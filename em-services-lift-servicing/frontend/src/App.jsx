import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppBar, Avatar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import ElevatorOutlinedIcon from '@mui/icons-material/ElevatorOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import TabBar from './TabBar';
import Workspace from './Workspace';
import { useThemeMode } from './context/ThemeModeContext';
import { useAuth } from './context/AuthContext';

export const TABS = [
  { id: 'lifts', label: 'Lifts' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'defects', label: 'Defects' },
  { id: 'rectifications', label: 'Rectifications' },
];

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeMode();
  const { user } = useAuth();

  // The active tab is derived from the URL (e.g. /lifts) so dialogs elsewhere in the app
  // can deep-link into a tab with navigate('/scheduling') etc.
  const activeTab = location.pathname.replace('/', '') || TABS[0].id;

  useEffect(() => {
    if (location.pathname === '/') navigate(`/${TABS[0].id}`, { replace: true });
  }, [location.pathname, navigate]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <ElevatorOutlinedIcon color="primary" />
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Lift Servicing Digitisation
          </Typography>

          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleMode} color="inherit" aria-label="Toggle color mode">
              {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pl: 1 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
              {initials(user.name)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.role}
              </Typography>
            </Box>
          </Stack>
        </Toolbar>

        <TabBar tabs={TABS} activeTab={activeTab} onTabChange={(id) => navigate(`/${id}`)} />
      </AppBar>

      <Workspace tabs={TABS} activeTab={activeTab} />
    </Box>
  );
}
