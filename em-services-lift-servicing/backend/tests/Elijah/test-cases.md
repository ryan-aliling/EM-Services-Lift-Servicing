# Backend Test Cases — Defects

Feature owner: Elijah
Automated in: `placeholder.test.js` (Jest + Supertest, against an in-memory MongoDB via `mongodb-memory-server` — no real Atlas connection needed to run these).

Run with: `npm run test:elijah` (see `backend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Create defect — happy path | POST `/api/defects` with required fields | 201; `defectNo` is `DEF-0001`, `status` defaults to `Open`, `resolvedDate` is `null` |
| 2 | Create defect — missing required field | POST `/api/defects` with only `title` | 400; message names the missing field(s) (`location`, `severity`) |
| 3 | Create defect — invalid severity value | POST with `severity: "Super Bad"` | Rejected by Mongoose's enum validation |
| 4 | Create defect — lift snapshot | POST with a real `liftId` | 201; `liftCode` is copied from the real Lift record |
| 5 | Create defect — liftId doesn't resolve to a real lift | POST with a well-formed but non-existent `liftId` | 400; "Selected lift not found" |
| 6 | Defect number reuse after delete | Create two defects (`DEF-0001`, `DEF-0002`), delete `DEF-0002`, create a third | Third defect reissues `DEF-0002` instead of jumping to `DEF-0003` |
| 7 | Full edit — correct wrong info regardless of status | Move a defect to `In Progress`, then PUT new `title`/`location`/`severity` | 200; all three fields update, `status` is unaffected by the unrelated field edit |
| 8 | Full edit — reject empty title | PUT `title: "   "` | 400; message references the title |
| 9 | Full edit — unknown id | PUT a well-formed but non-existent id | 404 |
| 10 | Status transition — normal forward path | Open → In Progress → Resolved → Closed, one PUT per step | Each step 200; `resolvedDate` gets set the moment status first reaches `Resolved` |
| 11 | Status transition — skip a step | PUT `status: "Resolved"` directly from `Open` | 400; message names the current status and disallows the jump |
| 12 | Status transition — reopen from Closed | Walk a defect to `Closed`, then PUT `status: "Open"` | 200; reopening is allowed (unlike other forward-only jumps) |
| 13 | Delete defect | DELETE an existing defect, then GET the same id | DELETE 200; subsequent GET 404 |
| 14 | Delete — unknown id | DELETE a well-formed but non-existent id | 404 |
| 15 | List — multi-status filter | Create two defects, move one to `In Progress`, GET with `?status=Open,In Progress` | 200; both returned (tests the comma-separated multi-select filter) |
| 16 | List — search | GET `?q=<defectNo>` | 200; only the matching defect returned |
| 17 | Stats — counts and critical flag | Create a `Critical` defect and a normal one, move the critical one to `In Progress`, GET `/api/defects/stats` | 200; `total`, `open`, `inProgress`, `criticalOpen` all reflect the correct counts |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 18 | Create a defect via the UI form without picking a severity | Inline required-field error shown, no request sent |
| 19 | Click "Edit" on an existing defect and change the title/location | Form pre-fills with the existing values; saving updates the same record (not a duplicate) |
| 20 | Try to jump a defect's status past what the UI offers | Status dropdown in the edit form only lists the valid next step(s), matching the backend's transition rules |
| 21 | Delete a defect, confirm the dialog | Row disappears from the grid immediately after confirming; cancelling the dialog leaves the row untouched |
| 22 | Filter the list by status and severity together | Only rows matching both filters are shown |
| 23 | Search for a defect by lift code | Matches even though `liftCode` isn't a visibly separate filter field |