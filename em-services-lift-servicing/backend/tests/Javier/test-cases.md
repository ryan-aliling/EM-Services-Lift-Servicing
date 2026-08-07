# Backend Test Cases — Inspections

Feature owner: Javier
Automated in: `placeholder.test.js` (Jest + Supertest, against an in-memory MongoDB via `mongodb-memory-server` — no real Atlas connection needed to run these).

Run with: `npm run test:javier` (see `backend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Create report — happy path | POST `/api/inspections` with a real `liftId` + required fields | 201; `reportNo` is `INSP-0001`, `overallStatus` defaults to `Draft`, `compliance` defaults to `Pass`, `liftCode`/`block` are copied from the real Lift record |
| 2 | Create report — missing required field | POST `/api/inspections` with only `inspectorName` | 400; message names the missing field(s) (`liftId`) |
| 3 | Create report — liftId doesn't resolve to a real lift | POST with a well-formed but non-existent `liftId` | 400; "Selected lift not found" |
| 4 | Create report — future inspection date | POST with `inspectionDate: '2099-01-01'` | 400; message names the date-in-future rule |
| 5 | Create report — compliance derivation | POST with a `defects` array containing one entry | 201; `compliance` is `"Defect Found"`, not `"Pass"` |
| 6 | Report number reuse after delete | Create two reports (`INSP-0001`, `INSP-0002`), delete `INSP-0002`, create a third | Third report reissues `INSP-0002` instead of jumping to `INSP-0003` |
| 7 | Edit lock — Draft report | PUT a Draft report's `notes` | 200; update applied |
| 8 | Edit lock — Submitted report | PUT `overallStatus: 'Submitted'`, then try another PUT | Second PUT returns 400; message states the report has already been submitted |
| 9 | Delete rule — Draft report | DELETE a Draft report | 200 |
| 10 | Delete rule — non-Draft report | Submit a report, then DELETE it | 400; message references keeping submitted reports for audit purposes |
| 11 | Delete rule — unknown id | DELETE a well-formed but non-existent id | 404 |
| 12 | List — multi-status filter | Create a Draft and a Submitted report, GET with `?status=Draft,Submitted` | 200; both are returned (tests the comma-separated multi-select filter) |
| 13 | List — search | GET `?q=<reportNo>` | 200; only the matching report is returned |
| 14 | Notify contractor — no defects logged | PATCH `/api/inspections/:id/notify-contractor` on a report with an empty `defects` array | 400; "No defects logged on this report..." |
| 15 | Notify contractor — happy path | PATCH on a report with at least one defect | 200; `overallStatus` becomes `Under Review`, `contractorNotifiedAt` is set, each `Open` defect flips to `Acknowledged` |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 16 | Create a report via the UI form without picking a lift | `LiftSelect` shows a required-field error; no request sent |
| 17 | Mark a checklist item "Fail" in the form | A blank defect row appears automatically, ready to type into |
| 18 | Revert that "Fail" back to "Pass"/"N/A" after already typing a defect | The typed defect row is NOT auto-deleted (only auto-added, never auto-removed) |
| 19 | Click "All Pass" / "All Fail" on the checklist | Every row's result updates in one click |
| 20 | Try to type in the Defects section before any checklist item is marked "Fail" | Inputs are disabled with a hint explaining why |
| 21 | Pick a lift, then pick a schedule in "Linked Schedule (optional)" | Only schedules matching the selected lift's `liftId` appear; leaving it blank still allows submission |
| 22 | Upload a defect photo, then click the photo thumbnail | Opens a full-size lightbox view |
| 23 | Click the small "×" on the photo thumbnail (not the defect's own remove button) | Removes only the photo, keeps the defect entry and its description intact |
| 24 | Submit a report, then view it as a full page (not a popup) | Checklist + defects render correctly; "Edit Report" button hidden since it's locked |
| 25 | Export the filtered list to CSV | Downloaded file matches exactly the rows currently shown in the table (respects search/status filters) |
