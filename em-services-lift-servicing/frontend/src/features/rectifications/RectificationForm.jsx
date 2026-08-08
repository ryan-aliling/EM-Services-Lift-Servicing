import { useRef, useState } from 'react';
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
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import DefectSelect from './DefectSelect';
import PhotoUploader from './PhotoUploader';
import SignaturePad from './SignaturePad';
import { useFileUpload } from '../../hooks/useFileUpload';
import { dateInputValue } from '../../utils/formatDate';

function SectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{ fontWeight: 600, letterSpacing: 0.4, color: 'text.secondary', textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  );
}

const emptyRectification = {
  defectId: '',
  rectifiedBy: '',
  liftCompanyName: '',
  dateRectified: '',
  proofPhotos: [],
  signatureUrl: '',
  remarks: '',
};

const schema = Yup.object({
  defectId: Yup.string().required('Defect is required'),
  rectifiedBy: Yup.string().trim().required('Rectified By is required'),
  liftCompanyName: Yup.string(),
  dateRectified: Yup.string().required('Date Rectified is required'),
  remarks: Yup.string(),
});

/**
 * Create/edit dialog for a rectification record. Unlike DefectFormDialog (one Save
 * button), this form has two distinct actions - "Save as Draft" and "Submit" - each with
 * different validation, since Submit additionally requires a photo + signature. Both
 * route through the same Formik onSubmit; which one fires is captured in
 * targetStatusRef right before triggering formik.handleSubmit(), so the base-field
 * validation (defectId/rectifiedBy/dateRectified) stays centralised either way.
 */
