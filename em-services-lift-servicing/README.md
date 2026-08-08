# em-services-lift-servicing

## Overview
TODO: describe the project.

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
│       └── features/            One folder per feature (lifts, scheduling, inspections, defects, rectifications)
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

Per-student design and test documents live under a folder named after the student (placeholder: `student-name`), e.g.:
- `design/student-name/use-cases.md`
- `design/student-name/api-documentation.md`
- `design/student-name/database-schema.md`
- `frontend/tests/student-name/`
- `backend/tests/student-name/`

A sibling directory, `em-services-lift-servicing-ai/`, stores each student's AI usage logs and reflection under their own `student-name` folder.

## Ownership Model

The shared shell (tab switcher, upload hook, Express/Atlas setup, `/api/health`, Cloudinary signed-upload route) is common infrastructure — changes to it should be agreed on by the team rather than made unilaterally.

Everything else is owned per feature. Each feature has a matching folder in both apps:
- `frontend/src/features/<feature>/`
- `backend/src/models/<feature>/`, `backend/src/routes/<feature>/`, `backend/src/controllers/<feature>/`

Fill in the owner for each feature below:

| Feature | Owner |
| --- | --- |
| Lifts | TBD |
| Scheduling | Aeric |
| Inspections | TBD |
| Defects | TBD |
| Rectifications | TBD |

Each owner is responsible for their feature's model, routes, controller, and frontend UI, and for mounting their router in `backend/src/server.js`.

## Setup Instructions

### Frontend
```
cd frontend
cp .env.example .env
npm install
npm start
```

### Backend
```
cd backend
cp .env.example .env
npm install
npm start
```

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

## TODO
- [ ] Fill in project overview
- [ ] Fill in setup/run instructions once implemented
- [ ] Link to design docs and deployment guide
