// Theming must never stop an email. Every way the theme lookup, the colour maths or the icon tinting can go wrong
// still ends with exactly one email handed to the sender. Fault-injection tests that damage the icon code run FIRST
// in this file (the icon module remembers what it has loaded), and the one that feeds it garbage runs LAST.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PNG } = require('pngjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.APP_URL = 'https://focusflow.example';
const sent = [];
let senderError = null;
const queuePath = require.resolve('./emailQueueService');
require.cache[queuePath] = {
  id: queuePath, filename: queuePath, loaded: true,
  exports: { sendBulkEmailQueued: async (to, subject, html, text, attachments) => { if (senderError) { sent.push({ failed: true }); throw senderError; } sent.push({ to, subject, html, text, attachments }); return { queued: true, outcome: Promise.resolve({ status: 'sent' }) }; }, waitForOutcome: (r) => r.outcome, codeEmail: () => null },
};
const { deliver, buildReminderEmail } = require('./notifyChannels');
const { reminderEmail } = require('./emailTemplates');
const { loadUserTheme, emailPalette } = require('./emailTheme');
const { PALETTES } = require('./theme/palettes');
const { MAX_BYTES } = require('../utils/preferences');

const APP = process.env.APP_URL;
const asTheme = (id) => { const p = PALETTES.find((x) => x.id === id); return { v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id }; };
const BOLD = asTheme('electric-blue');
const N = {
  kind: 'class', title: 'Compiler Construction', body: 'Room LR26', url: '/timetable',
  view: { headline: 'Compiler Construction', sub: 'Starts at 13:15', facts: [{ icon: 'clock', label: 'Time', value: '13:15' }] },
};
const user = { userId: 'user-9', email: 'a@example.com' };
const settings = { emailEnabled: true };
const rowsConn = (rows) => ({ execute: async () => ({ rows }) });
const DEFAULT_HTML = reminderEmail(N, APP, null).html;

// Records everything printed, so we can prove the stored data is never written to a log.
async function logged(fn) {
  const lines = [];
  const saved = {};
  for (const k of ['log', 'warn', 'error', 'info', 'debug']) {
    saved[k] = console[k];
    console[k] = (...a) => lines.push(a.map(String).join(' '));
  }
  try { return [await fn(), lines.join('\n')]; } finally { Object.assign(console, saved); }
}

const MARK = 'SECRET_MARK_7731';
const VALID_KEYS = { v: 1, background: '#0B1020', brand: '#2546F0', accent: '#8FB3F0', text: 'auto', presetId: 'x' };

// ---- icon damage (first, before the icon module has cached anything) ------------------------------------

function everyAttachmentUsable(att) {
  for (const a of att) {
    if (a.path) assert.ok(fs.existsSync(a.path), `missing file ${a.path}`);
    else assert.ok(Buffer.isBuffer(a.content) && a.content.length > 0);
  }
}

test('the icon file is missing: the email still goes out once, with the nearest ready-made icons', async () => {
  const realRead = fs.readFileSync;
  fs.readFileSync = function patched(p, ...rest) {
    if (typeof p === 'string' && p.endsWith('-white.png')) { const e = new Error(`ENOENT: ${MARK}`); e.code = 'ENOENT'; throw e; }
    return realRead.call(this, p, ...rest);
  };
  try {
    sent.length = 0;
    const [res] = await logged(() => deliver(rowsConn([{ DATA: JSON.stringify({ theme: BOLD }) }]), user, settings, N));
    assert.deepEqual(res.email, { ok: true });
    assert.equal(sent.length, 1);
    everyAttachmentUsable(sent[0].attachments.filter((a) => a.cid !== 'ff-logo'));
  } finally { fs.readFileSync = realRead; }
});

test('the PNG reader throws: one email, usable attachments', async () => {
  const real = PNG.sync.read;
  PNG.sync.read = () => { throw new Error('corrupt png'); };
  try {
    sent.length = 0;
    const res = await deliver(rowsConn([{ DATA: JSON.stringify({ theme: BOLD }) }]), user, settings, N);
    assert.deepEqual(res.email, { ok: true });
    assert.equal(sent.length, 1);
    everyAttachmentUsable(sent[0].attachments.filter((a) => a.cid !== 'ff-logo'));
  } finally { PNG.sync.read = real; }
});

test('the PNG writer throws (a tint function failing): one email, usable attachments', async () => {
  const real = PNG.sync.write;
  PNG.sync.write = () => { throw new Error('cannot encode'); };
  try {
    sent.length = 0;
    const res = await deliver(rowsConn([{ DATA: JSON.stringify({ theme: BOLD }) }]), user, settings, N);
    assert.deepEqual(res.email, { ok: true });
    assert.equal(sent.length, 1);
    assert.ok(sent[0].html.includes(emailPalette(BOLD).coral), 'still in the theme colours');
    everyAttachmentUsable(sent[0].attachments.filter((a) => a.cid !== 'ff-logo'));
  } finally { PNG.sync.write = real; }
});

