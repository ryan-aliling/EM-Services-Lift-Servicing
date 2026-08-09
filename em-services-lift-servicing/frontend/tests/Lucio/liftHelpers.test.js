// Lift status/service-due logic tests (Lucio). See test-cases.md for the full test plan.
import { describe, expect, test } from 'vitest';
import dayjs from 'dayjs';
import { LIFT_TYPES, LIFT_STATUSES, SERVICE_DUE_DAYS, isServiceDue } from '../../src/utils/liftHelpers';

describe('LIFT_TYPES / LIFT_STATUSES — match the backend enums', () => {
  test('LIFT_TYPES has the 3 values the Lift model enum accepts', () => {
    expect(LIFT_TYPES).toEqual(['Passenger', 'Freight', 'Mixed']);
  });

  test('LIFT_STATUSES has the 4 values the Lift model enum accepts', () => {
    expect(LIFT_STATUSES).toEqual(['Active', 'Maintenance', 'Out of Service', 'Decommissioned']);
  });
});

describe('isServiceDue', () => {
  test('never serviced (lastServiced is null) is always due', () => {
    expect(isServiceDue({ lastServiced: null })).toBe(true);
  });

  test('serviced fewer than SERVICE_DUE_DAYS ago is not due', () => {
    const recent = dayjs().subtract(SERVICE_DUE_DAYS - 10, 'day').toISOString();
    expect(isServiceDue({ lastServiced: recent })).toBe(false);
  });

  test('serviced exactly SERVICE_DUE_DAYS ago is due (boundary is inclusive)', () => {
    const boundary = dayjs().subtract(SERVICE_DUE_DAYS, 'day').toISOString();
    expect(isServiceDue({ lastServiced: boundary })).toBe(true);
  });

  test('serviced more than SERVICE_DUE_DAYS ago is due', () => {
    const overdue = dayjs().subtract(SERVICE_DUE_DAYS + 30, 'day').toISOString();
    expect(isServiceDue({ lastServiced: overdue })).toBe(true);
  });
});
