require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Schedule = require('./src/models/scheduling/Schedule');
const Lift = require('./src/models/lifts/Lift');
const Inspection = require('./src/models/inspections/Inspection');
const Defect = require('./src/models/defects/Defect');
const Rectification = require('./src/models/rectifications/Rectification');
const User = require('./src/models/users/User');

// TODO: each person adds their own seed data here for their feature's models,
// e.g. connect to DATABASE_URL and insert sample lifts/schedules/inspections/etc.

// Staff names deliberately match the `assignedInspector` strings already used in
// buildSampleSchedules() below, so that function can set the real `assignedStaffId` link
// directly via a name lookup - guaranteed 1:1 matches since both are authored together
// (see backend/scripts/migrateAssignedStaff.js for the equivalent best-effort match against
// pre-existing data that wasn't seeded this way).
const SAMPLE_USERS = [
  { name: 'Master Admin', email: 'master@emservices.test', password: 'Passw0rd!', role: 'Master' },
  { name: 'Alice Tan', email: 'alice.admin@emservices.test', password: 'Passw0rd!', role: 'Admin' },
  { name: 'Jessica S.', email: 'jessica.s@emservices.test', password: 'Passw0rd!', role: 'Staff' },
  { name: 'Marcus T.', email: 'marcus.t@emservices.test', password: 'Passw0rd!', role: 'Staff' },
  { name: 'Jane Lim', email: 'jane.lim@emservices.test', password: 'Passw0rd!', role: 'Staff' },
  { name: 'John Tan', email: 'john.tan@emservices.test', password: 'Passw0rd!', role: 'Staff' },
];

async function seedUsers() {
  await User.deleteMany({});
  const docs = await Promise.all(
    SAMPLE_USERS.map(async (u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: await bcrypt.hash(u.password, 10),
    }))
  );
  const users = await User.insertMany(docs);
  console.log(`Seeded ${users.length} users. Local dev logins (plaintext, dev-only):`);
  SAMPLE_USERS.forEach((u) => console.log(`  ${u.role.padEnd(6)} ${u.email} / ${u.password}`));
  return users;
}

const sampleLifts = [
  { liftCode: 'L-102', block: 'Blk 201 Tampines St 21', unit: '#B1-01', type: 'Passenger', capacity: 13, status: 'Active', manufacturer: 'KONE', installDate: new Date('2014-03-15'), lastServiced: new Date('2026-07-08') },
  { liftCode: 'L-103', block: 'Blk 201 Tampines St 21', unit: '#B1-02', type: 'Passenger', capacity: 13, status: 'Active', manufacturer: 'KONE', installDate: new Date('2014-03-15'), lastServiced: new Date('2026-07-08') },
  { liftCode: 'L-205', block: '549C Woodlands Dr 44', unit: '#01-01', type: 'Passenger', capacity: 10, status: 'Active', manufacturer: 'Otis', installDate: new Date('2016-09-01'), lastServiced: new Date('2026-07-05') },
  { liftCode: 'L-206', block: '549C Woodlands Dr 44', unit: '#01-02', type: 'Mixed', capacity: 17, status: 'Maintenance', manufacturer: 'Otis', installDate: new Date('2016-09-01'), lastServiced: new Date('2026-06-20') },
  { liftCode: 'L-301', block: 'Blk 82 Marine Parade Central', unit: '#01-01', type: 'Passenger', capacity: 10, status: 'Active', manufacturer: 'Schindler', installDate: new Date('2011-11-20'), lastServiced: new Date('2026-07-11') },
  { liftCode: 'L-302', block: 'Blk 82 Marine Parade Central', unit: '#01-02', type: 'Passenger', capacity: 10, status: 'Active', manufacturer: 'Schindler', installDate: new Date('2011-11-20'), lastServiced: new Date('2026-06-28') },
  { liftCode: 'L-410', block: 'Blk 12A Ang Mo Kio Ave 3', unit: '#01-01', type: 'Passenger', capacity: 15, status: 'Active', manufacturer: 'Mitsubishi Electric', installDate: new Date('2018-05-10'), lastServiced: new Date('2026-07-14') },
  { liftCode: 'L-411', block: 'Blk 12A Ang Mo Kio Ave 3', unit: '#B1-01', type: 'Freight', capacity: 20, status: 'Out of Service', manufacturer: 'Mitsubishi Electric', installDate: new Date('2018-05-10'), lastServiced: new Date('2026-05-30') },
  { liftCode: 'L-522', block: 'Blk 88 Bedok North Rd', unit: '#01-01', type: 'Passenger', capacity: 13, status: 'Active', manufacturer: 'Hitachi', installDate: new Date('2019-01-22'), lastServiced: new Date('2026-07-02') },
  { liftCode: 'L-523', block: 'Blk 88 Bedok North Rd', unit: '#01-02', type: 'Passenger', capacity: 13, status: 'Active', manufacturer: 'Hitachi', installDate: new Date('2019-01-22'), lastServiced: new Date('2026-07-02') },
  { liftCode: 'L-630', block: 'Blk 45 Jurong West St 42', unit: '#01-01', type: 'Passenger', capacity: 8, status: 'Active', manufacturer: 'ThyssenKrupp', installDate: new Date('2009-07-30'), lastServiced: new Date('2026-06-15') },
  { liftCode: 'L-631', block: 'Blk 45 Jurong West St 42', unit: '#01-02', type: 'Passenger', capacity: 8, status: 'Decommissioned', manufacturer: 'ThyssenKrupp', installDate: new Date('2009-07-30'), lastServiced: new Date('2025-11-02') },
];

