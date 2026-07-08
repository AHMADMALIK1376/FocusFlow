const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, examController.getExams);
router.post('/', authMiddleware, examController.createExam);
router.put('/:id/toggle', authMiddleware, examController.toggleDone);
router.put('/:id', authMiddleware, examController.updateExam);
router.delete('/:id', authMiddleware, examController.deleteExam);

module.exports = router;
