import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import LiftSelect from '../lifts/LiftSelect';
import { DEFECT_SEVERITIES, DEFECT_NEXT_STATUSES } from '../../utils/defectHelpers';

const emptyDefect = {
  title: '',
  description: '',
  liftId: '',
  location: '',
  severity: '',
  reportedBy: '',
  status: 'Open',
};

const schema = Yup.object({
  title: Yup.string().trim().required('Title is required'),
  location: Yup.string().trim().required('Location is required'),
  severity: Yup.string().oneOf(DEFECT_SEVERITIES).required('Severity is required'),
  description: Yup.string(),
  reportedBy: Yup.string(),
  status: Yup.string(),
});

// Same dialog handles both Create and full Edit - editing intentionally allows
// correcting ANY field (title, location, severity, etc.), not just status, so a
// wrong initial entry can be fixed later. See defectController.js updateDefect.
export default function DefectFormDialog({ open, defect, onClose, onSubmit }) {
  const isEdit = Boolean(defect);
  // Status can only move to a valid next step from wherever it currently is -
  // mirrors the backend's VALID_TRANSITIONS so the UI never offers a change the
  // server would reject. On create, the field isn't shown at all (always starts Open).
  const nextStatusOptions = isEdit ? DEFECT_NEXT_STATUSES[defect.status] || [] : [];

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: defect
      ? {
          ...emptyDefect,
          ...defect,
          liftId: defect.liftId || '',
        }
      : emptyDefect,
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>{isEdit ? `Edit Defect ${defect.defectNo}` : 'Log Defect'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                name="title"
                label="Title"
                placeholder="e.g., Door not closing fully"
                fullWidth
                value={formik.values.title}
                onChange={formik.handleChange}
                error={formik.touched.title && Boolean(formik.errors.title)}
                helperText={formik.touched.title && formik.errors.title}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                name="location"
                label="Location"
                placeholder="e.g., Blk 12 lift lobby"
                fullWidth
                value={formik.values.location}
                onChange={formik.handleChange}
                error={formik.touched.location && Boolean(formik.errors.location)}
                helperText={formik.touched.location && formik.errors.location}
              />
            </Grid>
            <Grid size={6}>
              <LiftSelect
                value={formik.values.liftId}
                onChange={(id) => formik.setFieldValue('liftId', id)}
                label="Lift (optional)"
              />
            </Grid>
            <Grid size={isEdit ? 6 : 12}>
              <TextField
                select
                name="severity"
                label="Severity"
                fullWidth
                value={formik.values.severity}
                onChange={formik.handleChange}
                error={formik.touched.severity && Boolean(formik.errors.severity)}
                helperText={formik.touched.severity && formik.errors.severity}
              >
                {DEFECT_SEVERITIES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {isEdit && (
              <Grid size={6}>
                <TextField
                  select
                  name="status"
                  label="Status"
                  fullWidth
                  value={formik.values.status}
                  onChange={formik.handleChange}
                >
                  <MenuItem value={defect.status}>{defect.status} (no change)</MenuItem>
                  {nextStatusOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid size={12}>
              <TextField
                name="reportedBy"
                label="Reported By"
                fullWidth
                value={formik.values.reportedBy}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="description"
                label="Description"
                placeholder="Describe the defect..."
                fullWidth
                multiline
                rows={3}
                value={formik.values.description}
                onChange={formik.handleChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
            {isEdit ? 'Save Changes' : 'Log Defect'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}