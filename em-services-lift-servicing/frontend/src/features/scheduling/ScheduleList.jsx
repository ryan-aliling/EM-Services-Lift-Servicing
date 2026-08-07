import StatusStepper from './StatusStepper';

const STATUS_OPTIONS = ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

// One-click "advance to the next step" so staff don't have to open the edit
// form just to move a job along the workflow.
const NEXT_STATUS = {
  Scheduled: 'Assigned',
  Assigned: 'In Progress',
  'In Progress': 'Completed',
};

function isOverdue(schedule) {
  if (schedule.status === 'Completed' || schedule.status === 'Cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(schedule.scheduledDate) < today;
}

export default function ScheduleList({
  schedules,
  loading,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  onAdvanceStatus,
  onEdit,
  onDelete,
  onExport,
}) {
  return (
    <div className="schedule-list">
      <div className="schedule-list__toolbar">
        <label>
          Status
          <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Date
          <input type="date" value={dateFilter} onChange={(e) => onDateFilterChange(e.target.value)} />
        </label>

        <button type="button" className="btn-secondary" onClick={onExport}>
          Export CSV
        </button>
      </div>

      {loading && <p>Loading schedules…</p>}
      {!loading && schedules.length === 0 && (
        <p className="schedule-list__empty">No schedules match this filter.</p>
      )}

      {!loading && schedules.length > 0 && (
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Town Council</th>
              <th>Lift Company</th>
              <th>Block/Lift Address</th>
              <th>Inspector</th>
              <th>Progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => {
              const overdue = isOverdue(schedule);
              const nextStatus = NEXT_STATUS[schedule.status];

              return (
                <tr key={schedule._id} className={overdue ? 'schedule-row--overdue' : ''}>
                  <td>
                    {new Date(schedule.scheduledDate).toLocaleDateString()}
                    {overdue && (
                      <span className="overdue-badge" title="Past scheduled date, still open">
                        Overdue
                      </span>
                    )}
                  </td>
                  <td>{schedule.townCouncil}</td>
                  <td>{schedule.liftCompany}</td>
                  <td>{schedule.blockAddress}</td>
                  <td>{schedule.assignedInspector || '—'}</td>
                  <td>
                    <StatusStepper status={schedule.status} />
                  </td>
                  <td className="schedule-table__actions">
                    {nextStatus && (
                      <button type="button" onClick={() => onAdvanceStatus(schedule, nextStatus)}>
                        Mark {nextStatus}
                      </button>
                    )}
                    <button type="button" className="btn-secondary" onClick={() => onEdit(schedule)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger" onClick={() => onDelete(schedule)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
