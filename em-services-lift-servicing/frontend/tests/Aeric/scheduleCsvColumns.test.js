// CSV export column mapping tests (Aeric). See test-cases.md for the full plan.
// Kept as a pure-function test — the actual Blob/download side effects live
// in the shared utils/csvExport.js and aren't re-tested here.
import { describe, expect, test } from 'vitest';
import { SCHEDULE_CSV_COLUMNS } from '../../src/features/scheduling/scheduleCsvColumns';

const sample = {
  townCouncil: 'Tampines Town Council',
  liftCompany: 'ABC Lifts Pte Ltd',
  blockAddress: 'Blk 201 Tampines St 21',
  scheduledDate: '2026-09-01T00:00:00.000Z',
  assignedInspector: 'John Tan',
  status: 'Scheduled',
  notes: 'Monthly spot-check',
};

function toRow(schedule) {
  return Object.fromEntries(SCHEDULE_CSV_COLUMNS.map((column) => [column.label, column.value(schedule)]));
}

describe('SCHEDULE_CSV_COLUMNS', () => {
  test('maps every schedule field to its labeled CSV column', () => {
    const row = toRow(sample);
    expect(row['Town Council']).toBe('Tampines Town Council');
    expect(row['Lift Company']).toBe('ABC Lifts Pte Ltd');
    expect(row['Block/Lift Address']).toBe('Blk 201 Tampines St 21');
    expect(row['Assigned Inspector']).toBe('John Tan');
    expect(row.Status).toBe('Scheduled');
    expect(row.Notes).toBe('Monthly spot-check');
  });

  test('formats the scheduled date for display rather than a raw ISO string', () => {
    const row = toRow(sample);
    expect(row['Scheduled Date']).not.toContain('T00:00:00');
  });

  test('falls back to an empty string for missing optional fields', () => {
    const row = toRow({ ...sample, assignedInspector: undefined, notes: undefined });
    expect(row['Assigned Inspector']).toBe('');
    expect(row.Notes).toBe('');
  });
});
