import { useCallback, useEffect, useState } from 'react';
import ScheduleForm from './ScheduleForm';
import ScheduleList from './ScheduleList';
import { createSchedule, deleteSchedule, fetchSchedules, updateSchedule } from './api';
import { downloadCsv, schedulesToCsv } from './exportCsv';
import './scheduling.css';

// Root component for the Scheduling tab (mounted from Workspace.jsx).
export default function SchedulingPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const data = await fetchSchedules(params);
      setSchedules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  async function handleCreateOrUpdate(form) {
    setSubmitting(true);
    try {
      if (editing) {
        await updateSchedule(editing._id, form);
      } else {
        await createSchedule(form);
      }
      setEditing(null);
      await loadSchedules();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdvanceStatus(schedule, nextStatus) {
    try {
      await updateSchedule(schedule._id, { status: nextStatus });
      await loadSchedules();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(schedule) {
    if (!window.confirm(`Cancel the spot-check for ${schedule.blockAddress}?`)) return;
    try {
      await deleteSchedule(schedule._id);
      await loadSchedules();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`schedules-${today}.csv`, schedulesToCsv(schedules));
  }

  return (
    <div className="scheduling-page">
      <ScheduleForm
        initialValue={editing}
        onSubmit={handleCreateOrUpdate}
        onCancel={() => setEditing(null)}
        submitting={submitting}
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <ScheduleList
        schedules={schedules}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        onAdvanceStatus={handleAdvanceStatus}
        onEdit={setEditing}
        onDelete={handleDelete}
        onExport={handleExport}
      />
    </div>
  );
}
