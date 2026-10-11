// A heartbeat for the reminder job, kept in the database so it survives restarts and sleeping.
// It answers the questions "is the reminder server awake?" and "is email working?" in Settings.
// Everything here is best effort: if the table has not been created yet (run
// scripts/migrate-reminder-status.js), reminders and email still work, only the status panel is empty.
const { getConnection } = require('../config/database');

const ROW = 'reminders';
let tableMissing = false;

async function run(sql, binds, fn) {
    if (tableMissing) return null;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, binds);
        return fn ? fn(result) : null;
    } catch (err) {
        if (/relation .* does not exist|does not exist/i.test(err.message)) {
            tableMissing = true;
            console.warn('⚠️ SCHEDULER_STATUS table is missing, so the Settings status panel stays empty. Run: node scripts/migrate-reminder-status.js');
        } else {
            console.error('Scheduler status error:', err.message);
        }
        return null;
    } finally {
        if (connection) await connection.close();
    }
}

// A tick (one pass over every student) just finished.
function recordTick({ ms, sent, error }) {
    return run(
        `INSERT INTO SCHEDULER_STATUS (id, last_tick_at, last_tick_ms, last_tick_sent, last_tick_error, updated_at)
         VALUES (:id, NOW(), :ms, :sent, :error, NOW())
         ON CONFLICT (id) DO UPDATE SET last_tick_at = NOW(), last_tick_ms = :ms, last_tick_sent = :sent,
                                        last_tick_error = :error, updated_at = NOW()`,
        { id: ROW, ms: Math.round(ms) || 0, sent: sent || 0, error: error ? String(error).slice(0, 300) : null }
    );
}

// An email was delivered (ok) or finally failed (not ok, with a plain-English reason).
function recordEmail(ok, message) {
    if (ok) {
        return run(
            `INSERT INTO SCHEDULER_STATUS (id, email_ok_at, updated_at) VALUES (:id, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET email_ok_at = NOW(), email_error = NULL, email_error_at = NULL, updated_at = NOW()`,
            { id: ROW }
        );
    }
    return run(
        `INSERT INTO SCHEDULER_STATUS (id, email_error, email_error_at, updated_at) VALUES (:id, :message, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET email_error = :message, email_error_at = NOW(), updated_at = NOW()`,
        { id: ROW, message: String(message || 'unknown error').slice(0, 300) }
    );
}

// Ages are worked out in the database (seconds), so clock and time-zone differences cannot skew them.
async function readStatus() {
    const row = await run(
        `SELECT last_tick_ms, last_tick_sent, last_tick_error, email_error,
                CAST(EXTRACT(EPOCH FROM (NOW() - last_tick_at)) AS INTEGER) AS tick_age_s,
                CAST(EXTRACT(EPOCH FROM (NOW() - email_ok_at)) AS INTEGER) AS email_ok_age_s,
                CAST(EXTRACT(EPOCH FROM (NOW() - email_error_at)) AS INTEGER) AS email_error_age_s
         FROM SCHEDULER_STATUS WHERE id = :id`,
        { id: ROW },
        (r) => r.rows[0] || null
    );
    if (!row) return null;
    return {
        lastTickAgeSeconds: row.TICK_AGE_S,
        lastTickMs: row.LAST_TICK_MS,
        lastTickSent: row.LAST_TICK_SENT,
        lastTickError: row.LAST_TICK_ERROR,
        emailOkAgeSeconds: row.EMAIL_OK_AGE_S,
        emailError: row.EMAIL_ERROR,
        emailErrorAgeSeconds: row.EMAIL_ERROR_AGE_S,
    };
}

// The words shown in Settings. Pure, so it is tested without a database.
const STALE_AFTER_SECONDS = 15 * 60;

function summarise(status, setup, devices, now = {}) {
    const age = status && status.lastTickAgeSeconds;
    const awake = typeof age === 'number' && age <= STALE_AFTER_SECONDS;
    const emailFailing = Boolean(status && status.emailError &&
        (status.emailOkAgeSeconds == null || (status.emailErrorAgeSeconds != null && status.emailErrorAgeSeconds < status.emailOkAgeSeconds)));
    let email;
    if (!setup.configured) email = { state: 'not-set-up', note: setup.note };
    else if (emailFailing) email = { state: 'failing', note: status.emailError };
    else if (status && status.emailOkAgeSeconds != null) email = { state: 'working', note: null };
    else email = { state: 'unknown', note: 'No email has been sent yet. Press "Send test email".' };
    return {
        reminders: {
            state: status == null ? 'unknown' : awake ? 'awake' : 'asleep',
            lastCheckedSecondsAgo: typeof age === 'number' ? age : null,
            warning: status == null
                ? 'The reminder server has not reported in yet.'
                : awake ? null : 'The reminder server has not checked for a while, so reminders may be late or missing. It may be asleep: set up the free keep-alive monitor.',
        },
        phone: { devices },
        email,
        serverUptimeSeconds: now.uptime == null ? null : Math.round(now.uptime),
    };
}

module.exports = { recordTick, recordEmail, readStatus, summarise, STALE_AFTER_SECONDS };
