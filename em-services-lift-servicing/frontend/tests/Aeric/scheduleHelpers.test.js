// Tests for the shared scheduling status helpers (Aeric). See test-cases.md.
import { describe, expect, test } from 'vitest';
import { NEXT_STATUS, SCHEDULE_STATUSES, isOverdue } from '../../src/utils/scheduleHelpers';

describe('isOverdue', () => {
  test('flags an open schedule whose date has passed', () => {
    expect(isOverdue({ status: 'Scheduled', scheduledDate: '2000-01-01' })).toBe(true);
  });

  test('does not flag a Completed schedule even if its date has passed', () => {
    expect(isOverdue({ status: 'Completed', scheduledDate: '2000-01-01' })).toBe(false);
  });

  test('does not flag a Cancelled schedule even if its date has passed', () => {
    expect(isOverdue({ status: 'Cancelled', scheduledDate: '2000-01-01' })).toBe(false);
  });

  test('does not flag a schedule whose date is in the future', () => {
    expect(isOverdue({ status: 'Scheduled', scheduledDate: '2999-01-01' })).toBe(false);
  });
});

describe('NEXT_STATUS', () => {
  test('defines a forward path Scheduled -> Assigned -> In Progress -> Completed', () => {
    expect(NEXT_STATUS.Scheduled).toBe('Assigned');
    expect(NEXT_STATUS.Assigned).toBe('In Progress');
    expect(NEXT_STATUS['In Progress']).toBe('Completed');
  });

  test('has no next step defined for terminal statuses', () => {
    expect(NEXT_STATUS.Completed).toBeUndefined();
    expect(NEXT_STATUS.Cancelled).toBeUndefined();
  });
});

describe('SCHEDULE_STATUSES', () => {
  test('matches the backend Schedule model enum', () => {
    expect(SCHEDULE_STATUSES).toEqual(['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Cancelled']);
  });
});
