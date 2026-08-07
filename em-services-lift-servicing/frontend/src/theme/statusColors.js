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

// Placeholder maps below: the Inspections/Defects/Rectifications modules
// (backend/src/{routes,controllers,models}/...) aren't built yet, so their real status
// enums don't exist. StatusChip falls back to a gray "default" chip for any value not
// listed here, so these are safe placeholders to refine once each module lands.

export const INSPECTION_STATUS_COLORS = {
  Pass: 'success',
  Fail: 'error',
  Pending: 'warning',
};

export const DEFECT_STATUS_COLORS = {
  Open: 'error',
  'In Progress': 'warning',
  Resolved: 'success',
};

export const RECTIFICATION_STATUS_COLORS = {
  Pending: 'warning',
  Completed: 'success',
};
