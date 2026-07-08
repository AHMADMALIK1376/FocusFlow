const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// GET /api/budget  → { entries, settings }
exports.getBudget = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const entries = await connection.execute(
      `SELECT entry_id, type, amount, category, note, TO_CHAR(entry_date,'YYYY-MM-DD') AS entry_date, created_at
       FROM BUDGET_ENTRIES WHERE user_id = :userId ORDER BY entry_date DESC, created_at DESC`,
      { userId: req.user.userId }
    );
    const settings = await connection.execute(
      `SELECT monthly_allowance, currency, savings_goal FROM BUDGET_SETTINGS WHERE user_id = :userId`,
      { userId: req.user.userId }
    );
    const s = settings.rows[0] || {};
    res.json({
      entries: entries.rows.map((e) => ({ id: e.ENTRY_ID, type: e.TYPE, amount: e.AMOUNT, category: e.CATEGORY, note: e.NOTE, date: e.ENTRY_DATE, createdAt: e.CREATED_AT })),
      settings: {
        monthlyAllowance: s.MONTHLY_ALLOWANCE != null ? s.MONTHLY_ALLOWANCE : 0,
        currency: s.CURRENCY || 'PKR',
        savingsGoal: s.SAVINGS_GOAL != null ? s.SAVINGS_GOAL : 0,
      },
    });
  } catch (err) {
    console.error('Get budget error:', err);
    res.status(500).json({ error: 'Failed to get budget.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/budget/entries
exports.addEntry = async (req, res) => {
  let connection;
  try {
    const { type, amount, category, note, date } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Amount must be positive.' });
    const entryId = generateId();
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO BUDGET_ENTRIES (entry_id, user_id, type, amount, category, note, entry_date)
       VALUES (:id, :userId, :type, :amount, :category, :note, :date)`,
      {
        id: entryId, userId: req.user.userId,
        type: type === 'income' ? 'income' : 'expense',
        amount: amt, category: category || 'General', note: note || null,
        date: date || new Date().toISOString().slice(0, 10),
      }
    );
    res.status(201).json({ success: true, id: entryId });
  } catch (err) {
    console.error('Add budget entry error:', err);
    res.status(500).json({ error: 'Failed to add entry.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/budget/entries/:id
exports.removeEntry = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM BUDGET_ENTRIES WHERE entry_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove budget entry error:', err);
    res.status(500).json({ error: 'Failed to remove entry.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/budget/settings  (upsert)
exports.saveSettings = async (req, res) => {
  let connection;
  try {
    const { monthlyAllowance, currency, savingsGoal } = req.body;
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO BUDGET_SETTINGS (user_id, monthly_allowance, currency, savings_goal, updated_at)
       VALUES (:userId, :monthlyAllowance, :currency, :savingsGoal, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         monthly_allowance = EXCLUDED.monthly_allowance,
         currency = EXCLUDED.currency,
         savings_goal = EXCLUDED.savings_goal,
         updated_at = CURRENT_TIMESTAMP`,
      {
        userId: req.user.userId,
        monthlyAllowance: Number(monthlyAllowance) || 0,
        currency: currency || 'PKR',
        savingsGoal: Number(savingsGoal) || 0,
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save budget settings error:', err);
    res.status(500).json({ error: 'Failed to save settings.' });
  } finally {
    if (connection) await connection.close();
  }
};
