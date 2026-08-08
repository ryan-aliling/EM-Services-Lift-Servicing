// Tests for the shared defect status helpers (Elijah). See test-cases.md.
import { describe, expect, test } from 'vitest';
import { DEFECT_SEVERITIES, DEFECT_STATUSES, DEFECT_NEXT_STATUSES } from '../../src/utils/defectHelpers';

describe('DEFECT_SEVERITIES', () => {
  test('matches the backend Defect model enum', () => {
    expect(DEFECT_SEVERITIES).toEqual(['Minor', 'Major', 'Critical']);
  });
});

describe('DEFECT_STATUSES', () => {
  test('matches the backend Defect model enum', () => {
    expect(DEFECT_STATUSES).toEqual(['Open', 'In Progress', 'Resolved', 'Closed']);
  });
});

describe('DEFECT_NEXT_STATUSES', () => {
  test('defines the forward path Open -> In Progress -> Resolved -> Closed', () => {
    expect(DEFECT_NEXT_STATUSES.Open).toContain('In Progress');
    expect(DEFECT_NEXT_STATUSES['In Progress']).toContain('Resolved');
    expect(DEFECT_NEXT_STATUSES.Resolved).toContain('Closed');
  });

  test('allows reopening a Closed defect back to Open', () => {
    expect(DEFECT_NEXT_STATUSES.Closed).toEqual(['Open']);
  });

  test('does not allow skipping from Open directly to Resolved or Closed-only-forward', () => {
    expect(DEFECT_NEXT_STATUSES.Open).not.toContain('Resolved');
  });

  test('every status has a defined (possibly empty) set of next steps', () => {
    DEFECT_STATUSES.forEach((status) => {
      expect(DEFECT_NEXT_STATUSES[status]).toBeDefined();
    });
  });
});