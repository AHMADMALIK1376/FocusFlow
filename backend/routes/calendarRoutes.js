const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const authMiddleware = require('../middleware/auth');

// Calendar list routes
router.get('/', authMiddleware, calendarController.getCalendars);
router.post('/', authMiddleware, calendarController.createCalendar);
router.put('/:id', authMiddleware, calendarController.updateCalendar);
router.put('/:id/activate', authMiddleware, calendarController.setActiveCalendar);
router.delete('/:id', authMiddleware, calendarController.deleteCalendar);

// Calendar entries routes
router.get('/:calendarId/entries', authMiddleware, calendarController.getCalendarEntries);
router.post('/:calendarId/entries', authMiddleware, calendarController.addCalendarEntry);
router.put('/entries/:entryId', authMiddleware, calendarController.updateCalendarEntry);
router.delete('/entries/:entryId', authMiddleware, calendarController.deleteCalendarEntry);
router.put('/entries/:entryId/toggle-done', authMiddleware, calendarController.toggleEntryDone);

module.exports = router;