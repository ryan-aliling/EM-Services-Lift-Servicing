import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrMaster } from '../../utils/roles';

/**
 * EM staff's endorsement action on a Submitted rectification, after the joint on-site
 * inspection confirms the fix. Only ever rendered for a "Submitted" record, and now gated
 * to Admin/Master (the backend's PATCH /:id/endorse rejects a Staff caller regardless -
 * see requireRole('Admin','Master') on rectificationsRoutes.js - but this keeps the button
 * from even appearing for a role that can never use it).
 */
export default function EndorseButton({ rectification, onEndorse }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [endorsedBy, setEndorsedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (rectification.status !== 'Submitted') return null;
  if (!isAdminOrMaster(user.role)) return null;

  async function handleConfirm() {
    if (!endorsedBy.trim()) return;
    setSubmitting(true);
    try {
      await onEndorse(rectification._id, endorsedBy.trim());
      enqueueSnackbar('Rectification endorsed', { variant: 'success' });
      setOpen(false);
      setEndorsedBy('');
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to endorse rectification', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="contained" color="success" startIcon={<VerifiedOutlinedIcon />} onClick={() => setOpen(true)}>
        Endorse
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Endorse Rectification</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Endorsed By"
            placeholder="Your name"
            value={endorsedBy}
            onChange={(e) => setEndorsedBy(e.target.value)}
            sx={{ mt: 1 }}
            helperText="Confirms the joint on-site inspection verified the fix"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirm} disabled={submitting || !endorsedBy.trim()}>
            Confirm Endorsement
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
