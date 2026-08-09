import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, Chip, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import * as auditLogApi from '../../api/auditLogApi';
import { formatDateTime } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrMaster } from '../../utils/roles';

const TYPES = ['Lift', 'Schedule', 'Inspection', 'Defect', 'Rectification'];

// Plain MUI Chip colors, not the app's per-feature StatusChip colorMaps - this page shows
// five different features' worth of status values side by side (Lift's "Active", Defect's
// "Open", Inspection's "Draft", ...), so a single feature's colorMap doesn't apply here.
const ACTION_COLORS = { Created: 'success', Updated: 'info', Deleted: 'error' };

export default function AuditLogPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  // Tracked separately from the snackbar (which auto-dismisses) so a failed load reads as
  // "couldn't load" rather than being indistinguishable from a genuinely empty audit log
  // once the toast disappears.
  const [loadError, setLoadError] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setEntries(await auditLogApi.fetchAuditLog());
    } catch (err) {
      setLoadError(true);
      enqueueSnackbar(err.response?.data?.message || 'Failed to load audit log', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip the fetch entirely for a Staff user who navigates here directly by URL (the tab
    // itself is already hidden from them) - the backend would 403 it anyway, but there's no
    // reason to fire a request that can only ever fail for a page this render is about to
    // show "Not authorized" for regardless.
    if (isAdminOrMaster(user.role)) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defense in depth only - the Audit Log tab is already hidden from Staff (see
  // App.jsx's getTabs), and the backend rejects a Staff caller on GET /api/audit-log
  // regardless of what this page renders.
  if (!isAdminOrMaster(user.role)) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 12, color: 'text.secondary' }}>
        <Typography variant="h6">Not authorized to view this page.</Typography>
      </Stack>
    );
  }

  // Same convention as Lifts.jsx/DefectsStep.jsx: the backend supports server-side
  // type/limit filters, but filtering the already-fetched feed client-side is simpler and
  // functionally equivalent at this app's data volume.
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter && e.type !== typeFilter) return false;
      if (actionFilter && e.action !== actionFilter) return false;
      return true;
    });
  }, [entries, typeFilter, actionFilter]);

  const columns = [
    {
      field: 'type',
      headerName: 'Feature',
      width: 130,
      renderCell: (params) => <Chip label={params.value} size="small" variant="outlined" />,
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 110,
      renderCell: (params) => <Chip label={params.value} size="small" color={ACTION_COLORS[params.value]} />,
    },
    { field: 'status', headerName: 'Status', width: 130 },
    { field: 'label', headerName: 'Record', flex: 1, minWidth: 260 },
    {
      field: 'timestamp',
      headerName: 'When',
      width: 180,
      renderCell: (params) => formatDateTime(params.value),
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4">Audit Log</Typography>
          <Typography variant="body2" color="text.secondary">
            Recent activity across Lifts, Scheduling, Inspections, Defects, and Rectifications, most recent first.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Feature"
          size="small"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All features</MenuItem>
          {TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Action"
          size="small"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All actions</MenuItem>
          {Object.keys(ACTION_COLORS).map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ height: 560, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <DataGrid
          rows={filteredEntries}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'timestamp', sort: 'desc' }] },
          }}
          sx={{ border: 'none' }}
          slots={{ noRowsOverlay: AuditLogEmptyState }}
          slotProps={{ noRowsOverlay: { error: loadError, onRetry: load } }}
        />
      </Box>
    </Box>
  );
}

function AuditLogEmptyState({ error, onRetry }) {
  if (error) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', color: 'error.main' }}>
        <ErrorOutlineIcon sx={{ fontSize: 32 }} />
        <Typography variant="body2">Couldn't load the audit log.</Typography>
        <Button size="small" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', color: 'text.secondary' }}>
      <HistoryOutlinedIcon sx={{ fontSize: 32 }} />
      <Typography variant="body2">No activity matches the current filters.</Typography>
    </Stack>
  );
}
