# deployment

## Overview
- **Frontend:** deployed to Vercel — https://em-services-lift-servicing.vercel.app
  (root directory `em-services-lift-servicing/frontend`, framework preset Vite)
- **Backend:** deployed to Render — https://em-services-lift-servicing.onrender.com
  (root directory `em-services-lift-servicing/backend`, Node web service)
- **Environment:** single production environment, no separate staging deploy
- Both services auto-redeploy on every push to `main`

## Prerequisites
- [x] MongoDB Atlas cluster created, connection string ready
- [x] Cloudinary account created, API credentials set in production env vars (confirmed set in Render)
- [x] Hosting accounts set up for frontend (Vercel) and backend (Render)

## Frontend Deployment
- [x] Root directory in Vercel set to `em-services-lift-servicing/frontend`
- [x] Framework preset: Vite (auto-detected)
- [x] Set `VITE_API_BASE_URL=https://em-services-lift-servicing.onrender.com` in Vercel's project env vars
- [x] Vercel runs `npm install && npm run build` automatically and serves `frontend/dist/`
- Live URL: https://em-services-lift-servicing.vercel.app

## Backend Deployment
- [x] Root directory in Render set to `em-services-lift-servicing/backend`
- [x] Build Command: `npm install`
- [x] Start Command: `npm start` (runs `node src/server.js`)
- [x] Set all variables from `backend/.env.example` in Render's Environment tab — see list below
- [x] Confirm `/api/health` returns `{ status: "ok" }` after deploy: https://em-services-lift-servicing.onrender.com/api/health
- Live URL: https://em-services-lift-servicing.onrender.com
- **Note:** Render's free tier spins the service down after 15 minutes of inactivity — the first request after idle takes ~30s to wake back up. Mention this before any live demo.

## Environment Variables
See `backend/.env.example` and `frontend/.env.example` for the full list.

**Backend (set in Render → Environment):**
- `DATABASE_URL` — MongoDB Atlas connection string
- `JWT_SECRET` — required; the server refuses to boot without it (`backend/src/server.js`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `NODE_ENV=production`
- `PORT` — Render sets this automatically; no need to set it manually

**Frontend (set in Vercel → Environment Variables):**
- `VITE_API_BASE_URL=https://em-services-lift-servicing.onrender.com`
