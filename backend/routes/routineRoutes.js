const express = require('express');
const router = express.Router();
const routineController = require('../controllers/routineController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, routineController.getRoutines);
router.get('/today', authMiddleware, routineController.getTodayRoutine);
router.post('/', authMiddleware, routineController.createRoutine);
router.put('/:id', authMiddleware, routineController.updateRoutine);           // ✅ NEW
router.delete('/:routineId', authMiddleware, routineController.deleteRoutine);
router.delete('/', authMiddleware, routineController.deleteAllRoutines);
router.post('/:routineId/complete', authMiddleware, routineController.completeRoutine);

module.exports = router;