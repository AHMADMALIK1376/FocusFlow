const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

function toEntry(r) {
  return {
    id: r.ENTRY_ID,
    subjectId: r.SUBJECT_ID,
    label: r.LABEL,
    seconds: r.SECONDS,
    start: r.START_TIME,
    end: r.END_TIME,
    date: r.ENTRY_DATE,
  };
}

// GET /api/study-hours
exports.getEntries = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT entry_id, subject_id, label, seconds, start_time, end_time, TO_CHAR(entry_date,'YYYY-MM-DD') AS entry_date
       FROM STUDY_HOURS WHERE user_id = :userId ORDER BY created_at DESC`,
      { userId: req.user.userId }
    );
    res.json(result.rows.map(toEntry));
  } catch (err) {
    console.error('Get study hours error:', err);
    res.status(500).json({ error: 'Failed to get study hours.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/study-hours  { label, seconds, start, end, subjectId }
exports.createEntry = async (req, res) => {
  let connection;
  try {
    const { label, seconds, start, end, subjectId } = req.body;
    const secs = Number(seconds) || 0;
    const entryId = generateId();
    const date = (start && String(start).slice(0, 10)) || new Date().toISOString().slice(0, 10);
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO STUDY_HOURS (entry_id, user_id, subject_id, label, seconds, start_time, end_time, entry_date)
       VALUES (:id, :userId, :subjectId, :label, :seconds, :start, :end, :date)`,
      { id: entryId, userId: req.user.userId, subjectId: subjectId || null, label: label || 'Study', seconds: secs, start: start || null, end: end || null, date }
    );
    res.status(201).json({ success: true, id: entryId });
  } catch (err) {
    console.error('Create study hours error:', err);
    res.status(500).json({ error: 'Failed to log study time.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/study-hours/:id
exports.removeEntry = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`DELETE FROM STUDY_HOURS WHERE entry_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove study hours error:', err);
    res.status(500).json({ error: 'Failed to remove entry.' });
  } finally {
    if (connection) await connection.close();
  }
};
