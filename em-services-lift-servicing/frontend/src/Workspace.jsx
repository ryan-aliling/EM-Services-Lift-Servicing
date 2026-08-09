import { Box, Stack, Typography } from '@mui/material';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import Lifts from './features/lifts/Lifts';
import LiftWorkflowPage from './features/lift-workflow/LiftWorkflowPage';
import DashboardPage from './features/dashboard/DashboardPage';
import AccountsPage from './features/accounts/AccountsPage';
import AuditLogPage from './features/audit-log/AuditLogPage';
import SettingsPage from './features/settings/SettingsPage';

// Each feature owner mounts their page component here under their tab id.
// Tabs without an entry yet fall back to the "coming soon" placeholder.
// NOTE: this previously rendered <Lifts /> unconditionally underneath
// whichever page matched FEATURE_PAGES (so the Scheduling tab was showing
// the full Lifts grid stacked above SchedulingPage) — keyed properly here
// so each tab renders only its own feature.
// Scheduling/Inspections/Defects/Rectifications used to each be their own entry here -
// they're now combined into the single 'lift-workflow' entry (see App.jsx TABS comment).
const FEATURE_PAGES = {
  dashboard: DashboardPage,
  lifts: Lifts,
  'lift-workflow': LiftWorkflowPage,
  accounts: AccountsPage,
  'audit-log': AuditLogPage,
  settings: SettingsPage,
};

export default function Workspace({ tabs, activeTab }) {
  const tab = tabs.find((t) => t.id === activeTab);
  const FeaturePage = FEATURE_PAGES[activeTab];

  return (
    <Box component="main" sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {FeaturePage ? (
        <FeaturePage />
      ) : (
        <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 12, color: 'text.secondary' }}>
          <ConstructionOutlinedIcon sx={{ fontSize: 40 }} />
          <Typography variant="h6" color="text.secondary">
            {tab ? tab.label : 'Select a tab to get started'}
          </Typography>
          {tab && <Typography variant="body2">Module coming soon.</Typography>}
        </Stack>
      )}
    </Box>
  );
}