import { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LiftSelect from '../lifts/LiftSelect';
import { listUsers } from '../../api/authApi';
import { SCHEDULE_STATUSES } from '../../utils/scheduleHelpers';

// A local, client-only convenience (not submitted anywhere) so a half-filled form survives
// a refresh - separate from the AI-drafted notes feature that used to live here (removed).
// Single shared slot rather than per-lift: keeps this simple, matching the stated use case
// of "don't lose what I was typing", not a full multi-draft system.
const DRAFT_KEY = 'scheduleForm:draft';

const emptySchedule = {
  townCouncil: '',
  liftCompany: '',
  blockAddress: '',
  scheduledDate: '',
  assignedInspector: '',
  assignedStaffId: '',
  notes: '',
  status: 'Scheduled',
  liftId: '',
};

// isEdit: past dates are only blocked on create - editing an existing (possibly
// legitimately backfilled) record shouldn't suddenly reject its own stored date.
function buildSchema(isEdit) {
  return Yup.object({
    townCouncil: Yup.string().trim().required('Town council is required'),
    liftCompany: Yup.string().trim().required('Lift company is required'),
    blockAddress: Yup.string().trim().required('Block/Lift address is required'),
    scheduledDate: Yup.date()
      .typeError('Enter a valid date')
      .required('Scheduled date is required')
      .test('not-in-past', 'Scheduled date cannot be in the past', (value) => {
        if (isEdit || !value) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(value) >= today;
      }),
    status: Yup.string().oneOf(SCHEDULE_STATUSES).required(),
    assignedInspector: Yup.string(),
    notes: Yup.string(),
  });
}

export default function ScheduleFormDialog({ open, schedule, onClose, onSubmit, initialLiftId }) {
  const [staffOptions, setStaffOptions] = useState([]);
  const schema = useMemo(() => buildSchema(Boolean(schedule)), [schedule]);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  // Full-screen on a phone-sized viewport - MUI's Dialog margin/max-width defaults leave
  // very little usable width once a 320-375px screen is involved.
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // This dialog only ever opens for Admin/Master (SchedulingStep.jsx gates the Add/Edit
  // buttons that trigger it), so listUsers() here always succeeds - no separate role
  // check needed. Determines who can see/update this schedule as "their own" once
  // assigned - see the Staff-scoping comments in schedulingController.js.
  useEffect(() => {
    if (!open) return;
    listUsers()
      .then((users) => setStaffOptions(users.filter((u) => u.role === 'Staff')))
      .catch(() => setStaffOptions([]));
  }, [open]);

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
          assignedStaffId: schedule.assignedStaffId || '',
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

  function handleSaveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formik.values));
    enqueueSnackbar('Draft saved', { variant: 'success' });
  }

  function handleLoadDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      enqueueSnackbar('No draft found', { variant: 'info' });
      return;
    }
    try {
      formik.setValues({ ...emptySchedule, ...JSON.parse(raw) });
      enqueueSnackbar('Draft loaded', { variant: 'success' });
    } catch {
      enqueueSnackbar('No draft found', { variant: 'info' });
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>{schedule ? 'Edit Schedule' : 'New Spot-Check Schedule'}</DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <Box sx={{ mb: 3 }}>
            <LiftSelect
              value={formik.values.liftId}
              onChange={handleLiftChange}
              label="Link to a Lift (optional)"
              helperText="Auto-fills Block/Lift Address from the Lifts directory"
              disabled={Boolean(initialLiftId) && !schedule}
            />
          </Box>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button size="small" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button size="small" onClick={handleLoadDraft}>
              Load Draft
            </Button>
          </Stack>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12}>
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                name="assignedInspector"
                label="Assigned Inspector"
                fullWidth
                value={formik.values.assignedInspector}
                onChange={formik.handleChange}
                helperText="Free-text display label"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                name="assignedStaffId"
                label="Assigned Staff Account"
                fullWidth
                value={formik.values.assignedStaffId}
                onChange={formik.handleChange}
                helperText="Who can see/update this in their own Staff view"
              >
                <MenuItem value="">— Unassigned —</MenuItem>
                {staffOptions.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name} ({s.email})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" mb={0.75}>
                Notes
              </Typography>
              <TextField
                name="notes"
                fullWidth
                multiline
                rows={3}
                value={formik.values.notes}
                onChange={formik.handleChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
            {schedule ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
