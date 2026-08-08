// RBAC tests (Auth). See test-cases.md for the full test plan.
//
// Mounts authRoutes, schedulingRoutes and rectificationsRoutes together against an
// in-memory MongoDB (mongodb-memory-server) - deliberately NOT requiring src/server.js,
// since that file connects to the real DATABASE_URL and calls app.listen as a side effect
// of just being imported (same approach as every other suite in backend/tests/).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const authRoutes = require('../../src/routes/auth/authRoutes');
const schedulingRoutes = require('../../src/routes/scheduling/schedulingRoutes');
const rectificationsRoutes = require('../../src/routes/rectifications/rectificationsRoutes');
const User = require('../../src/models/users/User');
const Schedule = require('../../src/models/scheduling/Schedule');
const Rectification = require('../../src/models/rectifications/Rectification');
const Defect = require('../../src/models/defects/Defect');
const { createTestUser, authHeader } = require('../testAuthHelper');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/scheduling', schedulingRoutes);
  app.use('/api/rectifications', rectificationsRoutes);
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
    patch: (url) => request(app).patch(url).set('Authorization', header),
    delete: (url) => request(app).delete(url).set('Authorization', header),
  };
}

async function createSchedule(overrides = {}) {
  return Schedule.create({
    townCouncil: 'Tampines Town Council',
    liftCompany: 'ABC Lifts Pte Ltd',
    blockAddress: 'Blk 201 Tampines St 21',
    scheduledDate: new Date('2026-09-01'),
    ...overrides,
  });
}

async function createDefect(overrides = {}) {
  return Defect.create({
    defectNo: 'DEF-0001',
    title: 'Door not closing fully',
    location: 'Blk 12 lift lobby',
    severity: 'Major',
    ...overrides,
  });
}

const PHOTO_URL = 'https://bucket.s3.ap-southeast-1.amazonaws.com/photo-1.jpg';
const SIGNATURE_URL = 'https://bucket.s3.ap-southeast-1.amazonaws.com/signature-1.png';

async function createSubmittedRectification(defect) {
  return Rectification.create({
    defectId: defect._id,
    rectifiedBy: 'John Tan',
    liftCompanyName: 'Acme Lift Co',
    dateRectified: new Date('2026-08-01'),
    proofPhotos: [PHOTO_URL],
    signatureUrl: SIGNATURE_URL,
    status: 'Submitted',
  });
}

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = buildApp();
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Schedule.deleteMany({}), Rectification.deleteMany({}), Defect.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('POST /api/auth/login', () => {
  test('rejects the wrong password', async () => {
    const user = await createTestUser('Staff', { email: 'login-test@test.local' });
    const res = await request(app).post('/api/auth/login').send({ email: 'login-test@test.local', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('happy path returns a token and the user role', async () => {
    const user = await createTestUser('Admin', { email: 'login-ok@test.local' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-ok@test.local', password: 'Passw0rd!' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.role).toBe('Admin');
  });
});

describe('requireAuth', () => {
  test('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/api/scheduling');
    expect(res.status).toBe(401);
  });

  test('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/api/scheduling').set('Authorization', 'Bearer');
    expect(res.status).toBe(401);
  });

  test('rejects a tampered/invalid token', async () => {
    const res = await request(app).get('/api/scheduling').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

describe('Staff cannot manage schedules', () => {
  test('POST /api/scheduling as Staff -> 403', async () => {
    const staff = await createTestUser('Staff');
    const res = await asUser(staff).post('/api/scheduling').send({
      townCouncil: 'Tampines Town Council',
      liftCompany: 'ABC Lifts Pte Ltd',
      blockAddress: 'Blk 201 Tampines St 21',
      scheduledDate: '2026-09-01',
    });

    expect(res.status).toBe(403);
  });

  test('DELETE /api/scheduling/:id as Staff -> 403', async () => {
    const staff = await createTestUser('Staff');
    const schedule = await createSchedule({ assignedStaffId: staff._id });

    const res = await asUser(staff).delete(`/api/scheduling/${schedule._id}`);
    expect(res.status).toBe(403);
  });
});

describe('Staff updating their own assigned schedule', () => {
  test('can update only status, other fields unchanged', async () => {
    const staff = await createTestUser('Staff');
    const schedule = await createSchedule({ assignedStaffId: staff._id });

    const res = await asUser(staff).put(`/api/scheduling/${schedule._id}`).send({ status: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('In Progress');
    expect(res.body.data.townCouncil).toBe('Tampines Town Council');
  });

  test('rejects a body with an extra field alongside status', async () => {
    const staff = await createTestUser('Staff');
    const schedule = await createSchedule({ assignedStaffId: staff._id });

    const res = await asUser(staff)
      .put(`/api/scheduling/${schedule._id}`)
      .send({ status: 'In Progress', townCouncil: 'Someone Else TC' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/townCouncil/);
  });

  test('cannot touch a schedule assigned to a different Staff user', async () => {
    const staff = await createTestUser('Staff');
    const otherStaff = await createTestUser('Staff');
    const schedule = await createSchedule({ assignedStaffId: otherStaff._id });

    const res = await asUser(staff).put(`/api/scheduling/${schedule._id}`).send({ status: 'In Progress' });
    expect(res.status).toBe(404);
  });
});

describe('Staff cannot call the endorse endpoint', () => {
  test('PATCH /api/rectifications/:id/endorse as Staff -> 403', async () => {
    const staff = await createTestUser('Staff');
    const defect = await createDefect();
    const rectification = await createSubmittedRectification(defect);

    const res = await asUser(staff)
      .patch(`/api/rectifications/${rectification._id}/endorse`)
      .send({ endorsedBy: 'Staff User' });

    expect(res.status).toBe(403);
  });
});

describe('Account creation eligibility', () => {
  test('Admin cannot create another Admin account', async () => {
    const admin = await createTestUser('Admin');
    const res = await asUser(admin).post('/api/auth/users').send({
      name: 'New Admin',
      email: 'new-admin@test.local',
      password: 'Passw0rd!',
      role: 'Admin',
    });

    expect(res.status).toBe(403);
  });

  test('Admin can create a Staff account (positive control)', async () => {
    const admin = await createTestUser('Admin');
    const res = await asUser(admin).post('/api/auth/users').send({
      name: 'New Staff',
      email: 'new-staff@test.local',
      password: 'Passw0rd!',
      role: 'Staff',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('Staff');
  });

  test('Master can create an Admin account', async () => {
    const master = await createTestUser('Master');
    const res = await asUser(master).post('/api/auth/users').send({
      name: 'New Admin',
      email: 'master-made-admin@test.local',
      password: 'Passw0rd!',
      role: 'Admin',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('Admin');
  });

  test('no one can create a Master account through this endpoint', async () => {
    const master = await createTestUser('Master');
    const res = await asUser(master).post('/api/auth/users').send({
      name: 'Another Master',
      email: 'another-master@test.local',
      password: 'Passw0rd!',
      role: 'Master',
    });

    expect(res.status).toBe(403);
  });
});
