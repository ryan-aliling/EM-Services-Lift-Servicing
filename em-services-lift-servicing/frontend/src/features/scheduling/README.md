# Scheduling Feature (Frontend)

MUI-based UI for spot-check scheduling. Its CRUD/API stays separate, but the
page it's mounted on is now the Scheduling step of the Lift Workflow tab
(`features/lift-workflow/steps/SchedulingStep.jsx`), not a standalone tab.

| File | Purpose |
| --- | --- |
| `ScheduleFormDialog.jsx` | Create/edit dialog — formik + yup validation, lift linking (`LiftSelect`). |
| `ScheduleDetailsModal.jsx` | Read-only detail view — status stepper, "Generate PDF". |
| `StatusStepper.jsx` | MUI `Stepper` showing progress through the workflow. |
| `generateSchedulePdf.js` | Builds and downloads a one-page PDF record via `jspdf`. |
| `scheduleCsvColumns.js` | Column defs for the shared `exportToCSV`/`csvImport` utils. |

Photo/audio attachments were removed (dead feature — the backend model/controller never persisted them after the RBAC rewrite dropped the field).

API calls live in `frontend/src/api/scheduleApi.js` (shared location alongside the other features' API modules); shared status enum/helpers live in `frontend/src/utils/scheduleHelpers.js`.

Full guide (design decisions, cross-feature integration notes, deviations): [`design/Aeric/SCHEDULING-MODULE.md`](../../../../design/Aeric/SCHEDULING-MODULE.md)

Owner: Aeric
