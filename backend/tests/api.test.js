// HTTP-layer tests. The database layer is stubbed (no MongoDB is needed), so these
// verify routing, validation, status codes, CORS, error shapes and the response
// contract -- NOT real persistence. Persistence is verified manually (see README).
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/config/db');
const Requirement = require('../src/models/Requirement');
const fx = require('./fixtures');

const ORIGIN = 'http://localhost:3000';
const app = createApp([ORIGIN]);
const FAKE_ID = '65f1a2b3c4d5e6f708192a3b';

function stubDb(t, { ready = true, create } = {}) {
  t.mock.method(db, 'isDbReady', () => ready);
  if (create) t.mock.method(Requirement, 'create', create);
}
const fakeCreate = async (doc) => ({ _id: { toString: () => FAKE_ID }, createdAt: new Date('2026-10-26T04:00:00Z'), ...doc });

test('GET /api/health: 200 when DB connected, 503 when not', async (t) => {
  stubDb(t, { ready: true });
  let res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.database, 'connected');
  t.mock.restoreAll();
  stubDb(t, { ready: false });
  res = await request(app).get('/api/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.database, 'disconnected');
});

for (const [name, make] of Object.entries({ planner: fx.planner, performer: fx.performer, crew: fx.crew })) {
  test(`POST /api/requirements: ${name} returns 201 with id, category, eventName, createdAt`, async (t) => {
    let saved;
    stubDb(t, { create: async (doc) => { saved = doc; return fakeCreate(doc); } });
    const res = await request(app).post('/api/requirements').send(make());
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, FAKE_ID);
    assert.equal(res.body.data.category, name);
    assert.equal(res.body.data.eventName, make().eventName);
    assert.ok(res.body.data.createdAt);
    assert.equal(saved.category, name); // what would be written to MongoDB
  });
}

test('invalid payload returns 422 with per-field errors and never touches the DB', async (t) => {
  let called = false;
  stubDb(t, { create: async () => { called = true; } });
  const bad = fx.planner();
  bad.eventName = '  ';
  bad.details.budget = -10;
  const res = await request(app).post('/api/requirements').send(bad);
  assert.equal(res.status, 422);
  assert.equal(res.body.success, false);
  assert.ok(res.body.errors.eventName);
  assert.ok(res.body.errors['details.budget']);
  assert.equal(called, false);
});

test('invalid category returns 422', async (t) => {
  stubDb(t);
  const res = await request(app).post('/api/requirements').send({ ...fx.planner(), category: 'dj' });
  assert.equal(res.status, 422);
  assert.ok(res.body.errors.category);
});

test('malformed JSON returns 400 with a safe message', async (t) => {
  stubDb(t);
  const res = await request(app).post('/api/requirements').set('Content-Type', 'application/json').send('{"eventName": ');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Malformed JSON/);
});

test('non-JSON content type returns 415', async (t) => {
  stubDb(t);
  const res = await request(app).post('/api/requirements').set('Content-Type', 'text/plain').send('hello');
  assert.equal(res.status, 415);
});

test('oversized body returns 413', async (t) => {
  stubDb(t);
  const res = await request(app).post('/api/requirements').send({ ...fx.planner(), junk: 'x'.repeat(60000) });
  assert.equal(res.status, 413);
});

test('database down: valid payload returns 503, not a fake success', async (t) => {
  stubDb(t, { ready: false });
  const res = await request(app).post('/api/requirements').send(fx.planner());
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
});

test('database error during save returns 503 without leaking details', async (t) => {
  const err = new Error('connection to mongodb+srv://user:secret@cluster failed');
  err.name = 'MongoServerError';
  stubDb(t, { create: async () => { throw err; } });
  const res = await request(app).post('/api/requirements').send(fx.planner());
  assert.equal(res.status, 503);
  assert.equal(JSON.stringify(res.body).includes('secret'), false);
});

test('unexpected error returns generic 500 without stack or message', async (t) => {
  stubDb(t, { create: async () => { throw new Error('internal boom detail'); } });
  const res = await request(app).post('/api/requirements').send(fx.planner());
  assert.equal(res.status, 500);
  assert.equal(JSON.stringify(res.body).includes('boom'), false);
  assert.equal('stack' in res.body, false);
});

test('GET /api/requirements/:id: invalid id 400, missing 404, found 200', async (t) => {
  stubDb(t);
  let res = await request(app).get('/api/requirements/not-an-id');
  assert.equal(res.status, 400);

  t.mock.method(Requirement, 'findById', () => ({ lean: async () => null }));
  res = await request(app).get(`/api/requirements/${FAKE_ID}`);
  assert.equal(res.status, 404);

  t.mock.restoreAll();
  stubDb(t);
  t.mock.method(Requirement, 'findById', () => ({ lean: async () => ({ _id: { toString: () => FAKE_ID }, __v: 0, category: 'crew', eventName: 'X' }) }));
  res = await request(app).get(`/api/requirements/${FAKE_ID}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.id, FAKE_ID);
  assert.equal('__v' in res.body.data, false);
});

test('unknown route returns JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('CORS: allowed origin gets headers, other origin is rejected', async (t) => {
  stubDb(t);
  let res = await request(app).get('/api/health').set('Origin', ORIGIN);
  assert.equal(res.headers['access-control-allow-origin'], ORIGIN);
  res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
  assert.equal(res.status, 403);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('CORS preflight for POST from allowed origin succeeds', async () => {
  const res = await request(app).options('/api/requirements').set('Origin', ORIGIN)
    .set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type');
  assert.ok(res.status === 204 || res.status === 200);
  assert.equal(res.headers['access-control-allow-origin'], ORIGIN);
});
