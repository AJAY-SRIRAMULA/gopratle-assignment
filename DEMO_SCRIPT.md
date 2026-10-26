# Demo video script (target 6:00, must land between 5:00 and 7:00)

I could not record the video, so this is the script and checklist. Record after you have deployed and verified the live app.

## Before recording
- [ ] Backend deployed, `/api/health` shows `"database":"connected"`; hit it once so the free tier is awake.
- [ ] Frontend deployed and submitting successfully.
- [ ] Browser tabs ready: live app, MongoDB Atlas *Browse Collections* (`requirements`), GitHub repo, VS Code with the files below, and a terminal or Postman/DevTools Network tab.
- [ ] Zoom the browser to ~125%, close notifications, hide any secrets (Atlas connection string, `.env`). **Do not show `.env` or the Render/Atlas credentials on screen.**
- [ ] Files to have open in VS Code: `frontend/lib/constants.js`, `frontend/components/RequirementWizard.jsx`, `frontend/lib/api.js`, `backend/src/validators/requirementValidator.js`, `backend/src/models/Requirement.js`, `backend/src/controllers/requirementController.js`.

## Timeline

**0:00–0:45 — Introduction**
"This is my submission for the GoPratle full-stack intern assignment: a four-step requirement posting flow. A user describes their event, picks Event Planner, Performer or Crew, answers questions specific to that category, reviews, and submits. The stack is Next.js on the frontend, Express and Mongoose on the backend, MongoDB Atlas for storage, deployed on Vercel and Render. I'll show the flow, explain how it's built, show the data in MongoDB, and be upfront about limitations."
(Mention your assumptions: dates can be in the past; venue optional; no auth because it wasn't required.)

**0:45–2:30 — Walkthrough (live app)**
1. Step 1: click Continue empty → show inline errors. Fill name, type, date; toggle multi-day and show end-before-start rejected; leave venue blank (optional); show the three category cards (keyboard Tab/arrow works).
2. Pick **Event Planner** → Step 2 planner fields (service type, guests, ₹ budget, multi-select services, experience) → Step 3 planner extras.
3. Go back, switch to **Performer** → show different fields; switch to **Crew** → show different fields. Note: answers per category are kept but only the selected one is submitted.
4. Finish one category, reach Review, click an Edit link and return to show nothing was lost, then **Submit**. Show loading state, then the success screen with the saved ID. Copy the ID.

**2:30–3:45 — Frontend**
- `constants.js`: one config describes every field per category; the step screens, validation, payload and review are all generated from it.
- `RequirementWizard.jsx`: single state object, answers stored per category, `buildPayload` sends only the selected category; step validation + full revalidation on submit; ref guard against double submits; Enter key doesn't submit.
- `api.js`: single place for the URL (`NEXT_PUBLIC_API_URL`), checks status, parses server errors, handles network failure and unexpected bodies.

**3:45–4:45 — Backend**
- Routes → controller → validator → model, plus central error handler.
- `requirementValidator.js`: builds a fresh object from a whitelist, rejects fields from other categories, checks dates (`YYYY-MM-DD`, end ≥ start), numbers, lengths. The server never trusts the frontend.
- `Requirement.js`: `category` enum; `details` is flexible so a `pre('validate')` hook re-runs the category-aware validator.
- Show the Network tab (or Postman): request body and the `201` response `{ success, data: { id, category, eventName, createdAt } }`; then send one bad payload (negative budget) and show the `422` with field errors. Mention CORS allowlist, 50 kb body limit, safe error messages, `/api/health` reflecting DB state.

**4:45–5:30 — MongoDB**
- In Atlas, find the document whose `_id` matches the ID from the success screen. Point at `category`, `details` (category-specific), `additionalDetails`, `createdAt`. Show that a crew document has crew fields only.

**5:30–6:30 — Testing, limitations, improvements**
- Backend tests (44) and frontend tests (33): validation edge cases, category isolation, duplicate submit, network failure, server validation errors. Be precise: the backend HTTP tests stub the database, so persistence was verified with the smoke script / the manual Atlas check shown above (**only say this if you actually ran it**).
- Limitations: public endpoint with no auth or rate limiting, no contact details, free-tier cold starts, refresh discards progress by design.
- Improvements: rate limiting/CAPTCHA, contact details and confirmation email, Playwright end-to-end tests, CI.

## After recording
- [ ] Length is between 5:00 and 7:00.
- [ ] No secrets visible. Upload (YouTube unlisted / Drive link with access enabled) and add the link to the README.
