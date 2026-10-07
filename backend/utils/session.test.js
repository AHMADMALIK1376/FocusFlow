const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { SESSION_DAYS, REFRESH_AFTER_SECONDS, signSession, shouldRefresh } = require('./session');

const SECRET = 'test-secret-test-secret-test-secret-123';

test('a session lasts 20 days', () => {
  const d = jwt.verify(signSession('u1', 'a@b.c', SECRET), SECRET);
  assert.equal(SESSION_DAYS, 20);
  assert.equal(d.exp - d.iat, 20 * 24 * 60 * 60);
  assert.equal(d.userId, 'u1');
  assert.equal(d.email, 'a@b.c');
});

test('a login is renewed once it is a day old, not before', () => {
  const now = 1_800_000_000;
  assert.equal(shouldRefresh({ iat: now - 60 }, now), false);
  assert.equal(shouldRefresh({ iat: now - REFRESH_AFTER_SECONDS + 1 }, now), false);
  assert.equal(shouldRefresh({ iat: now - REFRESH_AFTER_SECONDS }, now), true);
  assert.equal(shouldRefresh({ iat: now - 15 * 24 * 3600 }, now), true);
});

test('a token without an issue time is never renewed', () => {
  assert.equal(shouldRefresh({}, 1_800_000_000), false);
  assert.equal(shouldRefresh(null, 1_800_000_000), false);
});
