const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// GET /api/habits  → [{ id, name, color, log: { 'YYYY-MM-DD': true } }]
exports.getHabits = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const habits = await connection.execute(
      `SELECT habit_id, name, color FROM HABITS WHERE user_id = :userId ORDER BY created_at ASC`,
      { userId: req.user.userId }
    );
    const logs = await connection.execute(
      `SELECT l.habit_id, TO_CHAR(l.log_date,'YYYY-MM-DD') AS log_date
       FROM HABIT_LOG l JOIN HABITS h ON h.habit_id = l.habit_id WHERE h.user_id = :userId`,
      { userId: req.user.userId }
    );
    const logByHabit = {};
    for (const r of logs.rows) {
      (logByHabit[r.HABIT_ID] = logByHabit[r.HABIT_ID] || {})[r.LOG_DATE] = true;
    }
    res.json(habits.rows.map((h) => ({ id: h.HABIT_ID, name: h.NAME, color: h.COLOR, log: logByHabit[h.HABIT_ID] || {} })));
  } catch (err) {
    console.error('Get habits error:', err);
    res.status(500).json({ error: 'Failed to get habits.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/habits  { name, color }
exports.createHabit = async (req, res) => {
  let connection;
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Habit name is required.' });
    const habitId = generateId();
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO HABITS (habit_id, user_id, name, color) VALUES (:id, :userId, :name, :color)`,
      { id: habitId, userId: req.user.userId, name: name.trim(), color: color || 'brand' }
    );
    res.status(201).json({ success: true, id: habitId });
  } catch (err) {
    console.error('Create habit error:', err);
    res.status(500).json({ error: 'Failed to create habit.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/habits/:id  { name }
exports.renameHabit = async (req, res) => {
  let connection;
  try {
    const { name } = req.body;
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE HABITS SET name = COALESCE(:name, name) WHERE habit_id = :id AND user_id = :userId`,
      { name: name != null ? name.trim() : null, id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Habit not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Rename habit error:', err);
    res.status(500).json({ error: 'Failed to rename habit.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/habits/:id
exports.deleteHabit = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`DELETE FROM HABITS WHERE habit_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Habit not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete habit error:', err);
    res.status(500).json({ error: 'Failed to delete habit.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/habits/:id/toggle  { day }  — toggles a day's completion
exports.toggleDay = async (req, res) => {
  let connection;
  try {
    const day = req.body.day || new Date().toISOString().slice(0, 10);
    connection = await getConnection();
    const owned = await connection.execute(`SELECT habit_id FROM HABITS WHERE habit_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Habit not found.' });
    const del = await connection.execute(`DELETE FROM HABIT_LOG WHERE habit_id = :id AND log_date = :day`, { id: req.params.id, day });
    if (!del.rowsAffected) {
      await connection.execute(`INSERT INTO HABIT_LOG (log_id, habit_id, log_date) VALUES (:logId, :id, :day)`, { logId: generateId(), id: req.params.id, day });
    }
    res.json({ success: true, done: !del.rowsAffected });
  } catch (err) {
    console.error('Toggle habit day error:', err);
    res.status(500).json({ error: 'Failed to toggle day.' });
  } finally {
    if (connection) await connection.close();
  }
};
