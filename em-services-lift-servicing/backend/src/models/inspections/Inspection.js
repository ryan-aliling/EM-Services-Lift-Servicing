const mongoose = require('mongoose');

const CHECKLIST_RESULTS = ['Pass', 'Fail', 'N/A'];
const DEFECT_SEVERITIES = ['Minor', 'Major', 'Critical'];
const DEFECT_STATUSES = ['Open', 'Acknowledged', 'Verified'];
const OVERALL_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Closed'];
const COMPLIANCE_VALUES = ['Pass', 'Defect Found'];

const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    result: { type: String, enum: CHECKLIST_RESULTS, default: 'N/A' },
    remarks: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const defectSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  severity: { type: String, enum: DEFECT_SEVERITIES, default: 'Minor' },
  photoUrl: { type: String, default: '' },
  status: { type: String, enum: DEFECT_STATUSES, default: 'Open' },
  raisedDate: { type: Date, default: Date.now },
});

const inspectionSchema = new mongoose.Schema(
  {
    // Assigned by the controller (see nextReportNo in inspectionController.js) from the
    // current max in the collection, not an ever-incrementing counter — so deleting the
    // highest-numbered report and creating a new one reissues that same number instead of
    // skipping ahead. Uniqueness is enforced below via a partial index scoped to
    // isDeleted: false, not a plain unique field - a soft-deleted report keeps its
    // original reportNo for the audit trail, and that value has to be reissuable to a
    // new active report without colliding with the deleted one.
    reportNo: { type: String, required: true, trim: true },

    // The lift this report is about, plus the optional scheduled visit it followed up on
    // (Lift -> Schedule -> Inspection, per the client's workflow doc). liftId is the source
    // of truth; liftCode/block below are a snapshot taken at creation time (see controller),
    // not live-joined - an inspection report is a historical record, so it shouldn't silently
    // change if the lift's block gets reassigned months later.
    liftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lift', required: true },
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', default: null },
    liftCode: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true },

    inspectionDate: { type: Date, required: true },
    inspectorName: { type: String, required: true, trim: true },
    contractor: { type: String, default: '', trim: true },
    compliance: { type: String, enum: COMPLIANCE_VALUES, default: 'Pass' },
    checklist: { type: [checklistItemSchema], default: [] },
    defects: { type: [defectSchema], default: [] },
    overallStatus: { type: String, enum: OVERALL_STATUSES, default: 'Draft' },
    contractorNotifiedAt: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },

    // Soft delete, so deleting the Schedule this report followed up on can cascade here
    // without destroying the audit trail (see utils/cascadeDelete.js).
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Only active reports need to be collision-free on reportNo - a soft-deleted report
// keeps its original number for the audit trail, and that number is exactly what
// nextReportNo() reissues to the next active report (see inspectionController.js).
inspectionSchema.index({ reportNo: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

module.exports = mongoose.model('Inspection', inspectionSchema);
module.exports.CHECKLIST_RESULTS = CHECKLIST_RESULTS;
module.exports.DEFECT_SEVERITIES = DEFECT_SEVERITIES;
module.exports.DEFECT_STATUSES = DEFECT_STATUSES;
module.exports.OVERALL_STATUSES = OVERALL_STATUSES;
module.exports.COMPLIANCE_VALUES = COMPLIANCE_VALUES;
