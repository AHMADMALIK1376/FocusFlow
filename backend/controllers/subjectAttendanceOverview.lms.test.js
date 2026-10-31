const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let sessionsAnswer;
const dbPath = path.join(__dirname, '..', 'config', 'database.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getConnection: async () => ({
      execute: async (sql) => {
        if (sql.includes('FROM LMS_SESSIONS')) {
          if (sessionsAnswer instanceof Error) throw sessionsAnswer;
          return { rows: sessionsAnswer };
        }
        return { rows: [{ SUBJECT_ID: 'a', NAME: 'Web', COLOR: null, STATUS: 'Present' }, { SUBJECT_ID: 'b', NAME: 'AI', COLOR: null, STATUS: null }] };
      },
      close: async () => {},
    }),
  },
};
const { getOverview } = require('./subjectAttendanceController');
const run = async () => {
  const res = { body: null, json(b) { this.body = b; return this; }, status() { return this; } };
  await getOverview({ user: { userId: 'u1' } }, res);
  return res.body;
};

test('the overview adds the semester\'s class count, classes left and last class date from the LMS', async () => {
  sessionsAnswer = [
    { SUBJECT_ID: 'a', SESSION_DATE: '2000-01-01' },
    { SUBJECT_ID: 'a', SESSION_DATE: '2999-01-01' },
    { SUBJECT_ID: 'a', SESSION_DATE: '2999-02-01' },
  ];
  const { subjects } = await run();
  const a = subjects.find((s) => s.id === 'a');
  assert.deepEqual([a.classesTotal, a.classesLeft, a.lastClassDate], [3, 2, '2999-02-01']);
  assert.equal(a.percentage, 100); // the attendance numbers themselves are unchanged
  const b = subjects.find((s) => s.id === 'b');
  assert.equal('classesTotal' in b, false);
});

test('with no LMS tables or no sessions the overview is exactly what it was', async () => {
  sessionsAnswer = Object.assign(new Error('missing'), { code: '42P01' });
  let body = await run();
  assert.equal(body.subjects.length, 2);
  assert.equal('classesTotal' in body.subjects[0], false);
  sessionsAnswer = [];
  body = await run();
  assert.equal('classesLeft' in body.subjects[0], false);
});
