import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import StatusChip from '../../components/StatusChip';
import EndorseButton from './EndorseButton';
import { formatDate } from '../../utils/formatDate';
import { RECTIFICATION_STATUS_COLORS } from '../../theme/statusColors';

function Field({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2">{children ?? '—'}</Typography>
    </Box>
  );
}

/**
 * Read-only view of a single rectification: the defect it closes out, who fixed it,
 * the full proof-photo gallery (click any thumbnail to enlarge), the signature, remarks,
 * and - once endorsed - who signed off on it and when. Edit and Endorse actions live
 * here rather than inline in the table, since they need this much context on screen.
 */
export default function RectificationDetail({ open, rectification, onClose, onEdit, onEndorse }) {
  const [enlarged, setEnlarged] = useState(null);

  if (!rectification) return null;
  const defect = rectification.defectId || {};

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <span>Rectification Details</span>
            <StatusChip value={rectification.status} colorMap={RECTIFICATION_STATUS_COLORS} />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={12}>
              <Field label="Defect">
                {defect.defectNo ? `${defect.defectNo} — ${defect.title || defect.description || ''}` : '—'}
              </Field>
            </Grid>
            <Grid size={6}>
              <Field label="Rectified By">{rectification.rectifiedBy}</Field>
            </Grid>
            <Grid size={6}>
              <Field label="Lift Company">{rectification.liftCompanyName}</Field>
            </Grid>
            <Grid size={6}>
              <Field label="Date Rectified">{formatDate(rectification.dateRectified)}</Field>
            </Grid>
          </Grid>

          <Divider />

          <Typography
            variant="caption"
            sx={{ fontWeight: 600, letterSpacing: 0.4, color: 'text.secondary', textTransform: 'uppercase' }}
          >
            Proof Photos
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 1, mb: 2.5 }}>
            {rectification.proofPhotos?.length ? (
              rectification.proofPhotos.map((url, index) => (
                <Box
                  key={url + index}
                  component="img"
                  src={url}
                  alt={`Proof photo ${index + 1}`}
                  onClick={() => setEnlarged(url)}
                  sx={{
                    width: 88,
                    height: 88,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    cursor: 'pointer',
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No proof photos yet.
              </Typography>
            )}
          </Stack>

          <Divider />

          <Typography
            variant="caption"
            sx={{ fontWeight: 600, letterSpacing: 0.4, color: 'text.secondary', textTransform: 'uppercase' }}
          >
            E-Signature
          </Typography>
          <Box sx={{ mt: 1, mb: 2.5 }}>
            {rectification.signatureUrl ? (
              <Box
                component="img"
                src={rectification.signatureUrl}
                alt="Signature"
                onClick={() => setEnlarged(rectification.signatureUrl)}
                sx={{
                  maxWidth: 260,
                  height: 90,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: '#fff',
                  cursor: 'pointer',
                }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Not signed yet.
              </Typography>
            )}
          </Box>

          <Divider />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <Field label="Remarks">{rectification.remarks}</Field>
            </Grid>
            {rectification.status === 'Endorsed' && (
              <>
                <Grid size={6}>
                  <Field label="Endorsed By">{rectification.endorsedBy}</Field>
                </Grid>
                <Grid size={6}>
                  <Field label="Endorsed Date">{formatDate(rectification.endorsedDate)}</Field>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          {rectification.status !== 'Endorsed' && (
            <Button startIcon={<EditIcon />} onClick={onEdit}>
              Edit
            </Button>
          )}
          <EndorseButton rectification={rectification} onEndorse={onEndorse} />
        </DialogActions>
      </Dialog>

      {/* Lightbox: click a thumbnail (or the signature) to see it full-size. */}
      <Dialog open={Boolean(enlarged)} onClose={() => setEnlarged(null)} maxWidth="md">
        <Box
          component="img"
          src={enlarged}
          alt="Enlarged"
          sx={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', bgcolor: '#fff' }}
        />
      </Dialog>
    </>
  );
}
