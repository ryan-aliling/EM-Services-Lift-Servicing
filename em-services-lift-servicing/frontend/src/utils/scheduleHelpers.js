// Mirrors liftHelpers.js's pattern for the Scheduling feature — keeps the
// status enum and derived-status logic in one place shared by the form,
// grid, and stat tiles.
export const SCHEDULE_STATUSES = ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

// One-click "advance to the next step" so staff don't have to open the edit
// dialog just to move a job along the workflow.
export const NEXT_STATUS = {
  Scheduled: 'Assigned',
  Assigned: 'In Progress',
  'In Progress': 'Completed',
};

export function isOverdue(schedule) {
  if (schedule.status === 'Completed' || schedule.status === 'Cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(schedule.scheduledDate) < today;
}
