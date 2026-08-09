# Backend Test Cases — Scheduling

Feature owner: Aeric
Automated in: `placeholder.test.js` (Jest + Supertest, against an in-memory MongoDB via `mongodb-memory-server`). Every request runs as an Admin user via `asUser()` (see `backend/tests/testAuthHelper.js`), matching this suite's pre-RBAC behavior — Staff-specific scoping is covered in `tests/Auth/auth.test.js`.

Run with: `npm run test:aeric` (see `backend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Create schedule — happy path | POST `/api/scheduling` with all required fields | 201; `data.status` is `"Scheduled"` (default) |
| 2 | Create schedule — missing required field | POST `/api/scheduling` with only `townCouncil` | 400; message names the required fields |
| 3 | Create schedule — persists liftId | POST with a real `liftId` | 201; `data.liftId` matches |
| 4 | List schedules — sorted by date | Create two schedules with different `scheduledDate`s | 200; ordered soonest first |
| 5 | List schedules — filter by status | Filter by `?status=Assigned` | Only the `Assigned` schedule returned |
| 6 | List schedules — filter by liftId | Two lifts, one schedule each, filter by `?liftId=` | Only that lift's schedule returned |
| 7 | Get schedule — malformed id | GET with an invalid ObjectId | 400 |
| 8 | Get/Update/Delete — unknown id | Well-formed but non-existent id | 404 |
| 9 | Update schedule — invalid status value | PUT with `status: "Bogus"` | 400; record unchanged |
| 10 | Update schedule — valid status transition | PUT with `status: "Assigned"` | 200; reflects new status |
| 11 | Delete schedule — soft delete | DELETE then GET the same id | DELETE 200, GET 404 (hidden, not gone) |
| 12 | Import — all rows valid | POST `/api/scheduling/import` with 2 valid rows | 200; `created: 2`, `failed: []` |
| 13 | Import — mixed valid/invalid rows | 1 valid, 1 missing fields, 1 bad status | `created: 1`, 2 entries in `failed` with row numbers |
| 14 | Import — empty rows array | POST with `rows: []` | 400 |
| 15 | Import — Staff cannot import | POST `/api/scheduling/import` as Staff | 403 |

RBAC-specific cases (Staff scoping, cross-user access, role gating on create/delete/update) live in `tests/Auth/test-cases.md` / `tests/Auth/auth.test.js` since they're shared across every RBAC-protected route, not just Scheduling.

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 16 | Import a CSV via the UI (Lift Workflow → Scheduling step) with a mix of good/bad rows | Results dialog shows created count + per-row error messages |
| 17 | Download the CSV import template, re-import it unmodified | Imports cleanly (round-trips through the same header aliases as export) |
| 18 | Advance a schedule through the full stepper from the grid | Progress indicator updates without a page reload |
| 19 | Filter by search + status + date together, then export CSV | Only the filtered rows appear in the download |
| 20 | A schedule whose date has passed and isn't `Completed`/`Cancelled` | Row is visually flagged "Overdue" |
