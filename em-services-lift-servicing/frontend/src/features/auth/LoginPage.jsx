import { useState } from 'react';
import { Box, Button, Collapse, List, ListItem, Paper, Stack, TextField, Typography, Alert } from '@mui/material';
import ElevatorOutlinedIcon from '@mui/icons-material/ElevatorOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreOutlined';
import { useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/authApi';

// Rendered by AuthGate.jsx whenever there's no authenticated user - standalone, no
// AppBar/TabBar chrome, since nothing else in the app should be reachable yet.
export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        // Registration always creates a Staff account (see authController.js#register) -
        // there's no way to self-provision Admin/Master from this form.
        await authApi.register({ name, email, password });
      }
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${mode === 'register' ? 'register' : 'log in'}`);
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
            {mode === 'register' ? 'Create a Staff account' : 'Sign in to continue'}
          </Typography>
        </Stack>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {mode === 'register' && (
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
            )}
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
            {mode === 'register' && (
              <Box sx={{ mt: -1 }}>
                <Button
                  size="small"
                  endIcon={
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{ transform: showRequirements ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
                    />
                  }
                  onClick={() => setShowRequirements((v) => !v)}
                  sx={{ p: 0, minWidth: 0 }}
                >
                  Password requirements
                </Button>
                <Collapse in={showRequirements}>
                  <List dense sx={{ listStyleType: 'disc', pl: 2, py: 0 }}>
                    <ListItem sx={{ display: 'list-item', p: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        At least 8 characters
                      </Typography>
                    </ListItem>
                    <ListItem sx={{ display: 'list-item', p: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        At least one letter
                      </Typography>
                    </ListItem>
                    <ListItem sx={{ display: 'list-item', p: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        At least one number
                      </Typography>
                    </ListItem>
                  </List>
                </Collapse>
              </Box>
            )}
            <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
              {submitting ? 'Please wait…' : mode === 'register' ? 'Register' : 'Sign In'}
            </Button>
            <Button
              size="small"
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError('');
              }}
            >
              {mode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
