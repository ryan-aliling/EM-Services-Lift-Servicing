import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import ElevatorOutlinedIcon from '@mui/icons-material/ElevatorOutlined';
import ClearIcon from '@mui/icons-material/ClearOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import StatusChip from '../../components/StatusChip';
import * as liftApi from '../../api/liftApi';
import { LIFT_TYPES, LIFT_STATUSES, isServiceDue } from '../../utils/liftHelpers';
import { formatDate } from '../../utils/formatDate';
import { LIFT_STATUS_COLORS } from '../../theme/statusColors';

const EMPTY_FILTERS = {
  search: '',
  statusFilter: [],
  typeFilter: [],
  manufacturerFilter: [],
  blockFilter: [],
  capacityMin: '',
  capacityMax: '',
  lastServicedFrom: '',
  lastServicedTo: '',
};

// The "first page" of the Lift Workflow: search/filter the lift directory and pick one to
// work on. Deliberately read-only (no create/edit/delete) - Lift CRUD stays on its own
// Lifts tab so the two features' responsibilities never overlap.
export default function LiftSearchScreen({ onSelectLift }) {
  const { enqueueSnackbar } = useSnackbar();
  const [lifts, setLifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(EMPTY_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState(EMPTY_FILTERS.statusFilter);
  const [typeFilter, setTypeFilter] = useState(EMPTY_FILTERS.typeFilter);
  const [manufacturerFilter, setManufacturerFilter] = useState(EMPTY_FILTERS.manufacturerFilter);
  const [blockFilter, setBlockFilter] = useState(EMPTY_FILTERS.blockFilter);
  const [capacityMin, setCapacityMin] = useState(EMPTY_FILTERS.capacityMin);
  const [capacityMax, setCapacityMax] = useState(EMPTY_FILTERS.capacityMax);
  const [lastServicedFrom, setLastServicedFrom] = useState(EMPTY_FILTERS.lastServicedFrom);
  const [lastServicedTo, setLastServicedTo] = useState(EMPTY_FILTERS.lastServicedTo);

  useEffect(() => {
    // Fetches the whole lift directory once and filters entirely client-side (see
    // filteredLifts below). Fine at the scale this app runs at today; if the lift directory
    // grows into the thousands, this should move to server-side filtering/pagination
    // (liftApi.fetchLifts already accepts query params on other endpoints in this codebase)
    // rather than shipping every lift to the browser on every visit to this screen.
    liftApi
      .fetchLifts()
      .then(setLifts)
      .catch(() => enqueueSnackbar('Failed to load lifts - is the backend running?', { variant: 'error' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manufacturer/block aren't fixed enums like status/type (see liftHelpers.js) - their
  // filter options are derived from whatever values are actually present in the loaded
  // lifts, rather than hardcoded.
  const manufacturerOptions = useMemo(
    () => Array.from(new Set(lifts.map((l) => l.manufacturer).filter(Boolean))).sort(),
    [lifts]
  );
  const blockOptions = useMemo(() => Array.from(new Set(lifts.map((l) => l.block).filter(Boolean))).sort(), [lifts]);

  const filteredLifts = useMemo(() => {
    const minCap = capacityMin === '' ? null : Number(capacityMin);
    const maxCap = capacityMax === '' ? null : Number(capacityMax);

    return lifts.filter((lift) => {
      // Each multi-select filter is OR'd within itself (any selected value matches) but
      // AND'd against every other filter - an empty selection means "don't filter on this
      // field at all", matching the previous single-select "All ___" default.
      if (statusFilter.length && !statusFilter.includes(lift.status)) return false;
      if (typeFilter.length && !typeFilter.includes(lift.type)) return false;
      if (manufacturerFilter.length && !manufacturerFilter.includes(lift.manufacturer)) return false;
      if (blockFilter.length && !blockFilter.includes(lift.block)) return false;

      if (minCap !== null && !Number.isNaN(minCap) && (lift.capacity ?? 0) < minCap) return false;
      if (maxCap !== null && !Number.isNaN(maxCap) && (lift.capacity ?? 0) > maxCap) return false;

      // A lift with no lastServiced date has nothing to match against once either bound of
      // the range is set, so it's excluded rather than silently included.
      if (lastServicedFrom || lastServicedTo) {
        if (!lift.lastServiced) return false;
        const serviced = dayjs(lift.lastServiced);
        if (lastServicedFrom && serviced.isBefore(dayjs(lastServicedFrom), 'day')) return false;
        if (lastServicedTo && serviced.isAfter(dayjs(lastServicedTo), 'day')) return false;
      }

      if (search) {
        const haystack = `${lift.liftCode} ${lift.block} ${lift.unit}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [
    lifts,
    search,
    statusFilter,
    typeFilter,
    manufacturerFilter,
    blockFilter,
    capacityMin,
    capacityMax,
    lastServicedFrom,
    lastServicedTo,
  ]);

  const clearFilters = () => {
    setSearch(EMPTY_FILTERS.search);
    setStatusFilter(EMPTY_FILTERS.statusFilter);
    setTypeFilter(EMPTY_FILTERS.typeFilter);
    setManufacturerFilter(EMPTY_FILTERS.manufacturerFilter);
    setBlockFilter(EMPTY_FILTERS.blockFilter);
    setCapacityMin(EMPTY_FILTERS.capacityMin);
    setCapacityMax(EMPTY_FILTERS.capacityMax);
    setLastServicedFrom(EMPTY_FILTERS.lastServicedFrom);
    setLastServicedTo(EMPTY_FILTERS.lastServicedTo);
  };

  const filtersActive =
    search ||
    statusFilter.length ||
    typeFilter.length ||
    manufacturerFilter.length ||
    blockFilter.length ||
    capacityMin !== '' ||
    capacityMax !== '' ||
    lastServicedFrom ||
    lastServicedTo;

  const columns = [
    { field: 'liftCode', headerName: 'Lift Code', width: 130 },
    { field: 'block', headerName: 'Block', flex: 1, minWidth: 200 },
    { field: 'unit', headerName: 'Unit', width: 110 },
    { field: 'type', headerName: 'Type', width: 110 },
    { field: 'capacity', headerName: 'Capacity (kg)', width: 130, type: 'number' },
    { field: 'manufacturer', headerName: 'Manufacturer', width: 160 },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => <StatusChip value={params.value} colorMap={LIFT_STATUS_COLORS} />,
    },
    {
      field: 'lastServiced',
      headerName: 'Last Serviced',
      width: 170,
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
      <Typography variant="body2" color="text.secondary" mb={4}>
        Search for a lift to schedule a spot-check, log an inspection, track defects, and record rectifications - all
        in one guided flow.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Filters
        </Typography>

        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              label="Search"
              placeholder="Lift code, block, unit…"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 280 }}
            />
            <MultiSelectFilter
              allLabel="All statuses"
              options={LIFT_STATUSES}
              value={statusFilter}
              onChange={setStatusFilter}
              sx={{ minWidth: 180 }}
            />
            <MultiSelectFilter
              allLabel="All types"
              options={LIFT_TYPES}
              value={typeFilter}
              onChange={setTypeFilter}
              sx={{ minWidth: 160 }}
            />
            <MultiSelectFilter
              allLabel="All manufacturers"
              options={manufacturerOptions}
              value={manufacturerFilter}
              onChange={setManufacturerFilter}
              sx={{ minWidth: 200 }}
            />
            <MultiSelectFilter
              allLabel="All blocks"
              options={blockOptions}
              value={blockFilter}
              onChange={setBlockFilter}
              sx={{ minWidth: 180 }}
            />
          </Stack>

          <Divider />

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 'auto' }}>
              Capacity (kg):
            </Typography>
            <TextField
              label="Min"
              type="number"
              size="small"
              value={capacityMin}
              onChange={(e) => setCapacityMin(e.target.value)}
              sx={{ width: 110 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Max"
              type="number"
              size="small"
              value={capacityMax}
              onChange={(e) => setCapacityMax(e.target.value)}
              sx={{ width: 110 }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 'auto', ml: 2 }}>
              Last serviced:
            </Typography>
            <TextField
              label="From"
              type="date"
              size="small"
              value={lastServicedFrom}
              onChange={(e) => setLastServicedFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 170 }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={lastServicedTo}
              onChange={(e) => setLastServicedTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 170 }}
            />
            <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters} disabled={!filtersActive} sx={{ ml: 'auto' }}>
              Clear filters
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Showing {filteredLifts.length} of {lifts.length} lift{lifts.length === 1 ? '' : 's'}
      </Typography>

      <Box
        sx={{
          height: 600,
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
          onRowClick={(params) => onSelectLift(params.row)}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          rowHeight={60}
          sx={{ border: 'none', '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Box>
    </Box>
  );
}

// Shared multi-select control for the categorical filters above - same "Select multiple +
// checkbox + summary text" pattern already used for the status filter on the Inspections
// step (see steps/InspectionsStep.jsx), reused here instead of inventing a second pattern.
// An empty selection means "don't filter on this field", shown as `allLabel`.
function MultiSelectFilter({ allLabel, options, value, onChange, sx }) {
  return (
    <Select
      multiple
      displayEmpty
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      input={<OutlinedInput />}
      renderValue={(selected) => (selected.length === 0 ? allLabel : selected.join(', '))}
      sx={sx}
    >
      {options.length === 0 && (
        <MenuItem disabled value="">
          No options available
        </MenuItem>
      )}
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          <Checkbox size="small" checked={value.includes(option)} />
          <ListItemText primary={option} />
        </MenuItem>
      ))}
    </Select>
  );
}
