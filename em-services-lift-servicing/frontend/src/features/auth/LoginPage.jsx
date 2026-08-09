import { useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography, Alert } from '@mui/material';
import ElevatorOutlinedIcon from '@mui/icons-material/ElevatorOutlined';
import { useAuth } from '../../context/AuthContext';

// Rendered by AuthGate.jsx whenever there's no authenticated user - standalone, no
// AppBar/TabBar chrome, since nothing else in the app should be reachable yet. No
// self-registration by design - accounts are provisioned via the Admin/Master-gated
// Accounts page only (see features/accounts/AccountsPage.jsx).
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 380 }}>
        <Stack spacing={0.5} alignItems="center" sx={{ mb: 3 }}>
          <ElevatorOutlinedIcon color="primary" sx={{ fontSize: 36 }} />
          <Typography variant="h6">Lift Servicing Digitisation</Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to continue
          </Typography>
        </Stack>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
              {submitting ? 'Please wait…' : 'Sign In'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
