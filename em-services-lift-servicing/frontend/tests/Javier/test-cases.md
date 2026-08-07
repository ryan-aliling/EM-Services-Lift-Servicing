# Frontend Test Cases — Inspections

Feature owner: Javier
Automated in: `inspectionHelpers.test.js` (business-rule logic), `ChecklistEditor.test.jsx` (component render) — using Vitest + Testing Library / jsdom.

Run with: `npm run test:javier` (see `frontend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | `canEditReport` — Draft | Status `Draft` | Returns `true` |
| 2 | `canEditReport` — Submitted/Under Review/Closed | Each non-Draft status | Returns `false` |
| 3 | `canDeleteReport` — Draft | Status `Draft` | Returns `true` |
| 4 | `canDeleteReport` — Submitted | Status `Submitted` | Returns `false` (kept for audit) |
| 5 | `deriveCompliance` — no defects | Empty `defects` array | Returns `"Pass"` |
| 6 | `deriveCompliance` — at least one defect | Non-empty `defects` array | Returns `"Defect Found"` |
| 7 | `hasFailedChecklistItem` — all Pass/N-A | No item has `result: 'Fail'` | Returns `false` |
| 8 | `hasFailedChecklistItem` — one Fail | At least one item has `result: 'Fail'` | Returns `true` |
| 9 | `buildDefaultChecklist` — maps item names | Pass an array of item name strings | Each maps to `{ item, result: 'N/A', remarks: '' }` |
| 10 | ChecklistEditor — renders items | Render with a 2-item checklist | Both item labels appear |
| 11 | ChecklistEditor — "All Pass" | Click the "All Pass" button | `onChange` fires with every item's `result` set to `'Pass'` |
| 12 | ChecklistEditor — "All Fail" | Click the "All Fail" button | `onChange` fires with every item's `result` set to `'Fail'` |
| 13 | ChecklistEditor — read-only mode | Render with `readOnly` | The "All Pass"/"All Fail" buttons are not rendered |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 14 | Submit the inspection dialog with no lift selected | Formik/yup inline error shown on the lift field; no request sent |
| 15 | Pick a lift in the "Lift" field | `ScheduleSelect` becomes enabled and filters to that lift's scheduled visits |
| 16 | Change the selected lift after already picking a schedule | The previously-picked schedule is cleared (it belonged to the old lift) |
| 17 | Mark a checklist item "Fail" | A blank, editable defect row appears immediately — no extra click needed |
| 18 | Try to type a defect description while every checklist item is Pass/N-A | Inputs are disabled with an explanatory hint |
| 19 | Try to set an inspection date after today | Blocked both by the date picker's `max` and by an inline validation error on submit |
| 20 | Edit a Draft report, save, then change its status to Submitted and try editing again | Edit/Delete icons in the table become disabled once it's no longer Draft |
| 21 | Upload a defect photo, click its thumbnail | Opens a full-size lightbox overlay |
| 22 | Click the small "×" on the photo thumbnail | Removes only the photo (defect description/severity untouched); this is a separate control from the defect's own "remove entire defect" button |
| 23 | Select multiple values in the status filter (e.g. Draft + Submitted) | List shows reports matching either status |
| 24 | Type in the search box | The box visibly widens while focused/non-empty so long queries stay readable |
| 25 | Toggle ascending/descending next to the sort dropdown | List re-orders; the arrow icon flips direction |
| 26 | Click "View" on a report | Opens as a full-width page within the tab, not a popup dialog |
| 27 | Toggle dark mode (top-right icon) while viewing the checklist/defects sections | Backgrounds/borders adapt to dark mode instead of showing a hardcoded light-gray box |
| 28 | Click "Export" with the list filtered | Downloaded CSV contains only the filtered rows, correct headers |
