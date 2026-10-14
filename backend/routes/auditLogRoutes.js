const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/event/:eventId', auditLogController.getEventAuditLogs);
router.post('/event/:eventId', auditLogController.createEventAuditLog);

module.exports = router;
