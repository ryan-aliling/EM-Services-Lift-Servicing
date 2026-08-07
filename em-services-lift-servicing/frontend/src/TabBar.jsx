import { Tabs, Tab } from '@mui/material';

export default function TabBar({ tabs, activeTab, onTabChange }) {
  // Tabs throws if `value` doesn't match any Tab's `value` — guard against a
  // not-yet-known activeTab (e.g. mid-navigation) instead of crashing the shell.
  const value = tabs.some((t) => t.id === activeTab) ? activeTab : false;

  return (
    <Tabs
      value={value}
      onChange={(_, id) => onTabChange(id)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{ px: { xs: 1, sm: 3 }, minHeight: 44 }}
    >
      {tabs.map((tab) => (
        <Tab key={tab.id} value={tab.id} label={tab.label} sx={{ minHeight: 44 }} />
      ))}
    </Tabs>
  );
}
