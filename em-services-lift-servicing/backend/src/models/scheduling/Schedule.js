const mongoose = require('mongoose');

// Matches the client's paper spot-check form fields (Town Council / Lift Company /
// Block-Lift Address) so a schedule entry can stand alone even before the Lifts
// feature's own model/collection exists. Once Lifts is built, `liftId` can be
// populated to link back to the canonical lift record.
const STATUS_VALUES = ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

const scheduleSchema = new mongoose.Schema(
  {
    townCouncil: { type: String, required: true, trim: true },
    liftCompany: { type: String, required: true, trim: true },
    blockAddress: { type: String, required: true, trim: true },

    // Optional forward link to the Lifts feature's model.
    liftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lift', default: null },

    scheduledDate: { type: Date, required: true },
    assignedInspector: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'Scheduled',
    },

    notes: { type: String, trim: true, default: '' },

    // Soft delete, per assignment guide (delete can be optional/soft).
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

scheduleSchema.index({ scheduledDate: 1 });
scheduleSchema.index({ status: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);
Schedule.STATUS_VALUES = STATUS_VALUES;

module.exports = Schedule;