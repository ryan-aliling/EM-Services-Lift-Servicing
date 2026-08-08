// Tests for the Rectifications controller (Ryan). See test-cases.md.
//
// Mounts only rectificationsRoutes against an in-memory MongoDB (mongodb-memory-server) -
// deliberately NOT requiring src/server.js, since that file connects to the real
// DATABASE_URL and calls app.listen as a side effect of just being imported.
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const rectificationsRoutes = require('../../src/routes/rectifications/rectificationsRoutes');
const Defect = require('../../src/models/defects/Defect');
const Rectification = require('../../src/models/rectifications/Rectification');
const Lift = require('../../src/models/lifts/Lift');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/rectifications', rectificationsRoutes);
  // Same error-handling middleware as server.js, duplicated here since we don't require
  // server.js itself (see header comment).
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, message: err.message || 'Internal server error' });
  });
  return app;
}

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = buildApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Rectification.deleteMany({});
  await Defect.deleteMany({});
  await Lift.deleteMany({});
});

// Every test needs a real Defect to point defectId at.
async function createDefect(overrides = {}) {
  return Defect.create({
    defectNo: 'DEF-0001',
    title: 'Door not closing fully',
    location: 'Blk 12 lift lobby',
    severity: 'Major',
    ...overrides,
  });
}

async function createLift(overrides = {}) {
  return Lift.create({
    liftCode: 'L-TEST-1',
    block: 'Blk 1',
    unit: '#01-01',
    type: 'Passenger',
    capacity: 10,
    ...overrides,
  });
}

const PHOTO_URL = 'https://bucket.s3.ap-southeast-1.amazonaws.com/photo-1.jpg';
const SIGNATURE_URL = 'https://bucket.s3.ap-southeast-1.amazonaws.com/signature-1.png';

function baseBody(defect, overrides = {}) {
  return {
    defectId: String(defect._id),
    rectifiedBy: 'John Tan',
    liftCompanyName: 'Acme Lift Co',
    dateRectified: '2026-08-01',
    ...overrides,
  };
}

describe('POST /api/rectifications', () => {
  test('requires defectId', async () => {
    const res = await request(app)
      .post('/api/rectifications')
      .send({ rectifiedBy: 'John Tan', dateRectified: '2026-08-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/defectId/);
  });

  test('requires rectifiedBy and dateRectified', async () => {
    const defect = await createDefect();
    const res = await request(app).post('/api/rectifications').send({ defectId: String(defect._id) });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/rectifiedBy/);
    expect(res.body.message).toMatch(/dateRectified/);
  });

  test('rejects a defectId that does not resolve to a real defect', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/rectifications')
      .send({ defectId: String(fakeId), rectifiedBy: 'John Tan', dateRectified: '2026-08-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Selected defect not found');
  });

  test('creates a Draft when no photos/signature are supplied', async () => {
    const defect = await createDefect();
    const res = await request(app).post('/api/rectifications').send(baseBody(defect));

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Draft');
    expect(res.body.data.proofPhotos).toEqual([]);
    expect(res.body.data.signatureUrl).toBe('');
  });

  test('auto-promotes to Submitted when photos + signature are present', async () => {
    const defect = await createDefect();
    const res = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL }));

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Submitted');
  });

  test('rejects an explicit "Submitted" status with no proof at all', async () => {
    const defect = await createDefect();
    const res = await request(app).post('/api/rectifications').send(baseBody(defect, { status: 'Submitted' }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 1 proof photo/);
    expect(res.body.message).toMatch(/a signature/);
  });

  test('rejects an explicit "Submitted" status missing only the signature', async () => {
    const defect = await createDefect();
    const res = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { status: 'Submitted', proofPhotos: [PHOTO_URL] }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/a signature/);
    expect(res.body.message).not.toMatch(/proof photo/);
  });
});

