require('dotenv').config();

const mongoose = require('mongoose');
const Schedule = require('./src/models/scheduling/Schedule');

// TODO: each person adds their own seed data here for their feature's models,
// e.g. connect to DATABASE_URL and insert sample lifts/schedules/inspections/etc.

const sampleSchedules = [
  {
    townCouncil: 'Tampines Town Council',
    liftCompany: 'ABC Lifts Pte Ltd',
    blockAddress: 'Blk 201 Tampines St 21',
    scheduledDate: new Date('2026-08-10'),
    assignedInspector: 'John Tan',
    status: 'Scheduled',
    notes: 'Monthly spot-check',
  },
  {
    townCouncil: 'Woodlands Town Council',
    liftCompany: 'Otis Elevator Co',
    blockAddress: '549C Woodlands Dr 44',
    scheduledDate: new Date('2026-08-08'),
    assignedInspector: 'Jane Lim',
    status: 'Assigned',
    notes: '',
  },
  {
    townCouncil: 'Marine Parade Town Council',
    liftCompany: 'KONE Pte Ltd',
    blockAddress: 'Blk 82 Marine Parade Central',
    scheduledDate: new Date('2026-07-28'),
    assignedInspector: 'John Tan',
    status: 'Completed',
    notes: 'No defects found',
  },
];

async function seedScheduling() {
  await Schedule.deleteMany({});
  await Schedule.insertMany(sampleSchedules);
  console.log(`Seeded ${sampleSchedules.length} schedules`);
}

if (require.main === module) {
  mongoose
    .connect(process.env.DATABASE_URL)
    .then(async () => {
      await seedScheduling();
      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedScheduling };
