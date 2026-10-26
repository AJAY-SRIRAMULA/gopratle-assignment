import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequirementWizard from '../components/RequirementWizard';

const json = (status, body) => Promise.resolve({ ok: status < 300, status, json: async () => body });
let fetchMock;

beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

async function fillBasics(user, { category = 'Event Planner' } = {}) {
  await user.type(screen.getByLabelText(/event name/i), 'Wedding Celebration');
  await user.selectOptions(screen.getByLabelText(/event type/i), 'Wedding');
  await user.type(screen.getByLabelText(/event date/i), '2026-12-15');
  await user.type(screen.getByLabelText(/^location/i), 'Hyderabad');
  await user.click(screen.getByRole('radio', { name: new RegExp(category, 'i') }));
}
const next = (user) => user.click(screen.getByRole('button', { name: /continue/i }));

async function completePlanner(user) {
  await fillBasics(user);
  await next(user);
  await user.selectOptions(screen.getByLabelText(/planning service type/i), 'Full event planning');
  await user.type(screen.getByLabelText(/expected guest count/i), '500');
  await user.type(screen.getByLabelText(/estimated budget/i), '300000');
  await user.click(screen.getByRole('checkbox', { name: 'Decoration' }));
  await user.selectOptions(screen.getByLabelText(/preferred planner experience/i), 'Experienced');
  await next(user);
  await user.type(screen.getByLabelText(/preferred event theme/i), 'Traditional');
  await next(user);
}

