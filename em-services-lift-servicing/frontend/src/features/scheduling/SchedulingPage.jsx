import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, Grid, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import EventUpcomingIcon from '@mui/icons-material/EventAvailableOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import StatCard from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import ScheduleFormDialog from './ScheduleFormDialog';
import ScheduleDetailsModal from './ScheduleDetailsModal';
import * as scheduleApi from '../../api/scheduleApi';
import { SCHEDULE_STATUSES, NEXT_STATUS, isOverdue } from '../../utils/scheduleHelpers';
import { formatDate } from '../../utils/formatDate';
import { exportToCSV } from '../../utils/csvExport';
import { SCHEDULE_CSV_COLUMNS } from './scheduleCsvColumns';
import { SCHEDULE_STATUS_COLORS } from '../../theme/statusColors';
import { useAuth } from '../../context/AuthContext';

const UPCOMING_WINDOW_DAYS = 7;
const RECENTLY_COMPLETED_LIMIT = 5;

// Simple stat tiles rather than a full charting library — client feedback
// asked for "statistic/report" visibility, not a dedicated analytics page,
// so this stays lightweight and lives right where staff already work.
// Computed from the full (unfiltered) list, same as Lifts' stats endpoint
// is decoupled from its grid filters.
function computeStats(schedules) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + UPCOMING_WINDOW_DAYS);

  const upcoming = schedules.filter((schedule) => {
    if (schedule.status === 'Completed' || schedule.status === 'Cancelled') return false;
    const date = new Date(schedule.scheduledDate);
    return date >= today && date <= windowEnd;
  });

  const overdue = schedules.filter(isOverdue);

  const recentlyCompleted = schedules
    .filter((schedule) => schedule.status === 'Completed')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, RECENTLY_COMPLETED_LIMIT);

  return { upcomingCount: upcoming.length, overdueCount: overdue.length, recentlyCompletedCount: recentlyCompleted.length };
}

export default function SchedulingPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canEdit = user.role === 'Admin' || user.role === 'Manager';

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await scheduleApi.fetchSchedules();
      setSchedules(list);
    } catch {
      enqueueSnackbar('Failed to load schedules - is the backend running?', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (statusFilter && schedule.status !== statusFilter) return false;
      if (dateFilter && schedule.scheduledDate.slice(0, 10) !== dateFilter) return false;
      if (search) {
        const haystack = `${schedule.townCouncil} ${schedule.liftCompany} ${schedule.blockAddress} ${schedule.assignedInspector}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [schedules, search, statusFilter, dateFilter]);

  const stats = useMemo(() => computeStats(schedules), [schedules]);

  const handleSave = async (values) => {
    try {
      if (editingSchedule) {
        await scheduleApi.updateSchedule(editingSchedule._id, values);
        enqueueSnackbar('Schedule updated', { variant: 'success' });
      } else {
        await scheduleApi.createSchedule(values);
        enqueueSnackbar('Schedule created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditingSchedule(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save schedule', { variant: 'error' });
    }
  };

  const handleAdvanceStatus = async (schedule) => {
    const nextStatus = NEXT_STATUS[schedule.status];
    if (!nextStatus) return;
    try {
      await scheduleApi.updateSchedule(schedule._id, { status: nextStatus });
      enqueueSnackbar(`Marked ${schedule.blockAddress} as ${nextStatus}`, { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update status', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await scheduleApi.deleteSchedule(deleteTarget._id);
      enqueueSnackbar('Schedule cancelled', { variant: 'success' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to cancel schedule', { variant: 'error' });
    }
  };

  const handleExport = () => {
    exportToCSV('schedules.csv', filteredSchedules, SCHEDULE_CSV_COLUMNS);
  };

  const columns = [
    {
      field: 'scheduledDate',
      headerName: 'Scheduled Date',
      width: 160,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <span>{formatDate(params.value)}</span>
          {isOverdue(params.row) && (
            <Tooltip title="Past scheduled date, still open">
              <WarningAmberIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    { field: 'townCouncil', headerName: 'Town Council', width: 180 },
    { field: 'liftCompany', headerName: 'Lift Company', width: 160 },
    { field: 'blockAddress', headerName: 'Block/Lift Address', width: 200 },
    { field: 'assignedInspector', headerName: 'Inspector', width: 140 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <StatusChip value={params.value} colorMap={SCHEDULE_STATUS_COLORS} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: canEdit ? 190 : 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => setViewingSchedule(params.row)} title="View details">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          {canEdit && (
            <>
              {NEXT_STATUS[params.row.status] && (
                <Tooltip title={`Mark ${NEXT_STATUS[params.row.status]}`}>
                  <IconButton size="small" onClick={() => handleAdvanceStatus(params.row)}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton
                size="small"
                onClick={() => {
                  setEditingSchedule(params.row);
                  setFormOpen(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setDeleteTarget(params.row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Servicing Schedule</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport}>
            Export CSV
          </Button>
          {canEdit && (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setEditingSchedule(null);
                setFormOpen(true);
              }}
            >
              Add Schedule
            </Button>
          )}
        </Stack>
      </Stack>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label={`Upcoming (next ${UPCOMING_WINDOW_DAYS} days)`}
            value={stats.upcomingCount}
            icon={<EventUpcomingIcon />}
            color="primary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Overdue" value={stats.overdueCount} icon={<WarningAmberIcon />} color="warning.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Recently Completed"
            value={stats.recentlyCompletedCount}
            icon={<CheckCircleIcon />}
            color="success.main"
          />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          label="Search"
          placeholder="Town council, lift company, block, inspector…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
        />
        <TextField
          select
          label="Status"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {SCHEDULE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Date"
          type="date"
          size="small"
          value={dateFilter}
          slotProps={{ inputLabel: { shrink: true } }}
          onChange={(e) => setDateFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        />
      </Stack>

      <Box sx={{ height: 560, bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={filteredSchedules}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <ScheduleFormDialog
        open={formOpen}
        schedule={editingSchedule}
        onClose={() => {
          setFormOpen(false);
          setEditingSchedule(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Cancel Schedule"
        message={`Cancel the spot-check for ${deleteTarget?.blockAddress}? This cannot be undone.`}
        confirmLabel="Cancel Schedule"
        confirmColor="error"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ScheduleDetailsModal
        open={Boolean(viewingSchedule)}
        schedule={viewingSchedule}
        onClose={() => setViewingSchedule(null)}
      />
    </Box>
  );
}
