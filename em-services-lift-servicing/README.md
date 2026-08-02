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
│       ├── hooks/useFileUpload.js  Shared S3 presigned-upload hook
│       └── features/            One folder per feature (lifts, scheduling, inspections, defects, rectifications)
├── backend/                    Backend application (Express + Mongoose)
│   └── src/
│       ├── server.js            Express app, Atlas connection, router mounting, /api/health
│       ├── routes/uploads.js    Presigned S3 upload URL endpoint
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

The shared shell (tab switcher, upload hook, Express/Atlas setup, `/api/health`, presigned upload route) is common infrastructure — changes to it should be agreed on by the team rather than made unilaterally.

Everything else is owned per feature. Each feature has a matching folder in both apps:
- `frontend/src/features/<feature>/`
- `backend/src/models/<feature>/`, `backend/src/routes/<feature>/`, `backend/src/controllers/<feature>/`

Fill in the owner for each feature below:

| Feature | Owner |
| --- | --- |
| Lifts | TBD |
| Scheduling | TBD |
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

## TODO
- [ ] Fill in project overview
- [ ] Fill in setup/run instructions once implemented
- [ ] Link to design docs and deployment guide
