const express = require('express');
const router = express.Router();
const controller = require('../controllers/subjectAttendanceController');
const authMiddleware = require('../middleware/auth');

router.get('/all', authMiddleware, controller.getAllForUser);
router.get('/overview', authMiddleware, controller.getOverview);
router.get('/subjects/:subjectId', authMiddleware, controller.getForSubject);
router.post('/subjects/:subjectId', authMiddleware, controller.mark);
router.delete('/records/:recordId', authMiddleware, controller.remove);

module.exports = router;
