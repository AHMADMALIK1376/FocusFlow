const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');
const authMiddleware = require('../middleware/auth');

router.get('/decks', authMiddleware, flashcardController.getDecks);
router.post('/decks', authMiddleware, flashcardController.createDeck);
router.get('/decks/:id', authMiddleware, flashcardController.getDeck);
router.delete('/decks/:id', authMiddleware, flashcardController.deleteDeck);
router.post('/decks/:id/cards', authMiddleware, flashcardController.addCard);
router.put('/cards/:cardId', authMiddleware, flashcardController.updateCard);
router.delete('/cards/:cardId', authMiddleware, flashcardController.deleteCard);
router.post('/cards/:cardId/review', authMiddleware, flashcardController.reviewCard);

module.exports = router;
