// CSV export column mapping tests (Elijah). See test-cases.md for the full plan.
// Kept as a pure-function test — the actual Blob/download side effects live
// in the shared utils/csvExport.js and aren't re-tested here.
import { describe, expect, test } from 'vitest';
import { DEFECT_CSV_COLUMNS } from '../../src/features/defects/defectCsvColumns';

const sample = {
  defectNo: 'DEF-0007',
  title: 'Door not closing fully',
  location: 'Blk 12 lift lobby',
  liftCode: 'L-102',
  severity: 'Major',
  status: 'Open',
  reportedBy: 'Building Manager',
  reportedDate: '2026-08-06T03:00:00.000Z',
  description: 'Door bounces back roughly 5cm before fully closing.',
};

function toRow(defect) {
  return Object.fromEntries(DEFECT_CSV_COLUMNS.map((column) => [column.label, column.value(defect)]));
}

describe('DEFECT_CSV_COLUMNS', () => {
  test('maps every defect field to its labeled CSV column', () => {
    const row = toRow(sample);
    expect(row['Defect No.']).toBe('DEF-0007');
    expect(row.Title).toBe('Door not closing fully');
    expect(row.Location).toBe('Blk 12 lift lobby');
    expect(row.Lift).toBe('L-102');
    expect(row.Severity).toBe('Major');
    expect(row.Status).toBe('Open');
    expect(row['Reported By']).toBe('Building Manager');
    expect(row.Description).toBe('Door bounces back roughly 5cm before fully closing.');
  });

  test('formats the reported date for display rather than a raw ISO string', () => {
    const row = toRow(sample);
    expect(row['Reported Date']).not.toContain('T03:00:00');
  });

  test('falls back to an empty string for missing optional fields', () => {
    const row = toRow({ ...sample, liftCode: undefined, reportedBy: undefined, description: undefined });
    expect(row.Lift).toBe('');
    expect(row['Reported By']).toBe('');
    expect(row.Description).toBe('');
  });
});
