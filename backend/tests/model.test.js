// Model-level validation runs without a DB connection (validate() never hits the network).
const test = require('node:test');
const assert = require('node:assert/strict');
const Requirement = require('../src/models/Requirement');
const { validateRequirement } = require('../src/validators/requirementValidator');
const fx = require('./fixtures');

const clean = (make) => validateRequirement(make()).value;

test('valid documents of each category pass schema validation', async () => {
  for (const make of [fx.planner, fx.performer, fx.crew]) {
    await new Requirement(clean(make)).validate();
  }
});

test('schema rejects an unknown category', async () => {
  const doc = clean(fx.planner);
  doc.category = 'dj';
  await assert.rejects(new Requirement(doc).validate(), /category/);
});

test('schema blocks mismatched category/details even if the controller were bypassed', async () => {
  const doc = clean(fx.planner);
  doc.category = 'crew'; // planner details under a crew category
  await assert.rejects(new Requirement(doc).validate(), /details/);
});

test('schema requires details', async () => {
  const doc = clean(fx.planner);
  delete doc.details;
  await assert.rejects(new Requirement(doc).validate());
});
