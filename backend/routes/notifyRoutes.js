const express = require('express');
const router = express.Router();
const controller = require('../controllers/notifyController');
const authMiddleware = require('../middleware/auth');

router.get('/settings', authMiddleware, controller.getSettings);
router.put('/settings', authMiddleware, controller.updateSettings);
router.post('/subscribe', authMiddleware, controller.subscribe);
router.post('/unsubscribe', authMiddleware, controller.unsubscribe);
router.post('/test', authMiddleware, controller.sendTest);

// Questions answered from email/WhatsApp links or the phone notification
// ("Did you attend?", "Did you submit?", quiz marks). The signed token in the
// link identifies the student, so no login is needed.
router.get('/answer', controller.answerPage);
router.post('/answer', controller.answer);

module.exports = router;
