# Architecture

## Overview

The Lift Servicing Digitisation app is a single-page React frontend talking to a single
Express/Mongoose REST API, backed by MongoDB Atlas for data and Cloudinary for file storage
(photos, e-signatures). There's one backend and one database for the whole app — each of the
five client-workflow steps (Lifts, Scheduling, Inspections, Defects, Rectifications) is a
separate model/controller/route module and a separate frontend feature folder, not a separate
service. See `architecture-diagram.md` for the component diagram and `er-diagram.md` for how the
five feature collections plus `users` relate to each other.

## Frontend architecture

- **Stack:** React 18 + Vite, MUI (Material UI) for components, Formik + Yup for forms,
  react-router-dom for routing, notistack for toast notifications.
- **Shell:** `App.jsx` owns the top-level layout (app bar, tab bar) and derives the active tab
  from the URL, so any dialog in the app can deep-link into a tab. `TabBar.jsx` renders the tab
  strip; `Workspace.jsx` renders whichever tab is active.
- **Feature folders:** each client-workflow step lives in its own `frontend/src/features/<name>/`
  folder (`lifts`, `scheduling`, `inspections`, `defects`, `rectifications`), each owning its own
  API module (`frontend/src/api/<feature>Api.js`), a `use<Feature>` data hook, form dialogs, and
  list/detail views. Scheduling, Inspections, Defects and Rectifications used to be four separate
  top-level tabs; they're now reached through one combined **Lift Workflow** tab
  (`frontend/src/features/lift-workflow/`) that has a user pick a lift first, then step through
  all four for that lift via a shared stepper. This is a navigation change only — each feature's
  CRUD/API stayed fully separate; the workflow layer just scopes each step's own existing screen
  to whichever lift is selected.
- **Auth:** `AuthContext` holds the logged-in user and JWT (stored in `localStorage`), attached
  to every API call as an `Authorization: Bearer <token>` header by a shared `client.js`
  interceptor. A 401 response clears the token and forces re-login. `AuthGate.jsx` blocks the
  rest of the app from rendering until the token's been confirmed against `GET /api/auth/me`
  (never trusted purely from the decoded JWT), so a since-deactivated account is caught
  immediately rather than after its 8-hour token happens to expire.
- **File uploads:** any feature that needs to upload a photo or signature uses the shared
  `useFileUpload` hook (`frontend/src/hooks/useFileUpload.js`), which talks to the backend only
  for a short-lived Cloudinary signature and then uploads the file bytes directly to Cloudinary
  — the file itself never passes through our backend.

## Backend architecture

- **Stack:** Node.js + Express 4, Mongoose (MongoDB ODM), JWT (`jsonwebtoken`) + `bcryptjs` for
  auth, Cloudinary SDK for the upload-signature endpoint.
- **`server.js`** is the single composition root: it fails fast at boot if `JWT_SECRET` is
  unset, connects to MongoDB Atlas, mounts one router per feature under `/api/<feature>`, and
  registers one app-wide error-handling middleware at the bottom so every `ApiError` thrown
  anywhere in the app (via `asyncHandler`) comes back as consistent JSON
  (`{ success: false, message }`) instead of an unhandled 500.
- **Per-feature module layout** — `backend/src/{models,controllers,routes}/<feature>/`, one set
  per feature (`lifts`, `scheduling`, `inspections`, `defects`, `rectifications`, plus `auth`/
  `users` for the account system). Every success response uses the same envelope,
  `{ success: true, message, data }`, from the shared `utils/apiResponse.js`.
- **Auth & RBAC:** `middleware/auth.js` exports `requireAuth` (verifies the JWT and re-checks the
  account still exists and isn't deactivated, on **every** request) and `requireRole(...roles)`.
  Three roles exist — `Master`, `Admin`, `Staff` — and every resource router applies these per
  the capability matrix documented in `design/Ryan/use-cases.md`. Some ownership-style rules
  (e.g. a Staff user can only edit a Schedule assigned to them) are enforced inside the
  controller itself rather than the generic role middleware, since they depend on data, not just
  role.
- **Cross-cutting utilities:** `utils/ApiError.js` (typed HTTP errors), `utils/asyncHandler.js`
  (wraps controllers so a thrown/rejected error reaches the error middleware instead of hanging
  the request), `utils/cascadeDelete.js` (soft-delete cascades down the workflow chain — deleting
  a Schedule cascades to its Inspections, which cascades to their Defects, which cascades to
  their Rectifications — plus a repair pass that backfills/cleans up orphaned records).
- **Soft delete throughout:** every feature model uses `isDeleted: true` instead of removing
  documents, so the audit trail (who serviced what, when, and what was found) is never destroyed
  by a delete action.

## Data storage & integrations

- **MongoDB Atlas** — the single source of truth for all application data (`lifts`, `schedules`,
  `inspections`, `defects`, `rectifications`, `users` collections). The team shares one Atlas
  connection string via each person's local `.env` (`DATABASE_URL`), rather than separate
  per-teammate database users — simplest option at this project's size. Node is pointed at
  public DNS resolvers (`8.8.8.8`/`1.1.1.1`) at boot, working around some ISPs/routers breaking
  the SRV lookups `mongodb+srv://` URIs need.
- **Cloudinary** — stores every photo and e-signature (proof-of-fix photos on Rectifications,
  defect photos on Inspections/Defects). The backend never receives or stores file bytes itself:
  `POST /api/uploads/signature` hands the frontend a short-lived signed-upload signature (cloud
  name + API key + signature, never the API secret), and the frontend uploads straight to
  Cloudinary's API with it.
- **No separate file storage/CDN of our own** — Cloudinary serves both roles (storage and
  delivery) for this app's media needs. The app originally used AWS S3 for this and was migrated
  to Cloudinary to remove the AWS account/credential-coordination burden for a small team.

## Request flow (typical write)

1. Browser sends a request with `Authorization: Bearer <token>` to `/api/<feature>/...`.
2. Express router → `requireAuth` (and `requireRole(...)` where applicable) → controller.
3. Controller validates the request body, resolves any referenced documents (e.g. a
   Rectification's `defectId` must resolve to a real, non-deleted Defect), applies any
   role/ownership rule, then reads/writes via the Mongoose model.
4. Response is sent through the shared `{ success, message, data }` envelope; any thrown
   `ApiError` is instead caught by the bottom-of-`server.js` error handler and returned as
   `{ success: false, message }` with the matching status code.

## Deployment shape

Two independently deployable pieces sharing one Atlas cluster and one Cloudinary account:
- **Frontend** — static build (`npm run build` → `frontend/dist/`) served from any static host,
  configured with `VITE_API_BASE_URL` pointing at the deployed backend.
- **Backend** — a single Node process (`npm start`), configured with `DATABASE_URL`,
  `JWT_SECRET`, and the three `CLOUDINARY_*` variables. Boots successfully and exposes
  `/api/health` as the readiness check.

This is deliberately generic — see `deployment.md` for the actual hosting checklist once a
provider is chosen (e.g. Vercel/Render); nothing here changes based on which provider gets used.
