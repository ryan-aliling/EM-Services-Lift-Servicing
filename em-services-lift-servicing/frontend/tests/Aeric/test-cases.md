# Frontend Test Cases — Scheduling

Feature owner: Aeric
Automated in: `placeholder.test.js` (CSV export utility) and `StatusStepper.test.jsx` (component render), using Vitest + Testing Library / jsdom.

Run with: `npm run test:aeric` (see `frontend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | CSV export — empty list | Call `schedulesToCsv([])` | Returns the header row only |
| 2 | CSV export — single row | Call `schedulesToCsv([...])` with one schedule | Returns header + one row, `scheduledDate` formatted as `YYYY-MM-DD` |
| 3 | CSV export — value with a comma | Include a `blockAddress` containing a comma | That field is wrapped in double quotes in the output |
| 4 | Status stepper — mid-flow status | Render `<StatusStepper status="In Progress" />` | Steps before it are marked "done", the current step is marked "current", later steps are "pending" |
| 5 | Status stepper — cancelled | Render `<StatusStepper status="Cancelled" />` | Renders a single "Cancelled" pill, not the 4-step tracker |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 6 | Submit the schedule form with a field missing | Inline validation error shown; no network request fires |
| 7 | Edit an existing schedule from the list ("Edit" button) | Form pre-fills with that schedule's values; "Save Changes" updates it in place |
| 8 | Click "Mark Assigned" / "Mark In Progress" / "Mark Completed" on a row | Status advances one step at a time; button disappears once `Completed` |
| 9 | Click "Cancel" on a row | Confirms with the user, then the row's status becomes `Cancelled` (soft-deleted server-side, hidden once filtered) |
| 10 | Filter list by status + date together, then click "Export CSV" | Downloaded file only contains the rows currently shown in the filtered list |
