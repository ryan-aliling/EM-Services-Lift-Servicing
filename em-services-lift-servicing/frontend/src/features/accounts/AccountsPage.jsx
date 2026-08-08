import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import { useAuth } from '../../context/AuthContext';
import { isAdminOrMaster } from '../../utils/roles';
import * as authApi from '../../api/authApi';
import AccountFormDialog from './AccountFormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate } from '../../utils/formatDate';

// Master sees/creates Admin+Staff, Admin sees/creates Staff only - the backend already
// filters GET /api/auth/users and enforces the same rule on POST (see authController.js),
// this page just reflects what the API returns/allows rather than re-deciding it.
export default function AccountsPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setAccounts(await authApi.listUsers());
    } catch {
      enqueueSnackbar('Failed to load accounts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defense in depth only - the Accounts tab is already hidden from Staff (see
  // App.jsx's getTabs), and the backend rejects a Staff caller on every one of these
  // endpoints regardless of what this page renders.
  if (!isAdminOrMaster(user.role)) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 12, color: 'text.secondary' }}>
        <Typography variant="h6">Not authorized to view this page.</Typography>
      </Stack>
    );
  }

  const handleCreate = async (values) => {
    try {
      await authApi.createUser(values);
      enqueueSnackbar('Account created', { variant: 'success' });
      setFormOpen(false);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create account', { variant: 'error' });
    }
  };

  const handleDeactivate = async () => {
    try {
      await authApi.deactivateUser(deactivateTarget._id);
      enqueueSnackbar('Account deactivated', { variant: 'success' });
      setDeactivateTarget(null);
      load();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to deactivate account', { variant: 'error' });
      setDeactivateTarget(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Accounts</Typography>
          <Typography variant="body2" color="text.secondary">
            {user.role === 'Master' ? 'Create and manage Admin and Staff accounts.' : 'Create and manage Staff accounts.'}
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setFormOpen(true)}>
          Add Account
        </Button>
      </Stack>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        {!loading && accounts.length === 0 ? (
          <Box sx={{ p: 7, textAlign: 'center' }}>
            <Typography color="text.secondary">No accounts yet.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account._id} hover>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.email}</TableCell>
                  <TableCell>
                    <Chip size="small" label={account.role} variant="outlined" />
                  </TableCell>
                  <TableCell>{formatDate(account.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      startIcon={<PersonOffOutlinedIcon fontSize="small" />}
                      onClick={() => setDeactivateTarget(account)}
                    >
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <AccountFormDialog
        open={formOpen}
        callerRole={user.role}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate Account"
        message={`Deactivate ${deactivateTarget?.name}'s account? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        confirmColor="error"
        onConfirm={handleDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />
    </Box>
  );
}
