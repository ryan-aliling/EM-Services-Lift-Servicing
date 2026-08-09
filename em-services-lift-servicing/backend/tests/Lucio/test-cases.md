# Backend Test Cases — Lift Records

Feature owner: Lucio
Automated in: `lift.test.js` (Jest + Supertest, against an in-memory MongoDB via
`mongodb-memory-server` — no real Atlas connection needed to run these). The test file mounts
only `liftRoutes` (plus the same error-handling middleware `server.js` uses) rather than
requiring `server.js` itself, since that file connects to the real `DATABASE_URL` and calls
`app.listen` as a side effect of being imported.

Run with: `npm run test:lucio` (see `backend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Create — happy path | POST `/api/lifts` with all required fields | 201; `status` defaults to `"Active"` |
| 2 | Create — missing required fields | POST with only `liftCode` | 400; message names the missing fields (e.g. `block`) |
| 3 | Create — duplicate `liftCode` | POST twice with the same `liftCode` | Second call: 400, `Lift code "LIFT-001" already exists` |
| 4 | Create — Staff forbidden | POST as a Staff user | 403 |
| 5 | List — Staff can read | GET `/api/lifts` as Staff | 200; Staff has full read access despite no write access |
| 6 | List — filters by status | Create two lifts, advance one to `Maintenance`, GET `?status=Maintenance` | 200; only the matching lift returned |
| 7 | List — filters by type | Create a `Passenger` and a `Freight` lift, GET `?type=Freight` | 200; only the `Freight` lift returned |
| 8 | List — `q` searches liftCode/block/unit/manufacturer | Create two lifts with different manufacturers, GET `?q=otis` | 200; only the matching lift returned, case-insensitive |
| 9 | List — `q` tolerates regex special characters | GET `?q=a(b[c` | 200; empty result, not a 500 from an unescaped regex |
| 10 | Stats — counts by status | Create lifts across two statuses, GET `/api/lifts/stats` | 200; `{ total, active, maintenance, outOfService, decommissioned }` matches actual counts |
| 11 | Get one — happy path | GET an existing lift's id | 200; full lift object |
| 12 | Get one — unknown id | GET a well-formed but non-existent id | 404 |
| 13 | Get one — malformed id | GET `/api/lifts/not-a-valid-id` | 500 — documents current behavior: unlike Scheduling, this controller has no explicit ObjectId-format check, so a bad id reaches Mongoose as an uncaught `CastError` |
| 14 | Update — happy path | PUT `status`/`lastServiced` on an existing lift | 200; fields updated |
| 15 | Update — duplicate `liftCode` | PUT a second lift's `liftCode` to match the first's | 400, same duplicate message as create |
| 16 | Update — Staff forbidden | PUT as a Staff user | 403 |
| 17 | Update — unknown id | PUT a well-formed but non-existent id | 404 |
| 18 | Delete — soft delete | DELETE an existing lift, then GET the same id | DELETE 200; subsequent GET 404, but the raw Mongo document still exists with `isDeleted: true` |
| 19 | Delete — `liftCode` reusable after soft delete | Soft-delete a lift, then POST a new lift with the same `liftCode` | 201 — the partial unique index only applies to non-deleted lifts |
| 20 | Delete — Staff forbidden | DELETE as a Staff user | 403 |
| 21 | Delete — already deleted | DELETE the same lift twice | Second call: 404 |
| 22 | Delete — unknown id | DELETE a well-formed but non-existent id | 404 |
| 23 | Import — all rows valid | POST `/api/lifts/import` with 2 valid rows | 200; `created: 2`, `failed: []` |
| 24 | Import — per-row failures don't abort the batch | POST with one valid row, one missing required fields, one duplicating the first's `liftCode` | 200; `created: 1`, `failed` has 2 entries with correct 1-based CSV row numbers and reasons |
| 25 | Import — empty rows array | POST `{ rows: [] }` | 400, "No rows to import" |
| 26 | Import — Staff forbidden | POST as a Staff user | 403 |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 27 | Click "Add Lift", submit with a field missing | Formik/yup inline validation error shown; no network request fires |
| 28 | Download the CSV import template, edit it, then import it | Every row from the template file lands as a new lift |
| 29 | Import a `.csv` with one bad row mixed in among good ones | Import Results dialog shows "Imported N of M lift(s)" plus the exact row number/reason for the failure |
| 30 | Click "View history" on a lift with existing schedules/inspections/defects/rectifications | `LiftDetailDialog` shows all four tabs populated, each with a status badge matching that feature's own color scheme |
| 31 | Click a row inside `LiftDetailDialog` | Dialog closes and the app deep-links into the Lift Workflow tab for that lift, at the matching step |
| 32 | Log in as Staff and open the Lifts tab | "Add Lift", "Import CSV", and the row-level Edit/Delete actions are all hidden; "Export CSV" and "View history" remain available |
| 33 | Delete a lift, then check it via a direct Mongo/Compass query | Document still exists with `isDeleted: true` rather than being gone — confirms the soft delete end-to-end, not just through the API |
