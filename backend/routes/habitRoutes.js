const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, habitController.getHabits);
router.post('/', authMiddleware, habitController.createHabit);
router.post('/:id/toggle', authMiddleware, habitController.toggleDay);
router.put('/:id', authMiddleware, habitController.renameHabit);
router.delete('/:id', authMiddleware, habitController.deleteHabit);

module.exports = router;
