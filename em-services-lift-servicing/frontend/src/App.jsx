import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Lift Servicing Digitisation</h1>
      </header>
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <Workspace tabs={TABS} activeTab={activeTab} />
    </div>
  );
}
