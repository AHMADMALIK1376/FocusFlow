const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, assignmentController.getAssignments);
router.post('/', authMiddleware, assignmentController.createAssignment);
router.put('/:id/move', authMiddleware, assignmentController.moveAssignment);
router.put('/:id', authMiddleware, assignmentController.updateAssignment);
router.delete('/:id', authMiddleware, assignmentController.deleteAssignment);

module.exports = router;
