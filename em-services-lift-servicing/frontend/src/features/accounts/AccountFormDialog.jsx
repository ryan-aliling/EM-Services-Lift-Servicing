import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { ROLES } from '../../utils/roles';

const EMPTY = { name: '', email: '', password: '', role: ROLES.STAFF };

// Which roles the current caller is allowed to hand out - purely a UX narrowing (the
// backend re-enforces the same Master->Admin/Staff, Admin->Staff-only rule server-side
// regardless of what this dialog offers, see backend/src/controllers/auth/authController.js).
function assignableRoles(callerRole) {
  return callerRole === ROLES.MASTER ? [ROLES.ADMIN, ROLES.STAFF] : [ROLES.STAFF];
}

export default function AccountFormDialog({ open, callerRole, onClose, onSubmit }) {
  const [values, setValues] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setValues({ ...EMPTY, role: assignableRoles(callerRole)[0] });
  }, [open, callerRole]);

  const handleChange = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create Account</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="Name" value={values.name} onChange={handleChange('name')} required fullWidth />
            <TextField
              label="Email"
              type="email"
              value={values.email}
              onChange={handleChange('email')}
              required
              fullWidth
            />
            <TextField
              label="Temporary Password"
              type="password"
              value={values.password}
              onChange={handleChange('password')}
              required
              fullWidth
            />
            <TextField select label="Role" value={values.role} onChange={handleChange('role')} fullWidth>
              {assignableRoles(callerRole).map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Create
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
