const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, goalController.getGoals);
router.post('/', authMiddleware, goalController.createGoal);
// Milestone routes before /:id to avoid capture
router.post('/:id/milestones', authMiddleware, goalController.addMilestone);
router.put('/milestones/:milestoneId/toggle', authMiddleware, goalController.toggleMilestone);
router.delete('/milestones/:milestoneId', authMiddleware, goalController.removeMilestone);
router.put('/:id', authMiddleware, goalController.updateGoal);
router.delete('/:id', authMiddleware, goalController.deleteGoal);

module.exports = router;
