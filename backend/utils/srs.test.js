const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextBox, dueDate } = require('./srs');

const FROM = new Date('2026-07-01T12:00:00');

test('nextBox promotes / resets', () => {
  assert.equal(nextBox(1, true), 2);
  assert.equal(nextBox(5, true), 5);
  assert.equal(nextBox(3, false), 1);
});

test('dueDate by box', () => {
  assert.equal(dueDate(1, FROM), '2026-07-01');
  assert.equal(dueDate(3, FROM), '2026-07-04');
  assert.equal(dueDate(5, FROM), '2026-07-15');
});