async function seedLifts() {
  await Lift.deleteMany({});
  const lifts = await Lift.insertMany(sampleLifts);
  console.log(`Seeded ${lifts.length} lifts`);
  return lifts;
}

// Town council per block, and lift company per manufacturer - kept as lookup tables so
// schedule entries stay consistent with the Lift documents they reference below.
const TOWN_COUNCIL_BY_BLOCK = {
  'Blk 201 Tampines St 21': 'Tampines Town Council',
  '549C Woodlands Dr 44': 'Woodlands Town Council',
  'Blk 82 Marine Parade Central': 'Marine Parade Town Council',
  'Blk 12A Ang Mo Kio Ave 3': 'Ang Mo Kio Town Council',
  'Blk 88 Bedok North Rd': 'East Coast-Fengshan Town Council',
  'Blk 45 Jurong West St 42': 'Jurong-Clementi Town Council',
};

const LIFT_COMPANY_BY_MANUFACTURER = {
  KONE: 'KONE Pte Ltd',
  Otis: 'Otis Elevator Company (S) Pte Ltd',
  Schindler: 'Schindler Lifts (Singapore) Pte Ltd',
  'Mitsubishi Electric': 'Mitsubishi Elevator Asia Pte Ltd',
  Hitachi: 'Hitachi Elevator (S) Pte Ltd',
  ThyssenKrupp: 'TK Elevator Singapore Pte Ltd',
};

// Builds schedule fixtures off the real seeded Lift documents so `liftId`/`blockAddress`/
// `liftCompany` line up with an actual lift, and the two Completed entries below land the
// day before the matching inspection's `inspectionDate` in seedInspections() - mirroring
// the real workflow (spot-check -> next-day inspection). Covers every Schedule status.
// `users` (from seedUsers()) is optional so this still works if called standalone without
// users seeded first - assignedStaffId is simply left null in that case.
function buildSampleSchedules(lifts, users = []) {
  const byCode = Object.fromEntries(lifts.map((lift) => [lift.liftCode, lift]));
  const byStaffName = Object.fromEntries(
    users.filter((u) => u.role === 'Staff').map((u) => [u.name, u])
  );
  const forLift = (code, overrides) => {
    const lift = byCode[code];
    const staff = overrides.assignedInspector ? byStaffName[overrides.assignedInspector] : null;
    return {
      townCouncil: TOWN_COUNCIL_BY_BLOCK[lift.block],
      liftCompany: LIFT_COMPANY_BY_MANUFACTURER[lift.manufacturer],
      blockAddress: lift.block,
      liftId: lift._id,
      assignedStaffId: staff ? staff._id : null,
      ...overrides,
    };
  };

  return [
    // Completed - day before INSP-0004 (ventilation fan defect on L-102)
    forLift('L-102', {
      scheduledDate: new Date('2026-06-27'),
      assignedInspector: 'Jessica S.',
      status: 'Completed',
      notes: 'Spot-check completed - ventilation fan defect found, reported next day.',
    }),
    // Completed - day before INSP-0001 (door safety edge defect on L-102)
    forLift('L-102', {
      scheduledDate: new Date('2026-07-07'),
      assignedInspector: 'Jessica S.',
      status: 'Completed',
      notes: 'Spot-check completed - door safety edge defect found, reported next day.',
    }),
    // Completed - day before INSP-0002 (clean pass on L-103)
    forLift('L-103', {
      scheduledDate: new Date('2026-07-04'),
      assignedInspector: 'Jessica S.',
      status: 'Completed',
      notes: 'Spot-check completed - no defects found on follow-up inspection.',
    }),
    // Completed - day before INSP-0003 (lighting + intercom defects on L-205)
    forLift('L-205', {
      scheduledDate: new Date('2026-07-10'),
      assignedInspector: 'Marcus T.',
      status: 'Completed',
      notes: 'Spot-check completed - defects raised on follow-up inspection.',
    }),
    // In Progress - today
    forLift('L-410', {
      scheduledDate: new Date('2026-08-08'),
      assignedInspector: 'Jane Lim',
      status: 'In Progress',
      notes: 'Technician on site.',
    }),
    // Assigned - lift is under Maintenance, spot-check follows once servicing wraps up
    forLift('L-206', {
      scheduledDate: new Date('2026-08-12'),
      assignedInspector: 'John Tan',
      status: 'Assigned',
      notes: 'Awaiting contractor to complete scheduled maintenance before spot-check.',
    }),
    // Scheduled - upcoming, not yet assigned to an inspector
    forLift('L-301', {
      scheduledDate: new Date('2026-08-15'),
      assignedInspector: '',
      status: 'Scheduled',
      notes: 'Monthly spot-check.',
    }),
    forLift('L-630', {
      scheduledDate: new Date('2026-08-20'),
      assignedInspector: '',
      status: 'Scheduled',
      notes: 'Monthly spot-check.',
    }),
    // Cancelled
    forLift('L-522', {
      scheduledDate: new Date('2026-08-01'),
      assignedInspector: 'John Tan',
      status: 'Cancelled',
      notes: 'Rescheduled - estate event at the block on this date.',
    }),
  ];
}

