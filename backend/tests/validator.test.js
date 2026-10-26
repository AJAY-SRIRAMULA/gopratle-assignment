const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRequirement } = require('../src/validators/requirementValidator');
const fx = require('./fixtures');

const check = (payload) => validateRequirement(payload).errors;
const mutate = (make, fn) => { const p = make(); fn(p); return p; };

test('valid planner, performer and crew payloads pass', () => {
  for (const make of [fx.planner, fx.performer, fx.crew]) {
    const { errors, value } = validateRequirement(make());
    assert.deepEqual(errors, {});
    assert.ok(value.category);
  }
});

test('venue is optional and a blank venue is dropped', () => {
  const { errors, value } = validateRequirement(mutate(fx.planner, (p) => { p.venue = '   '; }));
  assert.deepEqual(errors, {});
  assert.equal('venue' in value, false);
});

test('single-day event: missing endDate defaults to startDate', () => {
  const { errors, value } = validateRequirement(mutate(fx.planner, (p) => { delete p.endDate; }));
  assert.deepEqual(errors, {});
  assert.equal(value.endDate, value.startDate);
});

test('event name: missing, whitespace-only, too long', () => {
  assert.ok(check(mutate(fx.planner, (p) => { delete p.eventName; })).eventName);
  assert.ok(check(mutate(fx.planner, (p) => { p.eventName = '    '; })).eventName);
  assert.ok(check(mutate(fx.planner, (p) => { p.eventName = 'x'.repeat(121); })).eventName);
});

test('event name is trimmed', () => {
  const { value } = validateRequirement(mutate(fx.planner, (p) => { p.eventName = '  Gala  '; }));
  assert.equal(value.eventName, 'Gala');
});

test('event type: missing, invalid, and "Other" needs a custom value', () => {
  assert.ok(check(mutate(fx.planner, (p) => { delete p.eventType; })).eventType);
  assert.ok(check(mutate(fx.planner, (p) => { p.eventType = 'Nonsense'; })).eventType);
  assert.ok(check(mutate(fx.planner, (p) => { p.eventType = 'Other'; })).eventTypeOther);
  assert.deepEqual(check(mutate(fx.planner, (p) => { p.eventType = 'Other'; p.eventTypeOther = 'Product launch'; })), {});
});

test('dates: missing, invalid, impossible, reversed', () => {
  assert.ok(check(mutate(fx.planner, (p) => { delete p.startDate; })).startDate);
  assert.ok(check(mutate(fx.planner, (p) => { p.startDate = 'tomorrow'; })).startDate);
  assert.ok(check(mutate(fx.planner, (p) => { p.startDate = '2026-02-30'; })).startDate);
  assert.ok(check(mutate(fx.planner, (p) => { p.endDate = '2026-12-14'; })).endDate);
});

test('same start and end date is allowed; past dates are not rejected', () => {
  assert.deepEqual(check(mutate(fx.planner, (p) => { p.startDate = p.endDate = '2020-01-01'; })), {});
});

test('location is required', () => {
  assert.ok(check(mutate(fx.planner, (p) => { delete p.location; })).location);
  assert.ok(check(mutate(fx.planner, (p) => { p.location = ' '; })).location);
});

test('category: missing and invalid', () => {
  assert.ok(check(mutate(fx.planner, (p) => { delete p.category; })).category);
  assert.ok(check(mutate(fx.planner, (p) => { p.category = 'magician'; })).category);
});

test('planner: missing required fields', () => {
  for (const key of ['planningType', 'guestCount', 'budget', 'services', 'preferredExperience']) {
    const errs = check(mutate(fx.planner, (p) => { delete p.details[key]; }));
    assert.ok(errs[`details.${key}`], `expected error for ${key}`);
  }
});

test('performer: missing required fields', () => {
  for (const key of ['performanceType', 'durationMinutes', 'performerCount', 'style', 'budget']) {
    const errs = check(mutate(fx.performer, (p) => { delete p.details[key]; }));
    assert.ok(errs[`details.${key}`], `expected error for ${key}`);
  }
});

test('crew: missing required fields', () => {
  for (const key of ['crewRole', 'crewCount', 'durationHours', 'budget']) {
    const errs = check(mutate(fx.crew, (p) => { delete p.details[key]; }));
    assert.ok(errs[`details.${key}`], `expected error for ${key}`);
  }
});

