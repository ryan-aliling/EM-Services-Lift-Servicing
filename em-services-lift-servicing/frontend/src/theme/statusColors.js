// Maps each module's status enum to a MUI Chip color, consumed by <StatusChip>.

export const LIFT_STATUS_COLORS = {
  Active: 'success',
  Maintenance: 'warning',
  'Out of Service': 'error',
  Decommissioned: 'default',
};

// Scheduling is now live (backend/src/models/scheduling/Schedule.js) — this
// matches its real STATUS_VALUES enum exactly.
export const SCHEDULE_STATUS_COLORS = {
  Scheduled: 'default',
  Assigned: 'info',
  'In Progress': 'warning',
  Completed: 'success',
  Cancelled: 'default',
};

// Inspections module has landed (backend/src/models/inspections/Inspection.js) - matches
// its real overallStatus enum. `compliance` (Pass / Defect Found) uses its own inline
// colours in Inspections.jsx rather than this map, since it's a separate field.
export const INSPECTION_STATUS_COLORS = {
  Draft: 'default',
  Submitted: 'info',
  'Under Review': 'warning',
  Closed: 'success',
};

export const DEFECT_SEVERITY_COLORS = {
  Minor: 'warning',
  Major: 'warning',
  Critical: 'error',
};

export const DEFECT_COMPLIANCE_COLORS = {
  Pass: 'success',
  'Defect Found': 'error',
};

// Defects module has landed (backend/src/models/defects/Defect.js) - matches its real
// status enum exactly.
export const DEFECT_STATUS_COLORS = {
  Open: 'error',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'default',
};

// Rectifications module has landed (backend/src/models/rectifications/Rectification.js) -
// matches its real status enum exactly (previously Pending/Completed, a placeholder from
// before the module existed).
export const RECTIFICATION_STATUS_COLORS = {
  Draft: 'default',
  Submitted: 'info',
  Endorsed: 'success',
};