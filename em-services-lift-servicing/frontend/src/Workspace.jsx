import Lifts from './features/lifts/Lifts';

export default function Workspace({ tabs, activeTab }) {
  const tab = tabs.find((t) => t.id === activeTab);

  if (activeTab === 'lifts') {
    return (
      <main className="workspace">
        <Lifts />
      </main>
    );
  }

  return (
    <main className="workspace">
      <p>{tab ? `${tab.label} module — coming soon.` : 'Select a tab to get started.'}</p>
    </main>
  );
}
