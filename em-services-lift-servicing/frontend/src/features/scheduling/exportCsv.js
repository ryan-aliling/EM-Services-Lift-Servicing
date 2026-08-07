// Client-side CSV export for the schedule list — client feedback asked for
// "mass import/export" so staff can pull the monthly plan into Excel for
// planning meetings / sharing with town councils, without a backend endpoint.

const CSV_COLUMNS = [
  { key: 'townCouncil', label: 'Town Council' },
  { key: 'liftCompany', label: 'Lift Company' },
  { key: 'blockAddress', label: 'Block/Lift Address' },
  { key: 'scheduledDate', label: 'Scheduled Date' },
  { key: 'assignedInspector', label: 'Assigned Inspector' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
];

function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Pure function (no DOM) so it's easy to unit test — see tests/Aeric.
export function schedulesToCsv(schedules) {
  const header = CSV_COLUMNS.map((column) => column.label).join(',');

  const rows = schedules.map((schedule) =>
    CSV_COLUMNS.map((column) => {
      let value = schedule[column.key];
      if (column.key === 'scheduledDate' && value) {
        value = new Date(value).toISOString().slice(0, 10);
      }
      return escapeCsvValue(value);
    }).join(',')
  );

  return [header, ...rows].join('\n');
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
