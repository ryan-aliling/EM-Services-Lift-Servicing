import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import LiftSelect from '../lifts/LiftSelect';
import ScheduleSelect from './ScheduleSelect';
import ChecklistEditor from './ChecklistEditor';
import DefectEditor from './DefectEditor';
import { dateInputValue } from '../../utils/formatDate';
import { DEFAULT_CHECKLIST_ITEMS } from './inspectionConstants';
import { buildDefaultChecklist, hasFailedChecklistItem } from './inspectionHelpers';

const STATUS_OPTIONS = ['Draft', 'Submitted', 'Under Review', 'Closed'];

function blankDefect() {
  return { description: '', severity: 'Minor', photoUrl: '', status: 'Open' };
}

const todayStr = () => new Date().toISOString().split('T')[0];

const schema = Yup.object({
  liftId: Yup.string().required('Select a lift'),
  // A plain .max(new Date(), ...) would freeze "now" at module-load time (evaluated once,
  // not per validation) - a session left open past midnight would then wrongly reject
  // today's own date as "in the future". .test() re-evaluates fresh on every validation.
  inspectionDate: Yup.date()
    .test('not-future', 'Inspection date cannot be in the future', (value) => !value || new Date(value) <= new Date())
    .required('Inspection date is required'),
  inspectorName: Yup.string().trim().required('Inspector name is required'),
  overallStatus: Yup.string().oneOf(STATUS_OPTIONS).required(),
});

export default function InspectionFormDialog({ open, inspection, onClose, onSubmit, initialLiftId }) {
  const [checklist, setChecklist] = useState(buildDefaultChecklist(DEFAULT_CHECKLIST_ITEMS));
  const [defects, setDefects] = useState([]);

  // initialLiftId presets (and, below, locks) the lift picker for a fresh report opened
  // from the Lift Workflow page's Inspections step — ignored once `inspection` is set.
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      liftId: inspection?.liftId || initialLiftId || '',
      scheduleId: inspection?.scheduleId || null,
      inspectionDate: inspection?.inspectionDate ? dateInputValue(inspection.inspectionDate) : todayStr(),
      inspectorName: inspection?.inspectorName || '',
      contractor: inspection?.contractor || '',
      overallStatus: inspection?.overallStatus || 'Draft',
      notes: inspection?.notes || '',
    },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit({ ...values, checklist, defects });
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setChecklist(inspection?.checklist?.length ? inspection.checklist.map((c) => ({ ...c })) : buildDefaultChecklist(DEFAULT_CHECKLIST_ITEMS));
      setDefects(inspection?.defects ? inspection.defects.map((d) => ({ ...d })) : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inspection]);

  const hasFail = hasFailedChecklistItem(checklist);

  // Marking a checklist item "Fail" should immediately let the inspector start typing a
  // defect, not just unlock a button they still have to notice and click - so auto-add one
  // blank, editable row the moment a Fail first appears (only if nothing's been added yet;
  // never auto-delete rows the inspector already filled in if they later revert a Fail).
  useEffect(() => {
    if (hasFail && defects.length === 0) {
      setDefects([blankDefect()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFail]);

  // Changing lift clears any previously-linked schedule that belonged to the old lift.
  const handleLiftChange = (liftId) => {
    formik.setFieldValue('liftId', liftId);
    formik.setFieldValue('scheduleId', null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>{inspection ? `Edit ${inspection.reportNo}` : 'New Inspection Report'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12}>
              <LiftSelect
                value={formik.values.liftId}
                onChange={handleLiftChange}
                error={formik.touched.liftId && Boolean(formik.errors.liftId)}
                helperText={formik.touched.liftId && formik.errors.liftId}
                disabled={Boolean(initialLiftId) && !inspection}
              />
            </Grid>
            <Grid item xs={12}>
              <ScheduleSelect
                liftId={formik.values.liftId}
                value={formik.values.scheduleId}
                onChange={(scheduleId) => formik.setFieldValue('scheduleId', scheduleId)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="date" name="inspectionDate" label="Inspection Date"
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: todayStr() }}
                value={formik.values.inspectionDate} onChange={formik.handleChange}
                error={formik.touched.inspectionDate && Boolean(formik.errors.inspectionDate)}
                helperText={formik.touched.inspectionDate && formik.errors.inspectionDate}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" name="inspectorName" label="Inspector Name"
                value={formik.values.inspectorName} onChange={formik.handleChange}
                error={formik.touched.inspectorName && Boolean(formik.errors.inspectorName)}
                helperText={formik.touched.inspectorName && formik.errors.inspectorName}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" name="contractor" label="Contractor"
                value={formik.values.contractor} onChange={formik.handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth select size="small" name="overallStatus" label="Report Status"
                value={formik.values.overallStatus} onChange={formik.handleChange}
              >
                {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Inspection Checklist</Typography>
          <ChecklistEditor checklist={checklist} onChange={setChecklist} />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Defects Found</Typography>
          <DefectEditor defects={defects} onChange={setDefects} disabled={!hasFail} />

          <TextField
            fullWidth multiline minRows={2} size="small" name="notes" label="Notes" sx={{ mt: 2 }}
            value={formik.values.notes} onChange={formik.handleChange}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
            {inspection ? 'Save Changes' : 'Create Report'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