async function seedScheduling(lifts, users = []) {
  const sampleSchedules = buildSampleSchedules(lifts, users);
  await Schedule.deleteMany({});
  const schedules = await Schedule.insertMany(sampleSchedules);
  console.log(`Seeded ${schedules.length} schedules`);
  return schedules;
}

// Inspection requires a real liftId, so seed data needs actual Lift documents to reference.
// seedLifts() is expected to have run already; fall back to creating it here if not.
async function ensureSeedLifts() {
  const existing = await Lift.find();
  if (existing.length) return existing;
  return seedLifts();
}

// Looks up the real Schedule doc a given inspection followed up on, by lift + date, so the
// inspection's `scheduleId` links back to an actual seeded schedule instead of being left
// null - this is what makes the Inspections step demonstrably derive from the Scheduling
// step (see the scheduleId cross-check added in inspectionController.js). Returns null
// (rather than throwing) if seedScheduling() hasn't been run first, so this function still
// degrades gracefully when called standalone.
async function findSeedSchedule(liftId, isoDate) {
  return Schedule.findOne({ liftId, scheduledDate: new Date(isoDate) });
}

async function seedInspections(lifts) {
  lifts = lifts || (await ensureSeedLifts());
  const [liftA, liftB, liftC] = lifts;

  const [scheduleForInsp0004, scheduleForInsp0001, scheduleForInsp0002, scheduleForInsp0003] = await Promise.all([
    findSeedSchedule(liftA._id, '2026-06-27'),
    findSeedSchedule(liftA._id, '2026-07-07'),
    findSeedSchedule(liftB._id, '2026-07-04'),
    findSeedSchedule(liftC._id, '2026-07-10'),
  ]);

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
      scheduleId: scheduleForInsp0001?._id || null,
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
          // Acknowledged, not Open - the contractor was already notified (see
          // contractorNotifiedAt below), matching the notifyContractor controller action
          // which flips embedded defects from Open to Acknowledged.
          status: 'Acknowledged',
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
      scheduleId: scheduleForInsp0002?._id || null,
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
      scheduleId: scheduleForInsp0003?._id || null,
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
      scheduleId: scheduleForInsp0004?._id || null,
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
  const inspections = await Inspection.insertMany(sampleInspections);
  console.log(`Seeded ${inspections.length} inspection reports`);
  return inspections;
}

// Every standalone Defect below is derived directly from an inspection's embedded
// `defects` array (Inspection -> Defect -> Rectification, per the client's workflow doc) -
// same description/severity as the source finding, not re-typed by hand, so the two never
// drift out of sync. The embedded defect's lightweight status (Open/Acknowledged/Verified)
// maps onto the standalone module's fuller lifecycle (Open/In Progress/Resolved/Closed).
const EMBEDDED_TO_STANDALONE_STATUS = {
  Open: 'Open',
  Acknowledged: 'In Progress',
  Verified: 'Closed',
};

