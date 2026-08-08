import { useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import ElevatorIcon from '@mui/icons-material/ElevatorOutlined';
import BuildIcon from '@mui/icons-material/BuildOutlined';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import StatCard from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import LiftFormDialog from './LiftFormDialog';
import LiftDetailDialog from './LiftDetailDialog';
import * as liftApi from '../../api/liftApi';
import { LIFT_TYPES, LIFT_STATUSES, isServiceDue } from '../../utils/liftHelpers';
import { formatDate } from '../../utils/formatDate';
import { exportToCSV } from '../../utils/csvExport';
import { parseCSV, rowsToLiftPayloads } from '../../utils/csvImport';
import { LIFT_STATUS_COLORS } from '../../theme/statusColors';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrMaster } from '../../utils/roles';

const IMPORT_TEMPLATE_COLUMNS = [
  { label: 'Lift Code', value: (l) => l.liftCode },
  { label: 'Block', value: (l) => l.block },
  { label: 'Unit', value: (l) => l.unit },
  { label: 'Type', value: (l) => l.type },
  { label: 'Capacity', value: (l) => l.capacity },
  { label: 'Status', value: (l) => l.status },
  { label: 'Manufacturer', value: (l) => l.manufacturer },
  { label: 'Install Date', value: (l) => l.installDate },
  { label: 'Last Serviced', value: (l) => l.lastServiced },
];

export default function Lifts() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  // Lift management (create/edit/delete/import) is Admin/Master only - the role matrix
  // grants Staff no access here at all.
  const canEdit = isAdminOrMaster(user.role);

  const [lifts, setLifts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingLift, setEditingLift] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingLift, setViewingLift] = useState(null);

  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [liftList, liftStats] = await Promise.all([liftApi.fetchLifts(), liftApi.fetchLiftStats()]);
      setLifts(liftList);
      setStats(liftStats);
    } catch {
      enqueueSnackbar('Failed to load lifts - is the backend running?', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLifts = useMemo(() => {
    return lifts.filter((lift) => {
      if (statusFilter && lift.status !== statusFilter) return false;
      if (typeFilter && lift.type !== typeFilter) return false;
      if (search) {
        const haystack = `${lift.liftCode} ${lift.block} ${lift.unit} ${lift.manufacturer}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [lifts, search, statusFilter, typeFilter]);

  const handleSave = async (values) => {
    try {
      if (editingLift) {
        await liftApi.updateLift(editingLift._id, values);
        enqueueSnackbar('Lift updated', { variant: 'success' });
      } else {
        await liftApi.createLift(values);
        enqueueSnackbar('Lift created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditingLift(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save lift', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await liftApi.deleteLift(deleteTarget._id);
      enqueueSnackbar('Lift deleted', { variant: 'success' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete lift', { variant: 'error' });
    }
  };

  const handleExport = () => {
    exportToCSV('lifts.csv', filteredLifts, [
      { label: 'Lift Code', value: (l) => l.liftCode },
      { label: 'Block', value: (l) => l.block },
      { label: 'Unit', value: (l) => l.unit },
      { label: 'Type', value: (l) => l.type },
      { label: 'Capacity', value: (l) => l.capacity },
      { label: 'Status', value: (l) => l.status },
      { label: 'Manufacturer', value: (l) => l.manufacturer },
      { label: 'Last Serviced', value: (l) => formatDate(l.lastServiced) },
    ]);
  };

  const handleDownloadTemplate = () => {
    exportToCSV(
      'lifts-import-template.csv',
      [
        {
          liftCode: 'LIFT-001',
          block: 'A',
          unit: '01-01',
          type: 'Passenger',
          capacity: 800,
          status: 'Active',
          manufacturer: 'Otis',
          installDate: '2020-01-15',
          lastServiced: '2026-05-01',
        },
      ],
      IMPORT_TEMPLATE_COLUMNS
    );
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
      const payloads = rowsToLiftPayloads(parseCSV(text));
      if (!payloads.length) {
        enqueueSnackbar('No data rows found in that CSV', { variant: 'warning' });
        return;
      }

      const result = await liftApi.importLifts(payloads);
      setImportResult({ ...result, total: payloads.length });
      enqueueSnackbar(
        result.failed.length
          ? `Imported ${result.created} of ${payloads.length} lift(s) — ${result.failed.length} failed`
          : `Imported ${result.created} lift(s)`,
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
    { field: 'liftCode', headerName: 'Lift Code', width: 130, fontWeight: 600 },
    { field: 'block', headerName: 'Block', width: 100 },
    { field: 'unit', headerName: 'Unit', width: 90 },
    { field: 'type', headerName: 'Type', width: 110 },
    { field: 'capacity', headerName: 'Capacity (kg)', width: 130, type: 'number' },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <StatusChip value={params.value} colorMap={LIFT_STATUS_COLORS} />,
    },
    {
      field: 'lastServiced',
      headerName: 'Last Serviced',
      width: 160,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <span>{formatDate(params.value)}</span>
          {isServiceDue(params.row) && (
            <Tooltip title="Service overdue (180+ days)">
              <WarningAmberIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    { field: 'manufacturer', headerName: 'Manufacturer', width: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: canEdit ? 150 : 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => setViewingLift(params.row)} title="View history">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          {canEdit && (
            <>
              <IconButton
                size="small"
                onClick={() => {
                  setEditingLift(params.row);
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
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4">Lift Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Track lift assets, service status, and maintenance history.
          </Typography>
          {canEdit && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Importing lifts?{' '}
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
          {canEdit && (
            <>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFileSelected} />
              <Tooltip title="Import lifts from a .csv file">
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
                  setEditingLift(null);
                  setFormOpen(true);
                }}
              >
                Add Lift
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Total Lifts" value={stats.total} icon={<ElevatorIcon />} color="primary.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Active" value={stats.active} icon={<ElevatorIcon />} color="success.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Under Maintenance" value={stats.maintenance} icon={<BuildIcon />} color="warning.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Out of Service" value={stats.outOfService} icon={<BlockIcon />} color="error.main" />
          </Grid>
        </Grid>
      )}

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          label="Search"
          placeholder="Lift code, block, unit, manufacturer…"
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
          {LIFT_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          size="small"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {LIFT_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box
        sx={{
          height: 560,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <DataGrid
          rows={filteredLifts}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{ border: 'none' }}
          slots={{ noRowsOverlay: LiftsEmptyState }}
        />
      </Box>

      <LiftFormDialog
        open={formOpen}
        lift={editingLift}
        onClose={() => {
          setFormOpen(false);
          setEditingLift(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Lift"
        message={`Delete lift ${deleteTarget?.liftCode}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <LiftDetailDialog open={Boolean(viewingLift)} lift={viewingLift} onClose={() => setViewingLift(null)} />

      <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />
    </Box>
  );
}

function LiftsEmptyState() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', color: 'text.secondary' }}>
      <ElevatorIcon sx={{ fontSize: 32 }} />
      <Typography variant="body2">No lifts match the current filters.</Typography>
    </Stack>
  );
}

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
                Row {f.row}{f.liftCode ? ` (${f.liftCode})` : ''}: {f.message}
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
