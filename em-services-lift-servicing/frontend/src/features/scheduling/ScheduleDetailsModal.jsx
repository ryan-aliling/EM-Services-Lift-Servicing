import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import StatusStepper from './StatusStepper';
import { downloadSchedulePdf } from './generateSchedulePdf';
import { formatDate } from '../../utils/formatDate';

// "Extending to see more details" without a page navigation, per client
// feedback — a dialog keeps the grid in place behind it, matching
// LiftDetailDialog's pattern for the Lifts feature.
export default function ScheduleDetailsModal({ open, schedule, onClose }) {
  if (!schedule) return null;

  const attachments = schedule.attachments || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{schedule.blockAddress}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <StatusStepper status={schedule.status} />

          <Stack spacing={0.5}>
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

          <Divider />

          <Typography variant="subtitle2">Attachments</Typography>
          {attachments.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No attachments.
            </Typography>
          )}
          {attachments.length > 0 && (
            <List dense disablePadding>
              {attachments.map((attachment) => (
                <ListItem key={attachment.url} disableGutters>
                  {attachment.fileType?.startsWith('image/') && (
                    <Box
                      component="img"
                      src={attachment.url}
                      alt={attachment.fileName}
                      sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1, mr: 1.5 }}
                    />
                  )}
                  <ListItemText
                    primary={attachment.fileName || attachment.url}
                    secondary={
                      <a href={attachment.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => downloadSchedulePdf(schedule)}>
          Generate PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
