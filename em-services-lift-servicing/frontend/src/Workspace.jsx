export default function Workspace({ tabs, activeTab }) {
  const tab = tabs.find((t) => t.id === activeTab);

  return (
    <main className="workspace">
      <p>{tab ? `${tab.label} module — coming soon.` : 'Select a tab to get started.'}</p>
    </main>
  );
}
