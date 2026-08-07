# Frontend Test Cases — Scheduling

Feature owner: Aeric
Automated in: `scheduleHelpers.test.js` (status/overdue logic), `scheduleCsvColumns.test.js` (CSV column mapping), `StatusStepper.test.jsx` (component render) — using Vitest + Testing Library / jsdom.

Run with: `npm run test:aeric` (see `frontend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | `isOverdue` — open schedule past its date | Status `Scheduled`, date in the past | Returns `true` |
| 2 | `isOverdue` — Completed schedule past its date | Status `Completed`, date in the past | Returns `false` (terminal, never "overdue") |
| 3 | `isOverdue` — Cancelled schedule past its date | Status `Cancelled`, date in the past | Returns `false` |
| 4 | `isOverdue` — future schedule | Date in the future | Returns `false` |
| 5 | `NEXT_STATUS` — forward path | Check each non-terminal status | `Scheduled → Assigned → In Progress → Completed` |
| 6 | `NEXT_STATUS` — terminal statuses | Check `Completed`/`Cancelled` | No next step defined (`undefined`) |
| 7 | `SCHEDULE_STATUSES` — matches backend enum | Compare the exported array | Equals the 5 values in the Schedule model |
| 8 | CSV columns — field mapping | Map a sample schedule through `SCHEDULE_CSV_COLUMNS` | Each labeled column returns the expected value |
| 9 | CSV columns — date formatting | Map `scheduledDate` | Returns the display format (`DD MMM YYYY`), not a raw ISO timestamp |
| 10 | CSV columns — missing optional fields | `assignedInspector`/`notes` undefined | Both columns fall back to `''` rather than `undefined` |
| 11 | Status stepper — Scheduled | Render `<StatusStepper status="Scheduled" />` | All 4 step labels (Scheduled/Assigned/In Progress/Completed) render |
| 12 | Status stepper — Cancelled | Render `<StatusStepper status="Cancelled" />` | Renders a single "Cancelled" chip; none of the 4 step labels render |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 13 | Submit the schedule dialog with a field missing | Formik/yup inline validation error shown; no network request fires |
| 14 | Pick a lift from "Link to a Lift" in the schedule dialog | Block/Lift Address auto-fills from the selected lift; falls back to manual entry if no lift directory is available yet |
| 15 | Click "Generate Draft from AI" with Block/Lift Address filled in | Notes field populates with a templated draft the staff member can still edit |
| 16 | Attach a photo/audio file, then remove it before saving | File uploads via the shared presigned-upload flow; removing it clears it from the dialog and the saved record |
| 17 | Click the forward-arrow action on a grid row | Status advances one step (e.g. Scheduled → Assigned) without opening the edit dialog |
| 18 | Click "Cancel" (delete) on a row | `ConfirmDialog` appears; confirming soft-deletes the schedule (hidden from the grid, not gone from the DB) |
| 19 | Filter by search + status + date together, then "Export CSV" | Downloaded file only contains the rows currently shown in the filtered grid |
| 20 | Open a lift's detail dialog (Lifts tab) → Schedules tab | Shows that lift's own spot-check schedules with the correct block/company/date fields |
| 21 | "View" a schedule, then "Generate PDF" | Downloads a one-page PDF with the schedule's fields and a signature block |
