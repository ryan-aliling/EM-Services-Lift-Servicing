// One-off, non-destructive repair pass: maps existing Schedule.assignedInspector free-text
// strings to real User accounts (assignedStaffId), for any Schedule data that predates the
// User model / wasn't seeded via seed.js's seedUsers()+buildSampleSchedules() (which already
// wires assignedStaffId correctly at insert time).
//
// Kept as a standalone script rather than folded into seed.js on purpose - seed.js's whole
// pattern is destructive (deleteMany + insertMany, meant to wipe and repopulate a dev DB
// from scratch). This script's job is the opposite: run once against whatever
// Schedule/User documents already exist, without touching anything else. Same reasoning
// that kept cleanupOrphans() (backend/src/utils/cascadeDelete.js) a separate, manually-run
// function instead of an automatic one.
//
// Safe to re-run any time - only touches schedules that still have assignedStaffId: null.
// Usage: npm run migrate:assigned-staff
require('dotenv').config();

const mongoose = require('mongoose');
const Schedule = require('../src/models/scheduling/Schedule');
const User = require('../src/models/users/User');

async function backfillAssignedStaffId() {
  const staff = await User.find({ role: 'Staff', isDeleted: false });
  const schedules = await Schedule.find({
    assignedStaffId: null,
    assignedInspector: { $ne: '' },
    isDeleted: false,
  });

  let matched = 0;
  let ambiguous = 0;
  let noMatch = 0;

  for (const schedule of schedules) {
    const name = schedule.assignedInspector.trim().toLowerCase();
    // Exact case-insensitive name match only - no fuzzy/partial matching, ever. A schedule
    // left unmatched (or ambiguously matched) stays assignedStaffId: null - still visible to
    // Admin/Master, simply invisible to any Staff user until manually reassigned via PUT.
    const candidates = staff.filter((u) => u.name.trim().toLowerCase() === name);

    if (candidates.length === 1) {
      schedule.assignedStaffId = candidates[0]._id;
      await schedule.save();
      matched += 1;
    } else if (candidates.length > 1) {
      ambiguous += 1;
      console.warn(
        `Ambiguous match for "${schedule.assignedInspector}" (schedule ${schedule._id}) - ${candidates.length} Staff users share that name. Left null.`
      );
    } else {
      noMatch += 1;
      console.warn(
        `No Staff user found matching "${schedule.assignedInspector}" (schedule ${schedule._id}). Left null.`
      );
    }
  }

  console.log(`Backfill done: ${matched} matched, ${ambiguous} ambiguous, ${noMatch} no match.`);
  return { matched, ambiguous, noMatch };
}

if (require.main === module) {
  mongoose
    .connect(process.env.DATABASE_URL)
    .then(async () => {
      await backfillAssignedStaffId();
      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = { backfillAssignedStaffId };
