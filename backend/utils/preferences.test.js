const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MAX_BYTES, validatePreferences } = require('./preferences');

test('a normal preferences object is accepted and returned as JSON text', () => {
  const r = validatePreferences({ data: { schemaVersion: 2, profile: { mascot: 'sloth' }, dashboards: [] } });
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(r.json), { schemaVersion: 2, profile: { mascot: 'sloth' }, dashboards: [] });
});

test('anything that is not an object is refused', () => {
  for (const body of [undefined, null, {}, { data: null }, { data: 'text' }, { data: 5 }, { data: [] }]) {
    const r = validatePreferences(body);
    assert.equal(r.ok, false, JSON.stringify(body));
    assert.match(r.error, /object/);
  }
});

test('it needs a numeric schemaVersion so the app can migrate it later', () => {
  assert.equal(validatePreferences({ data: { profile: {} } }).ok, false);
  assert.equal(validatePreferences({ data: { schemaVersion: '2' } }).ok, false);
});

test('a huge document is refused as too large', () => {
  const big = { schemaVersion: 2, blob: 'x'.repeat(MAX_BYTES) };
  const r = validatePreferences({ data: big });
  assert.equal(r.ok, false);
  assert.equal(r.tooLarge, true);
});

test('just under the limit is fine', () => {
  const r = validatePreferences({ data: { schemaVersion: 2, blob: 'x'.repeat(MAX_BYTES - 100) } });
  assert.equal(r.ok, true);
});
