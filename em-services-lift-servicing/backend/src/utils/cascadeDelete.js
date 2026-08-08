// Cascades a soft delete down the workflow chain: Schedule -> Inspection -> Defect ->
// Rectification. Each step of the chain is optional-by-design (an Inspection can exist
// without a Schedule, a Defect without an Inspection - see the model comments), so
// cascading only ever touches records that actually declared the link, and only ever
// flips `isDeleted` (never a hard delete) so the audit trail stays intact and reversible.
const Inspection = require('../models/inspections/Inspection');
const Defect = require('../models/defects/Defect');
const Rectification = require('../models/rectifications/Rectification');

// Soft-deletes every Rectification pointing at any of the given defect ids.
async function cascadeFromDefects(defectIds) {
  if (!defectIds || !defectIds.length) return { rectifications: 0 };
  const { modifiedCount } = await Rectification.updateMany(
    { defectId: { $in: defectIds }, isDeleted: false },
    { isDeleted: true }
  );
  return { rectifications: modifiedCount };
}

// Soft-deletes every standalone Defect raised by any of the given inspection ids, then
// cascades further down to any Rectification against those defects.
async function cascadeFromInspections(inspectionIds) {
  if (!inspectionIds || !inspectionIds.length) return { defects: 0, rectifications: 0 };

  const defectIds = await Defect.find(
    { inspectionId: { $in: inspectionIds }, isDeleted: false },
    '_id'
  ).distinct('_id');

  const { modifiedCount } = await Defect.updateMany(
    { inspectionId: { $in: inspectionIds }, isDeleted: false },
    { isDeleted: true }
  );

  const deeper = await cascadeFromDefects(defectIds);
  return { defects: modifiedCount, ...deeper };
}

// Soft-deletes every Inspection that followed up on the given schedule, then cascades
// further down through the Defects and Rectifications those inspections led to. Called
// right after a Schedule is itself soft-deleted.
async function cascadeFromSchedule(scheduleId) {
  const inspectionIds = await Inspection.find(
    { scheduleId, isDeleted: false },
    '_id'
  ).distinct('_id');

  const { modifiedCount } = await Inspection.updateMany(
    { scheduleId, isDeleted: false },
    { isDeleted: true }
  );

  const deeper = await cascadeFromInspections(inspectionIds);
  return { inspections: modifiedCount, ...deeper };
}

// Repair pass, safe to re-run at any time: (1) backfills `isDeleted: false` onto any
// legacy documents saved before that field existed (a plain MongoDB equality filter like
// `{ isDeleted: false }` does NOT match a document where the field is simply absent, so
// without this those old records would silently disappear from every list/get endpoint),
// then (2) soft-deletes any Defect/Inspection/Rectification left dangling because its
// parent was removed by something other than the cascading delete handlers above (e.g. a
// direct database edit, or data seeded before a link field existed).
async function cleanupOrphans() {
  const Schedule = require('../models/scheduling/Schedule');

  const backfill = await Promise.all([
    Inspection.updateMany({ isDeleted: { $exists: false } }, { isDeleted: false }),
    Defect.updateMany({ isDeleted: { $exists: false } }, { isDeleted: false }),
  ]);

  const orphanedInspectionIds = await Inspection.find({
    isDeleted: false,
    scheduleId: { $ne: null },
  })
    .then(async (inspections) => {
      const scheduleIds = inspections.map((i) => i.scheduleId).filter(Boolean);
      const liveSchedules = await Schedule.find({ _id: { $in: scheduleIds }, isDeleted: false }, '_id').distinct(
        '_id'
      );
      const liveSet = new Set(liveSchedules.map(String));
      return inspections.filter((i) => !liveSet.has(String(i.scheduleId))).map((i) => i._id);
    });
  await Inspection.updateMany({ _id: { $in: orphanedInspectionIds } }, { isDeleted: true });

  const orphanedDefectIds = await Defect.find({
    isDeleted: false,
    inspectionId: { $ne: null },
  })
    .then(async (defects) => {
      const inspectionIds = defects.map((d) => d.inspectionId).filter(Boolean);
      const liveInspections = await Inspection.find(
        { _id: { $in: inspectionIds }, isDeleted: false },
        '_id'
      ).distinct('_id');
      const liveSet = new Set(liveInspections.map(String));
      return defects.filter((d) => !liveSet.has(String(d.inspectionId))).map((d) => d._id);
    });
  await Defect.updateMany({ _id: { $in: orphanedDefectIds } }, { isDeleted: true });

  const orphanedRectifications = await Rectification.find({ isDeleted: false }).then(async (rects) => {
    const defectIds = rects.map((r) => r.defectId).filter(Boolean);
    const liveDefects = await Defect.find({ _id: { $in: defectIds }, isDeleted: false }, '_id').distinct('_id');
    const liveSet = new Set(liveDefects.map(String));
    return rects.filter((r) => !liveSet.has(String(r.defectId))).map((r) => r._id);
  });
  await Rectification.updateMany({ _id: { $in: orphanedRectifications } }, { isDeleted: true });

  return {
    backfilled: { inspections: backfill[0].modifiedCount, defects: backfill[1].modifiedCount },
    orphaned: {
      inspections: orphanedInspectionIds.length,
      defects: orphanedDefectIds.length,
      rectifications: orphanedRectifications.length,
    },
  };
}

module.exports = { cascadeFromSchedule, cascadeFromInspections, cascadeFromDefects, cleanupOrphans };
