# Backend (Express + MongoDB)

See the [root README](../README.md) for full setup, API docs and deployment.

```powershell
cd backend
npm install
copy .env.example .env     # then edit MONGODB_URI
npm run dev                # http://localhost:5000
npm test                   # automated tests (no database needed)
node scripts/smoke.mjs     # persistence check against a running, DB-connected server
```
