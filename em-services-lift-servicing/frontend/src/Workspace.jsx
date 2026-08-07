import Lifts from './features/lifts/Lifts';
import SchedulingPage from './features/scheduling/SchedulingPage';
import DashboardPage from './features/dashboard/DashboardPage';

// Each feature owner mounts their page component here under their tab id.
// Tabs without an entry yet fall back to the "coming soon" placeholder.
// NOTE: this previously rendered <Lifts /> unconditionally underneath
// whichever page matched FEATURE_PAGES (so the Scheduling tab was showing
// the full Lifts grid stacked above SchedulingPage) — keyed properly here
// so each tab renders only its own feature.
const FEATURE_PAGES = {
  dashboard: DashboardPage,
  lifts: Lifts,
  scheduling: SchedulingPage,
};

export default function Workspace({ tabs, activeTab }) {
  const tab = tabs.find((t) => t.id === activeTab);
  const FeaturePage = FEATURE_PAGES[activeTab];

  if (FeaturePage) {
    return (
      <main className="workspace">
        <FeaturePage />
      </main>
    );
  }

  return (
    <main className="workspace">
      <p>{tab ? `${tab.label} module — coming soon.` : 'Select a tab to get started.'}</p>
    </main>
  );
}