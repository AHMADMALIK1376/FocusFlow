const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

function toNote(r) {
  return {
    id: r.NOTE_ID,
    subjectId: r.SUBJECT_ID,
    title: r.TITLE,
    body: r.BODY,
    isPinned: r.IS_PINNED === 1,
    color: r.COLOR,
    updatedAt: r.UPDATED_AT,
    createdAt: r.CREATED_AT,
  };
}

// GET /api/notes  (optional ?subjectId=)
exports.getNotes = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const { subjectId } = req.query;
    const cols = `note_id, subject_id, title, body, is_pinned, color, updated_at, created_at`;
    const sql = subjectId
      ? `SELECT ${cols} FROM NOTES WHERE user_id = :userId AND subject_id = :subjectId ORDER BY is_pinned DESC, updated_at DESC`
      : `SELECT ${cols} FROM NOTES WHERE user_id = :userId ORDER BY is_pinned DESC, updated_at DESC`;
    const binds = subjectId ? { userId: req.user.userId, subjectId } : { userId: req.user.userId };
    const result = await connection.execute(sql, binds);
    res.json(result.rows.map(toNote));
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ error: 'Failed to get notes.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/notes
exports.createNote = async (req, res) => {
  let connection;
  try {
    const { subjectId, title, body, color } = req.body;
    connection = await getConnection();
    const noteId = generateId();
    await connection.execute(
      `INSERT INTO NOTES (note_id, user_id, subject_id, title, body, color)
       VALUES (:id, :userId, :subjectId, :title, :body, :color)`,
      {
        id: noteId, userId: req.user.userId, subjectId: subjectId || null,
        title: title != null ? title : 'Untitled', body: body != null ? body : '', color: color || null,
      }
    );
    res.status(201).json({ success: true, id: noteId });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Failed to create note.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/notes/:id
exports.updateNote = async (req, res) => {
  let connection;
  try {
    const { subjectId, title, body, color, isPinned } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT note_id FROM NOTES WHERE note_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Note not found.' });
    await connection.execute(
      `UPDATE NOTES SET
         subject_id = :subjectId,
         title = COALESCE(:title, title),
         body = COALESCE(:body, body),
         color = :color,
         is_pinned = COALESCE(:isPinned, is_pinned),
         updated_at = CURRENT_TIMESTAMP
       WHERE note_id = :id AND user_id = :userId`,
      {
        subjectId: subjectId != null ? subjectId : null,
        title: title != null ? title : null,
        body: body != null ? body : null,
        color: color != null ? color : null,
        isPinned: isPinned != null ? (isPinned ? 1 : 0) : null,
        id: req.params.id, userId: req.user.userId,
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Failed to update note.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/notes/:id
exports.deleteNote = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM NOTES WHERE note_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Note not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Failed to delete note.' });
  } finally {
    if (connection) await connection.close();
  }
};
