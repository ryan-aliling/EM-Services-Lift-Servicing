import { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { fetchDefects } from '../../api/defectApi';

/**
 * Picker for "which defect is this rectification closing out". Mirrors
 * features/lifts/LiftSelect.jsx's shape exactly: a read-only cross-feature GET against
 * the Defects module's own API (fetchDefects) rather than duplicating any Defect CRUD
 * logic here.
 */
export default function DefectSelect({ value, onChange, error, helperText, disabled, liftId }) {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDefects()
      // Degrade to an empty picker rather than an unhandled rejection if defects can't
      // be reached for any reason - same defensive fallback as LiftSelect.
      .then(setDefects)
      .catch(() => setDefects([]))
      .finally(() => setLoading(false));
  }, []);

  // Optional scoping for the Lift Workflow page's Rectifications step - when a liftId is
  // passed, only offer defects logged against that lift instead of the whole directory.
  const options = liftId ? defects.filter((d) => d.liftId === liftId) : defects;

  const selected = defects.find((d) => d._id === value) || null;

  return (
    <Autocomplete
      options={options}
      loading={loading}
      disabled={disabled}
      value={selected}
      getOptionLabel={(defect) => `${defect.defectNo} — ${defect.title}`}
      isOptionEqualToValue={(option, val) => option._id === val._id}
      onChange={(_e, newValue) => onChange(newValue ? newValue._id : '')}
      renderInput={(params) => (
        <TextField {...params} label="Defect" placeholder="Search by defect no. or title" error={error} helperText={helperText} />
      )}
    />
  );
}
