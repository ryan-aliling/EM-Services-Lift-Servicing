// Tests for the Lift Records controller (Lucio). See test-cases.md.
//
// Mounts only liftRoutes against an in-memory MongoDB (mongodb-memory-server) - deliberately
// NOT requiring src/server.js, since that file connects to the real DATABASE_URL and calls
// app.listen as a side effect of just being imported (same approach as tests/Aeric,
// tests/Ryan).
//
// liftRoutes requires an authenticated caller on every route (RBAC pass) - reads run as
// whichever role the test needs (Staff can read, per the capability matrix), writes
// (create/update/delete/import) run as Admin unless the test is specifically checking that
// Staff is forbidden.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const liftRoutes = require('../../src/routes/lifts/liftRoutes');
const Lift = require('../../src/models/lifts/Lift');
const User = require('../../src/models/users/User');
const { createTestUser, authHeader } = require('../testAuthHelper');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/lifts', liftRoutes);
  // Same error-handling middleware as server.js, duplicated here since we don't require
  // server.js itself (see header comment).
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, message: err.message || 'Internal server error' });
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

let mongod;
let app;
let admin;
let staff;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = buildApp();
});

beforeEach(async () => {
  admin = await createTestUser('Admin');
  staff = await createTestUser('Staff');
});

afterEach(async () => {
  await Lift.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const validPayload = {
  liftCode: 'LIFT-001',
  block: 'A',
  unit: '01-01',
  type: 'Passenger',
  capacity: 800,
  manufacturer: 'Otis',
};

describe('POST /api/lifts', () => {
  test('creates a lift with default status Active', async () => {
    const res = await asUser(admin).post('/api/lifts').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Active');
    expect(res.body.data.liftCode).toBe('LIFT-001');
  });

  test('rejects a payload missing required fields', async () => {
    const res = await asUser(admin).post('/api/lifts').send({ liftCode: 'LIFT-002' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Missing required field/);
    expect(res.body.message).toMatch(/block/);
  });

  test('rejects a duplicate liftCode', async () => {
    await asUser(admin).post('/api/lifts').send(validPayload);

    const res = await asUser(admin).post('/api/lifts').send({ ...validPayload, unit: '02-02' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Lift code "LIFT-001" already exists');
  });

  test('Staff cannot create a lift', async () => {
    const res = await asUser(staff).post('/api/lifts').send(validPayload);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/lifts', () => {
  test('Staff can list lifts (read-only access)', async () => {
    await asUser(admin).post('/api/lifts').send(validPayload);

    const res = await asUser(staff).get('/api/lifts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('filters by status', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);
    await asUser(admin).put(`/api/lifts/${created.body.data._id}`).send({ status: 'Maintenance' });
    await asUser(admin).post('/api/lifts').send({ ...validPayload, liftCode: 'LIFT-002' });

    const res = await asUser(admin).get('/api/lifts').query({ status: 'Maintenance' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('Maintenance');
  });

  test('filters by type', async () => {
    await asUser(admin).post('/api/lifts').send(validPayload);
    await asUser(admin).post('/api/lifts').send({ ...validPayload, liftCode: 'LIFT-002', type: 'Freight' });

    const res = await asUser(admin).get('/api/lifts').query({ type: 'Freight' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('Freight');
  });

  test('q searches across liftCode, block, unit and manufacturer (case-insensitive)', async () => {
    await asUser(admin).post('/api/lifts').send(validPayload);
    await asUser(admin).post('/api/lifts').send({ ...validPayload, liftCode: 'LIFT-002', manufacturer: 'Schindler' });

    const res = await asUser(admin).get('/api/lifts').query({ q: 'otis' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].manufacturer).toBe('Otis');
  });

  test('q tolerates regex special characters instead of throwing', async () => {
    const res = await asUser(admin).get('/api/lifts').query({ q: 'a(b[c' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/lifts/stats', () => {
  test('returns counts grouped by status', async () => {
    await asUser(admin).post('/api/lifts').send(validPayload);
    const created = await asUser(admin).post('/api/lifts').send({ ...validPayload, liftCode: 'LIFT-002' });
    await asUser(admin).put(`/api/lifts/${created.body.data._id}`).send({ status: 'Out of Service' });

    const res = await asUser(admin).get('/api/lifts/stats');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ total: 2, active: 1, maintenance: 0, outOfService: 1, decommissioned: 0 });
  });
});

describe('GET /api/lifts/:id', () => {
  test('returns a lift by id', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);

    const res = await asUser(admin).get(`/api/lifts/${created.body.data._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.liftCode).toBe('LIFT-001');
  });

  test('returns 404 for a well-formed but unknown id', async () => {
    const res = await asUser(admin).get(`/api/lifts/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });

  // Documents current behavior rather than desired behavior: unlike Scheduling's controller,
  // Lift's controller has no explicit ObjectId-format check, so a malformed id reaches Mongoose
  // as an uncaught CastError and comes back as a generic 500, not a 400. See api-documentation.md.
  test('a malformed id currently surfaces as a 500, not a 400', async () => {
    const res = await asUser(admin).get('/api/lifts/not-a-valid-id');
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/lifts/:id', () => {
  test('updates fields', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);

    const res = await asUser(admin)
      .put(`/api/lifts/${created.body.data._id}`)
      .send({ status: 'Maintenance', lastServiced: '2026-08-01' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Maintenance');
  });

  test('rejects renaming to another lift\'s liftCode', async () => {
    await asUser(admin).post('/api/lifts').send(validPayload);
    const second = await asUser(admin).post('/api/lifts').send({ ...validPayload, liftCode: 'LIFT-002' });

    const res = await asUser(admin).put(`/api/lifts/${second.body.data._id}`).send({ liftCode: 'LIFT-001' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Lift code "LIFT-001" already exists');
  });

  test('Staff cannot update a lift', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);

    const res = await asUser(staff).put(`/api/lifts/${created.body.data._id}`).send({ status: 'Maintenance' });
    expect(res.status).toBe(403);
  });

  test('returns 404 for a well-formed but unknown id', async () => {
    const res = await asUser(admin).put(`/api/lifts/${new mongoose.Types.ObjectId()}`).send({ status: 'Active' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/lifts/:id', () => {
  test('soft deletes: hides the record from reads but keeps it in the collection', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);

    const del = await asUser(admin).delete(`/api/lifts/${created.body.data._id}`);
    expect(del.status).toBe(200);

    const getRes = await asUser(admin).get(`/api/lifts/${created.body.data._id}`);
    expect(getRes.status).toBe(404);

    const rawDoc = await mongoose.connection
      .collection('lifts')
      .findOne({ _id: new mongoose.Types.ObjectId(created.body.data._id) });
    expect(rawDoc).not.toBeNull();
    expect(rawDoc.isDeleted).toBe(true);
  });

  test('liftCode is reusable once the original lift is soft-deleted (partial unique index)', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);
    await asUser(admin).delete(`/api/lifts/${created.body.data._id}`);

    const res = await asUser(admin).post('/api/lifts').send(validPayload);
    expect(res.status).toBe(201);
  });

  test('Staff cannot delete a lift', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);

    const res = await asUser(staff).delete(`/api/lifts/${created.body.data._id}`);
    expect(res.status).toBe(403);
  });

  test('returns 404 when deleting an already-deleted lift', async () => {
    const created = await asUser(admin).post('/api/lifts').send(validPayload);
    await asUser(admin).delete(`/api/lifts/${created.body.data._id}`);

    const res = await asUser(admin).delete(`/api/lifts/${created.body.data._id}`);
    expect(res.status).toBe(404);
  });

  test('returns 404 for a well-formed but unknown id', async () => {
    const res = await asUser(admin).delete(`/api/lifts/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/lifts/import', () => {
  test('creates every row when all are valid', async () => {
    const res = await asUser(admin)
      .post('/api/lifts/import')
      .send({ rows: [validPayload, { ...validPayload, liftCode: 'LIFT-002' }] });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(2);
    expect(res.body.data.failed).toHaveLength(0);
  });

  test('reports per-row failures without aborting the rest of the batch', async () => {
    const res = await asUser(admin)
      .post('/api/lifts/import')
      .send({
        rows: [
          validPayload,
          { liftCode: 'LIFT-002' }, // missing required fields
          { ...validPayload, liftCode: 'LIFT-001' }, // duplicate of row 1
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(1);
    expect(res.body.data.failed).toHaveLength(2);
    // header (line 1) + row 1 (line 2) -> row 2 is line 3
    expect(res.body.data.failed[0].row).toBe(3);
    expect(res.body.data.failed[1].message).toBe('Lift code "LIFT-001" already exists');
  });

  test('rejects an empty rows array', async () => {
    const res = await asUser(admin).post('/api/lifts/import').send({ rows: [] });
    expect(res.status).toBe(400);
  });

  test('Staff cannot import lifts', async () => {
    const res = await asUser(staff).post('/api/lifts/import').send({ rows: [validPayload] });
    expect(res.status).toBe(403);
  });
});
