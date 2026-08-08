// Unit tests for the pure computation behind the Lift Workflow's header status
// indicators (stage chip + "needs attention" warning). See
// src/features/lift-workflow/useLiftWorkflowStatus.js.
import dayjs from 'dayjs';
import { describe, expect, test } from 'vitest';
import { computeStage, computeAttentionReasons } from '../../src/features/lift-workflow/useLiftWorkflowStatus';

const daysAgo = (n) => dayjs().subtract(n, 'day').toISOString();
const EMPTY = { schedules: [], inspections: [], defects: [], rectifications: [] };

describe('computeStage', () => {
  test('nothing logged yet', () => {
    expect(computeStage(EMPTY)).toEqual({ label: 'Not yet scheduled', color: 'default' });
  });

  test('a completed schedule with nothing else is "Up to date"', () => {
    const stage = computeStage({
      ...EMPTY,
      schedules: [{ status: 'Completed', scheduledDate: daysAgo(10) }],
    });
    expect(stage).toEqual({ label: 'Up to date', color: 'success' });
  });

  test('an open, not-yet-completed schedule surfaces as the current stage', () => {
    const stage = computeStage({
      ...EMPTY,
      schedules: [{ status: 'Assigned', scheduledDate: daysAgo(1) }],
    });
    expect(stage.label).toBe('Spot-check: Assigned');
  });

  test('an in-progress inspection outranks a completed schedule', () => {
    const stage = computeStage({
      ...EMPTY,
      schedules: [{ status: 'Completed', scheduledDate: daysAgo(5) }],
      inspections: [{ overallStatus: 'Under Review', inspectionDate: daysAgo(2) }],
    });
    expect(stage).toEqual({ label: 'Inspection: Under Review', color: 'warning' });
  });

  test('an open defect outranks a closed inspection', () => {
    const stage = computeStage({
      ...EMPTY,
      inspections: [{ overallStatus: 'Closed', inspectionDate: daysAgo(3) }],
      defects: [{ status: 'Open', severity: 'Major', reportedDate: daysAgo(1) }],
    });
    expect(stage).toEqual({ label: '1 open defect', color: 'warning' });
  });

  test('a Critical open defect is colored error, not warning', () => {
    const stage = computeStage({
      ...EMPTY,
      defects: [{ status: 'Open', severity: 'Critical', reportedDate: daysAgo(1) }],
    });
    expect(stage.color).toBe('error');
  });

  test('multiple open defects are counted, pluralized', () => {
    const stage = computeStage({
      ...EMPTY,
      defects: [
        { status: 'Open', severity: 'Minor', reportedDate: daysAgo(1) },
        { status: 'In Progress', severity: 'Minor', reportedDate: daysAgo(1) },
      ],
    });
    expect(stage.label).toBe('2 open defects');
  });

  test('a rectification awaiting endorsement outranks a resolved defect', () => {
    const stage = computeStage({
      ...EMPTY,
      defects: [{ status: 'Resolved', severity: 'Minor', reportedDate: daysAgo(5) }],
      rectifications: [{ status: 'Submitted', dateRectified: daysAgo(1) }],
    });
    expect(stage).toEqual({ label: 'Awaiting rectification endorsement', color: 'info' });
  });

  test('a Draft rectification (no Submitted ones) reads as "in draft"', () => {
    const stage = computeStage({
      ...EMPTY,
      rectifications: [{ status: 'Draft', dateRectified: daysAgo(1) }],
    });
    expect(stage).toEqual({ label: 'Rectification in draft', color: 'default' });
  });

  test('an Endorsed rectification with nothing else outstanding is "Up to date"', () => {
    const stage = computeStage({
      ...EMPTY,
      defects: [{ status: 'Closed', severity: 'Minor', reportedDate: daysAgo(20) }],
      rectifications: [{ status: 'Endorsed', dateRectified: daysAgo(15) }],
    });
    expect(stage).toEqual({ label: 'Up to date', color: 'success' });
  });
});

describe('computeAttentionReasons', () => {
  test('nothing overdue or stuck returns no reasons', () => {
    expect(computeAttentionReasons(EMPTY)).toEqual([]);
  });

  test('flags a spot-check past its scheduled date that never completed', () => {
    const reasons = computeAttentionReasons({
      ...EMPTY,
      schedules: [{ status: 'Scheduled', scheduledDate: daysAgo(3) }],
    });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/spot-check/i);
  });

  test('does not flag a schedule whose date is in the future', () => {
    const reasons = computeAttentionReasons({
      ...EMPTY,
      schedules: [{ status: 'Scheduled', scheduledDate: dayjs().add(3, 'day').toISOString() }],
    });
    expect(reasons).toEqual([]);
  });

  test('flags a Critical defect open past its (tighter) threshold', () => {
    const reasons = computeAttentionReasons({
      ...EMPTY,
      defects: [{ status: 'Open', severity: 'Critical', reportedDate: daysAgo(4) }],
    });
    expect(reasons.some((r) => /defect/i.test(r))).toBe(true);
  });

  test('does not flag a freshly-reported Critical defect', () => {
    const reasons = computeAttentionReasons({
      ...EMPTY,
      defects: [{ status: 'Open', severity: 'Critical', reportedDate: daysAgo(1) }],
    });
    expect(reasons).toEqual([]);
  });

  test('a Minor defect gets a longer grace period than a Critical one', () => {
    const reasons = computeAttentionReasons({
      ...EMPTY,
      defects: [{ status: 'Open', severity: 'Minor', reportedDate: daysAgo(4) }],
    });
    expect(reasons).toEqual([]);
  });

  test('flags a rectification submitted long ago with no endorsement yet', () => {
    const reasons = computeAttentionReasons({
      ...EMPTY,
      rectifications: [{ status: 'Submitted', dateRectified: daysAgo(10) }],
    });
    expect(reasons.some((r) => /endorsement/i.test(r))).toBe(true);
  });

  test('does not flag a rectification submitted recently', () => {
    const reasons = computeAttentionReasons({
      ...EMPTY,
      rectifications: [{ status: 'Submitted', dateRectified: daysAgo(1) }],
    });
    expect(reasons).toEqual([]);
  });

  test('can surface more than one reason at once', () => {
    const reasons = computeAttentionReasons({
      schedules: [{ status: 'Scheduled', scheduledDate: daysAgo(3) }],
      defects: [{ status: 'Open', severity: 'Critical', reportedDate: daysAgo(5) }],
      rectifications: [{ status: 'Submitted', dateRectified: daysAgo(10) }],
    });
    expect(reasons).toHaveLength(3);
  });
});
