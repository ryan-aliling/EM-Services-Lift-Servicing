import { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { fetchSchedules } from '../../api/scheduleApi';
import { formatDate } from '../../utils/formatDate';

// Lets an inspection optionally link back to the scheduled visit it followed up
// on (Lift -> Schedule -> Inspection, per the client's workflow). Deliberately
// optional: an inspector should still be able to log an ad-hoc/walk-in check
// with no prior schedule entry, so this never blocks report creation.
export default function ScheduleSelect({ liftId, value, onChange, disabled }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules()
      .then(setSchedules)
      // Scheduling might not be reachable / liftId might not match anything yet -
      // degrade to "no schedule found" rather than blocking the form.
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, []);

  const relevant = liftId ? schedules.filter((s) => s.liftId === liftId) : [];
  const selected = relevant.find((s) => s._id === value) || null;

  return (
    <Autocomplete
      options={relevant}
      loading={loading}
      disabled={disabled || !liftId}
      value={selected}
      getOptionLabel={(s) => `${formatDate(s.scheduledDate)} — ${s.status}${s.assignedInspector ? ` (${s.assignedInspector})` : ''}`}
      isOptionEqualToValue={(option, val) => option._id === val._id}
      onChange={(_e, newValue) => onChange(newValue ? newValue._id : null)}
      noOptionsText={liftId ? 'No scheduled visits found for this lift' : 'Select a lift first'}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Linked Schedule (optional)"
          helperText="Leave blank for an ad-hoc/walk-in inspection with no prior schedule entry"
        />
      )}
    />
  );
}
