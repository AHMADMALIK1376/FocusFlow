const express = require('express');
const router = express.Router();
const studyHoursController = require('../controllers/studyHoursController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, studyHoursController.getEntries);
router.post('/', authMiddleware, studyHoursController.createEntry);
router.delete('/:id', authMiddleware, studyHoursController.removeEntry);

module.exports = router;
