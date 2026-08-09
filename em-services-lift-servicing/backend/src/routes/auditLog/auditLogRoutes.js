const express = require('express');
const { listAuditLog } = require('../../controllers/auditLog/auditLogController');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Admin/Master only - this surfaces every feature's records in one feed, including
// Schedules a Staff caller wouldn't otherwise see past their own assignedStaffId scoping,
// so it needs the same restriction as Accounts rather than the "any authenticated role"
// default most feature routes use.
const router = express.Router();

router.get('/', requireAuth, requireRole('Admin', 'Master'), listAuditLog);

module.exports = router;