describe('RequirementWizard', () => {
  it('renders step 1 with progress indicator and the three categories', () => {
    render(<RequirementWizard />);
    expect(screen.getByRole('heading', { name: /event basics/i, level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    const current = document.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent(/event basics/i);
    expect(screen.getByLabelText(/venue/i)).toBeInTheDocument();
  });

  it('blocks Continue on empty step 1 and shows inline, associated errors', async () => {
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await next(user);
    expect(screen.getByRole('heading', { name: /event basics/i, level: 2 })).toBeInTheDocument();
    const name = screen.getByLabelText(/event name/i);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(name.getAttribute('aria-describedby'))).toHaveTextContent(/enter an event name/i);
    expect(screen.getByText(/choose a category/i)).toBeInTheDocument();
  });

  it('shows end date only for multi-day events and rejects end before start', async () => {
    const user = userEvent.setup();
    render(<RequirementWizard />);
    expect(screen.queryByLabelText(/end date/i)).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: /more than one day/i }));
    await user.type(screen.getByLabelText(/start date/i), '2026-12-15');
    await user.type(screen.getByLabelText(/end date/i), '2026-12-10');
    await next(user);
    expect(screen.getByText(/end date cannot be before/i)).toBeInTheDocument();
  });

  it.each([
    ['Event Planner', /planning service type/i, /preferred event theme/i],
    ['Performer', /performance category/i, /audience type/i],
    ['Crew', /crew role/i, /setup and teardown/i],
  ])('steps 2 and 3 adapt to %s', async (category, step2Label, step3Label) => {
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await fillBasics(user, { category });
    await next(user);
    expect(screen.getByLabelText(step2Label)).toBeInTheDocument();
    // fields of other categories must not be present
    if (category !== 'Event Planner') expect(screen.queryByLabelText(/planning service type/i)).toBeNull();
    if (category !== 'Crew') expect(screen.queryByLabelText(/^crew role/i)).toBeNull();
  });

  it('keeps data when going back and forth, and keeps per-category answers when switching', async () => {
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await fillBasics(user);
    await next(user);
    await user.type(screen.getByLabelText(/expected guest count/i), '250');
    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByLabelText(/event name/i)).toHaveValue('Wedding Celebration');
    // switch to crew and back
    await user.click(screen.getByRole('radio', { name: /crew/i }));
    await next(user);
    expect(screen.queryByLabelText(/expected guest count/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: /previous/i }));
    await user.click(screen.getByRole('radio', { name: /event planner/i }));
    await next(user);
    expect(screen.getByLabelText(/expected guest count/i)).toHaveValue('250');
  });

  it('validates step 2 (negative budget, empty required fields)', async () => {
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await fillBasics(user);
    await next(user);
    await user.type(screen.getByLabelText(/estimated budget/i), '-100');
    await next(user);
    expect(screen.getByRole('heading', { name: /your requirements/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/cannot be negative/i)).toBeInTheDocument();
    expect(screen.getByText(/select at least one option/i)).toBeInTheDocument();
  });

  it('review step shows entered data and Edit returns to the step without losing it', async () => {
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await completePlanner(user);
    expect(screen.getByRole('heading', { name: /review and submit/i, level: 2 })).toBeInTheDocument();
    const basics = screen.getByRole('region', { name: /event basics/i });
    expect(within(basics).getByText('Wedding Celebration')).toBeInTheDocument();
    expect(within(basics).getByText('15 Dec 2026')).toBeInTheDocument();
    expect(within(basics).getByText('Not provided')).toBeInTheDocument(); // blank venue
    expect(screen.getByText('₹ 3,00,000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /edit requirements/i }));
    expect(screen.getByLabelText(/expected guest count/i)).toHaveValue('500');
  });

  it('submits the real payload to the API and shows the returned ID', async () => {
    fetchMock.mockImplementation(() => json(201, { success: true, message: 'ok', data: { id: '65f1a2b3c4d5e6f708192a3b', category: 'planner', eventName: 'Wedding Celebration', createdAt: '2026-10-26T00:00:00.000Z' } }));
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await completePlanner(user);
    await user.click(screen.getByRole('button', { name: /submit requirement/i }));
    expect(await screen.findByText(/requirement submitted/i)).toBeInTheDocument();
    expect(screen.getByTestId('requirement-id')).toHaveTextContent('65f1a2b3c4d5e6f708192a3b');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/requirements$/);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ category: 'planner', eventName: 'Wedding Celebration', startDate: '2026-12-15', endDate: '2026-12-15', details: { guestCount: 500, budget: 300000, services: ['Decoration'] }, additionalDetails: { theme: 'Traditional' } });
    // start a new requirement resets
    await user.click(screen.getByRole('button', { name: /start a new requirement/i }));
    expect(screen.getByLabelText(/event name/i)).toHaveValue('');
  });

  it('prevents duplicate submissions while a request is pending', async () => {
    let resolve;
    fetchMock.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await completePlanner(user);
    const submit = screen.getByRole('button', { name: /submit requirement/i });
    await user.dblClick(submit);
    await user.click(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
    resolve({ ok: true, status: 201, json: async () => ({ success: true, data: { id: 'x1', category: 'planner', eventName: 'Wedding Celebration' } }) });
    expect(await screen.findByText(/requirement submitted/i)).toBeInTheDocument();
  });

  it('on network failure keeps the form, shows an error, never claims success, and allows retry', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await completePlanner(user);
    await user.click(screen.getByRole('button', { name: /submit requirement/i }));
    expect(await screen.findByText(/your requirement was not saved/i)).toBeInTheDocument();
    expect(screen.queryByText(/requirement submitted/i)).toBeNull();
    expect(screen.getByRole('heading', { name: /review and submit/i, level: 2 })).toBeInTheDocument();
    // retry succeeds
    fetchMock.mockImplementationOnce(() => json(201, { success: true, data: { id: 'retry1', category: 'planner', eventName: 'Wedding Celebration' } }));
    await user.click(screen.getByRole('button', { name: /submit requirement/i }));
    expect(await screen.findByTestId('requirement-id')).toHaveTextContent('retry1');
  });

  it('shows server validation errors on the right step and keeps values', async () => {
    fetchMock.mockImplementation(() => json(422, { success: false, message: 'Validation failed', errors: { 'details.guestCount': 'Guest count must be at most 100000' } }));
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await completePlanner(user);
    await user.click(screen.getByRole('button', { name: /submit requirement/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /your requirements/i, level: 2 })).toBeInTheDocument());
    expect(screen.getByText(/guest count must be at most/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected guest count/i)).toHaveValue('500');
  });

  it('Enter key in a text field does not submit on the review step', async () => {
    const user = userEvent.setup();
    render(<RequirementWizard />);
    await completePlanner(user);
    await user.keyboard('{Enter}');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
