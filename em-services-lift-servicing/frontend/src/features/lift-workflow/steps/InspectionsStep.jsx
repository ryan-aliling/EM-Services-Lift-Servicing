import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import StatusChip from '../../../components/StatusChip';
import ConfirmDialog from '../../../components/ConfirmDialog';
import InspectionFormDialog from '../../inspections/InspectionFormDialog';
import * as inspectionApi from '../../../api/inspectionApi';
import { formatDate } from '../../../utils/formatDate';
import { exportToCSV } from '../../../utils/csvExport';
import { INSPECTION_STATUS_COLORS, DEFECT_COMPLIANCE_COLORS, DEFECT_SEVERITY_COLORS } from '../../../theme/statusColors';
import { useAuth } from '../../../context/AuthContext';
import { isAdminOrMaster } from '../../../utils/roles';
import { canEditReport, canDeleteReport } from '../../inspections/inspectionHelpers';

const STATUS_OPTIONS = ['Draft', 'Submitted', 'Under Review', 'Closed'];

// Step 2 of the Lift Workflow - same CRUD/API as the standalone Inspections page, scoped
// down to reports linked to the currently selected lift. Builds on Step 1: a fresh report
// created here already carries this lift's id (InspectionFormDialog's initialLiftId).
export default function InspectionsStep({ lift }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  // Create/edit is open to all 3 roles - the backend scopes a Staff caller to a schedule
  // assigned to them (or no schedule link at all). Delete is Admin/Master only.
  const canCreateOrEdit = true;
  const canManageFull = isAdminOrMaster(user.role);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState([]);
  const [sortField, setSortField] = useState('inspectionDate');
  const [sortDirection, setSortDirection] = useState('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await inspectionApi.fetchInspections();
      setReports(list);
    } catch {
      enqueueSnackbar('Failed to load inspection reports - is the backend running?', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liftReports = useMemo(() => reports.filter((r) => r.liftId === lift._id), [reports, lift._id]);

  const shownReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return liftReports
      .filter((r) => {
        const matchesSearch = !q || [r.reportNo, r.liftCode, r.block, r.inspectorName].some((v) => String(v || '').toLowerCase().includes(q));
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(r.overallStatus);
        return matchesSearch && matchesStatus;
      })
      .slice()
      .sort((a, b) => {
        const aVal = sortField === 'compliance' ? a.compliance : a[sortField];
        const bVal = sortField === 'compliance' ? b.compliance : b[sortField];
        return String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) * (sortDirection === 'asc' ? 1 : -1);
      });
  }, [liftReports, search, statusFilter, sortField, sortDirection]);

  const openCreate = () => { setEditingReport(null); setFormOpen(true); };
  const openEdit = (report) => { setEditingReport(report); setFormOpen(true); };
  const openView = (report) => setViewingReport(report);

  const handleSave = async (values) => {
    try {
      if (editingReport) {
        const updated = await inspectionApi.updateInspection(editingReport._id, values);
        enqueueSnackbar(`${updated.reportNo} updated`, { variant: 'success' });
      } else {
        const created = await inspectionApi.createInspection(values);
        enqueueSnackbar(`${created.reportNo} created`, { variant: 'success' });
      }
      setFormOpen(false);
      setEditingReport(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save inspection report', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      const res = await inspectionApi.deleteInspection(deleteTarget._id);
      enqueueSnackbar(res.message || 'Deleted', { variant: 'success' });
      setDeleteTarget(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete', { variant: 'error' });
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    exportToCSV(`inspection-reports-${lift.liftCode}.csv`, shownReports, [
      { label: 'Report No.', value: (r) => r.reportNo },
      { label: 'Inspection Date', value: (r) => formatDate(r.inspectionDate) },
      { label: 'Inspector', value: (r) => r.inspectorName },
      { label: 'Contractor', value: (r) => r.contractor },
      { label: 'Compliance', value: (r) => r.compliance },
      { label: 'Report Status', value: (r) => r.overallStatus },
      { label: 'Defects Logged', value: (r) => r.defects?.length || 0 },
    ]);
  };

  if (viewingReport) {
    return (
      <InspectionDetailView
        report={viewingReport}
        onBack={() => setViewingReport(null)}
        onEdit={canCreateOrEdit ? () => { setViewingReport(null); openEdit(viewingReport); } : null}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Inspections — {lift.liftCode}</Typography>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Inspection Reports</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search by report no., block or inspector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              sx={{ width: searchFocused || search ? 380 : 240, transition: 'width 0.2s ease' }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <Select
              multiple
              displayEmpty
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              input={<OutlinedInput />}
              renderValue={(selected) => (selected.length === 0 ? 'All Status' : selected.join(', '))}
              sx={{ minWidth: 170 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  <Checkbox size="small" checked={statusFilter.includes(s)} />
                  <ListItemText primary={s} />
                </MenuItem>
              ))}
            </Select>
            <Box sx={{ display: 'flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1, '&:hover': { borderColor: 'text.primary' } }}>
              <Select
                size="small" variant="standard" disableUnderline value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                sx={{ minWidth: 170, pl: 1.5, '& .MuiSelect-select': { py: '7.5px' } }}
              >
                <MenuItem value="inspectionDate">Sort: Inspection Date</MenuItem>
                <MenuItem value="reportNo">Sort: Report No.</MenuItem>
                <MenuItem value="compliance">Sort: Compliance</MenuItem>
              </Select>
              <IconButton size="small" title={sortDirection === 'asc' ? 'Ascending (click for descending)' : 'Descending (click for ascending)'} onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                {sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Tooltip title="Export the reports currently shown to CSV">
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>Export</Button>
            </Tooltip>
            {canCreateOrEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Inspection Report</Button>}
          </Box>
        </Box>

        {!loading && shownReports.length === 0 ? (
          <Box sx={{ p: 7, textAlign: 'center' }}><Typography color="text.secondary">No inspection reports found for this lift.</Typography></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap' } }}>
                <TableCell>Report No.</TableCell>
                <TableCell>Inspection Date</TableCell><TableCell>Inspector</TableCell><TableCell>Compliance</TableCell>
                <TableCell>Report Status</TableCell><TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shownReports.map((r) => {
                const isDraft = canEditReport(r.overallStatus);
                const deletable = canDeleteReport(r.overallStatus);
                return (
                  <TableRow key={r._id} hover>
                    <TableCell><strong>{r.reportNo}</strong></TableCell>
                    <TableCell>{formatDate(r.inspectionDate)}</TableCell>
                    <TableCell>{r.inspectorName}</TableCell>
                    <TableCell><StatusChip value={r.compliance} colorMap={DEFECT_COMPLIANCE_COLORS} /></TableCell>
                    <TableCell><StatusChip value={r.overallStatus} colorMap={INSPECTION_STATUS_COLORS} /></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="View report"><IconButton size="small" onClick={() => openView(r)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                      {canCreateOrEdit && (
                        <Tooltip title={isDraft ? 'Edit findings' : 'Submitted reports are locked and cannot be edited'}>
                          <span><IconButton size="small" disabled={!isDraft} onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton></span>
                        </Tooltip>
                      )}
                      {canManageFull && (
                        <Tooltip title={isDraft ? 'Delete draft report' : 'Only draft reports can be deleted'}>
                          <span><IconButton size="small" color="error" disabled={!deletable} onClick={() => setDeleteTarget(r)}><DeleteIcon fontSize="small" /></IconButton></span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <InspectionFormDialog
        open={formOpen}
        inspection={editingReport}
        initialLiftId={lift._id}
        onClose={() => { setFormOpen(false); setEditingReport(null); }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirm Delete"
        message={`Delete draft report ${deleteTarget?.reportNo}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.4 }}>{label}</Typography>
      <Typography variant="body1">{value || '—'}</Typography>
    </Box>
  );
}

// Mirrors Inspections.jsx's own detail-view swap (see comment there): the app's routing is
// tab-based rather than per-entity, so "viewing a report" swaps this step's own content for a
// full-width detail view instead of introducing a nested route or a dialog.
function InspectionDetailView({ report, onBack, onEdit }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const isDraft = canEditReport(report.overallStatus);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Back to Inspection Reports</Button>
        {isDraft && onEdit && <Button variant="outlined" startIcon={<EditIcon />} onClick={onEdit}>Edit Report</Button>}
      </Box>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{report.reportNo}</Typography>
            <Typography variant="body2" color="text.secondary">{report.liftCode} · {report.block}</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <StatusChip value={report.compliance} colorMap={DEFECT_COMPLIANCE_COLORS} />
            <StatusChip value={report.overallStatus} colorMap={INSPECTION_STATUS_COLORS} />
          </Stack>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}><Field label="Inspection Date" value={formatDate(report.inspectionDate)} /></Grid>
          <Grid item xs={6} sm={3}><Field label="Inspector" value={report.inspectorName} /></Grid>
          <Grid item xs={6} sm={3}><Field label="Contractor" value={report.contractor} /></Grid>
          <Grid item xs={6} sm={3}><Field label="Contractor Notified" value={report.contractorNotifiedAt ? formatDate(report.contractorNotifiedAt) : 'Not yet notified'} /></Grid>
        </Grid>
        {report.notes && <><Divider sx={{ my: 2 }} /><Field label="Notes" value={report.notes} /></>}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Inspection Checklist</Typography>
        <Table size="small">
          <TableHead><TableRow><TableCell>Item</TableCell><TableCell width={100}>Result</TableCell><TableCell>Remarks</TableCell></TableRow></TableHead>
          <TableBody>
            {(report.checklist || []).map((c, i) => (
              <TableRow key={i}>
                <TableCell>{c.item}</TableCell>
                <TableCell>
                  <Chip size="small" label={c.result} color={c.result === 'Fail' ? 'error' : c.result === 'Pass' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>{c.remarks || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Defects Found</Typography>
        {(!report.defects || report.defects.length === 0) ? (
          <Typography variant="body2" color="text.secondary">No defects logged on this report.</Typography>
        ) : (
          <Stack spacing={2}>
            {report.defects.map((d) => (
              <Paper key={d._id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                  {d.photoUrl && (
                    <Avatar variant="rounded" src={d.photoUrl} sx={{ width: 72, height: 72, cursor: 'pointer', flexShrink: 0 }} onClick={() => setPreviewUrl(d.photoUrl)} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1">{d.description}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <StatusChip value={d.severity} colorMap={DEFECT_SEVERITY_COLORS} />
                      <Chip size="small" label={d.status} variant="outlined" />
                    </Stack>
                    {d.raisedDate && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Raised {formatDate(d.raisedDate)}</Typography>}
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={Boolean(previewUrl)} onClose={() => setPreviewUrl(null)} maxWidth="md">
        {previewUrl && (
          <Box sx={{ position: 'relative', bgcolor: 'black', display: 'flex', justifyContent: 'center' }}>
            <IconButton size="small" onClick={() => setPreviewUrl(null)} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.85)' }}><CloseIcon fontSize="small" /></IconButton>
            <img src={previewUrl} alt="Defect photo" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} />
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
