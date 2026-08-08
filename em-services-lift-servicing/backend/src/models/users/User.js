const mongoose = require('mongoose');

// Three roles only - Master, Admin, Staff. There is deliberately no "Manager" role (retired)
// and no Contractor role (a separate, larger piece of work - see design docs).
const ROLES = ['Master', 'Admin', 'Staff'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ROLES },

    // Who created this account - Master creates Admin/Staff, Admin creates Staff only
    // (enforced in the auth controller, not here). Null for accounts provisioned outside
    // the app (e.g. the very first Master account, seeded directly).
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Soft delete (deactivation), same pattern as every other model - see utils/cascadeDelete.js.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);
User.ROLES = ROLES;

module.exports = User;
