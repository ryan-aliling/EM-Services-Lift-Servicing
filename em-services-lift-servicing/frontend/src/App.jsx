import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TabBar from './TabBar';
import Workspace from './Workspace';

export const TABS = [
  { id: 'lifts', label: 'Lifts' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'defects', label: 'Defects' },
  { id: 'rectifications', label: 'Rectifications' },
];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

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
      </header>
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={(id) => navigate(`/${id}`)} />
      <Workspace tabs={TABS} activeTab={activeTab} />
    </div>
  );
}
