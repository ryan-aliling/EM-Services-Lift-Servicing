# Scheduling Feature (Frontend)

MUI-based UI for spot-check scheduling, mounted on the "Scheduling" tab (`Workspace.jsx`).

| File | Purpose |
| --- | --- |
| `SchedulingPage.jsx` | Main page — stat tiles, search/status/date filters, DataGrid, wires up the dialogs below. Mirrors `features/lifts/Lifts.jsx`'s structure. |
| `ScheduleFormDialog.jsx` | Create/edit dialog — formik + yup validation, lift linking (`LiftSelect`), AI draft notes, photo/audio attachments. |
| `ScheduleDetailsModal.jsx` | Read-only detail view — status stepper, attachments, "Generate PDF". |
| `StatusStepper.jsx` | MUI `Stepper` showing progress through the workflow. |
| `generateSchedulePdf.js` | Builds and downloads a one-page PDF record via `jspdf`. |
| `scheduleCsvColumns.js` | Column defs for the shared `exportToCSV` util. |

API calls live in `frontend/src/api/scheduleApi.js` (shared location alongside the other features' API modules); shared status enum/helpers live in `frontend/src/utils/scheduleHelpers.js`.

Full guide (design decisions, cross-feature integration notes, deviations): [`design/Aeric/SCHEDULING-MODULE.md`](../../../../design/Aeric/SCHEDULING-MODULE.md)

Owner: Aeric