async function seedDefectsAndRectifications(inspections) {
  await Defect.deleteMany({});
  await Rectification.deleteMany({});

  // Flatten every inspection's embedded defects into standalone Defect fixtures, keeping a
  // parallel `source` marker (which report + which finding) purely so the rectification
  // fixtures below can find the right defect again after insertMany assigns real _ids -
  // that marker is stripped before insert, it's never actually persisted.
  let seq = 0;
  const drafts = inspections.flatMap((insp) =>
    insp.defects.map((d) => {
      seq += 1;
      const status = EMBEDDED_TO_STANDALONE_STATUS[d.status] || 'Open';
      return {
        source: { reportNo: insp.reportNo, description: d.description },
        doc: {
          defectNo: `DEF-${String(seq).padStart(4, '0')}`,
          title: d.description,
          description: d.description,
          inspectionId: insp._id,
          liftId: insp.liftId,
          liftCode: insp.liftCode,
          location: `${insp.block} - Lift Car`,
          severity: d.severity,
          status,
          reportedBy: insp.inspectorName,
          reportedDate: d.raisedDate || insp.inspectionDate,
          resolvedDate: status === 'Closed' || status === 'Resolved' ? d.raisedDate || insp.inspectionDate : null,
        },
      };
    })
  );

  const defects = await Defect.insertMany(drafts.map((d) => d.doc));
  const findDefect = (reportNo, description) =>
    defects[drafts.findIndex((d) => d.source.reportNo === reportNo && d.source.description === description)];

  // Only two of the derived defects have any rectification progress yet - the rest are
  // freshly raised (Open) with nothing to report on, which is correct: a defect doesn't
  // get a rectification record until the lift company has actually started working it.
  const fanDefect = findDefect('INSP-0004', 'Ventilation fan not spinning, car gets stuffy');
  const doorDefect = findDefect('INSP-0001', 'Door safety edge misaligned, sticks intermittently on close');

  const sampleRectifications = [
    {
      // Fully closed loop: fixed, proof submitted, and endorsed after the joint inspection.
      defectId: fanDefect._id,
      rectifiedBy: 'Apex Elevators - Ravi K.',
      liftCompanyName: 'Apex Elevators',
      dateRectified: new Date('2026-07-01'),
      proofPhotos: ['https://res.cloudinary.com/uwg40w6l/image/upload/v1/seed/def-0001-fan-replaced.jpg'],
      signatureUrl: 'https://res.cloudinary.com/uwg40w6l/image/upload/v1/seed/def-0001-signature.png',
      remarks: 'Fan replaced. Verified fixed on follow-up visit.',
      status: 'Endorsed',
      endorsedBy: 'Jessica S.',
      endorsedDate: new Date('2026-07-02'),
    },
    {
      // Still active and past its 2-week SLA (raised 2026-07-08, due 2026-07-22, today is
      // 2026-08-08): the contractor claims the fix is done but hasn't submitted proof yet,
      // so this sits as an unsubmitted Draft rather than progressing further.
      defectId: doorDefect._id,
      rectifiedBy: 'Koh Lift Services - Daniel Koh',
      liftCompanyName: 'Koh Lift Services',
      dateRectified: new Date('2026-07-20'),
      proofPhotos: [],
      signatureUrl: '',
      remarks: 'Technician says re-alignment done on site, awaiting photos and sign-off to submit.',
      status: 'Draft',
    },
  ];

  await Rectification.insertMany(sampleRectifications);
  console.log(
    `Seeded ${defects.length} defects (derived from inspection findings) and ${sampleRectifications.length} rectifications`
  );
}

if (require.main === module) {
  const { cleanupOrphans } = require('./src/utils/cascadeDelete');

  mongoose
    .connect(process.env.DATABASE_URL)
    .then(async () => {
      const users = await seedUsers();
      const lifts = await seedLifts();
      await seedScheduling(lifts, users);
      const inspections = await seedInspections(lifts);
      await seedDefectsAndRectifications(inspections);

      // Sanity pass: confirms nothing was left dangling by this seed run (should be a
      // no-op on freshly seeded data - see utils/cascadeDelete.js for what this checks).
      const cleanup = await cleanupOrphans();
      console.log('Post-seed integrity check:', JSON.stringify(cleanup));

      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedUsers, seedLifts, seedScheduling, seedInspections, seedDefectsAndRectifications };
