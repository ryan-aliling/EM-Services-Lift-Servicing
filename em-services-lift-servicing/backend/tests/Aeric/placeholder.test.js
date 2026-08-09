// Scheduling API tests (Aeric). See test-cases.md for the full test plan.
//
// Uses an in-memory MongoDB (mongodb-memory-server) so this suite never
// touches the real Atlas DATABASE_URL, and mounts only the scheduling router
// on a bare Express app rather than requiring src/server.js (which connects
// to Mongo / calls app.listen as a side effect of being required).
//
// schedulingRoutes now requires an authenticated caller on every route (RBAC pass) - every
// request below runs as an Admin user via asUser(), which has full unrestricted CRUD access,
// matching this suite's original (pre-RBAC) behavior. Staff-specific scoping is covered
// separately in tests/Auth/auth.test.js.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const schedulingRoutes = require('../../src/routes/scheduling/schedulingRoutes');
const Lift = require('../../src/models/lifts/Lift');
const { createTestUser, authHeader } = require('../testAuthHelper');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/scheduling', schedulingRoutes);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' });
  });
  return app;
}

function asUser(user) {
  const header = authHeader(user);
  return {
    get: (url) => request(app).get(url).set('Authorization', header),
    post: (url) => request(app).post(url).set('Authorization', header),
    put: (url) => request(app).put(url).set('Authorization', header),
    delete: (url) => request(app).delete(url).set('Authorization', header),
  };
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

const validPayload = {
  townCouncil: 'Tampines Town Council',
  liftCompany: 'ABC Lifts Pte Ltd',
  blockAddress: 'Blk 201 Tampines St 21',
  scheduledDate: '2026-09-01',
  assignedInspector: 'John Tan',
};

let mongod;
let app;
let admin;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = buildTestApp();
});

