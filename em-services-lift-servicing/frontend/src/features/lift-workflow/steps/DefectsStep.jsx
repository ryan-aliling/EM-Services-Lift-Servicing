import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import StatusChip from '../../../components/StatusChip';
import ConfirmDialog from '../../../components/ConfirmDialog';
import DefectFormDialog from '../../defects/DefectFormDialog';
import * as defectApi from '../../../api/defectApi';
import { DEFECT_SEVERITIES, DEFECT_STATUSES } from '../../../utils/defectHelpers';
import { formatDate } from '../../../utils/formatDate';
import { exportToCSV } from '../../../utils/csvExport';
import { DEFECT_CSV_COLUMNS } from '../../defects/defectCsvColumns';
import { DEFECT_STATUS_COLORS, DEFECT_SEVERITY_COLORS } from '../../../theme/statusColors';
import { useAuth } from '../../../context/AuthContext';
import { isAdminOrMaster } from '../../../utils/roles';

// Step 3 of the Lift Workflow - same CRUD/API as the standalone Defects page, scoped down
// to defects linked to the currently selected lift. A fresh defect logged here already
// carries this lift's id (DefectFormDialog's initialLiftId), ready for Step 4 to rectify.
export default function DefectsStep({ lift }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  // Defects can be logged/edited freely by any role, including Staff (not restricted to
  // lifts/schedules assigned to them). Delete is Admin/Master only.
  const canCreateOrEdit = true;
  const canManageFull = isAdminOrMaster(user.role);

  const [defects, setDefects] = useState([]);
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
      const defectList = await defectApi.fetchDefects();
      setDefects(defectList);
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

  const liftDefects = useMemo(() => defects.filter((d) => d.liftId === lift._id), [defects, lift._id]);

  const filteredDefects = useMemo(() => {
    return liftDefects.filter((defect) => {
      if (statusFilter && defect.status !== statusFilter) return false;
      if (severityFilter && defect.severity !== severityFilter) return false;
      if (search) {
        const haystack = `${defect.defectNo} ${defect.title} ${defect.location}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [liftDefects, search, statusFilter, severityFilter]);

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

  const handleExport = () => {
    exportToCSV(`defects-${lift.liftCode}.csv`, filteredDefects, DEFECT_CSV_COLUMNS);
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
    { field: 'location', headerName: 'Location', width: 180 },
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
      width: canManageFull ? 100 : canCreateOrEdit ? 60 : 40,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row">
          {canCreateOrEdit && (
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
          )}
          {canManageFull && (
            <IconButton size="small" title="Delete defect" onClick={() => setDeleteTarget(params.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Defects — {lift.liftCode}</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport}>
            Export CSV
          </Button>
          {canCreateOrEdit && (
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
      </Stack>

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          label="Search"
          placeholder="Defect no, title, location…"
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
          height: 480,
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
        initialLiftId={lift._id}
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
      <Typography variant="body2">No defects logged for this lift yet.</Typography>
    </Stack>
  );
}
