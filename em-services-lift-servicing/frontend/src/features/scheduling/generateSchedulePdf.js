import jsPDF from 'jspdf';

// Pure data-shaping — kept separate from the actual jsPDF drawing calls so
// it can be unit tested without a canvas/PDF renderer. Field order mirrors
// the header section of the paper spot-check form (Town Council / Lift
// Company / Block-Lift Address) plus the scheduling-specific fields.
export function buildSchedulePdfLines(schedule) {
  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

  return [
    { label: 'Schedule ID', value: schedule._id || '—' },
    { label: 'Town Council', value: schedule.townCouncil || '—' },
    { label: 'Lift Company', value: schedule.liftCompany || '—' },
    { label: 'Block / Lift Address', value: schedule.blockAddress || '—' },
    { label: 'Scheduled Date', value: formatDate(schedule.scheduledDate) },
    { label: 'Assigned Inspector', value: schedule.assignedInspector || '—' },
    { label: 'Status', value: schedule.status || '—' },
    { label: 'Notes', value: schedule.notes || '—' },
  ];
}

// Generates and triggers a browser download of a one-page PDF record for a
// single schedule. The signature block at the bottom mirrors the paper
// form's own footer (Servicing Date / Checked By / Signature, Date of
// Rectification / Rectified By / Signature) so a printed copy slots into
// the same filing workflow staff already use.
export function downloadSchedulePdf(schedule) {
  const doc = new jsPDF();
  const lines = buildSchedulePdfLines(schedule);

  doc.setFontSize(14);
  doc.text('EM Services', 14, 18);
  doc.setFontSize(11);
  doc.text('Spot-Check Servicing Schedule', 14, 25);

  let y = 38;
  lines.forEach(({ label, value }) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), 65, y);
    y += 8;
  });

  y += 6;
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFont(undefined, 'bold');
  doc.text('Servicing Date Checked:', 14, y);
  doc.text('Checked By:', 110, y);
  y += 16;
  doc.setFont(undefined, 'normal');
  doc.text('Signature: ____________________', 14, y);
  y += 16;

  doc.setFont(undefined, 'bold');
  doc.text('Date of Rectification:', 14, y);
  doc.text('Rectified By:', 110, y);
  y += 16;
  doc.setFont(undefined, 'normal');
  doc.text('Signature: ____________________', 14, y);

  doc.save(`schedule-${schedule._id || 'record'}.pdf`);
}
