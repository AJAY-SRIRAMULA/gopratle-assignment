import { CATEGORY_FIELDS, needsOther } from './constants.js';

const emptyAnswers = () => ({ details: {}, additionalDetails: {} });

export function createInitialState() {
  return {
    eventName: '',
    eventType: '',
    eventTypeOther: '',
    multiDay: false,
    startDate: '',
    endDate: '',
    location: '',
    venue: '',
    category: '',
    // Answers are stored per category, so switching category never mixes data and
    // switching back never loses what the user already typed.
    answers: { planner: emptyAnswers(), performer: emptyAnswers(), crew: emptyAnswers() },
  };
}

const sections = [['details', 'details'], ['additional', 'additionalDetails']];

function cleanValue(field, raw) {
  if (field.type === 'checkboxes') return Array.isArray(raw) ? raw : [];
  if (field.type === 'number') return raw === '' || raw === undefined ? undefined : Number(String(raw).trim());
  const text = typeof raw === 'string' ? raw.trim() : '';
  return text === '' ? undefined : text;
}

// Builds exactly what is sent to the API (and shown on the review step):
// only the selected category's fields, trimmed and typed.
export function buildPayload(state) {
  const payload = {
    eventName: state.eventName.trim(),
    eventType: state.eventType,
    startDate: state.startDate,
    endDate: state.multiDay ? state.endDate : state.startDate,
    location: state.location.trim(),
    category: state.category,
  };
  if (state.eventType === 'Other') payload.eventTypeOther = state.eventTypeOther.trim();
  if (state.venue.trim()) payload.venue = state.venue.trim();

  if (!state.category) return payload;
  const config = CATEGORY_FIELDS[state.category];
  const answers = state.answers[state.category];

  for (const [configKey, payloadKey] of sections) {
    const store = answers[payloadKey];
    const out = {};
    for (const field of config[configKey]) {
      const value = cleanValue(field, store[field.key]);
      if (value !== undefined && !(Array.isArray(value) && value.length === 0 && !field.required)) out[field.key] = value;
      if (needsOther(field, store[field.key])) {
        const other = cleanValue({ type: 'text' }, store[field.otherKey]);
        if (other !== undefined) out[field.otherKey] = other;
      }
    }
    payload[payloadKey] = out;
  }
  return payload;
}
