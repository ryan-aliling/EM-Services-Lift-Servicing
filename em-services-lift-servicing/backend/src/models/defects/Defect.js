const mongoose = require('mongoose');

// Severity matches the terminology already used for embedded defects on inspection
// reports (see models/inspections/Inspection.js) for consistency across the app.
const DEFECT_SEVERITIES = ['Minor', 'Major', 'Critical'];

// A standalone defect has its own lifecycle, separate from the lightweight
// Open/Acknowledged/Verified status used for defects embedded on an inspection report.
const DEFECT_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

const defectSchema = new mongoose.Schema(
  {
    // Assigned by the controller from the current max in the collection (see
    // nextDefectNo in defectController.js), not an ever-incrementing counter -
    // mirrors reportNo in models/inspections/Inspection.js so deleting the
    // highest-numbered defect and creating a new one reissues that number
    // instead of skipping ahead.
    defectNo: { type: String, required: true, unique: true, trim: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },

    // Optional link to a real lift asset. Not required, since a defect can be
    // logged against a general area (e.g. "Blk 12 lift lobby") before anyone
    // has pinned down exactly which lift is at fault. liftCode/block are a
    // snapshot taken at creation time (see resolveLiftSnapshot in the
    // controller) - a defect is a historical record and shouldn't silently
    // change if the lift's block gets reassigned later.
    liftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lift', default: null },
    liftCode: { type: String, default: '', trim: true },
    location: { type: String, required: true, trim: true },

    // Optional link back to the Inspection report that raised this defect (Schedule ->
    // Inspection -> Defect, per the client's workflow doc). Left null for defects logged
    // independently of a report (e.g. a tenant complaint or ad-hoc walkthrough finding) -
    // per the design doc, standalone defects aren't required to trace back to an inspection.
    inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection', default: null },

    severity: { type: String, enum: DEFECT_SEVERITIES, required: true },
    status: { type: String, enum: DEFECT_STATUSES, default: 'Open' },

    reportedBy: { type: String, default: 'Unknown', trim: true },
    reportedDate: { type: Date, default: Date.now },

    // Set by the controller the moment status first reaches Resolved - kept even if
    // later reopened, so "how long did this take to fix" stays answerable.
    resolvedDate: { type: Date, default: null },

    // Soft delete, so deleting the Inspection this defect was raised on can cascade here
    // without destroying the audit trail (see utils/cascadeDelete.js).
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Defect', defectSchema);
module.exports.DEFECT_SEVERITIES = DEFECT_SEVERITIES;
module.exports.DEFECT_STATUSES = DEFECT_STATUSES;