export default function RectificationForm({ open, rectification, onClose, onSubmit, initialDefectId, liftId }) {
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = Boolean(rectification);
  const isEndorsed = isEdit && rectification.status === 'Endorsed';
  const isSubmittedAlready = isEdit && rectification.status === 'Submitted';

  // Files (photos/signature) are only locked once the record is finalized by an EM
  // staff endorsement - a Submitted record can still be amended before that happens.
  const filesDisabled = isEndorsed;

  const targetStatusRef = useRef(null);
  const signaturePadRef = useRef(null);
  const [showPad, setShowPad] = useState(!rectification?.signatureUrl);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const signatureUpload = useFileUpload();

  // initialDefectId presets (and, below, locks) the defect picker when this dialog is
  // opened from the Lift Workflow page's Rectifications step against a specific defect
  // row — ignored once `rectification` (edit mode) is set.
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: rectification
      ? {
          ...emptyRectification,
          ...rectification,
          defectId: rectification.defectId?._id || rectification.defectId || '',
          dateRectified: dateInputValue(rectification.dateRectified),
        }
      : { ...emptyRectification, defectId: initialDefectId || '' },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await performSubmit(values, targetStatusRef.current);
      } finally {
        setSubmitting(false);
      }
    },
  });

  async function performSubmit(values, targetStatus) {
    let signatureUrl = values.signatureUrl;

    if (showPad && !filesDisabled) {
      if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
        if (targetStatus === 'Submitted') {
          enqueueSnackbar('Draw a signature before submitting', { variant: 'warning' });
          return;
        }
      } else {
        try {
          const blob = await signaturePadRef.current.toBlob();
          const file = new File([blob], `signature-${rectification?._id || 'new'}.png`, { type: 'image/png' });
          signatureUrl = await signatureUpload.uploadFile(file, 'rectifications');
        } catch (err) {
          enqueueSnackbar(`Failed to upload signature: ${err.message}`, { variant: 'error' });
          return;
        }
      }
    }

    if (targetStatus === 'Submitted' && (!values.proofPhotos.length || !signatureUrl)) {
      enqueueSnackbar('Add at least 1 proof photo and a signature before submitting', { variant: 'warning' });
      return;
    }

    const payload = { ...values, signatureUrl };
    if (targetStatus) payload.status = targetStatus;

    try {
      await onSubmit(payload);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save rectification', { variant: 'error' });
    }
  }

  function fireSubmit(targetStatus) {
    targetStatusRef.current = targetStatus;
    formik.handleSubmit();
  }

  const canSubmit =
    formik.values.proofPhotos.length > 0 && (Boolean(formik.values.signatureUrl) || signatureDrawn);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={(e) => e.preventDefault()}>
        <DialogTitle>{isEdit ? `Edit Rectification` : 'New Rectification'}</DialogTitle>
        <DialogContent dividers>
          <SectionLabel>What Was Fixed</SectionLabel>
          <Grid container spacing={2} sx={{ mt: 1, mb: 2.5 }}>
            <Grid item xs={12}>
              <DefectSelect
                value={formik.values.defectId}
                onChange={(id) => formik.setFieldValue('defectId', id)}
                error={formik.touched.defectId && Boolean(formik.errors.defectId)}
                helperText={formik.touched.defectId && formik.errors.defectId}
                disabled={isEdit || Boolean(initialDefectId)}
                liftId={liftId}
              />
            </Grid>
          </Grid>

          <Divider />

          <SectionLabel>Rectification Details</SectionLabel>
          <Grid container spacing={2} sx={{ mt: 1, mb: 2.5 }}>
            <Grid item xs={6}>
              <TextField
                name="rectifiedBy"
                label="Rectified By"
                placeholder="Technician name"
                fullWidth
                value={formik.values.rectifiedBy}
                onChange={formik.handleChange}
                error={formik.touched.rectifiedBy && Boolean(formik.errors.rectifiedBy)}
                helperText={formik.touched.rectifiedBy && formik.errors.rectifiedBy}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                name="liftCompanyName"
                label="Lift Company"
                placeholder="e.g., Acme Lift Co"
                fullWidth
                value={formik.values.liftCompanyName}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                type="date"
                name="dateRectified"
                label="Date Rectified"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formik.values.dateRectified}
                onChange={formik.handleChange}
                error={formik.touched.dateRectified && Boolean(formik.errors.dateRectified)}
                helperText={formik.touched.dateRectified && formik.errors.dateRectified}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="remarks"
                label="Remarks"
                placeholder="Any additional notes..."
                fullWidth
                multiline
                rows={2}
                value={formik.values.remarks}
                onChange={formik.handleChange}
              />
            </Grid>
          </Grid>

          <Divider />

          <SectionLabel>Proof of Fix</SectionLabel>
          <Box sx={{ mt: 1, mb: 2.5 }}>
            <PhotoUploader
              photos={formik.values.proofPhotos}
              onChange={(photos) => formik.setFieldValue('proofPhotos', photos)}
              disabled={filesDisabled}
              onError={(message) => enqueueSnackbar(message, { variant: 'error' })}
            />
          </Box>

          <Divider />

          <SectionLabel>E-Signature</SectionLabel>
          <Box sx={{ mt: 1 }}>
            {filesDisabled || (!showPad && formik.values.signatureUrl) ? (
              <Box>
                <Box
                  component="img"
                  src={formik.values.signatureUrl}
                  alt="Signature"
                  sx={{ maxWidth: 300, height: 100, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }}
                />
                {!filesDisabled && (
                  <Button
                    size="small"
                    sx={{ display: 'block', mt: 1 }}
                    onClick={() => {
                      setShowPad(true);
                      formik.setFieldValue('signatureUrl', '');
                    }}
                  >
                    Redraw Signature
                  </Button>
                )}
              </Box>
            ) : (
              <SignaturePad ref={signaturePadRef} disabled={filesDisabled} onChange={setSignatureDrawn} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={formik.isSubmitting}>
            Cancel
          </Button>
          {isEndorsed && (
            <Button variant="contained" disabled={formik.isSubmitting} onClick={() => fireSubmit(null)}>
              Save Changes
            </Button>
          )}
          {isSubmittedAlready && !isEndorsed && (
            <Button variant="contained" disabled={formik.isSubmitting} onClick={() => fireSubmit('Submitted')}>
              Save Changes
            </Button>
          )}
          {!isEndorsed && !isSubmittedAlready && (
            <>
              <Button variant="outlined" disabled={formik.isSubmitting} onClick={() => fireSubmit('Draft')}>
                Save as Draft
              </Button>
              <Button
                variant="contained"
                disabled={formik.isSubmitting || !canSubmit}
                onClick={() => fireSubmit('Submitted')}
              >
                Submit
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
