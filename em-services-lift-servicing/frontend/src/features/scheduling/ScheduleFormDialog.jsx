import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import LiftSelect from '../lifts/LiftSelect';
import { generateDraftNotes } from '../../api/scheduleApi';
import { useFileUpload } from '../../hooks/useFileUpload';
import { SCHEDULE_STATUSES } from '../../utils/scheduleHelpers';

const emptySchedule = {
  townCouncil: '',
  liftCompany: '',
  blockAddress: '',
  scheduledDate: '',
  assignedInspector: '',
  notes: '',
  status: 'Scheduled',
  liftId: '',
  attachments: [],
};

// Client-side gate before we ever call the shared upload hook — the presign
// endpoint has no file-type/size checks of its own, so this is the only
// guard in place today. Limits are generous enough for a phone photo or a
// short voice note while keeping uploads fast on a mobile connection.
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/x-m4a',
];

const schema = Yup.object({
  townCouncil: Yup.string().trim().required('Town council is required'),
  liftCompany: Yup.string().trim().required('Lift company is required'),
  blockAddress: Yup.string().trim().required('Block/Lift address is required'),
  scheduledDate: Yup.date().typeError('Enter a valid date').required('Scheduled date is required'),
  status: Yup.string().oneOf(SCHEDULE_STATUSES).required(),
  assignedInspector: Yup.string(),
  notes: Yup.string(),
});

export default function ScheduleFormDialog({ open, schedule, onClose, onSubmit, initialLiftId }) {
  const [draftLoading, setDraftLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const { uploadFile, uploading, progress, error: uploadError } = useFileUpload();

  // initialLiftId is only ever consulted for a fresh record (no `schedule`) — e.g. the
  // Lift Workflow page's Scheduling step opens this dialog pre-linked to whichever lift
  // is currently selected, and locks the picker below so that link can't drift mid-flow.
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: schedule
      ? {
          ...emptySchedule,
          ...schedule,
          scheduledDate: schedule.scheduledDate ? schedule.scheduledDate.slice(0, 10) : '',
          liftId: schedule.liftId || '',
          attachments: schedule.attachments || [],
        }
      : { ...emptySchedule, liftId: initialLiftId || '' },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Auto-fills Block/Lift Address from the Lifts module (Student 1's feature)
  // when a lift is picked — one click instead of retyping what's already on
  // record there. LiftSelect degrades to an empty picker (see LiftSelect.jsx)
  // if no lift directory is available yet, so manual entry always still works.
  function handleLiftChange(liftId, lift) {
    formik.setFieldValue('liftId', liftId);
    if (lift) {
      formik.setFieldValue('blockAddress', `Lift ${lift.liftCode} — Blk ${lift.block}`);
    }
  }

  async function handleGenerateDraft() {
    if (!formik.values.blockAddress) {
      setLocalError('Fill in Block/Lift Address before generating a draft.');
      return;
    }

    setDraftLoading(true);
    setLocalError(null);
    try {
      const { notes } = await generateDraftNotes({
        townCouncil: formik.values.townCouncil,
        liftCompany: formik.values.liftCompany,
        blockAddress: formik.values.blockAddress,
        assignedInspector: formik.values.assignedInspector,
      });
      formik.setFieldValue('notes', notes);
    } catch (err) {
      setLocalError(err.response?.data?.message || 'Failed to generate draft');
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setLocalError('Unsupported file type. Allowed: JPG, PNG, WebP, MP3, WAV, M4A.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setLocalError('File is too large — 5MB max per attachment.');
      return;
    }

    setLocalError(null);
    try {
      const url = await uploadFile(file);
      formik.setFieldValue('attachments', [
        ...formik.values.attachments,
        { url, fileName: file.name, fileType: file.type },
      ]);
    } catch (err) {
      setLocalError(err.message);
    }
  }

  function handleRemoveAttachment(index) {
    formik.setFieldValue(
      'attachments',
      formik.values.attachments.filter((_, i) => i !== index)
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>{schedule ? 'Edit Schedule' : 'New Spot-Check Schedule'}</DialogTitle>
        <DialogContent dividers>
          {(localError || uploadError) && (
            <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
              {localError || uploadError}
            </Typography>
          )}

          <Box sx={{ mb: 2 }}>
            <LiftSelect
              value={formik.values.liftId}
              onChange={handleLiftChange}
              label="Link to a Lift (optional)"
              helperText="Auto-fills Block/Lift Address from the Lifts directory"
              disabled={Boolean(initialLiftId) && !schedule}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField
                name="townCouncil"
                label="Town Council"
                fullWidth
                value={formik.values.townCouncil}
                onChange={formik.handleChange}
                error={formik.touched.townCouncil && Boolean(formik.errors.townCouncil)}
                helperText={formik.touched.townCouncil && formik.errors.townCouncil}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                name="liftCompany"
                label="Lift Company"
                fullWidth
                value={formik.values.liftCompany}
                onChange={formik.handleChange}
                error={formik.touched.liftCompany && Boolean(formik.errors.liftCompany)}
                helperText={formik.touched.liftCompany && formik.errors.liftCompany}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="blockAddress"
                label="Block / Lift Address"
                fullWidth
                value={formik.values.blockAddress}
                onChange={formik.handleChange}
                error={formik.touched.blockAddress && Boolean(formik.errors.blockAddress)}
                helperText={formik.touched.blockAddress && formik.errors.blockAddress}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                name="scheduledDate"
                label="Scheduled Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={formik.values.scheduledDate}
                onChange={formik.handleChange}
                error={formik.touched.scheduledDate && Boolean(formik.errors.scheduledDate)}
                helperText={formik.touched.scheduledDate && formik.errors.scheduledDate}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                select
                name="status"
                label="Status"
                fullWidth
                value={formik.values.status}
                onChange={formik.handleChange}
              >
                {SCHEDULE_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField
                name="assignedInspector"
                label="Assigned Inspector"
                fullWidth
                value={formik.values.assignedInspector}
                onChange={formik.handleChange}
              />
            </Grid>

            <Grid size={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body2">Notes</Typography>
                <Button size="small" onClick={handleGenerateDraft} disabled={draftLoading}>
                  {draftLoading ? 'Generating…' : 'Generate Draft from AI'}
                </Button>
              </Stack>
              <TextField
                name="notes"
                fullWidth
                multiline
                rows={2}
                value={formik.values.notes}
                onChange={formik.handleChange}
              />
            </Grid>

            <Grid size={12}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Attachments (photos / audio field notes)
              </Typography>
              <Button component="label" variant="outlined" size="small" disabled={uploading}>
                {uploading ? `Uploading… ${progress}%` : 'Add Attachment'}
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp,audio/*"
                  onChange={handleFileSelect}
                />
              </Button>
              {formik.values.attachments.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {formik.values.attachments.map((attachment, index) => (
                    <Stack key={attachment.url} direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="body2"
                        component="a"
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ flexGrow: 1 }}
                      >
                        {attachment.fileName || attachment.url}
                      </Typography>
                      <IconButton size="small" onClick={() => handleRemoveAttachment(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={formik.isSubmitting || uploading}>
            {schedule ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
