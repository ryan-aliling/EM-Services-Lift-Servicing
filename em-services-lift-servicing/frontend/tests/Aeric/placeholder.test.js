// CSV export tests (Aeric). See test-cases.md for the full test plan.
// Pure-function tests — no DOM/component rendering needed here.
import { describe, expect, test } from 'vitest';
import { schedulesToCsv } from '../../src/features/scheduling/exportCsv';

const HEADER = 'Town Council,Lift Company,Block/Lift Address,Scheduled Date,Assigned Inspector,Status,Notes';

describe('schedulesToCsv', () => {
  test('returns the header row only for an empty list', () => {
    expect(schedulesToCsv([])).toBe(HEADER);
  });

  test('formats a schedule row, converting scheduledDate to YYYY-MM-DD', () => {
    const csv = schedulesToCsv([
      {
        townCouncil: 'Tampines Town Council',
        liftCompany: 'ABC Lifts Pte Ltd',
        blockAddress: 'Blk 201 Tampines St 21',
        scheduledDate: '2026-09-01T00:00:00.000Z',
        assignedInspector: 'John Tan',
        status: 'Scheduled',
        notes: '',
      },
    ]);

    const rows = csv.split('\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(HEADER);
    expect(rows[1]).toBe(
      'Tampines Town Council,ABC Lifts Pte Ltd,Blk 201 Tampines St 21,2026-09-01,John Tan,Scheduled,'
    );
  });

  test('wraps a value containing a comma in double quotes', () => {
    const csv = schedulesToCsv([
      {
        townCouncil: 'Tampines Town Council',
        liftCompany: 'ABC Lifts Pte Ltd',
        blockAddress: 'Blk 201, Tampines St 21',
        scheduledDate: '2026-09-01',
        assignedInspector: '',
        status: 'Scheduled',
        notes: '',
      },
    ]);

    expect(csv).toContain('"Blk 201, Tampines St 21"');
  });

  test('escapes embedded double quotes', () => {
    const csv = schedulesToCsv([
      {
        townCouncil: 'Tampines Town Council',
        liftCompany: 'ABC Lifts Pte Ltd',
        blockAddress: 'Blk 201',
        scheduledDate: '2026-09-01',
        assignedInspector: '',
        status: 'Scheduled',
        notes: 'Access via "side gate"',
      },
    ]);

    expect(csv).toContain('"Access via ""side gate"""');
  });
});
