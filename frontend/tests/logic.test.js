import { describe, it, expect } from 'vitest';
import { createInitialState, buildPayload } from '../lib/formState';
import { validateBasics, validateDetails, validateAll, isRealDate } from '../lib/validation';
import { buildUrl, createRequirement, ApiError } from '../lib/api';

const basics = (over = {}) => ({ ...createInitialState(), eventName: 'Gala', eventType: 'Concert', startDate: '2026-12-15', location: 'Hyderabad', category: 'planner', ...over });

describe('validateBasics', () => {
  it('accepts valid single-day basics with no venue', () => expect(validateBasics(basics())).toEqual({}));
  it('rejects empty and whitespace-only name', () => {
    expect(validateBasics(basics({ eventName: '' })).eventName).toBeTruthy();
    expect(validateBasics(basics({ eventName: '   ' })).eventName).toBeTruthy();
  });
  it('requires type, start date, location, category', () => {
    const e = validateBasics(basics({ eventType: '', startDate: '', location: ' ', category: '' }));
    expect(Object.keys(e).sort()).toEqual(['category', 'eventType', 'location', 'startDate']);
  });
  it('requires a custom type when "Other"', () => expect(validateBasics(basics({ eventType: 'Other' })).eventTypeOther).toBeTruthy());
  it('rejects end before start on multi-day, allows same day', () => {
    expect(validateBasics(basics({ multiDay: true, endDate: '2026-12-14' })).endDate).toBeTruthy();
    expect(validateBasics(basics({ multiDay: true, endDate: '2026-12-15' }))).toEqual({});
  });
  it('rejects impossible dates', () => {
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('2026-02-28')).toBe(true);
    expect(validateBasics(basics({ startDate: '2026-13-01' })).startDate).toBeTruthy();
  });
});

describe('validateDetails and category isolation', () => {
  it('flags missing planner fields', () => {
    const e = validateDetails(basics());
    expect(Object.keys(e).sort()).toEqual(['details.budget', 'details.guestCount', 'details.planningType', 'details.preferredExperience', 'details.services']);
  });
  it('rejects negative budget, zero performers, zero crew', () => {
    const s = basics({ category: 'performer' });
    s.answers.performer.details = { performanceType: 'DJ', durationMinutes: '60', performerCount: '0', style: 'EDM', budget: '-5' };
    const e = validateDetails(s);
    expect(e['details.performerCount']).toBeTruthy();
    expect(e['details.budget']).toBeTruthy();
    const c = basics({ category: 'crew' });
    c.answers.crew.details = { crewRole: 'Photographer', crewCount: '0', durationHours: '4', budget: '100' };
    expect(validateDetails(c)['details.crewCount']).toBeTruthy();
  });
  it('rejects non-numeric and fractional counts', () => {
    const s = basics();
    s.answers.planner.details = { planningType: 'Full event planning', guestCount: '12.5', budget: 'abc', services: ['Logistics'], preferredExperience: 'No preference' };
    const e = validateDetails(s);
    expect(e['details.guestCount']).toBeTruthy();
    expect(e['details.budget']).toBeTruthy();
  });
  it('requires follow-up text when "Other" is chosen', () => {
    const s = basics({ category: 'crew' });
    s.answers.crew.details = { crewRole: 'Other', crewCount: '1', durationHours: '2', budget: '0' };
    expect(validateDetails(s)['details.crewRoleOther']).toBeTruthy();
  });
  it('payload only contains the selected category, never leftovers from another', () => {
    const s = basics({ category: 'planner' });
    s.answers.planner.details = { planningType: 'Partial planning', guestCount: '100', budget: '5000', services: ['Decoration'], preferredExperience: 'Experienced' };
    s.answers.crew.details = { crewRole: 'Photographer', crewCount: '2' };
    const p1 = buildPayload(s);
    expect(p1.details.crewRole).toBeUndefined();
    expect(p1.details.guestCount).toBe(100);
    const p2 = buildPayload({ ...s, category: 'crew' });
    expect(p2.details.guestCount).toBeUndefined();
    expect(p2.details.crewRole).toBe('Photographer');
    // switching back keeps the planner answers
    expect(buildPayload({ ...s, category: 'planner' }).details.guestCount).toBe(100);
  });
  it('payload omits blank venue and uses start date for single-day events', () => {
    const p = buildPayload(basics({ venue: '  ', endDate: '2030-01-01' }));
    expect('venue' in p).toBe(false);
    expect(p.endDate).toBe(p.startDate);
  });
  it('validateAll aggregates basics and details errors', () => {
    expect(Object.keys(validateAll(basics({ eventName: '' }))).length).toBeGreaterThan(1);
  });
});

describe('api client', () => {
  const payload = { eventName: 'x' };
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

  it('builds URLs without duplicate or missing slashes', () => {
    expect(buildUrl('http://a.com/', '/api/requirements')).toBe('http://a.com/api/requirements');
    expect(buildUrl('http://a.com', 'api/requirements')).toBe('http://a.com/api/requirements');
  });
  it('posts JSON and returns data on 201', async () => {
    let call;
    const data = await createRequirement(payload, { fetchImpl: async (url, init) => { call = { url, init }; return res(201, { success: true, data: { id: 'abc', category: 'crew', eventName: 'x' } }); } });
    expect(call.url).toMatch(/\/api\/requirements$/);
    expect(call.init.method).toBe('POST');
    expect(call.init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(call.init.body)).toEqual(payload);
    expect(data.id).toBe('abc');
  });
  it('turns server validation errors into ApiError with field errors', async () => {
    const err = await createRequirement(payload, { fetchImpl: async () => res(422, { success: false, message: 'Validation failed', errors: { eventName: 'bad' } }) }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.fieldErrors.eventName).toBe('bad');
  });
  it('handles network failure', async () => {
    const err = await createRequirement(payload, { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }).catch((e) => e);
    expect(err.message).toMatch(/Could not reach the server/);
  });
  it('does not treat a 200 with an unexpected body as success', async () => {
    await expect(createRequirement(payload, { fetchImpl: async () => res(200, { hello: 'world' }) })).rejects.toThrow(/unexpected response/);
  });
  it('handles non-JSON error bodies', async () => {
    const err = await createRequirement(payload, { fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new Error('html'); } }) }).catch((e) => e);
    expect(err.message).toMatch(/502/);
  });
});
