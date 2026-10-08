// GET|POST /api/cron/tick: lets an outside pinger run the reminder check (and keep the sleeping
// server awake). Answers with counts only, nothing about any student.
const scheduler = require('../services/notificationScheduler');

// Mutable on purpose so tests can lower it. Below the 30 s request timeout in server.js.
exports.TICK_WAIT_MS = 25000;

exports.tick = async (req, res) => {
  const startedAt = Date.now();
  let timer;
  try {
    // runExclusive only ever resolves (or throws); the .catch keeps a late failure from escaping.
    const run = scheduler.runExclusive('http').then((r) => ({ r }), (e) => ({ failed: e }));
    const wait = new Promise((resolve) => { timer = setTimeout(() => resolve({ slow: true }), exports.TICK_WAIT_MS); });
    const out = await Promise.race([run, wait]);
    if (out.slow) return res.status(202).json({ ok: true, running: true });
    if (out.failed) {
      console.error('Reminder check from /api/cron/tick failed:', out.failed.message);
      return res.status(500).json({ ok: false, error: 'The reminder check failed.' });
    }
    if (out.r.busy) return res.json({ ok: true, ran: false, busy: true, message: 'A reminder check is already running.' });
    return res.json({ ok: true, ran: true, counts: out.r.counts, ms: Date.now() - startedAt });
  } catch (err) {
    console.error('Reminder check from /api/cron/tick failed:', err.message);
    return res.status(500).json({ ok: false, error: 'The reminder check failed.' });
  } finally {
    clearTimeout(timer);
  }
};
