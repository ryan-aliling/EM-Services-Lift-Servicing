const mongoose = require('mongoose');

const LIFT_TYPES = ['Passenger', 'Freight', 'Mixed'];
const LIFT_STATUSES = ['Active', 'Maintenance', 'Out of Service', 'Decommissioned'];

const liftSchema = new mongoose.Schema(
  {
    liftCode: { type: String, required: true, unique: true, trim: true },
    block: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: LIFT_TYPES },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, required: true, enum: LIFT_STATUSES, default: 'Active' },
    manufacturer: { type: String, default: '', trim: true },
    installDate: { type: Date, default: null },
    lastServiced: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lift', liftSchema);
module.exports.LIFT_TYPES = LIFT_TYPES;
module.exports.LIFT_STATUSES = LIFT_STATUSES;