// ---- the lookup ------------------------------------------------------------------------------------------

test('loadUserTheme: the SQL is the fixed text with a bound id, whatever the id looks like', async () => {
  const hostile = "u1' OR '1'='1'; DROP TABLE USER_PREFERENCES; --";
  const calls = [];
  await loadUserTheme({ execute: async (sql, binds) => { calls.push({ sql, binds }); return { rows: [] }; } }, hostile);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sql, 'SELECT data FROM USER_PREFERENCES WHERE user_id = :userId');
  assert.deepEqual(calls[0].binds, { userId: hostile });
  assert.ok(!calls[0].sql.includes('DROP'));
  assert.equal(Object.keys(calls[0].binds).length, 1);
});

test('deliver gives the lookup the signed-in student id only', async () => {
  const seen = [];
  await deliver({ execute: async (sql, binds) => { seen.push(binds); return { rows: [] }; } }, { userId: 'only-me', email: 'x@y.z' }, settings, N);
  assert.ok(seen.every((b) => b.userId === 'only-me'));
});

const hugeObject = { theme: BOLD };
Object.defineProperty(hugeObject, 'pad', { value: 'x'.repeat(5 * 1024 * 1024), enumerable: true });
const throwingGetter = {};
Object.defineProperty(throwingGetter, 'theme', { get() { throw new Error('boom'); }, enumerable: true });
const throwingProxy = new Proxy({}, { get() { throw new Error('proxy'); }, has() { throw new Error('has'); }, ownKeys() { throw new Error('keys'); } });

const BAD_ROWS = {
  'huge corrupt text': [{ DATA: `{"theme":${MARK}` + 'x'.repeat(MAX_BYTES + 10) }],
  'corrupt text with the marker': [{ DATA: `${MARK} oops` }],
  'huge valid-looking text': [{ DATA: JSON.stringify({ theme: VALID_KEYS, pad: 'x'.repeat(MAX_BYTES) }) }],
  'array data': [{ DATA: [BOLD] }],
  'array json': [{ DATA: JSON.stringify([BOLD]) }],
  'number data': [{ DATA: 42 }],
  'boolean data': [{ DATA: true }],
  'string json': [{ DATA: JSON.stringify(MARK) }],
  'empty string': [{ DATA: '' }],
  'lowercase column name': [{ data: JSON.stringify({ theme: BOLD }) }],
  'row without DATA': [{}],
  'null row': [null],
  'rows is not an array': { rows: MARK },
  'result is null': null,
  'theme is an array': [{ DATA: { theme: [BOLD] } }],
  'theme is a string': [{ DATA: { theme: MARK } }],
  'theme with an extra key': [{ DATA: { theme: { ...VALID_KEYS, [MARK]: 1 } } }],
  'theme version 0': [{ DATA: { theme: { ...VALID_KEYS, v: 0 } } }],
  'theme version 1.5': [{ DATA: { theme: { ...VALID_KEYS, v: 1.5 } } }],
  'inject: brand with css': [{ DATA: { theme: { ...VALID_KEYS, brand: '#EC706D;background:url(x)' } } }],
  'inject: background script': [{ DATA: { theme: { ...VALID_KEYS, background: `"><script>${MARK}</script>` } } }],
  'inject: accent 8-digit hex': [{ DATA: { theme: { ...VALID_KEYS, accent: '#8FB3F0FF' } } }],
  'inject: text with newline': [{ DATA: { theme: { ...VALID_KEYS, text: '#112233\n;color:red' } } }],
  'inject: presetId': [{ DATA: { theme: { ...VALID_KEYS, presetId: `x"><script>${MARK}` } } }],
  'inject: logo colour': [{ DATA: { theme: { ...VALID_KEYS, logo: 'javascript:alert(1)' } } }],
  'very long brand': [{ DATA: { theme: { ...VALID_KEYS, brand: '#' + 'A'.repeat(1_000_000) } } }],
  'very long presetId': [{ DATA: { theme: { ...VALID_KEYS, presetId: 'a'.repeat(1_000_000) } } }],
  'getter that throws': [{ DATA: throwingGetter }],
  'proxy that throws': [{ DATA: throwingProxy }],
};

