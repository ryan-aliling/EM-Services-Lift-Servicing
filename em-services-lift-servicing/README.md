# em-services-lift-servicing

## Overview
TODO: describe the project.

## Repository Structure
```
em-services-lift-servicing/
├── design/                     Design documentation (problem statement, architecture, ER diagrams, per-student docs)
├── frontend/                   Frontend application (src, tests, package.json, .env.example)
├── backend/                    Backend application (src, tests, package.json, .env.example)
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
