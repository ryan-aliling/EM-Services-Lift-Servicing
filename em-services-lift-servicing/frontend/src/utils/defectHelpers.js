export const DEFECT_SEVERITIES = ['Minor', 'Major', 'Critical'];
export const DEFECT_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

// Mirrors VALID_TRANSITIONS in backend/src/controllers/defects/defectController.js -
// keep these in sync. Used to only offer valid next steps in the edit form's status
// dropdown, so the UI can't even attempt a transition the backend would reject.
export const DEFECT_NEXT_STATUSES = {
  Open: ['In Progress', 'Closed'],
  'In Progress': ['Resolved', 'Open'],
  Resolved: ['Closed', 'In Progress'],
  Closed: ['Open'],
};