# Backend Test Cases — Scheduling

Feature owner: Aeric
Automated in: `placeholder.test.js` (Jest + Supertest, against an in-memory MongoDB via `mongodb-memory-server` — no real Atlas connection needed to run these).

Run with: `npm run test:aeric` (see `backend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Create schedule — happy path | POST `/api/scheduling` with all required fields | 201; response includes `status: "Scheduled"` (default) and the submitted fields |
| 2 | Create schedule — missing required field | POST `/api/scheduling` with only `townCouncil` | 400; error message names the required fields |
| 3 | List schedules — sorted by date | Create two schedules with different `scheduledDate`s, then GET `/api/scheduling` | 200; array of 2, ordered soonest date first |
| 4 | List schedules — filter by status | Create a schedule, PUT it to `status: "Assigned"`, GET with `?status=Assigned` | 200; only the `Assigned` schedule is returned |
| 5 | Update schedule — invalid status value | PUT `/api/scheduling/:id` with `status: "Bogus"` | 400; error names the valid enum values, record is unchanged |
| 6 | Update schedule — valid status transition | PUT `/api/scheduling/:id` with `status: "Assigned"` | 200; returned record reflects the new status |
| 7 | Delete schedule — soft delete | DELETE `/api/scheduling/:id`, then GET the same id | DELETE returns 200; subsequent GET returns 404 (hidden, not gone) |
| 8 | Delete schedule — data integrity check | After soft-deleting, query the raw `schedules` collection directly | Document still exists with `isDeleted: true` (not physically removed) |
| 9 | Get schedule — malformed id | GET `/api/scheduling/not-a-valid-id` | 400 (invalid ObjectId), not a 500 crash |
| 10 | Get/Update/Delete — unknown id | GET/PUT/DELETE with a well-formed but non-existent ObjectId | 404 `Schedule not found` for each |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 11 | Create schedule via UI form, leave a required field blank | Inline error shown, no request sent to the server |
| 12 | Advance a schedule through the full stepper (Scheduled → Assigned → In Progress → Completed) from the list view | Progress indicator updates at each step without a page reload |
| 13 | Filter the list by status and by date together | Only rows matching both filters are shown |
| 14 | Export the current filtered list to CSV | Downloaded file opens in Excel with correct headers/rows and dates in `YYYY-MM-DD` |
| 15 | A schedule whose date has passed and isn't `Completed`/`Cancelled` | Row is visually flagged "Overdue" in the list |
