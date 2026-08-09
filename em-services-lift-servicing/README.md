# EM Services — Lift Servicing Digitisation

Digital replacement for EM Services' paper-based lift spot-check workflow. A single-page
React frontend talking to a single Express/Mongoose REST API, backed by MongoDB Atlas for
data and Cloudinary for file storage (defect photos, e-signatures).

## Overview

Every lift under a town council must be regularly serviced and inspected. The paper
process this app replaces: a contractor services a lift, an EM Services staff member does
a spot-check the next day and fills in a paper form, any defects found are chased with the
lift company by email/phone, the contractor fixes them within two weeks, and both sides
sign off at a joint inspection. Paper forms go missing, handwriting is illegible, and
there's no automated way to track defect resolution.

This app digitises the full chain as one guided workflow per lift:

**Lifts → Scheduling → Inspections → Defects → Rectifications**

- **Lifts** — the asset register (lift code, block/unit, type, capacity, status).
- **Scheduling** — plans a spot-check visit against a lift, assigned to a Staff member.
- **Inspections** — the digital spot-check report: structured checklist, embedded
  findings, contractor notification tracking.
- **Defects** — standalone defect records (can be raised from an inspection or logged
  independently) with severity tagging and a status lifecycle through to closure.
- **Rectifications** — the lift company's proof of fix (photos + e-signature), reviewed
  and endorsed by an EM Services inspector, which closes the loop on a defect.

On top of the workflow, the app has role-based accounts (**Master / Admin / Staff**), a
dashboard, CSV import/export, PDF export, a fully soft-deleted audit trail so nothing is
ever destroyed by a delete action, and an Admin/Master-only **Audit Log** page that
surfaces that trail as an actual readable, filterable feed — see `design/architecture.md`
for the full technical write-up and `design/er-diagram.md` for how the six collections
relate to each other.

## Repository Structure
```
em-services-lift-servicing/
├── design/                     Design documentation (problem statement, architecture, ER diagrams, per-student docs)
├── frontend/                   Frontend application (React + Vite)
│   └── src/
│       ├── App.jsx              Root component: tab state + layout
│       ├── TabBar.jsx           Shared tab switcher
│       ├── Workspace.jsx        Renders the active tab's content area
│       ├── hooks/useFileUpload.js  Shared Cloudinary signed-upload hook
│       └── features/            One folder per feature (lifts, lift-workflow, accounts, dashboard, settings, auth)
├── backend/                    Backend application (Express + Mongoose)
│   └── src/
│       ├── server.js            Express app, Atlas connection, router mounting, /api/health
│       ├── routes/uploads.js    Cloudinary signed-upload endpoint
│       ├── models/              One folder per feature
│       ├── routes/              One folder per feature
│       └── controllers/         One folder per feature
├── .gitignore
├── deployment.md                Deployment instructions
└── README.md                    This file
```

Per-student design and test documents live under a folder named after the student, e.g.:
- `design/<student-name>/use-cases.md`
- `design/<student-name>/api-documentation.md`
- `design/<student-name>/database-schema.md`
- `frontend/tests/<student-name>/`
- `backend/tests/<student-name>/`

A sibling directory, `em-services-lift-servicing-ai/`, stores each student's AI usage logs
and reflection under their own `<student-name>` folder.

## Ownership Model

The shared shell (tab switcher, upload hook, Express/Atlas setup, `/api/health`,
Cloudinary signed-upload route, auth/RBAC, and the Admin/Master-only Audit Log) is common
infrastructure — changes to it should be agreed on by the team rather than made
unilaterally. The Audit Log (`backend/src/{controllers,routes}/auditLog/`,
`frontend/src/features/audit-log/`) has no model of its own — it's a read-only view over
the five feature models below, not a sixth owned feature.

Everything else is owned per feature. Each feature has a matching folder in both apps:
- `frontend/src/features/<feature>/`
- `backend/src/models/<feature>/`, `backend/src/routes/<feature>/`, `backend/src/controllers/<feature>/`

| Feature | Owner |
| --- | --- |
| Lifts | Lucio |
| Scheduling | Aeric |
| Inspections | Javier |
| Defects | Elijah |
| Rectifications & Auth/RBAC | Ryan |

Each owner is responsible for their feature's model, routes, controller, and frontend UI,
and for mounting their router in `backend/src/server.js`.

## Setup Instructions

### Backend
```
cd backend
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, and the CLOUDINARY_* values (see "Media Storage" below)
npm install
npm run seed   # seeds sample lifts/schedules/inspections + one login per role (see below)
npm run dev
```

### Frontend
```
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Logging in for the first time

There is no public sign-up in the UI — accounts are provisioned by a Master/Admin. Run
`npm run seed` in `backend/` first, then log in with one of the sample accounts it creates
(dev-only, printed to the console when the seed script runs):

| Role | Email | Password |
| --- | --- | --- |
| Master | `master@emservices.test` | `Passw0rd!` |
| Admin | `alice.admin@emservices.test` | `Passw0rd!` |
| Staff | `jessica.s@emservices.test` | `Passw0rd!` |

Once logged in as Master or Admin, use the Accounts page to create real accounts.

### Verifying it's running
- Backend: `GET http://localhost:5000/api/health` → `{ "status": "ok" }`
- Frontend: `npm run dev` → `http://localhost:3000` (port is fixed in `vite.config.js`)

## Testing

```
cd backend && npm test    # runs the full Jest suite (backend/tests/**)
cd frontend && npm test   # runs the full Vitest suite (frontend/tests/**)
```

Per-student suites can also be run individually, e.g. `npm run test:aeric`,
`npm run test:javier` (see `package.json` in each app for the full list). Each student's
`test-cases.md` alongside their tests documents what's covered.

## Media Storage

File uploads (photos, e-signatures, etc.) go through [Cloudinary](https://cloudinary.com)
via a signed-upload flow: the backend hands out a short-lived signature
(`POST /api/uploads/signature`), and the frontend uploads the file straight to Cloudinary
with it - file bytes never pass through our server, and `CLOUDINARY_API_SECRET` never
reaches the browser.

To set this up locally (or in a deployed environment):
1. Create a free account at [cloudinary.com](https://cloudinary.com/users/register/free).
2. On the dashboard home page, find your **Cloud name**, **API Key**, and **API Secret**
   under "Account Details" / "API Keys".
3. Copy those three values into `backend/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```
4. No frontend env vars are needed for this - the frontend only ever talks to our own
   backend for the signature, then to Cloudinary directly using the (non-secret) cloud
   name and API key that endpoint returns.

Any feature can reuse the shared `useFileUpload` hook (`frontend/src/hooks/useFileUpload.js`)
to upload a file: `const { uploadFile, uploading, progress } = useFileUpload();` then
`const url = await uploadFile(file, 'your-feature-folder')` - the optional `folder` argument
just organizes uploads by feature in the Cloudinary dashboard (e.g. `"rectifications"`).

## Design Docs & Deployment

- `design/architecture.md` + `design/architecture-diagram.md` — system architecture and component diagram
- `design/er-diagram.md` — full entity-relationship diagram across all six collections
- `design/<student-name>/` — per-feature use cases, API documentation, and database schema
- `deployment.md` — hosting checklist and environment variable reference
