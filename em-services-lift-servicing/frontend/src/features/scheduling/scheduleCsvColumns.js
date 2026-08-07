import { formatDate } from '../../utils/formatDate';

// Column defs for the shared exportToCSV util (utils/csvExport.js) — kept as
// a separate, pure module (no DOM/Blob calls) so the column mapping itself
// is unit-testable without touching the CSV/download side effects.
export const SCHEDULE_CSV_COLUMNS = [
  { label: 'Town Council', value: (s) => s.townCouncil },
  { label: 'Lift Company', value: (s) => s.liftCompany },
  { label: 'Block/Lift Address', value: (s) => s.blockAddress },
  { label: 'Scheduled Date', value: (s) => formatDate(s.scheduledDate) },
  { label: 'Assigned Inspector', value: (s) => s.assignedInspector || '' },
  { label: 'Status', value: (s) => s.status },
  { label: 'Notes', value: (s) => s.notes || '' },
];
