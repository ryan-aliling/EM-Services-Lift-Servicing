import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './context/AuthContext';
import LoginPage from './features/auth/LoginPage';
import App from './App';

// Sits between AuthProvider and App - the app's routing is tab-based rather than a real
// react-router route tree (see App.jsx), so login is gated here rather than via a
// protected-route wrapper: no user yet renders LoginPage instead of App entirely.
export default function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <LoginPage />;

  return <App />;
}
