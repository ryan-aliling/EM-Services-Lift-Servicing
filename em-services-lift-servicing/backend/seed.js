require('dotenv').config();

const mongoose = require('mongoose');
const Schedule = require('./src/models/scheduling/Schedule');
const Lift = require('./src/models/lifts/Lift');
const Inspection = require('./src/models/inspections/Inspection');

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

// Inspection requires a real liftId, so seed data needs actual Lift documents to reference.
// If the Lifts feature hasn't seeded any yet (no seedLifts() exists in this file as of
// writing), create a couple of minimal fixtures just so inspection seed data has something
// real to point at. Safe to delete once Lucio/Ryan add their own proper Lift seed data.
async function ensureSeedLifts() {
  const existing = await Lift.find();
  if (existing.length) return existing;

  console.log('No Lift documents found — creating minimal fixtures so inspections have a real liftId to reference.');
  return Lift.insertMany([
    { liftCode: 'L-102', block: 'Blk 12A', unit: '#01-01', type: 'Passenger', capacity: 13, manufacturer: 'KONE' },
    { liftCode: 'L-205', block: 'Blk 8', unit: '#01-01', type: 'Passenger', capacity: 10, manufacturer: 'Otis' },
    { liftCode: 'L-301', block: 'Blk 22B', unit: '#01-01', type: 'Passenger', capacity: 10, manufacturer: 'Schindler' },
  ]);
}

async function seedInspections() {
  const lifts = await ensureSeedLifts();
  const [liftA, liftB, liftC] = lifts;

  const passChecklist = [
    { item: 'Lift car interior & lighting', result: 'Pass', remarks: '' },
    { item: 'Door operation (open/close, safety edge)', result: 'Pass', remarks: '' },
    { item: 'Emergency alarm & intercom', result: 'Pass', remarks: '' },
    { item: 'Ventilation / fan', result: 'Pass', remarks: '' },
    { item: 'Floor leveling accuracy', result: 'Pass', remarks: '' },
    { item: 'Control panel buttons & indicators', result: 'Pass', remarks: '' },
    { item: 'Cabling & hoistway (visual check)', result: 'N/A', remarks: 'Not accessible during visit' },
    { item: 'Machine room cleanliness & signage', result: 'Pass', remarks: '' },
  ];

  const sampleInspections = [
    {
      reportNo: 'INSP-0001',
      liftId: liftA._id,
      liftCode: liftA.liftCode,
      block: liftA.block,
      inspectionDate: new Date('2026-07-08'),
      inspectorName: 'Jessica S.',
      contractor: 'Koh Lift Services',
      compliance: 'Defect Found',
      checklist: passChecklist.map((c) =>
        c.item.startsWith('Door') ? { ...c, result: 'Fail', remarks: 'Safety edge sticky on close' } : c
      ),
      defects: [
        {
          description: 'Door safety edge misaligned, sticks intermittently on close',
          severity: 'Major',
          photoUrl: '',
          status: 'Open',
          raisedDate: new Date('2026-07-08'),
        },
      ],
      overallStatus: 'Under Review',
      contractorNotifiedAt: new Date('2026-07-08T10:00:00.000Z'),
      notes: 'Contractor to re-align safety edge within 2 weeks per SLA.',
    },
    {
      reportNo: 'INSP-0002',
      liftId: liftB._id,
      liftCode: liftB.liftCode,
      block: liftB.block,
      inspectionDate: new Date('2026-07-05'),
      inspectorName: 'Jessica S.',
      contractor: 'Apex Elevators',
      compliance: 'Pass',
      checklist: passChecklist,
      defects: [],
      overallStatus: 'Closed',
      contractorNotifiedAt: null,
      notes: 'Clean spot-check, no issues found.',
    },
    {
      reportNo: 'INSP-0003',
      liftId: liftC._id,
      liftCode: liftC.liftCode,
      block: liftC.block,
      inspectionDate: new Date('2026-07-11'),
      inspectorName: 'Marcus T.',
      contractor: 'Koh Lift Services',
      compliance: 'Defect Found',
      checklist: passChecklist.map((c) => {
        if (c.item.startsWith('Lift car')) return { ...c, result: 'Fail', remarks: 'Ceiling light flickering' };
        if (c.item.startsWith('Emergency')) return { ...c, result: 'Fail', remarks: 'Intercom static, hard to hear' };
        return c;
      }),
      defects: [
        { description: 'Ceiling light flickering intermittently', severity: 'Minor', photoUrl: '', status: 'Open', raisedDate: new Date('2026-07-11') },
        { description: 'Emergency intercom has static, resident may not be heard clearly', severity: 'Critical', photoUrl: '', status: 'Open', raisedDate: new Date('2026-07-11') },
      ],
      overallStatus: 'Draft',
      contractorNotifiedAt: null,
      notes: '',
    },
    {
      reportNo: 'INSP-0004',
      liftId: liftA._id,
      liftCode: liftA.liftCode,
      block: liftA.block,
      inspectionDate: new Date('2026-06-28'),
      inspectorName: 'Jessica S.',
      contractor: 'Apex Elevators',
      compliance: 'Defect Found',
      checklist: passChecklist.map((c) => (c.item.startsWith('Ventilation') ? { ...c, result: 'Fail', remarks: 'Fan not spinning' } : c)),
      defects: [
        { description: 'Ventilation fan not spinning, car gets stuffy', severity: 'Minor', photoUrl: '', status: 'Verified', raisedDate: new Date('2026-06-28') },
      ],
      overallStatus: 'Closed',
      contractorNotifiedAt: new Date('2026-06-28T11:00:00.000Z'),
      notes: 'Fan replaced by contractor, verified fixed on follow-up visit.',
    },
  ];

  await Inspection.deleteMany({});
  await Inspection.insertMany(sampleInspections);
  console.log(`Seeded ${sampleInspections.length} inspection reports`);
}

if (require.main === module) {
  mongoose
    .connect(process.env.DATABASE_URL)
    .then(async () => {
      await seedScheduling();
      await seedInspections();
      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedScheduling, seedInspections };
