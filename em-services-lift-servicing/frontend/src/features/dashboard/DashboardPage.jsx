import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import { Box, Grid, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import HourglassBottomOutlinedIcon from '@mui/icons-material/HourglassBottomOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import StatCard from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import * as scheduleApi from '../../api/scheduleApi';
import { SCHEDULE_STATUSES, isOverdue } from '../../utils/scheduleHelpers';
import { formatDate } from '../../utils/formatDate';
import { SCHEDULE_STATUS_COLORS } from '../../theme/statusColors';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

// Same status-color convention as <StatusChip> elsewhere in the app (MUI chip
// color names -> real hex), so the chart never introduces a second, competing
// palette for the same statuses.
const STATUS_HEX = { default: '#9e9e9e', info: '#0288d1', warning: '#ed6c02', success: '#2e7d32', error: '#d32f2f' };

// "Pending" has no dedicated status value in the Schedule model — defined
// here as work that's been picked up but not finished (Assigned or In
// Progress), distinct from a not-yet-assigned "Scheduled" entry.
function computeStats(schedules) {
  return {
    total: schedules.length,
    scheduled: schedules.filter((s) => s.status === 'Scheduled').length,
    pending: schedules.filter((s) => s.status === 'Assigned' || s.status === 'In Progress').length,
    overdue: schedules.filter(isOverdue).length,
  };
}

export default function DashboardPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scheduleApi
      .fetchSchedules()
      .then(setSchedules)
      .catch(() => enqueueSnackbar('Failed to load schedules - is the backend running?', { variant: 'error' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => computeStats(schedules), [schedules]);

  const recentActivity = useMemo(
    () => [...schedules].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5),
    [schedules]
  );

  const chartData = useMemo(
    () => ({
      labels: SCHEDULE_STATUSES,
      datasets: [
        {
          data: SCHEDULE_STATUSES.map((status) => schedules.filter((s) => s.status === status).length),
          backgroundColor: SCHEDULE_STATUSES.map((status) => STATUS_HEX[SCHEDULE_STATUS_COLORS[status]] || STATUS_HEX.default),
          borderRadius: 4,
          maxBarThickness: 36,
        },
      ],
    }),
    [schedules]
  );

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  return (
    <Box>
      <Typography variant="h4" mb={4}>
        Dashboard
      </Typography>

      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Schedules" value={stats.total} icon={<EventNoteOutlinedIcon />} color="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Scheduled" value={stats.scheduled} icon={<EventAvailableOutlinedIcon />} color="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Pending" value={stats.pending} icon={<HourglassBottomOutlinedIcon />} color="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Overdue" value={stats.overdue} icon={<WarningAmberOutlinedIcon />} color="error.main" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="subtitle1" mb={2}>
              Schedule Status Distribution
            </Typography>
            <Bar data={chartData} options={chartOptions} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="subtitle1" mb={1.5}>
              Recent Activity
            </Typography>
            {!loading && recentActivity.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No schedules yet.
              </Typography>
            )}
            <List dense disablePadding>
              {recentActivity.map((schedule) => (
                <ListItem
                  key={schedule._id}
                  disableGutters
                  secondaryAction={<StatusChip value={schedule.status} colorMap={SCHEDULE_STATUS_COLORS} />}
                >
                  <ListItemText
                    primary={schedule.blockAddress}
                    secondary={`${schedule.liftCompany} · ${formatDate(schedule.scheduledDate)}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
