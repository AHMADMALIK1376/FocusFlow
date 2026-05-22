const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, taskController.getTasks);
router.post('/', authMiddleware, taskController.createTask);
router.put('/:taskId/complete', authMiddleware, taskController.toggleTaskComplete);
router.delete('/:taskId', authMiddleware, taskController.deleteTask);
router.delete('/', authMiddleware, taskController.deleteAllTasks);
router.delete('/type/:type', authMiddleware, taskController.deleteTasksByType);

module.exports = router;