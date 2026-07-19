const express = require('express');
const router = express.Router();
const focusController = require('../controllers/focusController');
const authMiddleware = require('../middleware/auth');

router.get('/sessions', authMiddleware, focusController.getSessions);
router.get('/sessions/:sessionId', authMiddleware, focusController.getSession);
router.post('/sessions', authMiddleware, focusController.createSession);
router.delete('/sessions/:sessionId', authMiddleware, focusController.deleteSession);
router.delete('/sessions', authMiddleware, focusController.deleteAllSessions);

module.exports = router;