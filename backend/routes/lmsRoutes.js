const express = require('express');
const router = express.Router();
const lmsController = require('../controllers/lmsController');
const authMiddleware = require('../middleware/auth');

router.get('/status', authMiddleware, lmsController.getStatus);
router.get('/grades', authMiddleware, lmsController.getGrades);
router.post('/connect', authMiddleware, lmsController.connect);
router.post('/sync', authMiddleware, lmsController.sync);
router.delete('/', authMiddleware, lmsController.disconnect);

module.exports = router;
