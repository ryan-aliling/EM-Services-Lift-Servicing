import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import StatusStepper from './StatusStepper';
import { downloadSchedulePdf } from './generateSchedulePdf';
import { formatDate } from '../../utils/formatDate';

// "Extending to see more details" without a page navigation, per client
// feedback — a dialog keeps the grid in place behind it, matching
// LiftDetailDialog's pattern for the Lifts feature.
export default function ScheduleDetailsModal({ open, schedule, onClose }) {
  if (!schedule) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{schedule.blockAddress}</DialogTitle>
      <DialogContent dividers sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <StatusStepper status={schedule.status} />

          <Stack spacing={0.75}>
            <Typography variant="body2">
              <strong>Town Council:</strong> {schedule.townCouncil}
            </Typography>
            <Typography variant="body2">
              <strong>Lift Company:</strong> {schedule.liftCompany}
            </Typography>
            <Typography variant="body2">
              <strong>Scheduled Date:</strong> {formatDate(schedule.scheduledDate)}
            </Typography>
            <Typography variant="body2">
              <strong>Assigned Inspector:</strong> {schedule.assignedInspector || '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Notes:</strong> {schedule.notes || '—'}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => downloadSchedulePdf(schedule)}>
          Generate PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
