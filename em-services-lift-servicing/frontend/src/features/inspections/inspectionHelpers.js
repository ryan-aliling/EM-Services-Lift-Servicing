// Shared pure-logic helpers for the Inspections feature (Javier). Extracted out of
// InspectionFormDialog/DefectEditor/Inspections.jsx so the business rules can be unit
// tested without rendering any components - mirrors backend/src/controllers/inspections
// (see inspectionController.js for the server-side equivalents of deriveCompliance/etc.,
// duplicated deliberately since the frontend can't import backend code, but kept in sync).

// A report is only "Draft" while nothing has been submitted yet - once it leaves Draft it's
// locked for audit purposes (client feedback: "shouldn't be able to edit after submitting").
export function canEditReport(overallStatus) {
  return overallStatus === 'Draft';
}

export function canDeleteReport(overallStatus) {
  return overallStatus === 'Draft';
}

// Compliance is derived from whether any defects were logged, not set independently -
// there's no "Pass with defects" state.
export function deriveCompliance(defects = []) {
  return defects.length > 0 ? 'Defect Found' : 'Pass';
}

// Drives the "auto-unlock defect entry" rule: the defect section should only accept input
// once at least one checklist item has failed (client feedback: "if all pass, I shouldn't be
// able to type in the defect").
export function hasFailedChecklistItem(checklist = []) {
  return checklist.some((item) => item.result === 'Fail');
}

export function buildDefaultChecklist(items = []) {
  return items.map((item) => ({ item, result: 'N/A', remarks: '' }));
}
