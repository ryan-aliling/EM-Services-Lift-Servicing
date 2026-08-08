import { formatDate } from '../../utils/formatDate';

// Column defs for the shared exportToCSV util (utils/csvExport.js) — kept as
// a separate, pure module (no DOM/Blob calls) so the column mapping itself
// is unit-testable without touching the CSV/download side effects.
export const DEFECT_CSV_COLUMNS = [
  { label: 'Defect No.', value: (d) => d.defectNo },
  { label: 'Title', value: (d) => d.title },
  { label: 'Location', value: (d) => d.location },
  { label: 'Lift', value: (d) => d.liftCode || '' },
  { label: 'Severity', value: (d) => d.severity },
  { label: 'Status', value: (d) => d.status },
  { label: 'Reported By', value: (d) => d.reportedBy || '' },
  { label: 'Reported Date', value: (d) => formatDate(d.reportedDate) },
  { label: 'Description', value: (d) => d.description || '' },
];
