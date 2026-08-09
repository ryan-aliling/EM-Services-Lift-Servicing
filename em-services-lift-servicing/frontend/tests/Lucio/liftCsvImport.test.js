// CSV parsing / lift-import row-mapping tests (Lucio). See test-cases.md for the full plan.
// Covers the Lift-specific parts of the shared utils/csvImport.js — parseCSV itself is
// feature-agnostic (also used by Scheduling's import), so only behaviour relevant to
// rowsToLiftPayloads is re-verified here rather than duplicating a full parseCSV suite.
import { describe, expect, test } from 'vitest';
import { parseCSV, rowsToLiftPayloads } from '../../src/utils/csvImport';

describe('parseCSV + rowsToLiftPayloads', () => {
  test('maps the human-readable header labels (as produced by the app\'s own export/template) to Lift fields', () => {
    const csv = [
      'Lift Code,Block,Unit,Type,Capacity (kg),Status,Manufacturer,Install Date,Last Serviced',
      'LIFT-001,A,01-01,Passenger,800,Active,Otis,2020-01-15,2026-05-01',
    ].join('\n');

    const [payload] = rowsToLiftPayloads(parseCSV(csv));

    expect(payload).toEqual({
      liftCode: 'LIFT-001',
      block: 'A',
      unit: '01-01',
      type: 'Passenger',
      capacity: 800,
      status: 'Active',
      manufacturer: 'Otis',
      installDate: '2020-01-15',
      lastServiced: '2026-05-01',
    });
  });

  test('also accepts the plain field-name header form (case/spacing-insensitive)', () => {
    const csv = ['liftCode,block,unit,type,capacity', 'LIFT-002,B,02-02,Freight,1200'].join('\n');

    const [payload] = rowsToLiftPayloads(parseCSV(csv));
    expect(payload).toEqual({ liftCode: 'LIFT-002', block: 'B', unit: '02-02', type: 'Freight', capacity: 1200 });
  });

  test('converts capacity to a number, not a string', () => {
    const csv = ['Lift Code,Capacity', 'LIFT-003,500'].join('\n');
    const [payload] = rowsToLiftPayloads(parseCSV(csv));
    expect(payload.capacity).toBe(500);
    expect(payload.capacity).not.toBe('500');
  });

  test('blank cells are omitted from the payload rather than sent as empty strings', () => {
    const csv = ['Lift Code,Block,Manufacturer', 'LIFT-004,C,'].join('\n');
    const [payload] = rowsToLiftPayloads(parseCSV(csv));
    expect(payload).toEqual({ liftCode: 'LIFT-004', block: 'C' });
    expect(payload.manufacturer).toBeUndefined();
  });

  test('unrecognised columns are ignored rather than causing an error', () => {
    const csv = ['Lift Code,Some Unknown Column', 'LIFT-005,whatever'].join('\n');
    const [payload] = rowsToLiftPayloads(parseCSV(csv));
    expect(payload).toEqual({ liftCode: 'LIFT-005' });
  });

  test('a header-only CSV (no data rows) produces no payloads', () => {
    const csv = 'Lift Code,Block,Unit,Type,Capacity';
    expect(rowsToLiftPayloads(parseCSV(csv))).toEqual([]);
  });

  test('handles a quoted field containing an embedded comma', () => {
    const csv = ['Lift Code,Manufacturer', 'LIFT-006,"Otis, Singapore"'].join('\n');
    const [payload] = rowsToLiftPayloads(parseCSV(csv));
    expect(payload.manufacturer).toBe('Otis, Singapore');
  });

  test('multiple data rows each become their own payload', () => {
    const csv = ['Lift Code,Block', 'LIFT-007,A', 'LIFT-008,B'].join('\n');
    const payloads = rowsToLiftPayloads(parseCSV(csv));
    expect(payloads).toHaveLength(2);
    expect(payloads[0].liftCode).toBe('LIFT-007');
    expect(payloads[1].liftCode).toBe('LIFT-008');
  });
});
