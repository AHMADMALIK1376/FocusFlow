const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// GET /api/goals
exports.getGoals = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const goals = await connection.execute(
      `SELECT goal_id, title, description, TO_CHAR(target_date,'YYYY-MM-DD') AS target_date, is_completed, created_at
       FROM GOALS WHERE user_id = :userId ORDER BY created_at ASC`,
      { userId: req.user.userId }
    );
    const ms = await connection.execute(
      `SELECT m.milestone_id, m.goal_id, m.title, m.is_done, m.sort_order
       FROM GOAL_MILESTONES m JOIN GOALS g ON g.goal_id = m.goal_id
       WHERE g.user_id = :userId ORDER BY m.sort_order ASC, m.created_at ASC`,
      { userId: req.user.userId }
    );
    const byGoal = {};
    for (const m of ms.rows) {
      (byGoal[m.GOAL_ID] = byGoal[m.GOAL_ID] || []).push({ id: m.MILESTONE_ID, title: m.TITLE, done: m.IS_DONE === 1, sortOrder: m.SORT_ORDER });
    }
    res.json(goals.rows.map((g) => ({
      id: g.GOAL_ID,
      title: g.TITLE,
      description: g.DESCRIPTION,
      targetDate: g.TARGET_DATE,
      isCompleted: g.IS_COMPLETED === 1,
      createdAt: g.CREATED_AT,
      milestones: byGoal[g.GOAL_ID] || [],
    })));
  } catch (err) {
    console.error('Get goals error:', err);
    res.status(500).json({ error: 'Failed to get goals.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/goals
exports.createGoal = async (req, res) => {
  let connection;
  try {
    const { title, description, targetDate } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Goal title is required.' });
    const goalId = generateId();
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO GOALS (goal_id, user_id, title, description, target_date)
       VALUES (:id, :userId, :title, :description, :targetDate)`,
      { id: goalId, userId: req.user.userId, title: title.trim(), description: description || null, targetDate: targetDate || null }
    );
    res.status(201).json({ success: true, id: goalId });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ error: 'Failed to create goal.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/goals/:id
exports.updateGoal = async (req, res) => {
  let connection;
  try {
    const { title, description, targetDate, isCompleted } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(`SELECT goal_id FROM GOALS WHERE goal_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Goal not found.' });
    await connection.execute(
      `UPDATE GOALS SET
         title = COALESCE(:title, title),
         description = :description,
         target_date = :targetDate,
         is_completed = COALESCE(:isCompleted, is_completed)
       WHERE goal_id = :id AND user_id = :userId`,
      {
        title: title != null ? title.trim() : null,
        description: description != null ? description : null,
        targetDate: targetDate != null ? targetDate : null,
        isCompleted: isCompleted != null ? (isCompleted ? 1 : 0) : null,
        id: req.params.id, userId: req.user.userId,
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Failed to update goal.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/goals/:id
exports.deleteGoal = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`DELETE FROM GOALS WHERE goal_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Goal not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ error: 'Failed to delete goal.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/goals/:id/milestones
exports.addMilestone = async (req, res) => {
  let connection;
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Milestone title is required.' });
    connection = await getConnection();
    const owned = await connection.execute(`SELECT goal_id FROM GOALS WHERE goal_id = :id AND user_id = :userId`, { id: req.params.id, userId: req.user.userId });
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Goal not found.' });
    const countRes = await connection.execute(`SELECT COUNT(*) AS c FROM GOAL_MILESTONES WHERE goal_id = :id`, { id: req.params.id });
    const sortOrder = Number(countRes.rows[0].C) || 0;
    const milestoneId = generateId();
    await connection.execute(
      `INSERT INTO GOAL_MILESTONES (milestone_id, goal_id, title, sort_order) VALUES (:id, :goalId, :title, :sortOrder)`,
      { id: milestoneId, goalId: req.params.id, title: title.trim(), sortOrder }
    );
    res.status(201).json({ success: true, id: milestoneId });
  } catch (err) {
    console.error('Add milestone error:', err);
    res.status(500).json({ error: 'Failed to add milestone.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/goals/milestones/:milestoneId/toggle
exports.toggleMilestone = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT m.milestone_id FROM GOAL_MILESTONES m JOIN GOALS g ON g.goal_id = m.goal_id
       WHERE m.milestone_id = :id AND g.user_id = :userId`,
      { id: req.params.milestoneId, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Milestone not found.' });
    await connection.execute(`UPDATE GOAL_MILESTONES SET is_done = 1 - is_done WHERE milestone_id = :id`, { id: req.params.milestoneId });
    res.json({ success: true });
  } catch (err) {
    console.error('Toggle milestone error:', err);
    res.status(500).json({ error: 'Failed to toggle milestone.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/goals/milestones/:milestoneId
exports.removeMilestone = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT m.milestone_id FROM GOAL_MILESTONES m JOIN GOALS g ON g.goal_id = m.goal_id
       WHERE m.milestone_id = :id AND g.user_id = :userId`,
      { id: req.params.milestoneId, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Milestone not found.' });
    await connection.execute(`DELETE FROM GOAL_MILESTONES WHERE milestone_id = :id`, { id: req.params.milestoneId });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove milestone error:', err);
    res.status(500).json({ error: 'Failed to remove milestone.' });
  } finally {
    if (connection) await connection.close();
  }
};
