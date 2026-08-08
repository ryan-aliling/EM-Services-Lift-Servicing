# Backend Test Cases — User Management / RBAC

Feature owner: Auth (User Management + RBAC pass)
Automated in: `auth.test.js` (Jest + Supertest, against an in-memory MongoDB via
`mongodb-memory-server` — no real Atlas connection needed to run these). The test file mounts
`authRoutes`, `schedulingRoutes` and `rectificationsRoutes` together (plus the same
error-handling middleware `server.js` uses) rather than requiring `server.js` itself, since
that file connects to the real `DATABASE_URL` and calls `app.listen` as a side effect of being
imported. `backend/tests/testAuthHelper.js` provides `createTestUser(role, overrides)` (a real
User document, since `requireAuth` re-queries the DB on every request) and `authHeader(user)`
(signs a token with the same payload shape as `src/utils/jwt.js`).

Run with: `npm run test:auth` (see `backend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Login — wrong password | POST `/api/auth/login` with a valid email, wrong password | 401; generic "Invalid email or password" |
| 2 | Login — happy path | POST `/api/auth/login` with correct credentials | 200; `data.token` present, `data.user.role` matches |
| 3 | requireAuth — no Authorization header | GET `/api/scheduling` with no header | 401 |
| 4 | requireAuth — malformed header | GET `/api/scheduling` with `Authorization: Bearer` (no token) | 401 |
| 5 | requireAuth — invalid/tampered token | GET `/api/scheduling` with a garbage token | 401 |
| 6 | Staff cannot create a schedule | POST `/api/scheduling` as Staff | 403 |
| 7 | Staff cannot delete a schedule | DELETE `/api/scheduling/:id` as Staff, even one assigned to them | 403 |
| 8 | Staff updates only `status` on their own schedule | PUT `/api/scheduling/:id` with `{status}` only, schedule assigned to that Staff user | 200; status updates, other fields (e.g. `townCouncil`) unchanged |
| 9 | Staff cannot smuggle other fields alongside `status` | PUT `/api/scheduling/:id` with `{status, townCouncil}` on their own schedule | 403; message names the rejected field |
| 10 | Staff cannot touch a schedule assigned to someone else | PUT `/api/scheduling/:id` with `{status}` on a schedule assigned to a different Staff user | 404 (not found, not "forbidden" — doesn't reveal the schedule exists) |
| 11 | Staff cannot call the endorse endpoint | PATCH `/api/rectifications/:id/endorse` as Staff on a Submitted rectification | 403 |
| 12 | Admin cannot create another Admin account | POST `/api/auth/users` as Admin with `role: "Admin"` | 403 |
| 13 | Admin can create a Staff account (positive control) | POST `/api/auth/users` as Admin with `role: "Staff"` | 201 — proves case 12's 403 is role-specific, not a blanket deny |
| 14 | Master can create an Admin account | POST `/api/auth/users` as Master with `role: "Admin"` | 201 |
| 15 | No one can create a Master account through this endpoint | POST `/api/auth/users` (as Master) with `role: "Master"` | 403 |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 16 | Log in as each seeded role (Master/Admin/Staff) via the frontend login page | Correct tabs/actions visible per role; Accounts tab only for Master/Admin |
| 17 | Deactivate a Staff account, then use that Staff user's still-unexpired token | Next API call 401s immediately — deactivation takes effect without waiting for token expiry |
| 18 | Start the server with `JWT_SECRET` unset | Process exits immediately with a clear "FATAL: JWT_SECRET is not set" message instead of booting insecurely |
