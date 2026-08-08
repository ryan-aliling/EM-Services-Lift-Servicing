import { Avatar, Box, Button, Divider, Paper, Stack, Switch, Typography } from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeModeContext';

// Deliberately light — dark mode, the user's name/role and Log Out already live in the
// global AppBar (see App.jsx) and work from every page. This page exists for the one thing
// that doesn't: showing the account's email, plus a settings-shaped place for anything
// this app grows into needing later.
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h4" mb={4}>
        Settings
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" mb={2}>
          Profile
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>{user.name?.[0]}</Avatar>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.role}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" mb={2}>
          Appearance
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2">Dark mode</Typography>
          <Switch checked={mode === 'dark'} onChange={toggleMode} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" mb={2}>
          Account
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Button color="error" startIcon={<LogoutOutlinedIcon />} onClick={logout}>
          Log Out
        </Button>
      </Paper>
    </Box>
  );
}
