const mongoose = require('mongoose');

const LIFT_TYPES = ['Passenger', 'Freight', 'Mixed'];
const LIFT_STATUSES = ['Active', 'Maintenance', 'Out of Service', 'Decommissioned'];

const liftSchema = new mongoose.Schema(
  {
    // Uniqueness is enforced below via a partial index scoped to isDeleted: false, not a
    // plain unique field - a soft-deleted lift keeps its original liftCode for the audit
    // trail, and that code has to be reusable (e.g. a decommissioned lift replaced by a
    // new physical unit in the same shaft) without colliding with the deleted record.
    liftCode: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: LIFT_TYPES },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, required: true, enum: LIFT_STATUSES, default: 'Active' },
    manufacturer: { type: String, default: '', trim: true },
    installDate: { type: Date, default: null },
    lastServiced: { type: Date, default: null },

    // Soft delete, so removing a lift doesn't destroy the audit trail for any
    // Schedule/Inspection/Defect that snapshot its liftCode/block at creation time (those
    // records stay meaningful even after the source Lift is gone) - same pattern as every
    // other model in the app.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Only active lifts need to be collision-free on liftCode - see the comment on the field
// above for why a soft-deleted lift's code has to be reissuable.
liftSchema.index({ liftCode: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

module.exports = mongoose.model('Lift', liftSchema);
module.exports.LIFT_TYPES = LIFT_TYPES;
module.exports.LIFT_STATUSES = LIFT_STATUSES;
