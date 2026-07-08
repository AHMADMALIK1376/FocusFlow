const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, gradeController.getGrades);
router.post('/', authMiddleware, gradeController.createGrade);
router.get('/gpa', authMiddleware, gradeController.getGpa);
router.put('/:id', authMiddleware, gradeController.updateGrade);
router.delete('/:id', authMiddleware, gradeController.deleteGrade);

module.exports = router;
