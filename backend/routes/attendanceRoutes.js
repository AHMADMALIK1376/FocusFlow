const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/auth');

// Dashboard overview
router.get('/dashboard', authMiddleware, attendanceController.getAttendanceDashboard);

// Summary for all subjects
router.get('/summary', authMiddleware, attendanceController.getAttendanceSummary);

// Auto-generate sessions for a subject
router.post('/generate/:entryId', authMiddleware, attendanceController.generateSessions);

// Get records for specific subject
router.get('/records/:entryId', authMiddleware, attendanceController.getAttendanceRecords);

// Update attendance for a specific session
router.put('/:entryId/:classDate', authMiddleware, attendanceController.updateAttendance);

// Get attendance trend data (for graphs)
router.get('/trend/:entryId', authMiddleware, attendanceController.getAttendanceTrend);

module.exports = router;