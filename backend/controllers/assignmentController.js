const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

const COLUMNS = ['col-todo', 'col-doing', 'col-done'];

function toCard(r) {
  return {
    id: r.ASSIGNMENT_ID,
    subjectId: r.SUBJECT_ID,
    subjectName: r.SUBJECT_NAME,
    subjectColor: r.SUBJECT_COLOR,
    title: r.TITLE,
    note: r.NOTE,
    dueDate: r.DUE_DATE,
    columnId: r.COLUMN_ID,
    order: r.BOARD_ORDER,
  };
}

// GET /api/assignments  (optional ?subjectId=)
exports.getAssignments = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const { subjectId } = req.query;
    const where = ['a.user_id = :userId'];
    const binds = { userId: req.user.userId };
    if (subjectId) { where.push('a.subject_id = :subjectId'); binds.subjectId = subjectId; }
    const result = await connection.execute(
      `SELECT a.assignment_id, a.subject_id, a.title, a.note, TO_CHAR(a.due_date,'YYYY-MM-DD') AS due_date, a.column_id, a.board_order,
              s.name AS subject_name, s.color AS subject_color
       FROM ASSIGNMENTS a LEFT JOIN SUBJECTS s ON s.subject_id = a.subject_id
       WHERE ${where.join(' AND ')} ORDER BY a.board_order ASC, a.created_at ASC`,
      binds
    );
    res.json(result.rows.map(toCard));
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ error: 'Failed to get assignments.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/assignments
exports.createAssignment = async (req, res) => {
  let connection;
  try {
    const { title, note, columnId, subjectId, dueDate } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
    const col = COLUMNS.includes(columnId) ? columnId : 'col-todo';
    connection = await getConnection();
    if (subjectId) {
      const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :subjectId AND user_id = :userId`, { subjectId, userId: req.user.userId });
      if (owned.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });
    }
    const countRes = await connection.execute(`SELECT COUNT(*) AS c FROM ASSIGNMENTS WHERE user_id = :userId AND column_id = :col`, { userId: req.user.userId, col });
    const order = Number(countRes.rows[0].C) || 0;
    const id = generateId();
    await connection.execute(
      `INSERT INTO ASSIGNMENTS (assignment_id, user_id, subject_id, title, note, due_date, column_id, board_order)
       VALUES (:id, :userId, :subjectId, :title, :note, :dueDate, :col, :order)`,
      { id, userId: req.user.userId, subjectId: subjectId || null, title: title.trim(), note: note || null, dueDate: dueDate || null, col, order }
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Create assignment error:', err);
    res.status(500).json({ error: 'Failed to create assignment.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/assignments/:id  (partial edit keeps unset fields via COALESCE)
exports.updateAssignment = async (req, res) => {
  let connection;
  try {
    const { title, note, subjectId, dueDate } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(`SELECT assignment_id FROM ASSIGNMENTS WHERE assignment_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Assignment not found.' });
    await connection.execute(
      `UPDATE ASSIGNMENTS SET
         title = COALESCE(:title, title),
         note = COALESCE(:note, note),
         subject_id = COALESCE(:subjectId, subject_id),
         due_date = COALESCE(:dueDate, due_date)
       WHERE assignment_id = :id AND user_id = :userId`,
      {
        title: title != null ? title.trim() : null,
        note: note != null ? note : null,
        subjectId: subjectId != null ? subjectId : null,
        dueDate: dueDate != null ? dueDate : null,
        id: req.params.id, userId: req.user.userId,
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update assignment error:', err);
    res.status(500).json({ error: 'Failed to update assignment.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/assignments/:id/move  { columnId, order }
exports.moveAssignment = async (req, res) => {
  let connection;
  try {
    const { columnId, order } = req.body;
    const col = COLUMNS.includes(columnId) ? columnId : 'col-todo';
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE ASSIGNMENTS SET column_id = :col, board_order = :order WHERE assignment_id = :id AND user_id = :userId`,
      { col, order: Number(order) || 0, id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Assignment not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Move assignment error:', err);
    res.status(500).json({ error: 'Failed to move assignment.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/assignments/:id
exports.deleteAssignment = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`DELETE FROM ASSIGNMENTS WHERE assignment_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Assignment not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete assignment error:', err);
    res.status(500).json({ error: 'Failed to delete assignment.' });
  } finally {
    if (connection) await connection.close();
  }
};
