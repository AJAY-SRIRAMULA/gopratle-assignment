// All backend communication lives here. Components never build URLs themselves.

const DEFAULT_DEV_URL = 'http://localhost:5000';
const REQUEST_TIMEOUT_MS = 60000; // generous: free hosting tiers can take a while to wake up

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function buildUrl(base, path) {
  return `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
}

function getBaseUrl() {
  // Must be referenced literally so Next.js can inline it at build time.
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return DEFAULT_DEV_URL;
  throw new ApiError('The application is not configured with a backend URL (NEXT_PUBLIC_API_URL).');
}

export async function createRequirement(payload, { fetchImpl = fetch } = {}) {
  const url = buildUrl(getBaseUrl(), '/api/requirements');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      err?.name === 'AbortError'
        ? 'The server took too long to respond. Your answers are safe — please try again.'
        : 'Could not reach the server. Check your connection and try again. Nothing was saved.'
    );
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(body?.message || `The server returned an error (${response.status}). Nothing was saved.`, {
      status: response.status,
      fieldErrors: body?.errors && typeof body.errors === 'object' ? body.errors : {},
    });
  }
  if (!body || body.success !== true || !body.data?.id) {
    throw new ApiError('The server sent an unexpected response, so we cannot confirm the requirement was saved.', { status: response.status });
  }
  return body.data;
}
