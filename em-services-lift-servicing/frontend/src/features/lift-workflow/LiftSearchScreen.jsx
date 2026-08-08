import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import ElevatorOutlinedIcon from '@mui/icons-material/ElevatorOutlined';
import StatusChip from '../../components/StatusChip';
import * as liftApi from '../../api/liftApi';
import { LIFT_TYPES, LIFT_STATUSES } from '../../utils/liftHelpers';
import { LIFT_STATUS_COLORS } from '../../theme/statusColors';

// The "first page" of the Lift Workflow: search/filter the lift directory and pick one to
// work on. Deliberately read-only (no create/edit/delete) - Lift CRUD stays on its own
// Lifts tab so the two features' responsibilities never overlap.
export default function LiftSearchScreen({ onSelectLift }) {
  const { enqueueSnackbar } = useSnackbar();
  const [lifts, setLifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    liftApi
      .fetchLifts()
      .then(setLifts)
      .catch(() => enqueueSnackbar('Failed to load lifts - is the backend running?', { variant: 'error' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLifts = useMemo(() => {
    return lifts.filter((lift) => {
      if (statusFilter && lift.status !== statusFilter) return false;
      if (typeFilter && lift.type !== typeFilter) return false;
      if (search) {
        const haystack = `${lift.liftCode} ${lift.block} ${lift.unit}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [lifts, search, statusFilter, typeFilter]);

  const columns = [
    { field: 'liftCode', headerName: 'Lift Code', width: 140 },
    { field: 'block', headerName: 'Block', width: 140 },
    { field: 'unit', headerName: 'Unit', width: 120 },
    { field: 'type', headerName: 'Type', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => <StatusChip value={params.value} colorMap={LIFT_STATUS_COLORS} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => onSelectLift(params.row)}>
          Select
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
        <ElevatorOutlinedIcon color="primary" />
        <Typography variant="h4">Lift Workflow</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Search for a lift to schedule a spot-check, log an inspection, track defects, and record rectifications - all
        in one guided flow.
      </Typography>

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          label="Search"
          placeholder="Lift code, block, unit…"
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
          {LIFT_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
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
          {LIFT_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ height: 560, bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={filteredLifts}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          disableRowSelectionOnClick
          onRowClick={(params) => onSelectLift(params.row)}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Box>
    </Box>
  );
}