describe('GET /api/rectifications', () => {
  test('excludes soft-deleted records', async () => {
    const defect = await createDefect();
    const kept = await request(app).post('/api/rectifications').send(baseBody(defect));
    const removed = await request(app).post('/api/rectifications').send(baseBody(defect));
    await request(app).delete(`/api/rectifications/${removed.body.data._id}`);

    const res = await request(app).get('/api/rectifications');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(kept.body.data._id);
  });

  test('populates the defect summary fields', async () => {
    const defect = await createDefect({ description: 'Door bounces back before closing' });
    await request(app).post('/api/rectifications').send(baseBody(defect));

    const res = await request(app).get('/api/rectifications');
    expect(res.status).toBe(200);
    expect(res.body.data[0].defectId).toMatchObject({
      defectNo: 'DEF-0001',
      title: 'Door not closing fully',
      description: 'Door bounces back before closing',
    });
  });

  // Rectification has no liftId of its own - filtering by lift means joining through the
  // referenced Defect's liftId (see listRectifications in rectificationController.js).
  test('filters by liftId via the linked defect - only returns that lift\'s rectifications', async () => {
    const liftA = await createLift();
    const liftB = await createLift({ liftCode: 'L-TEST-2' });
    const defectA = await createDefect({ liftId: liftA._id });
    const defectB = await createDefect({ defectNo: 'DEF-0002', liftId: liftB._id });

    const kept = await request(app).post('/api/rectifications').send(baseBody(defectA));
    await request(app).post('/api/rectifications').send(baseBody(defectB));

    const res = await request(app).get('/api/rectifications').query({ liftId: liftA._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(kept.body.data._id);
  });

  test('liftId filter with no matching lift returns an empty list', async () => {
    const defect = await createDefect();
    await request(app).post('/api/rectifications').send(baseBody(defect));

    const res = await request(app)
      .get('/api/rectifications')
      .query({ liftId: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/rectifications/:id', () => {
  test('404s on an unknown id', async () => {
    const res = await request(app).get(`/api/rectifications/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });

  test('returns a fully populated record', async () => {
    const defect = await createDefect();
    const created = await request(app).post('/api/rectifications').send(baseBody(defect));

    const res = await request(app).get(`/api/rectifications/${created.body.data._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.defectId.title).toBe('Door not closing fully');
  });
});

describe('PUT /api/rectifications/:id', () => {
  test('cannot submit without proof', async () => {
    const defect = await createDefect();
    const created = await request(app).post('/api/rectifications').send(baseBody(defect));

    const res = await request(app)
      .put(`/api/rectifications/${created.body.data._id}`)
      .send({ status: 'Submitted' });

    expect(res.status).toBe(400);
  });

  test('can reach Submitted once proof is attached in the same request', async () => {
    const defect = await createDefect();
    const created = await request(app).post('/api/rectifications').send(baseBody(defect));

    const res = await request(app)
      .put(`/api/rectifications/${created.body.data._id}`)
      .send({ proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Submitted');
  });

  test('cannot set status directly to Endorsed', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));

    const res = await request(app)
      .put(`/api/rectifications/${created.body.data._id}`)
      .send({ status: 'Endorsed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/endorse/i);
  });

  test('blocks photo/signature edits once Endorsed', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));
    await request(app).patch(`/api/rectifications/${created.body.data._id}/endorse`).send({ endorsedBy: 'EM Staff' });

    const res = await request(app)
      .put(`/api/rectifications/${created.body.data._id}`)
      .send({ proofPhotos: [PHOTO_URL, 'https://bucket.s3.amazonaws.com/photo-2.jpg'] });

    expect(res.status).toBe(400);
  });

  test('still allows remarks once Endorsed', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));
    await request(app).patch(`/api/rectifications/${created.body.data._id}/endorse`).send({ endorsedBy: 'EM Staff' });

    const res = await request(app)
      .put(`/api/rectifications/${created.body.data._id}`)
      .send({ remarks: 'Confirmed working during joint inspection' });

    expect(res.status).toBe(200);
    expect(res.body.data.remarks).toBe('Confirmed working during joint inspection');
    expect(res.body.data.proofPhotos).toEqual([PHOTO_URL]);
  });

  test('404s on an unknown id', async () => {
    const res = await request(app)
      .put(`/api/rectifications/${new mongoose.Types.ObjectId()}`)
      .send({ remarks: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/rectifications/:id/endorse', () => {
  test('cannot endorse a Draft record', async () => {
    const defect = await createDefect();
    const created = await request(app).post('/api/rectifications').send(baseBody(defect));

    const res = await request(app)
      .patch(`/api/rectifications/${created.body.data._id}/endorse`)
      .send({ endorsedBy: 'EM Staff' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Submitted/);
  });

  test('requires endorsedBy', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));

    const res = await request(app).patch(`/api/rectifications/${created.body.data._id}/endorse`).send({});
    expect(res.status).toBe(400);
  });

  test('happy path sets status, endorsedBy and endorsedDate', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));

    const res = await request(app)
      .patch(`/api/rectifications/${created.body.data._id}/endorse`)
      .send({ endorsedBy: 'EM Staff' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Endorsed');
    expect(res.body.data.endorsedBy).toBe('EM Staff');
    expect(res.body.data.endorsedDate).toBeTruthy();
  });

  // Endorsement means EM staff confirmed, after a joint on-site inspection, that the
  // defect is actually fixed - so it should also advance the linked Defect, using the same
  // transition rules as defectController.js's updateDefect (see VALID_TRANSITIONS).
  test('advances a linked "In Progress" defect to "Resolved" and sets resolvedDate', async () => {
    const defect = await createDefect({ status: 'In Progress' });
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));

    const res = await request(app)
      .patch(`/api/rectifications/${created.body.data._id}/endorse`)
      .send({ endorsedBy: 'EM Staff' });
    expect(res.status).toBe(200);

    const updatedDefect = await Defect.findById(defect._id);
    expect(updatedDefect.status).toBe('Resolved');
    expect(updatedDefect.resolvedDate).toBeTruthy();
  });

  test('advances a linked "Open" defect straight to "Closed" (not through Resolved)', async () => {
    const defect = await createDefect({ status: 'Open' });
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));

    const res = await request(app)
      .patch(`/api/rectifications/${created.body.data._id}/endorse`)
      .send({ endorsedBy: 'EM Staff' });
    expect(res.status).toBe(200);

    const updatedDefect = await Defect.findById(defect._id);
    expect(updatedDefect.status).toBe('Closed');
  });

  test('leaves an already-"Closed" defect alone and still succeeds (does not throw)', async () => {
    const defect = await createDefect({ status: 'Closed' });
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));

    const res = await request(app)
      .patch(`/api/rectifications/${created.body.data._id}/endorse`)
      .send({ endorsedBy: 'EM Staff' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Endorsed');

    const updatedDefect = await Defect.findById(defect._id);
    expect(updatedDefect.status).toBe('Closed');
  });

  test('cannot endorse twice', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));
    await request(app).patch(`/api/rectifications/${created.body.data._id}/endorse`).send({ endorsedBy: 'EM Staff' });

    const res = await request(app)
      .patch(`/api/rectifications/${created.body.data._id}/endorse`)
      .send({ endorsedBy: 'EM Staff Again' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Submitted/);
  });
});

describe('DELETE /api/rectifications/:id', () => {
  test('cannot delete a Submitted record', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));

    const res = await request(app).delete(`/api/rectifications/${created.body.data._id}`);
    expect(res.status).toBe(400);
  });

  test('cannot delete an Endorsed record', async () => {
    const defect = await createDefect();
    const created = await request(app)
      .post('/api/rectifications')
      .send(baseBody(defect, { proofPhotos: [PHOTO_URL], signatureUrl: SIGNATURE_URL, status: 'Submitted' }));
    await request(app).patch(`/api/rectifications/${created.body.data._id}/endorse`).send({ endorsedBy: 'EM Staff' });

    const res = await request(app).delete(`/api/rectifications/${created.body.data._id}`);
    expect(res.status).toBe(400);
  });

  test('soft-deletes a Draft record', async () => {
    const defect = await createDefect();
    const created = await request(app).post('/api/rectifications').send(baseBody(defect));

    const del = await request(app).delete(`/api/rectifications/${created.body.data._id}`);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/rectifications/${created.body.data._id}`);
    expect(get.status).toBe(404);
  });

  test('404s on an unknown id', async () => {
    const res = await request(app).delete(`/api/rectifications/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});
