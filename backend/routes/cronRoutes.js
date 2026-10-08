const express = require('express');
const router = express.Router();
const controller = require('../controllers/cronController');
const { requireCronSecret } = require('../middleware/cronAuth');

// GET and POST both run a check; HEAD is answered by the GET handler (Express), which pingers use.
router.get('/tick', requireCronSecret, controller.tick);
router.post('/tick', requireCronSecret, controller.tick);

module.exports = router;
