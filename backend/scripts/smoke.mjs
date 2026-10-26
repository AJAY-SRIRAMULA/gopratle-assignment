// End-to-end persistence check against a RUNNING backend that is connected to a real MongoDB.
// Usage:  node scripts/smoke.mjs [baseUrl]      (default http://localhost:5000)
// Creates one requirement per category, reads each back by ID, and checks the stored category.
const base = (process.argv[2] || 'http://localhost:5000').replace(/\/+$/, '');

const common = { eventType: 'Wedding', startDate: '2026-12-15', endDate: '2026-12-16', location: 'Hyderabad', venue: 'Grand Convention Hall' };
const samples = {
  planner: { ...common, eventName: 'Smoke planner', category: 'planner',
    details: { planningType: 'Full event planning', guestCount: 500, budget: 300000, services: ['Decoration', 'Catering coordination'], preferredExperience: 'Experienced' },
    additionalDetails: { theme: 'Traditional' } },
  performer: { ...common, eventName: 'Smoke performer', category: 'performer',
    details: { performanceType: 'Singer', durationMinutes: 90, performerCount: 2, style: 'Bollywood', budget: 50000 },
    additionalDetails: { audienceType: 'Family' } },
  crew: { ...common, eventName: 'Smoke crew', category: 'crew',
    details: { crewRole: 'Photographer', crewCount: 3, durationHours: 8, budget: 40000 },
    additionalDetails: { setupTeardown: 'Arrive 1 hour early' } },
};

let failed = false;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed = true; };

const health = await fetch(`${base}/api/health`).then((r) => r.json()).catch(() => null);
check(health?.database === 'connected', `health reports database connected (${JSON.stringify(health)})`);

for (const [category, payload] of Object.entries(samples)) {
  const created = await fetch(`${base}/api/requirements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await created.json();
  check(created.status === 201 && body.success, `${category}: POST returned 201`);
  const id = body.data?.id;
  check(/^[a-f0-9]{24}$/.test(id || ''), `${category}: received a MongoDB ObjectId (${id})`);
  const read = await fetch(`${base}/api/requirements/${id}`).then((r) => r.json());
  check(read.data?.category === category, `${category}: stored category is "${read.data?.category}"`);
  check(read.data?.eventName === payload.eventName, `${category}: stored eventName matches`);
}

const bad = await fetch(`${base}/api/requirements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...samples.crew, category: 'planner' }) });
check(bad.status === 422, `mismatched category/details rejected with 422 (got ${bad.status})`);

console.log(failed ? '\nSome checks FAILED' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
