const mongoose = require('mongoose');

const RECTIFICATION_STATUSES = ['Draft', 'Submitted', 'Endorsed'];

const rectificationSchema = new mongoose.Schema(
  {
    // The defect this rectification closes out. Always required - a rectification
    // record only exists in relation to a specific logged defect.
    defectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Defect', required: true },

    rectifiedBy: { type: String, required: true, trim: true },
    liftCompanyName: { type: String, default: '', trim: true },
    dateRectified: { type: Date, required: true },

    // proofPhotos/signatureUrl are NOT enforced with Mongoose `required` even though
    // signatureUrl conceptually "is" required for a finished record - the workflow this
    // feature supports explicitly allows saving a partial record as "Draft" before the
    // lift company has uploaded any photos or signed (see rectificationController.js
    // assertSubmittable). Requiring them at the schema level would make Draft creation
    // impossible. They're validated instead at the controller level, only when the
    // requested/target status is "Submitted".
    proofPhotos: { type: [String], default: [] },
    signatureUrl: { type: String, default: '' },

    remarks: { type: String, default: '', trim: true },

    status: { type: String, enum: RECTIFICATION_STATUSES, default: 'Draft' },

    // Filled in by PATCH /:id/endorse once EM staff sign off after the joint inspection.
    endorsedBy: { type: String, default: '', trim: true },
    endorsedDate: { type: Date, default: null },

    // Soft delete - only allowed while status is "Draft" (see deleteRectification),
    // so a Submitted/Endorsed record can never quietly disappear from the audit trail.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rectification', rectificationSchema);
module.exports.RECTIFICATION_STATUSES = RECTIFICATION_STATUSES;
