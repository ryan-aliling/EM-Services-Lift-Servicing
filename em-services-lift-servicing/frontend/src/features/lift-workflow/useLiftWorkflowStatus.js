import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import * as scheduleApi from '../../api/scheduleApi';
import * as inspectionApi from '../../api/inspectionApi';
import * as defectApi from '../../api/defectApi';
import * as rectificationApi from '../../api/rectificationApi';
import { isOverdue } from '../../utils/scheduleHelpers';
import { SCHEDULE_STATUS_COLORS, INSPECTION_STATUS_COLORS } from '../../theme/statusColors';

const OPEN_DEFECT_STATUSES = ['Open', 'In Progress'];
const PENDING_RECTIFICATION_STATUSES = ['Draft', 'Submitted'];

// How many days an unresolved defect can sit open before it's flagged as "stuck" -
// tighter for more severe defects, since a week-old Critical defect is a very different
// situation from a week-old Minor one. Heuristic, not a rule from the client's spec.
const DEFECT_STALE_DAYS = { Critical: 3, Major: 7, Minor: 14 };

// How many days a rectification can sit "Submitted" (fix done, proof attached) before the
// missing endorsement itself becomes the thing worth flagging.
const ENDORSEMENT_STALE_DAYS = 7;

function daysSince(date) {
  return dayjs().diff(dayjs(date), 'day');
}

function latestBy(items, dateField) {
  return items.reduce((latest, item) => {
    if (!item[dateField]) return latest;
    if (!latest || dayjs(item[dateField]).isAfter(dayjs(latest[dateField]))) return item;
    return latest;
  }, null);
}

// Where this lift currently sits in the Schedule -> Inspection -> Defect -> Rectification
// chain, boiled down to one label + Chip color. Checked furthest-along-first: an open
// defect outranks a pending rectification, which outranks an open inspection, which
// outranks an open spot-check - so the chip always reflects the most operationally
// relevant thing happening on this lift, not just whichever record was touched last.
export function computeStage({ schedules, inspections, defects, rectifications }) {
  const openDefects = defects.filter((d) => OPEN_DEFECT_STATUSES.includes(d.status));
  if (openDefects.length) {
    const critical = openDefects.some((d) => d.severity === 'Critical');
    return {
      label: `${openDefects.length} open defect${openDefects.length === 1 ? '' : 's'}`,
      color: critical ? 'error' : 'warning',
    };
  }

  const pendingRectifications = rectifications.filter((r) => PENDING_RECTIFICATION_STATUSES.includes(r.status));
  if (pendingRectifications.length) {
    const awaitingEndorsement = pendingRectifications.some((r) => r.status === 'Submitted');
    return {
      label: awaitingEndorsement ? 'Awaiting rectification endorsement' : 'Rectification in draft',
      color: awaitingEndorsement ? 'info' : 'default',
    };
  }

  const latestInspection = latestBy(inspections, 'inspectionDate');
  if (latestInspection && latestInspection.overallStatus !== 'Closed') {
    return {
      label: `Inspection: ${latestInspection.overallStatus}`,
      color: INSPECTION_STATUS_COLORS[latestInspection.overallStatus] || 'default',
    };
  }

  const latestSchedule = latestBy(schedules, 'scheduledDate');
  if (latestSchedule && !['Completed', 'Cancelled'].includes(latestSchedule.status)) {
    return {
      label: `Spot-check: ${latestSchedule.status}`,
      color: SCHEDULE_STATUS_COLORS[latestSchedule.status] || 'default',
    };
  }

  if (!schedules.length && !inspections.length && !defects.length && !rectifications.length) {
    return { label: 'Not yet scheduled', color: 'default' };
  }

  return { label: 'Up to date', color: 'success' };
}

// Separate from the stage above on purpose: stage describes *what state* things are in,
// this describes *how long* they've been sitting there. A brand-new open defect and a
// three-week-old one show the same stage chip, but only one of them is actually something
// to escalate right now.
export function computeAttentionReasons({ schedules, defects, rectifications }) {
  const reasons = [];

  const overdueSchedules = schedules.filter(isOverdue);
  if (overdueSchedules.length) {
    reasons.push(
      `${overdueSchedules.length} spot-check${overdueSchedules.length === 1 ? '' : 's'} past its scheduled date and still open`
    );
  }

  const staleDefects = defects.filter(
    (d) => OPEN_DEFECT_STATUSES.includes(d.status) && daysSince(d.reportedDate) >= (DEFECT_STALE_DAYS[d.severity] ?? 14)
  );
  if (staleDefects.length) {
    reasons.push(
      `${staleDefects.length} defect${staleDefects.length === 1 ? '' : 's'} unresolved well past its expected timeframe`
    );
  }

  const staleRectifications = rectifications.filter(
    (r) => r.status === 'Submitted' && daysSince(r.dateRectified) >= ENDORSEMENT_STALE_DAYS
  );
  if (staleRectifications.length) {
    reasons.push(
      `${staleRectifications.length} rectification${staleRectifications.length === 1 ? '' : 's'} submitted ${ENDORSEMENT_STALE_DAYS}+ days ago, still awaiting endorsement`
    );
  }

  return reasons;
}

// Fetches this one lift's slice of all four workflow modules (each already supports
// ?liftId= server-side - see the scheduling/inspections/defects/rectifications
// controllers) and reduces them to the two indicators shown next to the lift header: the
// current stage chip, and why (if anything) needs attention right now. Re-fetches whenever
// `refreshKey` changes so navigating between workflow steps (e.g. via Back/Next) picks up
// anything just created or updated in the step the user came from.
export function useLiftWorkflowStatus(liftId, refreshKey) {
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(null);
  const [attentionReasons, setAttentionReasons] = useState([]);

  useEffect(() => {
    if (!liftId) {
      setStage(null);
      setAttentionReasons([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      scheduleApi.fetchSchedules({ liftId }).catch(() => []),
      inspectionApi.fetchInspections({ liftId }).catch(() => []),
      defectApi.fetchDefects({ liftId }).catch(() => []),
      rectificationApi.fetchRectifications({ liftId }).catch(() => []),
    ]).then(([schedules, inspections, defects, rectifications]) => {
      if (cancelled) return;
      setStage(computeStage({ schedules, inspections, defects, rectifications }));
      setAttentionReasons(computeAttentionReasons({ schedules, defects, rectifications }));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [liftId, refreshKey]);

  return { loading, stage, attentionReasons };
}