test('numeric boundaries: negative budget, negative guests, zero performers, zero crew', () => {
  assert.ok(check(mutate(fx.planner, (p) => { p.details.budget = -1; }))['details.budget']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.guestCount = -5; }))['details.guestCount']);
  assert.ok(check(mutate(fx.performer, (p) => { p.details.performerCount = 0; }))['details.performerCount']);
  assert.ok(check(mutate(fx.crew, (p) => { p.details.crewCount = 0; }))['details.crewCount']);
  assert.deepEqual(check(mutate(fx.planner, (p) => { p.details.budget = 0; })), {}, 'zero budget is allowed');
});

test('numeric validity: NaN-like, fractional counts, upper limits', () => {
  assert.ok(check(mutate(fx.planner, (p) => { p.details.guestCount = 'abc'; }))['details.guestCount']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.guestCount = 10.5; }))['details.guestCount']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.guestCount = 1e9; }))['details.guestCount']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.budget = null; }))['details.budget']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.budget = true; }))['details.budget']);
  assert.ok(check(mutate(fx.performer, (p) => { p.details.durationMinutes = Infinity; }))['details.durationMinutes']);
});

test('numeric strings from a form are accepted and converted', () => {
  const { errors, value } = validateRequirement(mutate(fx.planner, (p) => { p.details.guestCount = '250'; p.details.budget = '1000.50'; }));
  assert.deepEqual(errors, {});
  assert.equal(value.details.guestCount, 250);
  assert.equal(value.details.budget, 1000.5);
});

test('overlong text fields are rejected', () => {
  assert.ok(check(mutate(fx.planner, (p) => { p.additionalDetails.theme = 'x'.repeat(1001); }))['additionalDetails.theme']);
  assert.ok(check(mutate(fx.performer, (p) => { p.details.technicalRequirements = 'x'.repeat(1001); }))['details.technicalRequirements']);
  assert.ok(check(mutate(fx.planner, (p) => { p.venue = 'x'.repeat(151); })).venue);
});

test('fields from another category are rejected (no category mixing)', () => {
  const p = fx.crew();
  p.details.guestCount = 100; // planner field
  assert.ok(check(p)['details.guestCount']);
  const q = fx.planner();
  q.additionalDetails.audienceType = 'Family'; // performer field
  assert.ok(check(q)['additionalDetails.audienceType']);
});

test('planner crew payload mismatch: crew details under planner category fails', () => {
  const p = fx.crew();
  p.category = 'planner';
  const errs = check(p);
  assert.ok(Object.keys(errs).some((k) => k.startsWith('details.')));
});

test('unknown details fields are not silently kept', () => {
  const p = fx.planner();
  p.details.isAdmin = true;
  assert.ok(check(p)['details.isAdmin']);
  const { value } = validateRequirement(p);
  assert.equal('isAdmin' in value.details, false);
});

test('planner services: empty, invalid option, duplicates collapsed, "Other" needs text', () => {
  assert.ok(check(mutate(fx.planner, (p) => { p.details.services = []; }))['details.services']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.services = ['Teleportation']; }))['details.services']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.services = 'Decoration'; }))['details.services']);
  assert.deepEqual(validateRequirement(mutate(fx.planner, (p) => { p.details.services = ['Decoration', 'Decoration']; })).value.details.services, ['Decoration']);
  assert.ok(check(mutate(fx.planner, (p) => { p.details.services = ['Other']; }))['details.servicesOther']);
});

test('performer/crew "Other" requires a custom description', () => {
  assert.ok(check(mutate(fx.performer, (p) => { p.details.performanceType = 'Other'; }))['details.performanceTypeOther']);
  assert.ok(check(mutate(fx.crew, (p) => { p.details.crewRole = 'Other'; }))['details.crewRoleOther']);
});

test('non-object bodies are rejected', () => {
  for (const bad of [null, [], 'text', 42, undefined]) {
    assert.ok(check(bad).body);
  }
});

test('prototype-pollution style keys are not copied into the result', () => {
  const p = JSON.parse('{"__proto__": {"polluted": true}}');
  const { value } = validateRequirement({ ...fx.planner(), ...p });
  assert.equal({}.polluted, undefined);
  assert.equal(value.polluted, undefined);
});
