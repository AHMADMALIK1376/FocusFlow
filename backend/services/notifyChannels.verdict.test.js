const test = require('node:test');
const assert = require('node:assert/strict');
const { isDelivered, wasAttempted } = require('./notifyChannels');

const CASES = [
  // [label, result, delivered, attempted]
  ['nothing at all', {}, false, false],
  ['push skipped (no VAPID keys)', { push: { sent: 0, skipped: 'no-vapid' } }, false, false],
  ['push: no devices', { push: { sent: 0, devices: 0 } }, false, false],
  ['push: one device failed', { push: { sent: 0, devices: 1 } }, false, true],
  ['push: sent to one of two', { push: { sent: 1, devices: 2 } }, true, true],
  ['email sent', { push: { sent: 0, devices: 0 }, email: { ok: true } }, true, true],
  ['email still queued (pending)', { email: { ok: true, pending: true } }, true, true],
  ['email failed', { email: { ok: false, error: 'Gmail refused' } }, false, true],
  ['email threw', { email: { error: 'boom' } }, false, true],
  ['whatsapp ok', { whatsapp: { ok: true } }, true, true],
  ['whatsapp failed', { whatsapp: { ok: false } }, false, true],
  ['push delivered, email failed', { push: { sent: 1, devices: 1 }, email: { ok: false, error: 'x' } }, true, true],
  ['push errored, email failed', { push: { error: 'db' }, email: { ok: false } }, false, true],
  ['undefined', undefined, false, false],
];

for (const [label, result, delivered, attempted] of CASES) {
  test(`verdict: ${label}`, () => {
    assert.equal(isDelivered(result), delivered, 'isDelivered');
    assert.equal(wasAttempted(result), attempted, 'wasAttempted');
  });
}
