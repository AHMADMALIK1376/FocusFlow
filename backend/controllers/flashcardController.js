const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { nextBox, dueDate } = require('../utils/srs');

// GET /api/flashcards/decks  (optional ?subjectId=)
exports.getDecks = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const { subjectId } = req.query;
    const where = ['d.user_id = :userId'];
    const binds = { userId: req.user.userId };
    if (subjectId) { where.push('d.subject_id = :subjectId'); binds.subjectId = subjectId; }
    const result = await connection.execute(
      `SELECT d.deck_id, d.subject_id, d.name, d.description, d.created_at,
              s.name AS subject_name, s.color AS subject_color,
              (SELECT COUNT(*) FROM FLASHCARDS c WHERE c.deck_id = d.deck_id) AS card_count,
              (SELECT COUNT(*) FROM FLASHCARDS c WHERE c.deck_id = d.deck_id AND (c.due_date IS NULL OR c.due_date <= CURRENT_DATE)) AS due_count
       FROM FLASHCARD_DECKS d LEFT JOIN SUBJECTS s ON s.subject_id = d.subject_id
       WHERE ${where.join(' AND ')} ORDER BY d.created_at DESC`,
      binds
    );
    res.json(result.rows.map((d) => ({
      id: d.DECK_ID, subjectId: d.SUBJECT_ID, subjectName: d.SUBJECT_NAME, subjectColor: d.SUBJECT_COLOR,
      name: d.NAME, description: d.DESCRIPTION, createdAt: d.CREATED_AT,
      cardCount: Number(d.CARD_COUNT) || 0, dueCount: Number(d.DUE_COUNT) || 0,
    })));
  } catch (err) {
    console.error('Get decks error:', err);
    res.status(500).json({ error: 'Failed to get decks.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/flashcards/decks
exports.createDeck = async (req, res) => {
  let connection;
  try {
    const { name, subjectId, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Deck name is required.' });
    connection = await getConnection();
    if (subjectId) {
      const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :subjectId AND user_id = :userId`, { subjectId, userId: req.user.userId });
      if (owned.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });
    }
    const deckId = generateId();
    await connection.execute(
      `INSERT INTO FLASHCARD_DECKS (deck_id, user_id, subject_id, name, description) VALUES (:id, :userId, :subjectId, :name, :description)`,
      { id: deckId, userId: req.user.userId, subjectId: subjectId || null, name: name.trim(), description: description || null }
    );
    res.status(201).json({ success: true, id: deckId });
  } catch (err) {
    console.error('Create deck error:', err);
    res.status(500).json({ error: 'Failed to create deck.' });
  } finally {
    if (connection) await connection.close();
  }
};

// GET /api/flashcards/decks/:id  → deck + cards
exports.getDeck = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const decks = await connection.execute(
      `SELECT d.deck_id, d.subject_id, d.name, d.description, d.created_at, s.name AS subject_name, s.color AS subject_color
       FROM FLASHCARD_DECKS d LEFT JOIN SUBJECTS s ON s.subject_id = d.subject_id
       WHERE d.deck_id = :id AND d.user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (decks.rows.length === 0) return res.status(404).json({ error: 'Deck not found.' });
    const cards = await connection.execute(
      `SELECT card_id, front, back, box, TO_CHAR(due_date,'YYYY-MM-DD') AS due_date, last_reviewed
       FROM FLASHCARDS WHERE deck_id = :id ORDER BY created_at ASC`,
      { id: req.params.id }
    );
    const d = decks.rows[0];
    res.json({
      id: d.DECK_ID, subjectId: d.SUBJECT_ID, subjectName: d.SUBJECT_NAME, subjectColor: d.SUBJECT_COLOR,
      name: d.NAME, description: d.DESCRIPTION, createdAt: d.CREATED_AT,
      cards: cards.rows.map((c) => ({ id: c.CARD_ID, front: c.FRONT, back: c.BACK, box: c.BOX, dueDate: c.DUE_DATE, lastReviewed: c.LAST_REVIEWED })),
    });
  } catch (err) {
    console.error('Get deck error:', err);
    res.status(500).json({ error: 'Failed to get deck.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/flashcards/decks/:id
exports.deleteDeck = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`DELETE FROM FLASHCARD_DECKS WHERE deck_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Deck not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete deck error:', err);
    res.status(500).json({ error: 'Failed to delete deck.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/flashcards/decks/:id/cards
exports.addCard = async (req, res) => {
  let connection;
  try {
    const { front, back } = req.body;
    if (!front || !front.trim() || !back || !back.trim()) return res.status(400).json({ error: 'Front and back are required.' });
    connection = await getConnection();
    const owned = await connection.execute(`SELECT deck_id FROM FLASHCARD_DECKS WHERE deck_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Deck not found.' });
    const cardId = generateId();
    await connection.execute(
      `INSERT INTO FLASHCARDS (card_id, deck_id, front, back, box, due_date) VALUES (:id, :deckId, :front, :back, 1, CURRENT_DATE)`,
      { id: cardId, deckId: req.params.id, front: front.trim(), back: back.trim() }
    );
    res.status(201).json({ success: true, id: cardId });
  } catch (err) {
    console.error('Add card error:', err);
    res.status(500).json({ error: 'Failed to add card.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/flashcards/cards/:cardId
exports.updateCard = async (req, res) => {
  let connection;
  try {
    const { front, back } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT c.card_id FROM FLASHCARDS c JOIN FLASHCARD_DECKS d ON d.deck_id = c.deck_id WHERE c.card_id = :id AND d.user_id = :userId`,
      { id: req.params.cardId, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Card not found.' });
    await connection.execute(
      `UPDATE FLASHCARDS SET front = COALESCE(:front, front), back = COALESCE(:back, back) WHERE card_id = :id`,
      { front: front != null ? front.trim() : null, back: back != null ? back.trim() : null, id: req.params.cardId }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update card error:', err);
    res.status(500).json({ error: 'Failed to update card.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/flashcards/cards/:cardId
exports.deleteCard = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT c.card_id FROM FLASHCARDS c JOIN FLASHCARD_DECKS d ON d.deck_id = c.deck_id WHERE c.card_id = :id AND d.user_id = :userId`,
      { id: req.params.cardId, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Card not found.' });
    await connection.execute(`DELETE FROM FLASHCARDS WHERE card_id = :id`, { id: req.params.cardId });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Failed to delete card.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/flashcards/cards/:cardId/review  { correct }
exports.reviewCard = async (req, res) => {
  let connection;
  try {
    const { correct } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT c.card_id, c.box FROM FLASHCARDS c JOIN FLASHCARD_DECKS d ON d.deck_id = c.deck_id WHERE c.card_id = :id AND d.user_id = :userId`,
      { id: req.params.cardId, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Card not found.' });
    const newBox = nextBox(owned.rows[0].BOX, !!correct);
    const due = dueDate(newBox);
    await connection.execute(
      `UPDATE FLASHCARDS SET box = :box, due_date = :due, last_reviewed = CURRENT_TIMESTAMP WHERE card_id = :id`,
      { box: newBox, due, id: req.params.cardId }
    );
    res.json({ success: true, box: newBox, dueDate: due });
  } catch (err) {
    console.error('Review card error:', err);
    res.status(500).json({ error: 'Failed to review card.' });
  } finally {
    if (connection) await connection.close();
  }
};
