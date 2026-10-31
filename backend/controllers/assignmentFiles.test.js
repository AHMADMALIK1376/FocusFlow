const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

let filesAnswer; // rows, or an Error for the LMS files query
const dbPath = path.join(__dirname, '..', 'config', 'database.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getConnection: async () => ({
      execute: async (sql, params) => {
        if (sql.includes('FROM LMS_FILES')) {
          if (filesAnswer instanceof Error) throw filesAnswer;
          assert.equal(params.userId, 'u1');
          return { rows: filesAnswer };
        }
        return { rows: [
          { ASSIGNMENT_ID: 'c1', SUBJECT_ID: 's1', TITLE: 'Lab 4', NOTE: 'Do all', DUE_DATE: '2026-10-30', COLUMN_ID: 'col-todo', BOARD_ORDER: 0, SUBJECT_NAME: 'Web', SUBJECT_COLOR: null },
          { ASSIGNMENT_ID: 'c2', SUBJECT_ID: null, TITLE: 'Own task', NOTE: null, DUE_DATE: null, COLUMN_ID: 'col-todo', BOARD_ORDER: 1, SUBJECT_NAME: null, SUBJECT_COLOR: null },
        ] };
      },
      close: async () => {},
    }),
  },
};
const { getAssignments } = require('./assignmentController');
const run = async () => {
  const res = { body: null, json(b) { this.body = b; return this; }, status() { return this; } };
  await getAssignments({ user: { userId: 'u1' }, query: {} }, res);
  return res.body;
};

test('a card from the LMS carries its teacher\'s files (id, name, size); other cards are unchanged', async () => {
  filesAnswer = [
    { FILE_ID: 'f1', ASSIGNMENT_ID: 'c1', NAME: 'Lab 4.pdf', SIZE_BYTES: '2048' },
    { FILE_ID: 'f2', ASSIGNMENT_ID: 'c1', NAME: 'data.csv', SIZE_BYTES: 10 },
  ];
  const cards = await run();
  assert.deepEqual(cards[0].files, [{ id: 'f1', name: 'Lab 4.pdf', size: 2048 }, { id: 'f2', name: 'data.csv', size: 10 }]);
  assert.equal('files' in cards[1], false);
  assert.ok(!JSON.stringify(cards).includes('path'));
});

test('without the LMS files table, or without files, the board is exactly what it was', async () => {
  filesAnswer = Object.assign(new Error('missing'), { code: '42P01' });
  let cards = await run();
  assert.equal(cards.length, 2);
  assert.equal('files' in cards[0], false);
  filesAnswer = [];
  cards = await run();
  assert.equal('files' in cards[0], false);
});
