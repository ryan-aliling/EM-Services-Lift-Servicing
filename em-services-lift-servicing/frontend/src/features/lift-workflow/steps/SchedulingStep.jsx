import { useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import StatusChip from '../../../components/StatusChip';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ScheduleFormDialog from '../../scheduling/ScheduleFormDialog';
import ScheduleDetailsModal from '../../scheduling/ScheduleDetailsModal';
import * as scheduleApi from '../../../api/scheduleApi';
import { SCHEDULE_STATUSES, NEXT_STATUS, isOverdue } from '../../../utils/scheduleHelpers';
import { formatDate } from '../../../utils/formatDate';
import { exportToCSV } from '../../../utils/csvExport';
import { parseCSV, rowsToSchedulePayloads } from '../../../utils/csvImport';
import { SCHEDULE_CSV_COLUMNS } from '../../scheduling/scheduleCsvColumns';
import { SCHEDULE_STATUS_COLORS } from '../../../theme/statusColors';
import { useAuth } from '../../../context/AuthContext';
import { ROLES, isAdminOrMaster } from '../../../utils/roles';

const IMPORT_TEMPLATE_ROW = {
  townCouncil: 'Tampines Town Council',
  liftCompany: 'ABC Lifts Pte Ltd',
  blockAddress: 'Blk 201 Tampines St 21',
  scheduledDate: '2026-09-01',
  assignedInspector: 'John Tan',
  status: 'Scheduled',
  notes: 'Monthly spot-check',
};

// Step 1 of the Lift Workflow - same CRUD/API as the standalone Scheduling page (Student
// owner's scheduleApi + ScheduleFormDialog are reused untouched), just scoped down to
// schedules linked to the currently selected lift.
export default function SchedulingStep({ lift }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  // Admin/Master: full CRUD (Add Schedule, full-field Edit, Delete). Staff: read-only,
  // except they can advance the status on their own assigned schedule - a separate, narrower
  // affordance from canManageSchedule, not the same flag reused. The backend already scopes
  // fetchSchedules() to "assigned to me" for a Staff caller (see schedulingController.js),
  // so there's no client-side filter to add here - only these action gates.
  const canManageSchedule = isAdminOrMaster(user.role);
  const canUpdateOwnStatus = user.role === ROLES.STAFF;
  const isOwnSchedule = (row) => String(row.assignedStaffId) === String(user.id);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingSchedule, setViewingSchedule] = useState(null);

  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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

  const liftSchedules = useMemo(() => schedules.filter((s) => s.liftId === lift._id), [schedules, lift._id]);

  const filteredSchedules = useMemo(() => {
    return liftSchedules.filter((schedule) => {
      if (statusFilter && schedule.status !== statusFilter) return false;
      if (dateFilter && schedule.scheduledDate.slice(0, 10) !== dateFilter) return false;
      if (search) {
        const haystack = `${schedule.townCouncil} ${schedule.liftCompany} ${schedule.blockAddress} ${schedule.assignedInspector}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [liftSchedules, search, statusFilter, dateFilter]);

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
    exportToCSV(`schedules-${lift.liftCode}.csv`, filteredSchedules, SCHEDULE_CSV_COLUMNS);
  };

  const handleDownloadTemplate = () => {
    exportToCSV('schedules-import-template.csv', [IMPORT_TEMPLATE_ROW], SCHEDULE_CSV_COLUMNS);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so re-selecting the same file still fires onChange

    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      enqueueSnackbar('Only .csv files are supported', { variant: 'error' });
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      // Stamp the currently selected lift onto every imported row - CSV columns don't
      // include liftId (impractical to hand-type an ObjectId), so without this every
      // imported schedule stayed unlinked and never matched this page's liftId filter
      // below, making a "successful" import look like it silently did nothing.
      const payloads = rowsToSchedulePayloads(parseCSV(text)).map((row) => ({ ...row, liftId: lift._id }));
      if (!payloads.length) {
        enqueueSnackbar('No data rows found in that CSV', { variant: 'warning' });
        return;
      }

      const result = await scheduleApi.importSchedules(payloads);
      setImportResult({ ...result, total: payloads.length });
      enqueueSnackbar(
        result.failed.length
          ? `Imported ${result.created} of ${payloads.length} schedule(s) — ${result.failed.length} failed`
          : `Imported ${result.created} schedule(s)`,
        { variant: result.failed.length ? 'warning' : 'success' }
      );
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to import CSV', { variant: 'error' });
    } finally {
      setImporting(false);
    }
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
      width: canManageSchedule ? 190 : 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => setViewingSchedule(params.row)} title="View details">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          {(canManageSchedule || (canUpdateOwnStatus && isOwnSchedule(params.row))) && NEXT_STATUS[params.row.status] && (
            <Tooltip title={`Mark ${NEXT_STATUS[params.row.status]}`}>
              <IconButton size="small" onClick={() => handleAdvanceStatus(params.row)}>
                <ArrowForwardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canManageSchedule && (
            <>
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
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h6">Scheduling — {lift.liftCode}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
            Plan and track this lift's spot-check visits: set the service date, assign a
            technician/inspector, and move each visit through Scheduled → Assigned → In
            Progress → Completed as work happens.
          </Typography>
          {canManageSchedule && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Importing schedules?{' '}
              <Button
                size="small"
                onClick={handleDownloadTemplate}
                sx={{ p: 0, minWidth: 0, fontSize: 'inherit', verticalAlign: 'baseline' }}
              >
                Download the CSV template
              </Button>
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport}>
            Export CSV
          </Button>
          {canManageSchedule && (
            <>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFileSelected} />
              <Tooltip title="Import schedules from a .csv file">
                <span>
                  <Button
                    startIcon={<UploadIcon />}
                    variant="outlined"
                    onClick={handleImportClick}
                    disabled={importing}
                  >
                    {importing ? 'Importing…' : 'Import CSV'}
                  </Button>
                </span>
              </Tooltip>
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
            </>
          )}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          label="Search"
          placeholder="Town council, lift company, inspector…"
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

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={filteredSchedules}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <ScheduleFormDialog
        open={formOpen}
        schedule={editingSchedule}
        initialLiftId={lift._id}
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

      <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />
    </Box>
  );
}

// Mirrors Lifts.jsx's ImportResultDialog exactly (same shape from the backend:
// { created, failed: [{row, message}] }) - kept as a local copy rather than a
// shared component since the two features' row-identifier column differs
// (liftCode vs blockAddress).
function ImportResultDialog({ result, onClose }) {
  if (!result) return null;
  const { created, total, failed } = result;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Results</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: failed.length ? 2 : 0 }}>
          Imported <strong>{created}</strong> of <strong>{total}</strong> row(s).
        </Typography>
        {failed.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="error">
              {failed.length} row(s) failed:
            </Typography>
            {failed.map((f) => (
              <Typography key={f.row} variant="body2" color="text.secondary">
                Row {f.row}
                {f.blockAddress ? ` (${f.blockAddress})` : ''}: {f.message}
              </Typography>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
