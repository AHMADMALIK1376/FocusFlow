const express = require('express');
const router = express.Router();
const preferencesController = require('../controllers/preferencesController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, preferencesController.getPreferences);
router.put('/', authMiddleware, preferencesController.savePreferences);

module.exports = router;
