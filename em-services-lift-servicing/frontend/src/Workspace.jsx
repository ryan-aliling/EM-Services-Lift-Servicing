import { Box, Stack, Typography } from '@mui/material';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import Lifts from './features/lifts/Lifts';
import SchedulingPage from './features/scheduling/SchedulingPage';

// Each feature owner mounts their page component here under their tab id.
// Tabs without an entry yet fall back to the "coming soon" placeholder.
const FEATURE_PAGES = {
  lifts: Lifts,
  scheduling: SchedulingPage,
};

export default function Workspace({ tabs, activeTab }) {
  const tab = tabs.find((t) => t.id === activeTab);
  const FeaturePage = FEATURE_PAGES[activeTab];

  return (
    <Box component="main" sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3 } }}>
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
