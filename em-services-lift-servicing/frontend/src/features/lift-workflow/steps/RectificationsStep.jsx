import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import StatusChip from '../../../components/StatusChip';
import ConfirmDialog from '../../../components/ConfirmDialog';
import RectificationForm from '../../rectifications/RectificationForm';
import RectificationDetail from '../../rectifications/RectificationDetail';
import { useRectifications } from '../../rectifications/useRectifications';
import * as defectApi from '../../../api/defectApi';
import { formatDate } from '../../../utils/formatDate';
import { RECTIFICATION_STATUS_COLORS, DEFECT_STATUS_COLORS } from '../../../theme/statusColors';
import { useAuth } from '../../../context/AuthContext';

// Step 4 of the Lift Workflow - same CRUD/API as the standalone Rectifications page
// (rectificationApi via useRectifications, RectificationForm) scoped down to this lift.
// Rectifications don't carry a liftId of their own (see models/rectifications/Rectification.js) -
// they link to a Defect, which does - so scoping walks that same chain Step 3 built:
// lift -> defects -> rectifications closing those defects out.
export default function RectificationsStep({ lift }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canEdit = user.role === 'Admin' || user.role === 'Manager';

  const { rectifications, loading, create, update, endorse, remove } = useRectifications();

  const [liftDefects, setLiftDefects] = useState([]);
  const [defectsLoading, setDefectsLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRectification, setEditingRectification] = useState(null);
  const [prefilledDefectId, setPrefilledDefectId] = useState(null);
  const [viewingRectification, setViewingRectification] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadDefects = () => {
    setDefectsLoading(true);
    return defectApi
      .fetchDefects()
      .then((list) => setLiftDefects(list.filter((d) => d.liftId === lift._id)))
      .catch(() => enqueueSnackbar('Failed to load defects for this lift', { variant: 'error' }))
      .finally(() => setDefectsLoading(false));
  };

  useEffect(() => {
    loadDefects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lift._id]);

  const liftRectifications = useMemo(
    () => rectifications.filter((r) => r.defectId?.liftId === lift._id),
    [rectifications, lift._id]
  );

  const rectifiedDefectIds = useMemo(
    () => new Set(liftRectifications.map((r) => r.defectId?._id).filter(Boolean)),
    [liftRectifications]
  );

  const openCreate = (defectId = null) => {
    setEditingRectification(null);
    setPrefilledDefectId(defectId);
    setFormOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (editingRectification) {
        await update(editingRectification._id, values);
        enqueueSnackbar('Rectification updated', { variant: 'success' });
      } else {
        await create(values);
        enqueueSnackbar('Rectification created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditingRectification(null);
      setPrefilledDefectId(null);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save rectification', { variant: 'error' });
      throw err;
    }
  };

  const handleEndorse = async (id, endorsedBy) => {
    await endorse(id, endorsedBy);
    setViewingRectification(null);
    // Endorsing advances the linked Defect's status server-side (see
    // endorseRectification in rectificationController.js) - refetch so the "Open Defects
    // for this Lift" panel above reflects that instead of showing its stale pre-endorse status.
    loadDefects();
  };

  const handleDelete = async () => {
    try {
      await remove(deleteTarget._id);
      enqueueSnackbar('Rectification deleted', { variant: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete rectification', { variant: 'error' });
    }
  };

  const columns = [
    {
      field: 'photo',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        params.row.proofPhotos?.[0] ? (
          <Box
            component="img"
            src={params.row.proofPhotos[0]}
            alt=""
            sx={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 1, my: 'auto' }}
          />
        ) : null,
    },
    {
      field: 'defect',
      headerName: 'Defect',
      flex: 1,
      minWidth: 220,
      valueGetter: (_value, row) => row.defectId?.description || row.defectId?.title || '—',
    },
    {
      field: 'liftCompanyName',
      headerName: 'Lift Company',
      width: 180,
      valueGetter: (value) => value || '—',
    },
    {
      field: 'dateRectified',
      headerName: 'Date Rectified',
      width: 130,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <StatusChip value={params.value} colorMap={RECTIFICATION_STATUS_COLORS} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: canEdit ? 60 : 20,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        canEdit && params.row.status === 'Draft' ? (
          <IconButton
            size="small"
            title="Delete rectification"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(params.row);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        ) : null,
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Rectifications — {lift.liftCode}</Typography>
        {canEdit && (
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => openCreate()}>
            New Rectification
          </Button>
        )}
      </Stack>

      {!defectsLoading && liftDefects.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Open Defects for this Lift
          </Typography>
          <Stack spacing={1}>
            {liftDefects.map((d) => (
              <Stack
                key={d._id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="body2">
                    <strong>{d.defectNo}</strong> — {d.title}
                  </Typography>
                  <StatusChip value={d.status} colorMap={DEFECT_STATUS_COLORS} />
                </Stack>
                {canEdit && (
                  <Button
                    size="small"
                    startIcon={<BuildOutlinedIcon fontSize="small" />}
                    disabled={rectifiedDefectIds.has(d._id)}
                    onClick={() => openCreate(d._id)}
                  >
                    {rectifiedDefectIds.has(d._id) ? 'Rectification logged' : 'Rectify'}
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      <Box sx={{ height: 480, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <DataGrid
          rows={liftRectifications}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          disableRowSelectionOnClick
          onRowClick={(params) => setViewingRectification(params.row)}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{ border: 'none', '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          slots={{ noRowsOverlay: RectificationsEmptyState }}
        />
      </Box>

      <RectificationForm
        open={formOpen}
        rectification={editingRectification}
        initialDefectId={prefilledDefectId}
        liftId={lift._id}
        onClose={() => {
          setFormOpen(false);
          setEditingRectification(null);
          setPrefilledDefectId(null);
        }}
        onSubmit={handleSave}
      />

      <RectificationDetail
        open={Boolean(viewingRectification)}
        rectification={viewingRectification}
        onClose={() => setViewingRectification(null)}
        onEdit={() => {
          setEditingRectification(viewingRectification);
          setViewingRectification(null);
          setFormOpen(true);
        }}
        onEndorse={handleEndorse}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Rectification"
        message="Delete this draft rectification? This cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

function RectificationsEmptyState() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', color: 'text.secondary' }}>
      <BuildOutlinedIcon sx={{ fontSize: 32 }} />
      <Typography variant="body2">No rectifications yet for this lift.</Typography>
    </Stack>
  );
}
