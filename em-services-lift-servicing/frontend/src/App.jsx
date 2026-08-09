import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppBar, Avatar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import ElevatorOutlinedIcon from '@mui/icons-material/ElevatorOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import TabBar from './TabBar';
import Workspace from './Workspace';
import NotificationBell from './components/NotificationBell';
import { useThemeMode } from './context/ThemeModeContext';
import { useAuth } from './context/AuthContext';
import { isAdminOrMaster } from './utils/roles';

// Scheduling, Inspections, Defects and Rectifications used to be four separate tabs.
// They're now one guided "Lift Workflow" tab (see features/lift-workflow/LiftWorkflowPage.jsx) -
// search/select a lift, then step through all four in sequence. The four modules' CRUD/API
// stay fully separate; only the navigation/UX is combined.
const BASE_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'lifts', label: 'Lifts' },
  { id: 'lift-workflow', label: 'Lift Workflow' },
  { id: 'settings', label: 'Settings' },
];

// Accounts and Audit Log tabs only exist for Master/Admin - Staff never sees or can
// navigate to either (see AccountsPage.jsx/AuditLogPage.jsx's own role checks for
// defense in depth if a Staff user tries the URL directly, but the backend is the real
// guard either way).
export function getTabs(role) {
  return isAdminOrMaster(role)
    ? [...BASE_TABS, { id: 'accounts', label: 'Accounts' }, { id: 'audit-log', label: 'Audit Log' }]
    : BASE_TABS;
}

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
  const { user, logout } = useAuth();
  const tabs = getTabs(user.role);

  // The active tab is derived from the URL (e.g. /lifts) so dialogs elsewhere in the app
  // can deep-link into a tab with navigate('/lift-workflow') etc.
  const activeTab = location.pathname.replace('/', '') || tabs[0].id;

  useEffect(() => {
    if (location.pathname === '/') navigate(`/${tabs[0].id}`, { replace: true });
  }, [location.pathname, navigate]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <ElevatorOutlinedIcon color="primary" />
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Lift Servicing Digitisation
          </Typography>

          <NotificationBell />

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
            <Tooltip title="Log out">
              <IconButton onClick={logout} color="inherit" aria-label="Log out">
                <LogoutOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>

        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => navigate(`/${id}`)} />
      </AppBar>

      <Workspace tabs={tabs} activeTab={activeTab} />
    </Box>
  );
}
