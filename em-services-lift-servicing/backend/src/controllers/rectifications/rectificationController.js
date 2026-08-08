const Rectification = require('../../models/rectifications/Rectification');
const Defect = require('../../models/defects/Defect');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');

// Always required, regardless of what status the record is being created as - a
// rectification without these three doesn't identify what was fixed, who fixed it,
// or when. Contrast with proofPhotos/signatureUrl, which are conditionally required
// only once someone tries to reach "Submitted" (see assertSubmittable below).
const REQUIRED_FIELDS = ['defectId', 'rectifiedBy', 'dateRectified'];

function assertRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`);
}

// defectId always has to resolve to a real Defect - same pattern as
// defectController.js's resolveLiftSnapshot for an optional liftId, except this link
// is mandatory rather than optional.
async function assertDefectExists(defectId) {
  const defect = await Defect.findById(defectId).catch(() => null);
  if (!defect) throw ApiError.badRequest('Selected defect not found');
}

// "Submitted" is the status that means "the lift company says this is done" - it's
// meaningless without proof. Enforced here rather than as a Mongoose `required` on the
// fields themselves so a "Draft" can still be saved with neither.
function assertSubmittable(proofPhotos, signatureUrl) {
  const missing = [];
  if (!proofPhotos || !proofPhotos.length) missing.push('at least 1 proof photo');
  if (!signatureUrl) missing.push('a signature');
  if (missing.length) throw ApiError.badRequest(`Cannot submit without ${missing.join(' and ')}`);
}

function cleanPhotos(proofPhotos) {
  return Array.isArray(proofPhotos) ? proofPhotos.filter(Boolean) : [];
}

// Basic defect info for the Rectifications list/table - description + liftId per the
// brief, plus defectNo/title/liftCode since a bare description is often blank and the
// table needs *something* readable to identify which defect each row is about.
const DEFECT_SUMMARY_FIELDS = 'defectNo title description liftId liftCode';

const listRectifications = asyncHandler(async (req, res) => {
  const rectifications = await Rectification.find({ isDeleted: false })
    .populate('defectId', DEFECT_SUMMARY_FIELDS)
    .sort({ createdAt: -1 });
  ok(res, rectifications);
});

const getRectification = asyncHandler(async (req, res) => {
  const rectification = await Rectification.findOne({ _id: req.params.id, isDeleted: false }).populate('defectId');
  if (!rectification) throw ApiError.notFound('Rectification not found');
  ok(res, rectification);
});

const createRectification = asyncHandler(async (req, res) => {
  assertRequiredFields(req.body);
  await assertDefectExists(req.body.defectId);

  const proofPhotos = cleanPhotos(req.body.proofPhotos);
  const signatureUrl = req.body.signatureUrl || '';

  // Status is either the explicit choice behind the form's "Save as Draft" / "Submit"
  // button, or - if the caller doesn't send one - inferred from whether photos and a
  // signature are already attached. Either way "Submitted" only sticks if it's earned.
  const requestedStatus = req.body.status || (proofPhotos.length && signatureUrl ? 'Submitted' : 'Draft');
  if (!['Draft', 'Submitted'].includes(requestedStatus)) {
    throw ApiError.badRequest('New rectifications can only be created as "Draft" or "Submitted"');
  }
  if (requestedStatus === 'Submitted') {
    assertSubmittable(proofPhotos, signatureUrl);
  }

  const rectification = await Rectification.create({
    defectId: req.body.defectId,
    rectifiedBy: req.body.rectifiedBy,
    liftCompanyName: req.body.liftCompanyName || '',
    dateRectified: req.body.dateRectified,
    proofPhotos,
    signatureUrl,
    remarks: req.body.remarks || '',
    status: requestedStatus,
  });

  ok(res, rectification, 'Rectification created', 201);
});

// Regular field edits. Reaching "Endorsed" is exclusively the job of the dedicated
// endorse endpoint below (which also stamps endorsedBy/endorsedDate), so it's not a
// valid target of a plain PUT - and once a record IS Endorsed, its proof photos and
// signature are locked (the record is finalized) even though remarks and the other
// descriptive fields can still be corrected.
const updateRectification = asyncHandler(async (req, res) => {
  const existing = await Rectification.findOne({ _id: req.params.id, isDeleted: false });
  if (!existing) throw ApiError.notFound('Rectification not found');

  const { defectId, rectifiedBy, liftCompanyName, dateRectified, proofPhotos, signatureUrl, remarks, status } =
    req.body;

  const touchesFiles = proofPhotos !== undefined || signatureUrl !== undefined;
  if (existing.status === 'Endorsed' && touchesFiles) {
    throw ApiError.badRequest('Cannot edit photos or signature on an endorsed rectification');
  }

  if (defectId !== undefined) {
    await assertDefectExists(defectId);
    existing.defectId = defectId;
  }
  if (rectifiedBy !== undefined) {
    if (!rectifiedBy.trim()) throw ApiError.badRequest('Rectified By cannot be empty');
    existing.rectifiedBy = rectifiedBy;
  }
  if (liftCompanyName !== undefined) existing.liftCompanyName = liftCompanyName;
  if (dateRectified !== undefined) existing.dateRectified = dateRectified;
  if (proofPhotos !== undefined) existing.proofPhotos = cleanPhotos(proofPhotos);
  if (signatureUrl !== undefined) existing.signatureUrl = signatureUrl;
  if (remarks !== undefined) existing.remarks = remarks;

  if (status !== undefined && status !== existing.status) {
    if (existing.status === 'Endorsed') {
      throw ApiError.badRequest('Cannot change the status of an endorsed rectification');
    }
    if (status === 'Endorsed') {
      throw ApiError.badRequest('Use PATCH /:id/endorse to mark a rectification as Endorsed');
    }
    if (!['Draft', 'Submitted'].includes(status)) {
      throw ApiError.badRequest(`Invalid status "${status}"`);
    }
    if (status === 'Submitted') {
      assertSubmittable(existing.proofPhotos, existing.signatureUrl);
    }
    existing.status = status;
  }

  await existing.save();
  ok(res, existing, 'Rectification updated');
});

// EM staff's endorsement after the joint on-site inspection. Deliberately its own
// endpoint (rather than folded into the generic PUT) since it's a distinct real-world
// action with its own actor (endorsedBy) and can only happen from exactly one status.
const endorseRectification = asyncHandler(async (req, res) => {
  const existing = await Rectification.findOne({ _id: req.params.id, isDeleted: false });
  if (!existing) throw ApiError.notFound('Rectification not found');

  if (existing.status !== 'Submitted') {
    throw ApiError.badRequest(
      `Cannot endorse a rectification with status "${existing.status}" - it must be "Submitted" first`
    );
  }

  const { endorsedBy } = req.body;
  if (!endorsedBy || !String(endorsedBy).trim()) {
    throw ApiError.badRequest('endorsedBy is required to endorse a rectification');
  }

  existing.status = 'Endorsed';
  existing.endorsedBy = endorsedBy;
  existing.endorsedDate = new Date();
  await existing.save();
  ok(res, existing, 'Rectification endorsed');
});

// Soft delete - a Submitted/Endorsed record is part of the compliance trail and can
// never be removed, only a still-in-progress Draft can be discarded.
const deleteRectification = asyncHandler(async (req, res) => {
  const existing = await Rectification.findOne({ _id: req.params.id, isDeleted: false });
  if (!existing) throw ApiError.notFound('Rectification not found');

  if (existing.status !== 'Draft') {
    throw ApiError.badRequest(
      `Cannot delete a rectification with status "${existing.status}" - only "Draft" records can be deleted`
    );
  }

  existing.isDeleted = true;
  await existing.save();
  ok(res, null, 'Rectification deleted');
});

module.exports = {
  listRectifications,
  getRectification,
  createRectification,
  updateRectification,
  endorseRectification,
  deleteRectification,
};
