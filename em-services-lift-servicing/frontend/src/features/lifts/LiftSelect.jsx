import { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { fetchLifts } from '../../api/liftApi';

/**
 * Live lift picker shared by Schedule/Inspection/Defect forms so every module links to a real
 * Lift document instead of a hardcoded placeholder ID or free-text lift code.
 */
export default function LiftSelect({ value, onChange, error, helperText, label = 'Lift', disabled }) {
  const [lifts, setLifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLifts()
      .then(setLifts)
      .finally(() => setLoading(false));
  }, []);

  const selected = lifts.find((l) => l._id === value) || null;

  return (
    <Autocomplete
      options={lifts}
      loading={loading}
      disabled={disabled}
      value={selected}
      getOptionLabel={(lift) => `${lift.liftCode} — Blk ${lift.block}, ${lift.unit}`}
      isOptionEqualToValue={(option, val) => option._id === val._id}
      onChange={(_e, newValue) => onChange(newValue ? newValue._id : '')}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  );
}