beforeEach(async () => {
  admin = await createTestUser('Admin');
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('POST /api/scheduling', () => {
  test('creates a schedule with default status Scheduled', async () => {
    const res = await asUser(admin).post('/api/scheduling').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Scheduled');
    expect(res.body.data.townCouncil).toBe(validPayload.townCouncil);
    expect(res.body.data.isDeleted).toBe(false);
  });

  test('rejects a payload missing required fields', async () => {
    const res = await asUser(admin).post('/api/scheduling').send({ townCouncil: 'Tampines Town Council' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('persists liftId when a lift is linked via LiftSelect', async () => {
    const lift = await createTestLift();
    const res = await asUser(admin)
      .post('/api/scheduling')
      .send({ ...validPayload, liftId: lift._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.liftId).toBe(lift._id.toString());
  });
});

describe('GET /api/scheduling', () => {
  test('lists schedules sorted by scheduledDate ascending', async () => {
    await asUser(admin).post('/api/scheduling').send({ ...validPayload, scheduledDate: '2026-09-15' });
    await asUser(admin)
      .post('/api/scheduling')
      .send({ ...validPayload, blockAddress: 'Blk 202', scheduledDate: '2026-08-20' });

    const res = await asUser(admin).get('/api/scheduling');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(new Date(res.body.data[0].scheduledDate).getTime()).toBeLessThan(
      new Date(res.body.data[1].scheduledDate).getTime()
    );
  });

  test('filters by status', async () => {
    const created = await asUser(admin).post('/api/scheduling').send(validPayload);
    await asUser(admin).put(`/api/scheduling/${created.body.data._id}`).send({ status: 'Assigned' });
    await asUser(admin).post('/api/scheduling').send({ ...validPayload, blockAddress: 'Blk 203' });

    const res = await asUser(admin).get('/api/scheduling').query({ status: 'Assigned' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('Assigned');
  });

  test('filters by liftId - only returns that lift\'s schedules, not other lifts\'', async () => {
    const liftA = await createTestLift();
    const liftB = await createTestLift({ liftCode: 'L-TEST-2' });
    await asUser(admin)
      .post('/api/scheduling')
      .send({ ...validPayload, liftId: liftA._id.toString() });
    await asUser(admin)
      .post('/api/scheduling')
      .send({ ...validPayload, blockAddress: 'Blk 202', liftId: liftB._id.toString() });

    const res = await asUser(admin).get('/api/scheduling').query({ liftId: liftA._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].liftId).toBe(liftA._id.toString());
  });
});

describe('GET /api/scheduling/:id', () => {
  test('returns 400 for a malformed id', async () => {
    const res = await asUser(admin).get('/api/scheduling/not-a-valid-id');
    expect(res.status).toBe(400);
  });

  test('returns 404 for a well-formed but unknown id', async () => {
    const unknownId = new mongoose.Types.ObjectId();
    const res = await asUser(admin).get(`/api/scheduling/${unknownId}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/scheduling/:id', () => {
  test('rejects an invalid status value and leaves the record unchanged', async () => {
    const created = await asUser(admin).post('/api/scheduling').send(validPayload);

    const res = await asUser(admin).put(`/api/scheduling/${created.body.data._id}`).send({ status: 'Bogus' });
    expect(res.status).toBe(400);

    const check = await asUser(admin).get(`/api/scheduling/${created.body.data._id}`);
    expect(check.body.data.status).toBe('Scheduled');
  });

  test('accepts a valid status transition', async () => {
    const created = await asUser(admin).post('/api/scheduling').send(validPayload);

    const res = await asUser(admin)
      .put(`/api/scheduling/${created.body.data._id}`)
      .send({ status: 'Assigned', assignedInspector: 'Jane Lim' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Assigned');
    expect(res.body.data.assignedInspector).toBe('Jane Lim');
  });
});

describe('DELETE /api/scheduling/:id', () => {
  test('soft deletes: hides the record from reads but keeps it in the collection', async () => {
    const created = await asUser(admin).post('/api/scheduling').send(validPayload);

    const del = await asUser(admin).delete(`/api/scheduling/${created.body.data._id}`);
    expect(del.status).toBe(200);

    const getRes = await asUser(admin).get(`/api/scheduling/${created.body.data._id}`);
    expect(getRes.status).toBe(404);

    const rawDoc = await mongoose.connection
      .collection('schedules')
      .findOne({ _id: new mongoose.Types.ObjectId(created.body.data._id) });
    expect(rawDoc).not.toBeNull();
    expect(rawDoc.isDeleted).toBe(true);
  });

  test('returns 404 when deleting an unknown id', async () => {
    const unknownId = new mongoose.Types.ObjectId();
    const res = await asUser(admin).delete(`/api/scheduling/${unknownId}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/scheduling/import', () => {
  test('creates every row when all are valid', async () => {
    const res = await asUser(admin)
      .post('/api/scheduling/import')
      .send({ rows: [validPayload, { ...validPayload, blockAddress: 'Blk 202' }] });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(2);
    expect(res.body.data.failed).toHaveLength(0);
  });

  test('reports per-row failures without aborting the rest of the batch', async () => {
    const res = await asUser(admin)
      .post('/api/scheduling/import')
      .send({
        rows: [
          validPayload,
          { townCouncil: 'Missing fields' },
          { ...validPayload, blockAddress: 'Blk 203', status: 'Bogus' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(1);
    expect(res.body.data.failed).toHaveLength(2);
    expect(res.body.data.failed[0].row).toBe(3); // header (line 1) + row 1 (line 2) -> row 2 is line 3
  });

  test('rejects an empty rows array', async () => {
    const res = await asUser(admin).post('/api/scheduling/import').send({ rows: [] });
    expect(res.status).toBe(400);
  });

  test('Staff cannot import schedules', async () => {
    const staff = await createTestUser('Staff');
    const res = await asUser(staff).post('/api/scheduling/import').send({ rows: [validPayload] });
    expect(res.status).toBe(403);
  });
});
