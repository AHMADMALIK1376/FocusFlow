const { test } = require('node:test');
const assert = require('node:assert/strict');
const { completionDate } = require('./helpers');

// 6 Oct 2026, 20:30 UTC = 7 Oct 01:30 in Pakistan.
const AT = new Date('2026-10-06T20:30:00Z');

test('accepts the student\'s local date, including tomorrow-in-UTC', () => {
  assert.equal(completionDate('2026-10-06', AT), '2026-10-06');
  assert.equal(completionDate('2026-10-07', AT), '2026-10-07'); // Pakistan is already on the 7th
  assert.equal(completionDate('2026-10-05', AT), '2026-10-05'); // earlier this week
});

test('rejects far-future, very old and malformed dates', () => {
  assert.equal(completionDate('2026-10-08', AT), null);
  assert.equal(completionDate('2025-10-01', AT), null);
  assert.equal(completionDate('2026-02-30', AT), null);
  assert.equal(completionDate('2026-10-6', AT), null);
  assert.equal(completionDate('Wed', AT), null);
  assert.equal(completionDate(undefined, AT), null);
  assert.equal(completionDate(20261006, AT), null);
});
