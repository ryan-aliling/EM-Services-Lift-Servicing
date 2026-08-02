# deployment

## Overview
TODO: describe where the app is deployed (hosting provider(s), environments).

## Prerequisites
- [ ] MongoDB Atlas cluster created, connection string ready
- [ ] AWS S3 bucket created for file uploads, with CORS configured for the frontend origin
- [ ] AWS IAM credentials (access key/secret) scoped to that bucket
- [ ] Hosting accounts set up for frontend and backend (provider TBD)

## Frontend Deployment
- [ ] Set `VITE_API_BASE_URL` to the deployed backend URL
- [ ] Run `npm install && npm run build` in `frontend/`
- [ ] Deploy the `frontend/dist/` output to the chosen static host

## Backend Deployment
- [ ] Set all variables from `backend/.env.example` in the hosting provider's environment config
- [ ] Run `npm install` in `backend/`
- [ ] Start with `npm start` (or the provider's equivalent process command)
- [ ] Confirm `/api/health` returns `{ status: "ok" }` after deploy

## Environment Variables
See `backend/.env.example` and `frontend/.env.example` for the full list. At minimum:
- `PORT`, `DATABASE_URL` (Atlas), `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` (backend)
- `VITE_API_BASE_URL` (frontend)

## Rollback Plan
TODO: describe how to roll back a bad deploy (e.g. redeploy previous build/commit, revert Atlas migrations if any).
