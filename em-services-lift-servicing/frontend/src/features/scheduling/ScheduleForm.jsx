import { useEffect, useState } from 'react';

// Single combined form for both create and edit — client feedback: "combine
// pages", don't make staff click through separate screens for one task.
const EMPTY_FORM = {
  townCouncil: '',
  liftCompany: '',
  blockAddress: '',
  scheduledDate: '',
  assignedInspector: '',
  notes: '',
};

export default function ScheduleForm({ initialValue, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialValue) {
      setForm({
        townCouncil: initialValue.townCouncil || '',
        liftCompany: initialValue.liftCompany || '',
        blockAddress: initialValue.blockAddress || '',
        scheduledDate: initialValue.scheduledDate ? initialValue.scheduledDate.slice(0, 10) : '',
        assignedInspector: initialValue.assignedInspector || '',
        notes: initialValue.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [initialValue]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.townCouncil || !form.liftCompany || !form.blockAddress || !form.scheduledDate) {
      setError('Town Council, Lift Company, Block/Lift Address and Scheduled Date are required.');
      return;
    }

    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <h2>{initialValue ? 'Edit Schedule' : 'New Spot-Check Schedule'}</h2>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-grid">
        <label>
          Town Council *
          <input
            value={form.townCouncil}
            onChange={handleChange('townCouncil')}
            placeholder="e.g. Tampines Town Council"
          />
        </label>

        <label>
          Lift Company *
          <input
            value={form.liftCompany}
            onChange={handleChange('liftCompany')}
            placeholder="e.g. ABC Lifts Pte Ltd"
          />
        </label>

        <label>
          Block / Lift Address *
          <input
            value={form.blockAddress}
            onChange={handleChange('blockAddress')}
            placeholder="e.g. Blk 201 Tampines St 21"
          />
        </label>

        <label>
          Scheduled Date *
          <input type="date" value={form.scheduledDate} onChange={handleChange('scheduledDate')} />
        </label>

        <label>
          Assigned Inspector
          <input
            value={form.assignedInspector}
            onChange={handleChange('assignedInspector')}
            placeholder="Optional"
          />
        </label>

        <label className="form-grid__full">
          Notes
          <textarea value={form.notes} onChange={handleChange('notes')} rows={2} placeholder="Optional" />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {initialValue ? 'Save Changes' : 'Create Schedule'}
        </button>
        {initialValue && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}
