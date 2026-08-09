# Frontend Test Cases — Lift Records

Feature owner: Lucio
Automated in: `liftHelpers.test.js` (service-due / enum logic), `liftCsvImport.test.js`
(CSV → Lift payload mapping) — using Vitest.

Run with: `npm run test:lucio` (see `frontend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | `LIFT_TYPES` matches the backend enum | Compare the exported array | Equals the 3 values in the Lift model |
| 2 | `LIFT_STATUSES` matches the backend enum | Compare the exported array | Equals the 4 values in the Lift model |
| 3 | `isServiceDue` — never serviced | `lastServiced: null` | Returns `true` |
| 4 | `isServiceDue` — recently serviced | `lastServiced` less than 180 days ago | Returns `false` |
| 5 | `isServiceDue` — exactly at the boundary | `lastServiced` exactly 180 days ago | Returns `true` (boundary is inclusive, `>=`) |
| 6 | `isServiceDue` — long overdue | `lastServiced` 210+ days ago | Returns `true` |
| 7 | CSV import — human-readable headers | Parse a CSV using the app's own export/template column labels (`Lift Code`, `Capacity (kg)`, …) | Every column maps to the correct Lift field |
| 8 | CSV import — plain field-name headers | Parse a CSV using raw field names (`liftCode`, `capacity`, …) | Same mapping works, case/spacing-insensitive |
| 9 | CSV import — capacity is numeric | Parse a row with `Capacity: 500` | `payload.capacity` is `500` (number), not `"500"` (string) |
| 10 | CSV import — blank cells omitted | Parse a row with an empty `Manufacturer` cell | `manufacturer` key is absent from the payload rather than `''`, so it doesn't overwrite model defaults |
| 11 | CSV import — unrecognised columns ignored | Parse a CSV with an extra unknown column | That column is silently dropped; no error |
| 12 | CSV import — header-only file | Parse a CSV with just the header row | Returns `[]`, not an error |
| 13 | CSV import — quoted field with embedded comma | Parse `"Otis, Singapore"` as a manufacturer value | Comma inside quotes is preserved, not treated as a column break |
| 14 | CSV import — multiple data rows | Parse a CSV with 2 data rows | Returns 2 payload objects, in file order |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 15 | Open the Lifts tab as Admin/Master and click "Add Lift" | Form dialog opens with `type: Passenger` and `status: Active` pre-filled; submitting with a required field blank shows an inline Formik/yup error and fires no request |
| 16 | Edit an existing lift's `liftCode` to one already in use | Snackbar shows `Lift code "X" already exists`; dialog stays open with the attempted value still in the field |
| 17 | Set a lift's "Last Serviced" date to 200+ days ago, then view the grid | The row shows a warning-amber icon with a "Service overdue (180+ days)" tooltip next to the date |
| 18 | Search/filter by status + type + free text together, then click "Export CSV" | Downloaded file only contains the rows currently shown in the filtered grid |
| 19 | Click "Download the CSV template", edit it, then "Import CSV" | Every valid row is created; a summary dialog reports "Imported N of M lift(s)" with per-row failure reasons for any bad rows |
| 20 | Select a non-`.csv` file via "Import CSV" | Rejected client-side with a "only .csv files are supported" snackbar; no request is sent |
| 21 | Click "View history" on a lift row | `LiftDetailDialog` opens with 4 tabs (Schedules/Inspections/Defects/Rectifications), each tab's count badge matching its actual record count |
| 22 | Log in as Staff and open the Lifts tab | "Add Lift", "Import CSV", and per-row Edit/Delete actions are all hidden; search/filter, "View history", and "Export CSV" remain usable |
| 23 | Delete a lift as Admin/Master, then reopen the Lifts tab | The deleted lift no longer appears in the list, stats, or search — even though it isn't gone from the database (soft delete) |
