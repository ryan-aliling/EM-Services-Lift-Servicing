// Defects API tests (Elijah). See test-cases.md for the full test plan.
//
// Uses an in-memory MongoDB (mongodb-memory-server) so this suite never touches the real
// Atlas DATABASE_URL, and mounts only the defects router on a bare Express app rather than
// requiring src/server.js (which connects to Mongo / calls app.listen as a side effect of
// being required) - same approach as tests/Javier/placeholder.test.js and
// tests/Aeric/placeholder.test.js.
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const defectsRoutes = require('../../src/routes/defects/defectsRoutes');
const Lift = require('../../src/models/lifts/Lift');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/defects', defectsRoutes);
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

const basePayload = (overrides = {}) => ({
  title: 'Door not closing fully',
  location: 'Blk 12 lift lobby',
  severity: 'Major',
  ...overrides,
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

describe('POST /api/defects', () => {
  test('creates a defect with the first defect number and default Open status', async () => {
    const res = await request(app).post('/api/defects').send(basePayload());

    expect(res.status).toBe(201);
    expect(res.body.data.defectNo).toBe('DEF-0001');
    expect(res.body.data.status).toBe('Open');
    expect(res.body.data.title).toBe('Door not closing fully');
    expect(res.body.data.resolvedDate).toBeNull();
  });

  test('rejects a payload missing required fields', async () => {
    const res = await request(app).post('/api/defects').send({ title: 'No location or severity' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/location/i);
  });

  test('rejects an invalid severity value', async () => {
    const res = await request(app).post('/api/defects').send(basePayload({ severity: 'Super Bad' }));

    expect(res.status).toBe(500); // Mongoose enum validation surfaces as a 500 via the shared error handler
  });

  test('snapshots liftCode when a valid liftId is supplied', async () => {
    const lift = await createTestLift();
    const res = await request(app).post('/api/defects').send(basePayload({ liftId: lift._id.toString() }));

    expect(res.status).toBe(201);
    expect(res.body.data.liftCode).toBe('L-TEST-1');
  });

  test('rejects a liftId that does not resolve to a real lift', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).post('/api/defects').send(basePayload({ liftId: fakeId.toString() }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lift not found/i);
  });
});

describe('defect number reuse after delete', () => {
  test('reissues the highest deleted number instead of skipping ahead', async () => {
    const first = await request(app).post('/api/defects').send(basePayload());
    const second = await request(app).post('/api/defects').send(basePayload());
    expect(first.body.data.defectNo).toBe('DEF-0001');
    expect(second.body.data.defectNo).toBe('DEF-0002');

    const del = await request(app).delete(`/api/defects/${second.body.data._id}`);
    expect(del.status).toBe(200);

    const third = await request(app).post('/api/defects').send(basePayload());
    expect(third.body.data.defectNo).toBe('DEF-0002');
  });
});

describe('PUT /api/defects/:id - full edit', () => {
  test('allows correcting any field regardless of current status', async () => {
    const created = await request(app).post('/api/defects').send(basePayload());
    await request(app).put(`/api/defects/${created.body.data._id}`).send({ status: 'In Progress' });

    const res = await request(app)
      .put(`/api/defects/${created.body.data._id}`)
      .send({ title: 'Corrected: door sensor misaligned', location: 'Blk 12A lobby', severity: 'Critical' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Corrected: door sensor misaligned');
    expect(res.body.data.location).toBe('Blk 12A lobby');
    expect(res.body.data.severity).toBe('Critical');
    expect(res.body.data.status).toBe('In Progress'); // unaffected by unrelated field edits
  });

  test('rejects clearing the title to an empty string', async () => {
    const created = await request(app).post('/api/defects').send(basePayload());
    const res = await request(app).put(`/api/defects/${created.body.data._id}`).send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/title/i);
  });

  test('returns 404 when editing an unknown id', async () => {
    const unknownId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/api/defects/${unknownId}`).send({ title: 'Anything' });
    expect(res.status).toBe(404);
  });
});

describe('status transitions', () => {
  test('allows the normal forward path Open -> In Progress -> Resolved -> Closed', async () => {
    const created = await request(app).post('/api/defects').send(basePayload());
    const id = created.body.data._id;

    const toInProgress = await request(app).put(`/api/defects/${id}`).send({ status: 'In Progress' });
    expect(toInProgress.status).toBe(200);

    const toResolved = await request(app).put(`/api/defects/${id}`).send({ status: 'Resolved' });
    expect(toResolved.status).toBe(200);
    expect(toResolved.body.data.resolvedDate).not.toBeNull();

    const toClosed = await request(app).put(`/api/defects/${id}`).send({ status: 'Closed' });
    expect(toClosed.status).toBe(200);
  });

  test('blocks skipping straight from Open to Resolved', async () => {
    const created = await request(app).post('/api/defects').send(basePayload());
    const res = await request(app).put(`/api/defects/${created.body.data._id}`).send({ status: 'Resolved' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot change status/i);
  });

  test('allows reopening a Closed defect back to Open', async () => {
    const created = await request(app).post('/api/defects').send(basePayload());
    const id = created.body.data._id;
    await request(app).put(`/api/defects/${id}`).send({ status: 'In Progress' });
    await request(app).put(`/api/defects/${id}`).send({ status: 'Resolved' });
    await request(app).put(`/api/defects/${id}`).send({ status: 'Closed' });

    const res = await request(app).put(`/api/defects/${id}`).send({ status: 'Open' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Open');
  });
});

describe('DELETE /api/defects/:id', () => {
  test('deletes an existing defect', async () => {
    const created = await request(app).post('/api/defects').send(basePayload());
    const res = await request(app).delete(`/api/defects/${created.body.data._id}`);
    expect(res.status).toBe(200);

    const getRes = await request(app).get(`/api/defects/${created.body.data._id}`);
    expect(getRes.status).toBe(404);
  });

  test('returns 404 when deleting an unknown id', async () => {
    const unknownId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/defects/${unknownId}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/defects', () => {
  test('filters by a comma-separated status list (multi-select filter)', async () => {
    const first = await request(app).post('/api/defects').send(basePayload());
    await request(app).post('/api/defects').send(basePayload());
    await request(app).put(`/api/defects/${first.body.data._id}`).send({ status: 'In Progress' });

    const res = await request(app).get('/api/defects').query({ status: 'Open,In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  test('searches by defect number', async () => {
    const created = await request(app).post('/api/defects').send(basePayload());
    const res = await request(app).get('/api/defects').query({ q: created.body.data.defectNo });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].defectNo).toBe(created.body.data.defectNo);
  });

  test('filters by liftId - only returns that lift\'s defects, not other lifts\'', async () => {
    const liftA = await createTestLift();
    const liftB = await createTestLift({ liftCode: 'L-TEST-2' });
    await request(app).post('/api/defects').send(basePayload({ liftId: liftA._id.toString() }));
    await request(app).post('/api/defects').send(basePayload({ liftId: liftB._id.toString() }));

    const res = await request(app).get('/api/defects').query({ liftId: liftA._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].liftId).toBe(liftA._id.toString());
  });
});

describe('GET /api/defects/stats', () => {
  test('counts defects by status and flags open critical defects', async () => {
    const critical = await request(app).post('/api/defects').send(basePayload({ severity: 'Critical' }));
    await request(app).post('/api/defects').send(basePayload());
    await request(app).put(`/api/defects/${critical.body.data._id}`).send({ status: 'In Progress' });

    const res = await request(app).get('/api/defects/stats');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.open).toBe(1);
    expect(res.body.data.inProgress).toBe(1);
    expect(res.body.data.criticalOpen).toBe(1);
  });
});