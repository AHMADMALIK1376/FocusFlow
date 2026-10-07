const { getConnection } = require('../config/database');
const { validatePreferences } = require('../utils/preferences');

// GET /api/preferences  ->  { data: {...} | null, updatedAt }
exports.getPreferences = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT data, updated_at FROM USER_PREFERENCES WHERE user_id = :userId`,
      { userId: req.user.userId }
    );
    if (result.rows.length === 0) return res.json({ data: null, updatedAt: null });
    let data = null;
    try { data = JSON.parse(result.rows[0].DATA); } catch { data = null; }
    res.json({ data, updatedAt: result.rows[0].UPDATED_AT });
  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ error: 'Failed to load preferences.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/preferences  { data }  ->  { success: true }
exports.savePreferences = async (req, res) => {
  const checked = validatePreferences(req.body);
  if (!checked.ok) return res.status(checked.tooLarge ? 413 : 400).json({ error: checked.error });
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO USER_PREFERENCES (user_id, data, updated_at) VALUES (:userId, :data, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
      { userId: req.user.userId, data: checked.json }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save preferences error:', err);
    res.status(500).json({ error: 'Failed to save preferences.' });
  } finally {
    if (connection) await connection.close();
  }
};
