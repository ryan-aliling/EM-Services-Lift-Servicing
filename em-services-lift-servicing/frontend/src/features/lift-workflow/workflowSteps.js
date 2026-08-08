// Shared step definitions for the Lift Workflow page — one entry per stage of the
// Scheduling -> Inspections -> Defects -> Rectifications sequence. Both the clickable
// header (WorkflowStepper) and the orchestrator (LiftWorkflowPage) index off this same
// array so the step order/labels only ever need to change in one place.
export const WORKFLOW_STEPS = [
  { key: 'scheduling', label: 'Scheduling' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'defects', label: 'Defects' },
  { key: 'rectifications', label: 'Rectifications' },
];
