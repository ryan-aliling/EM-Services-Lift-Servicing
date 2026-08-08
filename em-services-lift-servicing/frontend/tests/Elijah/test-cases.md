# Frontend Test Cases — Defect Management

Feature owner: Elijah
Automated in: `defectHelpers.test.js` (severity/status enums + transition map), `defectCsvColumns.test.js` (CSV column mapping), `DefectFormDialog.test.jsx` (component render/validation) — using Vitest + Testing Library / jsdom.

Run with: `npm run test:elijah` (see `frontend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | `DEFECT_SEVERITIES` — matches backend enum | Compare the exported array | Equals `['Minor', 'Major', 'Critical']`, the same values as the `Defect` model |
| 2 | `DEFECT_STATUSES` — matches backend enum | Compare the exported array | Equals `['Open', 'In Progress', 'Resolved', 'Closed']` |
| 3 | `DEFECT_NEXT_STATUSES` — forward path | Check each non-terminal status | `Open → In Progress → Resolved → Closed` |
| 4 | `DEFECT_NEXT_STATUSES` — reopen path | Check `Closed` | Only next step is `Open` (defects are always reopenable, unlike Scheduling's terminal statuses) |
| 5 | `DEFECT_NEXT_STATUSES` — no illegal jumps | Check `Open` | Does not include `Resolved` (can't skip `In Progress`) |
| 6 | `DEFECT_NEXT_STATUSES` — every status covered | Check all 4 statuses | Each has a defined (possibly single-item) array of next steps |
| 7 | CSV columns — field mapping | Map a sample defect through `DEFECT_CSV_COLUMNS` | Each labeled column returns the expected value |
| 8 | CSV columns — date formatting | Map `reportedDate` | Returns the display format, not a raw ISO timestamp |
| 9 | CSV columns — missing optional fields | `liftCode`/`reportedBy`/`description` undefined | All three columns fall back to `''` rather than `undefined` |
| 10 | Form dialog — create mode title & fields | Render `<DefectFormDialog defect={null} />` | Title reads "Log Defect"; no Status field renders (a new defect always starts `Open`) |
| 11 | Form dialog — required-field validation | Render create mode, click "Log Defect" with all fields empty | Inline errors for Title/Location/Severity appear; `onSubmit` is never called |
| 12 | Form dialog — edit mode title & fields | Render `<DefectFormDialog defect={sampleDefect} />` | Title reads "Edit Defect DEF-0007"; a Status field is present |
| 13 | Form dialog — edit mode pre-fills values | Render edit mode with a sample defect | Title/Location/Reported By inputs show the existing values, not blank |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 14 | Fill in Title, Location, Severity and submit "Log Defect" | New row appears at the top of the grid with a system-assigned `DEF-xxxx` number and status `Open` |
| 15 | Pick a lift in the "Lift (optional)" field, then save | Defect's Lift column shows that lift's code; leaving it unset still saves fine using only the free-text Location |
| 16 | Edit a defect and change its Status dropdown | Dropdown only offers the current status ("no change") plus its valid next step(s) — e.g. from `Open` only `In Progress`/`Closed` are selectable, never `Resolved` directly |
| 17 | Advance a defect to `Resolved`, then reopen it to `In Progress` and `Resolved` again | `resolvedDate` is stamped the first time and does not change on the second `Resolved`, even after being reopened in between |
| 18 | Edit a `Closed` defect's Title/Description | Edit succeeds — unlike inspection reports, editing is not locked by status |
| 19 | Clear the Title field to blank text on an existing defect and save | Save is rejected with "Title cannot be empty" rather than silently clearing it |
| 20 | Click delete on a row, confirm in the dialog | Row disappears immediately; note this is a **hard** delete (no soft-delete/undo), unlike Scheduling |
| 21 | Search by defect number, title, location, and lift code (one at a time) | Grid narrows to matching rows for each; combining Status + Severity filters with search narrows further |
| 22 | Check the stat cards (Total / Open / In Progress / Resolved) against the visible rows | Counts match what's actually in the collection, independent of the current grid filters |
| 23 | Filter/search the grid, then click "Export CSV" | Downloaded `defects.csv` contains only the rows currently shown in the filtered grid, with all 9 documented columns |
| 24 | Export an empty filtered result | Downloaded file has just the header row, not an error |
| 25 | Log in as a non-Admin/Manager role (once auth exists) | "Log Defect" button and row Edit/Delete actions are hidden; list/search/export remain visible |
