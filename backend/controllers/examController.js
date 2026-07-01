const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

function toExam(r) {
  return {
    id: r.ITEM_ID,
    subjectId: r.SUBJECT_ID,
    subjectName: r.SUBJECT_NAME,
    subjectColor: r.SUBJECT_COLOR,
    title: r.TITLE,
    type: r.TYPE,
    date: r.EVENT_DATE,
    time: r.EVENT_TIME,
    location: r.LOCATION,
    notes: r.NOTES,
    isDone: r.IS_DONE === 1,
    createdAt: r.CREATED_AT,
  };
}

// GET /api/exams  (optional ?subjectId= , ?upcoming=1)
exports.getExams = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const { subjectId, upcoming } = req.query;
    const where = ['e.user_id = :userId'];
    const binds = { userId: req.user.userId };
    if (subjectId) { where.push('e.subject_id = :subjectId'); binds.subjectId = subjectId; }
    if (upcoming) { where.push('e.event_date >= CURRENT_DATE'); where.push('e.is_done = 0'); }
    const sql =
      `SELECT e.item_id, e.subject_id, e.title, e.type,
              TO_CHAR(e.event_date,'YYYY-MM-DD') AS event_date, e.event_time,
              e.location, e.notes, e.is_done, e.created_at,
              s.name AS subject_name, s.color AS subject_color
       FROM EXAMS_DEADLINES e
       LEFT JOIN SUBJECTS s ON s.subject_id = e.subject_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.event_date ASC, e.event_time ASC NULLS LAST`;
    const result = await connection.execute(sql, binds);
    res.json(result.rows.map(toExam));
  } catch (err) {
    console.error('Get exams error:', err);
    res.status(500).json({ error: 'Failed to get exams.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/exams
exports.createExam = async (req, res) => {
  let connection;
  try {
    const { subjectId, title, type, date, time, location, notes } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
    if (!date) return res.status(400).json({ error: 'Date is required.' });
    connection = await getConnection();
    if (subjectId) {
      const owned = await connection.execute(
        `SELECT subject_id FROM SUBJECTS WHERE subject_id = :subjectId AND user_id = :userId`,
        { subjectId, userId: req.user.userId }
      );
      if (owned.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });
    }
    const itemId = generateId();
    await connection.execute(
      `INSERT INTO EXAMS_DEADLINES (item_id, user_id, subject_id, title, type, event_date, event_time, location, notes, is_done)
       VALUES (:id, :userId, :subjectId, :title, :type, :date, :time, :location, :notes, 0)`,
      {
        id: itemId, userId: req.user.userId, subjectId: subjectId || null,
        title: title.trim(), type: type || 'deadline', date,
        time: time || null, location: location || null, notes: notes || null,
      }
    );
    res.status(201).json({ success: true, id: itemId });
  } catch (err) {
    console.error('Create exam error:', err);
    res.status(500).json({ error: 'Failed to create exam.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/exams/:id  (client sends the full item)
exports.updateExam = async (req, res) => {
  let connection;
  try {
    const { subjectId, title, type, date, time, location, notes } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT item_id FROM EXAMS_DEADLINES WHERE item_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    await connection.execute(
      `UPDATE EXAMS_DEADLINES SET
         subject_id = :subjectId,
         title = COALESCE(:title, title),
         type = :type,
         event_date = COALESCE(:date, event_date),
         event_time = :time,
         location = :location,
         notes = :notes
       WHERE item_id = :id AND user_id = :userId`,
      {
        subjectId: subjectId != null ? subjectId : null,
        title: title != null ? String(title).trim() : null,
        type: type != null ? type : null,
        date: date != null ? date : null,
        time: time != null ? time : null,
        location: location != null ? location : null,
        notes: notes != null ? notes : null,
        id: req.params.id, userId: req.user.userId,
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update exam error:', err);
    res.status(500).json({ error: 'Failed to update item.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/exams/:id/toggle
exports.toggleDone = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE EXAMS_DEADLINES SET is_done = 1 - is_done WHERE item_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Item not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Toggle exam error:', err);
    res.status(500).json({ error: 'Failed to toggle item.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/exams/:id
exports.deleteExam = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM EXAMS_DEADLINES WHERE item_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Item not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete exam error:', err);
    res.status(500).json({ error: 'Failed to delete item.' });
  } finally {
    if (connection) await connection.close();
  }
};
