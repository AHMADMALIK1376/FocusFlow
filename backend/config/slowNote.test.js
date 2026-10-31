const { test } = require('node:test');
const assert = require('node:assert/strict');
const { slowNote } = require('./database');

test('a slow query is named by the start of its statement and its time, never its values; fast ones and "off" say nothing', () => {
  const note = slowNote(812.4, "SELECT a.title\n   FROM ASSIGNMENTS a WHERE a.user_id = :userId", 300);
  assert.equal(note, 'slow query (812 ms): SELECT a.title FROM ASSIGNMENTS a WHERE a.user_id = :userId');
  assert.equal(slowNote(120, 'SELECT 1', 300), null);
  assert.equal(slowNote(5000, 'SELECT 1', 0), null); // switched off
  assert.equal(slowNote(900, 'x'.repeat(500), 300).length, 'slow query (900 ms): '.length + 90);
});
