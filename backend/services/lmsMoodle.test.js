const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const moodle = require('./lmsMoodle');

const realFetch = global.fetch;
let sent;
const answer = (data, ok = true, status = 200) => {
  global.fetch = async (url, opts) => {
    sent = { url, body: new URLSearchParams(opts.body), method: opts.method };
    return { ok, status, json: async () => data };
  };
};
beforeEach(() => { sent = null; delete process.env.LMS_BASE_URL; });
afterEach(() => { global.fetch = realFetch; });

test('questions go only to the fixed university address, as a POST, with the key in the body (not the address)', async () => {
  answer({ userid: 5, sitename: 'Iqra' });
  assert.deepEqual(await moodle.siteInfo('f'.repeat(32)), { userId: 5, siteName: 'Iqra' });
  assert.equal(sent.url, 'https://lms.iqra.edu.pk/webservice/rest/server.php');
  assert.equal(sent.method, 'POST');
  assert.equal(sent.body.get('wsfunction'), 'core_webservice_get_site_info');
  assert.equal(sent.body.get('wstoken'), 'f'.repeat(32));
  assert.ok(!sent.url.includes('f'.repeat(32)));
  process.env.LMS_BASE_URL = 'https://lms.example.edu/';
  await moodle.siteInfo('f'.repeat(32));
  assert.equal(sent.url, 'https://lms.example.edu/webservice/rest/server.php');
});

test('only read functions are ever asked for', async () => {
  const asked = [];
  global.fetch = async (url, opts) => {
    asked.push(new URLSearchParams(opts.body).get('wsfunction'));
    return { ok: true, status: 200, json: async () => ({ courses: [], weeks: [], lastattempt: null }) };
  };
  await moodle.courses('t', 5); await moodle.assignments('t', [1]); await moodle.isSubmitted('t', 2); await moodle.attendanceEvents('t', 2026, 10);
  assert.deepEqual(asked, ['core_enrol_get_users_courses', 'mod_assign_get_assignments', 'mod_assign_get_submission_status', 'core_calendar_get_calendar_monthly_view']);
  asked.forEach((f) => assert.match(f, /_get_/));
});

test('lists are sent the way Moodle wants them, and asking about no courses asks nothing', async () => {
  answer({ courses: [] });
  await moodle.assignments('t', [3, 4]);
  assert.equal(sent.body.get('courseids[0]'), '3');
  assert.equal(sent.body.get('courseids[1]'), '4');
  sent = null;
  assert.deepEqual(await moodle.assignments('t', []), []);
  assert.equal(sent, null);
});

test('answers are reshaped to what FocusFlow needs', async () => {
  answer([{ id: 7, fullname: 'X', startdate: 1, enddate: 2, extra: 'ignored' }]);
  assert.deepEqual(await moodle.courses('t', 5), [{ id: 7, fullname: 'X', startdate: 1, enddate: 2 }]);
  answer({ courses: [{ id: 7, assignments: [{ id: 21, name: 'A', duedate: 99, intro: 'x' }] }] });
  assert.deepEqual(await moodle.assignments('t', [7]), [{ id: 21, courseId: 7, name: 'A', duedate: 99 }]);
  answer({ lastattempt: { submission: { status: 'submitted' } } });
  assert.equal(await moodle.isSubmitted('t', 21), true);
  answer({ lastattempt: { submission: { status: 'draft' } } });
  assert.equal(await moodle.isSubmitted('t', 21), false);
  answer({ lastattempt: null });
  assert.equal(await moodle.isSubmitted('t', 21), false);
  answer({ weeks: [{ days: [{ events: [{ id: 1, modulename: 'attendance', course: { id: 7 }, timestart: 5 }, { id: 2, modulename: 'assign', course: { id: 7 }, timestart: 6 }] }, { events: [] }] }] });
  assert.deepEqual(await moodle.attendanceEvents('t', 2026, 10), [{ id: 1, courseId: 7, timestart: 5 }]);
});

test('Moodle errors, bad replies and a dead network become one tidy error with a code', async () => {
  answer({ exception: 'moodle_exception', errorcode: 'invalidtoken', message: 'Invalid token' });
  await assert.rejects(() => moodle.siteInfo('t'), (e) => e.code === 'invalidtoken' && moodle.keyRejected(e));
  answer({}, false, 503);
  await assert.rejects(() => moodle.siteInfo('t'), (e) => e.code === 'http_503' && !moodle.keyRejected(e));
  global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new Error('html'); } });
  await assert.rejects(() => moodle.siteInfo('t'), (e) => e.code === 'badreply');
  global.fetch = async () => { throw new Error('ECONNRESET'); };
  await assert.rejects(() => moodle.siteInfo('t'), (e) => e.code === 'unreachable' && !moodle.keyRejected(e));
});