test('every kind of bad stored data still sends exactly one default-look email, and the data is never logged', async () => {
  for (const [name, rows] of Object.entries(BAD_ROWS)) {
    sent.length = 0;
    const conn = { execute: async () => (rows && rows.rows !== undefined ? rows : rows === null ? null : { rows }) };
    const [res, out] = await logged(() => deliver(conn, user, settings, N));
    assert.deepEqual(res.email, { ok: true }, name);
    assert.equal(sent.length, 1, name);
    assert.equal(sent[0].html, DEFAULT_HTML, `${name}: not the default look`);
    assert.equal(sent[0].to, 'a@example.com', name);
    assert.ok(!out.includes(MARK.slice(0, 8)), `${name}: the stored data reached a log: ${out.slice(0, 200)}`);
    assert.ok(!/x{50}/.test(out), `${name}: a long string reached a log`);
  }
});

test('a theme that merely sits inside huge object data is still used (size is only checked on text)', async () => {
  sent.length = 0;
  await deliver(rowsConn([{ DATA: hugeObject }]), user, settings, N);
  assert.equal(sent.length, 1);
});

test('the database failing in different ways never stops the email', async () => {
  const errors = [
    Object.assign(new Error('relation "user_preferences" does not exist'), { code: '42P01' }),
    new Error('connection terminated unexpectedly'),
    Object.assign(new Error(`syntax error near ${MARK}`), { code: '42601' }),
  ];
  for (const err of errors) {
    sent.length = 0;
    const [res] = await logged(() => deliver({ execute: async () => { throw err; } }, user, settings, N));
    assert.deepEqual(res.email, { ok: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].html, DEFAULT_HTML);
  }
  sent.length = 0;
  const res = await deliver({ execute: () => { throw new Error('sync throw'); } }, user, settings, N);
  assert.deepEqual(res.email, { ok: true });
  assert.equal(sent.length, 1);
});

// BUG FOUND (see .pipeline/test-results.md): loadUserTheme's catch reads err.message, so a rejection with
// undefined or null throws a TypeError out of the "never throws" function and the email is not sent.
for (const [label, reason] of [['undefined', undefined], ['null', null], ['a string', 'plain string']]) {
  test(`a database promise rejected with ${label} still sends the default-look email`, {}, async () => {
    sent.length = 0;
    const [res] = await logged(() => deliver({ execute: () => Promise.reject(reason) }, user, settings, N));
    assert.deepEqual(res.email, { ok: true });
    assert.equal(sent.length, 1);
  });
}

test('a missing connection object gives the default look', async () => {
  sent.length = 0;
  const res = await deliver(null, user, settings, N).catch((e) => ({ threw: e }));
  // the push channel needs the connection, but only when push keys exist; the email must still go
  assert.deepEqual(res.email, { ok: true });
  assert.equal(sent.length, 1);
});

test('buildReminderEmail: a theme that throws when read, or a template that throws, falls back to the default look once', () => {
  const quiet = console.warn;
  console.warn = () => {};
  try {
    for (const theme of [throwingProxy, throwingGetter, { get brand() { throw new Error('x'); } }]) {
      const e = buildReminderEmail(N, APP, theme);
      assert.equal(e.html, DEFAULT_HTML);
    }
  } finally { console.warn = quiet; }
});

test('a theme that is hostile text never reaches the email html', () => {
  const evil = { v: 1, background: '#EC706D;background:url(x)', brand: '"><script>', accent: '#8FB3F0', text: 'auto', presetId: 'x' };
  const e = buildReminderEmail(N, APP, evil);
  assert.equal(e.html, DEFAULT_HTML);
  assert.ok(!e.html.includes('<script'));
});

test('the user id may be missing: the email still goes out in the default look', async () => {
  sent.length = 0;
  const res = await deliver(rowsConn([]), { email: 'a@example.com' }, settings, N);
  assert.deepEqual(res.email, { ok: true });
  assert.equal(sent[0].html, DEFAULT_HTML);
});

test('the sender failing is reported, not thrown, and only one send is attempted', async () => {
  senderError = new Error('smtp down');
  try {
    sent.length = 0;
    const [res] = await logged(() => deliver(rowsConn([{ DATA: { theme: BOLD } }]), user, settings, N));
    assert.equal(sent.length, 1);
    assert.deepEqual(res.email, { error: 'smtp down' });
  } finally { senderError = null; }
});

// ---- LAST: garbage from the PNG reader (the icon module keeps what it read) ------------------------------

test('the PNG reader returns garbage: the email still goes out once', async () => {
  const real = PNG.sync.read;
  PNG.sync.read = () => ({ width: 2, height: 2, data: Buffer.alloc(3) });
  try {
    sent.length = 0;
    const [res] = await logged(() => deliver(rowsConn([{ DATA: JSON.stringify({ theme: asTheme('midnight') }) }]), user, settings, N));
    assert.deepEqual(res.email, { ok: true });
    assert.equal(sent.length, 1);
  } finally { PNG.sync.read = real; }
});
