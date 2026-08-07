import { useEffect, useState } from 'react';
import { Badge, IconButton, List, ListItem, ListItemText, Popover } from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import * as scheduleApi from '../api/scheduleApi';
import { isOverdue } from '../utils/scheduleHelpers';

// Badge count is real overdue-schedule data, not placeholder notification
// text — a "notification bell" showing fake alerts would misrepresent the
// state of the actual system it's demoing.
export default function NotificationBell() {
  const [overdue, setOverdue] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    scheduleApi
      .fetchSchedules()
      .then((list) => setOverdue(list.filter(isOverdue)))
      .catch(() => {});
  }, []);

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge badgeContent={overdue.length} color="error">
          <NotificationsOutlinedIcon />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <List dense sx={{ minWidth: 260, maxWidth: 320 }}>
          {overdue.length === 0 && (
            <ListItem>
              <ListItemText primary="No overdue schedules" />
            </ListItem>
          )}
          {overdue.map((schedule) => (
            <ListItem key={schedule._id}>
              <ListItemText primary={schedule.blockAddress} secondary="Overdue spot-check" />
            </ListItem>
          ))}
        </List>
      </Popover>
    </>
  );
}
