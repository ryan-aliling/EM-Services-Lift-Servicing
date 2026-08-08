import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import StatCard from '../../components/StatCard';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import DefectFormDialog from './DefectFormDialog';
import * as defectApi from '../../api/defectApi';
import { DEFECT_SEVERITIES, DEFECT_STATUSES } from '../../utils/defectHelpers';
import { formatDate } from '../../utils/formatDate';
import { DEFECT_STATUS_COLORS, DEFECT_SEVERITY_COLORS } from '../../theme/statusColors';
import { useAuth } from '../../context/AuthContext';

export default function Defects() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canEdit = user.role === 'Admin' || user.role === 'Manager';

  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [defectList, defectStats] = await Promise.all([
        defectApi.fetchDefects(),
        defectApi.fetchDefectStats(),
      ]);
      setDefects(defectList);
      setStats(defectStats);
    } catch {
      enqueueSnackbar('Failed to load defects - is the backend running?', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDefects = useMemo(() => {
    return defects.filter((defect) => {
      if (statusFilter && defect.status !== statusFilter) return false;
      if (severityFilter && defect.severity !== severityFilter) return false;
      if (search) {
        const haystack = `${defect.defectNo} ${defect.title} ${defect.location} ${defect.liftCode}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [defects, search, statusFilter, severityFilter]);

  const handleSave = async (values) => {
    try {
      if (editingDefect) {
        await defectApi.updateDefect(editingDefect._id, values);
        enqueueSnackbar('Defect updated', { variant: 'success' });
      } else {
        await defectApi.createDefect(values);
        enqueueSnackbar('Defect logged', { variant: 'success' });
      }
      setFormOpen(false);
      setEditingDefect(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save defect', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await defectApi.deleteDefect(deleteTarget._id);
      enqueueSnackbar('Defect deleted', { variant: 'success' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete defect', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'defectNo', headerName: 'Defect No.', width: 110 },
    { field: 'title', headerName: 'Title', width: 220, flex: 1 },
    {
      field: 'location',
      headerName: 'Location / Lift',
      width: 180,
      renderCell: (params) => (
        <span>
          {params.row.location}
          {params.row.liftCode ? ` (${params.row.liftCode})` : ''}
        </span>
      ),
    },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 120,
      renderCell: (params) => <StatusChip value={params.value} colorMap={DEFECT_SEVERITY_COLORS} />,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <StatusChip value={params.value} colorMap={DEFECT_STATUS_COLORS} />,
    },
    {
      field: 'reportedDate',
      headerName: 'Reported',
      width: 120,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: canEdit ? 100 : 40,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        canEdit ? (
          <Stack direction="row">
            <IconButton
              size="small"
              title="Edit defect"
              onClick={() => {
                setEditingDefect(params.row);
                setFormOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" title="Delete defect" onClick={() => setDeleteTarget(params.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ) : null,
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4">Defect Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Log, track, and resolve lift defects across all properties.
          </Typography>
        </Box>
        {canEdit && (
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {
              setEditingDefect(null);
              setFormOpen(true);
            }}
          >
            Log Defect
          </Button>
        )}
      </Stack>

      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Total Defects" value={stats.total} icon={<ReportProblemOutlinedIcon />} color="primary.main" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Open" value={stats.open} icon={<HourglassEmptyOutlinedIcon />} color="error.main" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="In Progress" value={stats.inProgress} icon={<BuildOutlinedIcon />} color="warning.main" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircleOutlinedIcon />} color="success.main" />
          </Grid>
        </Grid>
      )}

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          label="Search"
          placeholder="Defect no, title, location, lift code…"
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
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {DEFECT_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Severity"
          size="small"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All severities</MenuItem>
          {DEFECT_SEVERITIES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
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
          rows={filteredDefects}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{ border: 'none' }}
          slots={{ noRowsOverlay: DefectsEmptyState }}
        />
      </Box>

      <DefectFormDialog
        open={formOpen}
        defect={editingDefect}
        onClose={() => {
          setFormOpen(false);
          setEditingDefect(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Defect"
        message={`Delete defect ${deleteTarget?.defectNo}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

function DefectsEmptyState() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', color: 'text.secondary' }}>
      <ReportProblemOutlinedIcon sx={{ fontSize: 32 }} />
      <Typography variant="body2">No defects match the current filters.</Typography>
    </Stack>
  );
}