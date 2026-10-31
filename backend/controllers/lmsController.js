const { getConnection } = require('../config/database');
const lms = require('../utils/lms');
const moodle = require('../services/lmsMoodle');
const { syncUser, isSyncing } = require('../services/lmsSync');

// A first sync can take a minute (many questions to the LMS, many rows to the far-away database), longer than a request
// may last. Wait a little for the result; if it is not ready, answer now and let the sync finish on its own.
const WAIT_MS = 15000;
async function startSync(userId, opts) {
  const run = syncUser(userId, opts);
  run.catch((e) => console.error('LMS sync error:', e.message)); // never an unhandled rejection
  let timer;
  const waited = await Promise.race([run, new Promise((resolve) => { timer = setTimeout(() => resolve(undefined), WAIT_MS); })]);
  clearTimeout(timer);
  return waited; // undefined = still running
}

// A table that was never created (the migration has not been run yet) must not break the app.
const tablesMissing = (err) => Boolean(err && err.code === '42P01');

const sessionFor = (row) => ({
  connected: true,
  lastSynced: row.LAST_SYNCED || null,
  needsReconnect: Number(row.NEEDS_RECONNECT) === 1,
  lastError: row.LAST_ERROR || null,
});
const withSyncing = (body, userId) => ({ ...body, syncing: isSyncing(userId) });

// GET /api/lms/status
exports.getStatus = async (req, res) => {
  const base = { available: Boolean(lms.keyFromEnv()), site: moodle.baseUrl(), connected: false };
  if (!base.available) return res.json(base);
  let connection;
  try {
    connection = await getConnection();
    const r = await connection.execute(
      `SELECT last_synced, needs_reconnect, last_error FROM LMS_CONNECTIONS WHERE user_id = :userId`,
      { userId: req.user.userId }
    );
    res.json(withSyncing(r.rows.length ? { ...base, ...sessionFor(r.rows[0]) } : base, req.user.userId));
  } catch (err) {
    if (tablesMissing(err)) return res.json({ ...base, available: false });
    console.error('LMS status error:', err.message);
    res.status(500).json({ error: 'Failed to get the LMS status.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/lms/connect  { text }  -- the text the LMS sign-in gave back (see parseLaunchText)
exports.connect = async (req, res) => {
  const key = lms.keyFromEnv();
  if (!key) return res.status(503).json({ error: 'Connecting to the LMS is not set up on this server yet.' });
  const token = lms.parseLaunchText(req.body && req.body.text);
  if (!token) return res.status(400).json({ error: 'That does not look like the text the LMS gave you. Copy it again, whole.' });
  let info;
  try {
    info = await moodle.siteInfo(token);
  } catch (err) {
    if (moodle.keyRejected(err)) return res.status(400).json({ error: 'The LMS did not accept that key. Sign in again and copy the new one.' });
    return res.status(502).json({ error: 'The LMS did not answer. Try again in a minute.' });
  }
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO LMS_CONNECTIONS (user_id, token_enc, lms_user_id, needs_reconnect, last_error)
       VALUES (:userId, :enc, :lmsUserId, 0, NULL)
       ON CONFLICT (user_id) DO UPDATE SET token_enc = :enc, lms_user_id = :lmsUserId, needs_reconnect = 0, last_error = NULL`,
      { userId: req.user.userId, enc: lms.encryptToken(token, key), lmsUserId: info.userId }
    );
  } catch (err) {
    if (tablesMissing(err)) return res.status(503).json({ error: 'Connecting to the LMS is not set up on this server yet.' });
    console.error('LMS connect error:', err.message);
    return res.status(500).json({ error: 'Failed to save the connection.' });
  } finally {
    if (connection) await connection.close();
  }
  const result = await startSync(req.user.userId, { manual: true, ignoreGap: true });
  res.status(201).json({ connected: true, result, syncing: result === undefined });
};

// POST /api/lms/sync  { manual? }  -- cheap when nothing is due: the server decides how often it really asks the LMS
exports.sync = async (req, res) => {
  try {
    const result = await startSync(req.user.userId, { manual: Boolean(req.body && req.body.manual) });
    res.json({ result, syncing: result === undefined });
  } catch (err) {
    if (tablesMissing(err)) return res.json({ result: { skipped: 'not_set_up' } });
    console.error('LMS sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync with the LMS.' });
  }
};

// DELETE /api/lms  -- forget the key and what was remembered about the LMS. Subjects and cards stay: they are the student's.
exports.disconnect = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    for (const table of ['LMS_SESSIONS', 'LMS_ITEM_MAP', 'LMS_CONNECTIONS']) {
      await connection.execute(`DELETE FROM ${table} WHERE user_id = :userId`, { userId: req.user.userId });
    }
    res.json({ success: true });
  } catch (err) {
    if (tablesMissing(err)) return res.json({ success: true });
    console.error('LMS disconnect error:', err.message);
    res.status(500).json({ error: 'Failed to disconnect.' });
  } finally {
    if (connection) await connection.close();
  }
};
