const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, budgetController.getBudget);
router.post('/entries', authMiddleware, budgetController.addEntry);
router.delete('/entries/:id', authMiddleware, budgetController.removeEntry);
router.put('/settings', authMiddleware, budgetController.saveSettings);

module.exports = router;
