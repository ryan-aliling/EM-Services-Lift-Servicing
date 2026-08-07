// Tests for the shared inspection helper functions (Javier). See test-cases.md.
import { describe, expect, test } from 'vitest';
import {
  canDeleteReport,
  canEditReport,
  deriveCompliance,
  hasFailedChecklistItem,
  buildDefaultChecklist,
} from '../../src/features/inspections/inspectionHelpers';

describe('canEditReport', () => {
  test('allows editing a Draft report', () => {
    expect(canEditReport('Draft')).toBe(true);
  });

  test('blocks editing once a report is Submitted', () => {
    expect(canEditReport('Submitted')).toBe(false);
  });

  test('blocks editing an Under Review report', () => {
    expect(canEditReport('Under Review')).toBe(false);
  });

  test('blocks editing a Closed report', () => {
    expect(canEditReport('Closed')).toBe(false);
  });
});

describe('canDeleteReport', () => {
  test('allows deleting a Draft report', () => {
    expect(canDeleteReport('Draft')).toBe(true);
  });

  test('blocks deleting a Submitted report (kept for audit)', () => {
    expect(canDeleteReport('Submitted')).toBe(false);
  });
});

describe('deriveCompliance', () => {
  test('is "Pass" when no defects were logged', () => {
    expect(deriveCompliance([])).toBe('Pass');
  });

  test('is "Defect Found" when at least one defect exists', () => {
    expect(deriveCompliance([{ description: 'Door sticks' }])).toBe('Defect Found');
  });

  test('defaults to "Pass" when called with no argument', () => {
    expect(deriveCompliance()).toBe('Pass');
  });
});

describe('hasFailedChecklistItem', () => {
  test('is false when every item passes', () => {
    const checklist = [{ result: 'Pass' }, { result: 'Pass' }, { result: 'N/A' }];
    expect(hasFailedChecklistItem(checklist)).toBe(false);
  });

  test('is true when at least one item fails', () => {
    const checklist = [{ result: 'Pass' }, { result: 'Fail' }, { result: 'N/A' }];
    expect(hasFailedChecklistItem(checklist)).toBe(true);
  });

  test('is false for an empty checklist', () => {
    expect(hasFailedChecklistItem([])).toBe(false);
  });
});

describe('buildDefaultChecklist', () => {
  test('maps each item name to a checklist row defaulting to N/A with no remarks', () => {
    const result = buildDefaultChecklist(['Door operation', 'Emergency alarm']);
    expect(result).toEqual([
      { item: 'Door operation', result: 'N/A', remarks: '' },
      { item: 'Emergency alarm', result: 'N/A', remarks: '' },
    ]);
  });

  test('returns an empty array for an empty item list', () => {
    expect(buildDefaultChecklist([])).toEqual([]);
  });
});
