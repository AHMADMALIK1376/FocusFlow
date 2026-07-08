const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, subjectController.getSubjects);
router.post('/', authMiddleware, subjectController.createSubject);
router.get('/:id', authMiddleware, subjectController.getSubject);
router.put('/:id', authMiddleware, subjectController.updateSubject);
router.delete('/:id', authMiddleware, subjectController.deleteSubject);

module.exports = router;
