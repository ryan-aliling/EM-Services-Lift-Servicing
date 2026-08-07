import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Stack, Typography } from '@mui/material';
import TabBar from './TabBar';
import Workspace from './Workspace';
import NotificationBell from './components/NotificationBell';
import { useAuth } from './context/AuthContext';

export const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'lifts', label: 'Lifts' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'defects', label: 'Defects' },
  { id: 'rectifications', label: 'Rectifications' },
];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // The active tab is derived from the URL (e.g. /lifts) so dialogs elsewhere in the app
  // can deep-link into a tab with navigate('/scheduling') etc.
  const activeTab = location.pathname.replace('/', '') || TABS[0].id;

  useEffect(() => {
    if (location.pathname === '/') navigate(`/${TABS[0].id}`, { replace: true });
  }, [location.pathname, navigate]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Lift Servicing Digitisation</h1>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <NotificationBell />
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 28, height: 28 }}>{user.name[0]}</Avatar>
            <Typography variant="body2">{user.name}</Typography>
          </Stack>
        </Stack>
      </header>
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={(id) => navigate(`/${id}`)} />
      <Workspace tabs={TABS} activeTab={activeTab} />
    </div>
  );
}
