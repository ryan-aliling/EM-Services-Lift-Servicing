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
import { LIFT_TYPES, LIFT_STATUSES } from '../../utils/liftHelpers';
import { dateInputValue } from '../../utils/formatDate';

const emptyLift = {
  liftCode: '',
  block: '',
  unit: '',
  type: 'Passenger',
  capacity: '',
  status: 'Active',
  manufacturer: '',
  installDate: '',
  lastServiced: '',
};

const schema = Yup.object({
  liftCode: Yup.string().trim().required('Lift code is required'),
  block: Yup.string().trim().required('Block is required'),
  unit: Yup.string().trim().required('Unit is required'),
  type: Yup.string().oneOf(LIFT_TYPES).required(),
  capacity: Yup.number().typeError('Capacity must be a number').positive().integer().required('Capacity is required'),
  status: Yup.string().oneOf(LIFT_STATUSES).required(),
  manufacturer: Yup.string(),
  installDate: Yup.date().nullable(),
  lastServiced: Yup.date().nullable(),
});

export default function LiftFormDialog({ open, lift, onClose, onSubmit }) {
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: lift
      ? {
          ...emptyLift,
          ...lift,
          installDate: dateInputValue(lift.installDate),
          lastServiced: dateInputValue(lift.lastServiced),
        }
      : emptyLift,
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
        <DialogTitle>{lift ? `Edit Lift ${lift.liftCode}` : 'Add Lift'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <TextField
                name="liftCode"
                label="Lift Code"
                fullWidth
                value={formik.values.liftCode}
                onChange={formik.handleChange}
                error={formik.touched.liftCode && Boolean(formik.errors.liftCode)}
                helperText={formik.touched.liftCode && formik.errors.liftCode}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                name="block"
                label="Block"
                fullWidth
                value={formik.values.block}
                onChange={formik.handleChange}
                error={formik.touched.block && Boolean(formik.errors.block)}
                helperText={formik.touched.block && formik.errors.block}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                name="unit"
                label="Unit"
                fullWidth
                value={formik.values.unit}
                onChange={formik.handleChange}
                error={formik.touched.unit && Boolean(formik.errors.unit)}
                helperText={formik.touched.unit && formik.errors.unit}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                select
                name="type"
                label="Type"
                fullWidth
                value={formik.values.type}
                onChange={formik.handleChange}
              >
                {LIFT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                name="capacity"
                label="Capacity (kg)"
                type="number"
                fullWidth
                value={formik.values.capacity}
                onChange={formik.handleChange}
                error={formik.touched.capacity && Boolean(formik.errors.capacity)}
                helperText={formik.touched.capacity && formik.errors.capacity}
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
                {LIFT_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                name="manufacturer"
                label="Manufacturer"
                fullWidth
                value={formik.values.manufacturer}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                name="installDate"
                label="Install Date"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={formik.values.installDate}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                name="lastServiced"
                label="Last Serviced"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={formik.values.lastServiced}
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
            {lift ? 'Save Changes' : 'Create Lift'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
