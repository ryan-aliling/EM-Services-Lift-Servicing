// Inspections API tests (Javier). See test-cases.md for the full test plan.
//
// Uses an in-memory MongoDB (mongodb-memory-server) so this suite never touches the real
// Atlas DATABASE_URL, and mounts only the inspections router on a bare Express app rather
// than requiring src/server.js (which connects to Mongo / calls app.listen as a side
// effect of being required) - same approach as tests/Aeric/placeholder.test.js.
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const inspectionsRoutes = require('../../src/routes/inspections/inspectionsRoutes');
const Lift = require('../../src/models/lifts/Lift');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/inspections', inspectionsRoutes);
  // Mirrors the error-handler added to src/server.js - without it, ApiError throws from
  // asyncHandler would fall through to Express's default HTML error page instead of JSON.
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' });
  });
  return app;
}

async function createTestLift(overrides = {}) {
  return Lift.create({
    liftCode: 'L-TEST-1',
    block: 'Blk 1',
    unit: '#01-01',
    type: 'Passenger',
    capacity: 10,
    ...overrides,
  });
}

const basePayload = (liftId) => ({
  liftId,
  inspectionDate: '2026-01-01',
  inspectorName: 'Jessica S.',
});

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = buildTestApp();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('POST /api/inspections', () => {
  test('creates a report with the first report number and default Draft status', async () => {
    const lift = await createTestLift();
    const res = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));

    expect(res.status).toBe(201);
    expect(res.body.data.reportNo).toBe('INSP-0001');
    expect(res.body.data.overallStatus).toBe('Draft');
    expect(res.body.data.compliance).toBe('Pass');
    expect(res.body.data.liftCode).toBe('L-TEST-1');
    expect(res.body.data.block).toBe('Blk 1');
  });

  test('rejects a payload missing required fields', async () => {
    const res = await request(app).post('/api/inspections').send({ inspectorName: 'Jessica S.' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/liftId/i);
  });

  test('rejects a liftId that does not resolve to a real lift', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).post('/api/inspections').send(basePayload(fakeId.toString()));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lift not found/i);
  });

  test('rejects a future inspection date', async () => {
    const lift = await createTestLift();
    const res = await request(app)
      .post('/api/inspections')
      .send({ ...basePayload(lift._id.toString()), inspectionDate: '2099-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/future/i);
  });

  test('derives compliance "Defect Found" when defects are included', async () => {
    const lift = await createTestLift();
    const res = await request(app)
      .post('/api/inspections')
      .send({
        ...basePayload(lift._id.toString()),
        defects: [{ description: 'Door sticks', severity: 'Minor' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.compliance).toBe('Defect Found');
  });
});

describe('report number reuse after delete', () => {
  test('reissues the highest deleted number instead of skipping ahead', async () => {
    const lift = await createTestLift();

    const first = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));
    const second = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));
    expect(first.body.data.reportNo).toBe('INSP-0001');
    expect(second.body.data.reportNo).toBe('INSP-0002');

    const del = await request(app).delete(`/api/inspections/${second.body.data._id}`);
    expect(del.status).toBe(200);

    const third = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));
    expect(third.body.data.reportNo).toBe('INSP-0002');
  });
});

describe('edit lock', () => {
  test('allows editing a Draft report', async () => {
    const lift = await createTestLift();
    const created = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));

    const res = await request(app)
      .put(`/api/inspections/${created.body.data._id}`)
      .send({ notes: 'updated while still draft' });

    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('updated while still draft');
  });

  test('blocks editing once a report is Submitted', async () => {
    const lift = await createTestLift();
    const created = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));

    await request(app)
      .put(`/api/inspections/${created.body.data._id}`)
      .send({ overallStatus: 'Submitted' });

    const res = await request(app)
      .put(`/api/inspections/${created.body.data._id}`)
      .send({ notes: 'trying to edit after submit' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already been submitted/i);
  });
});

describe('delete rules', () => {
  test('allows deleting a Draft report', async () => {
    const lift = await createTestLift();
    const created = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));

    const res = await request(app).delete(`/api/inspections/${created.body.data._id}`);
    expect(res.status).toBe(200);
  });

  test('blocks deleting a report that is no longer Draft', async () => {
    const lift = await createTestLift();
    const created = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));

    await request(app)
      .put(`/api/inspections/${created.body.data._id}`)
      .send({ overallStatus: 'Submitted' });

    const res = await request(app).delete(`/api/inspections/${created.body.data._id}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/audit/i);
  });

  test('returns 404 when deleting an unknown id', async () => {
    const unknownId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/inspections/${unknownId}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/inspections', () => {
  test('filters by a comma-separated status list (multi-select filter)', async () => {
    const lift = await createTestLift();
    const toSubmit = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));
    await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));
    await request(app).put(`/api/inspections/${toSubmit.body.data._id}`).send({ overallStatus: 'Submitted' });

    const res = await request(app).get('/api/inspections').query({ status: 'Draft,Submitted' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  test('searches by report number', async () => {
    const lift = await createTestLift();
    const created = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));

    const res = await request(app).get('/api/inspections').query({ q: created.body.data.reportNo });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].reportNo).toBe(created.body.data.reportNo);
  });
});

describe('PATCH /api/inspections/:id/notify-contractor', () => {
  test('rejects notifying a report with no defects logged', async () => {
    const lift = await createTestLift();
    const created = await request(app).post('/api/inspections').send(basePayload(lift._id.toString()));

    const res = await request(app).patch(`/api/inspections/${created.body.data._id}/notify-contractor`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no defects/i);
  });

  test('notifies successfully and flips status to Under Review when defects exist', async () => {
    const lift = await createTestLift();
    const created = await request(app)
      .post('/api/inspections')
      .send({ ...basePayload(lift._id.toString()), defects: [{ description: 'Door sticks' }] });

    const res = await request(app).patch(`/api/inspections/${created.body.data._id}/notify-contractor`);

    expect(res.status).toBe(200);
    expect(res.body.data.overallStatus).toBe('Under Review');
    expect(res.body.data.contractorNotifiedAt).not.toBeNull();
    expect(res.body.data.defects[0].status).toBe('Acknowledged');
  });
});
