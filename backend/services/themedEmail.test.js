// Reminder emails in the student's colours, and the promise that theming never stops an email.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PNG } = require('pngjs');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { reminderEmail, codeEmail, iconSet } = require('./emailTemplates');
const { emailPalette } = require('./emailTheme');
const { PALETTES } = require('./theme/palettes');
const { localParts, computeDue, DEFAULT_SETTINGS } = require('../utils/reminders');

const APP = 'https://focusflow.example';
const themeOf = (id) => {
  const p = PALETTES.find((x) => x.id === id);
  return { v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id };
};
const BOLD = themeOf('electric-blue');
const DARK = themeOf('midnight');
const at = (hhmm) => localParts(new Date(`2026-10-06T${hhmm}:00+05:00`), 'Asia/Karachi');
const CLASSES = [{ scheduleId: 'cc', subjectId: 'S-CC', name: 'Compiler Construction', day: 'Tuesday', start: '13:15', end: '15:20', room: 'LR26' }];
const classReminder = () => computeDue({ now: at('12:15'), settings: DEFAULT_SETTINGS, classes: CLASSES }).find((x) => x.kind === 'class');
const quiet = async (fn) => {
  const warn = console.warn;
  console.warn = () => {};
  try { return await fn(); } finally { console.warn = warn; }
};

function checkAttachments(e) {
  const cids = e.attachments.map((a) => a.cid);
  assert.equal(new Set(cids).size, cids.length);
  for (const [, cid] of e.html.matchAll(/cid:([\w-]+)/g)) assert.ok(cids.includes(cid), cid);
  for (const a of e.attachments) {
    if (a.path) assert.ok(fs.existsSync(a.path), a.path);
    else assert.doesNotThrow(() => PNG.sync.read(a.content), a.cid);
  }
}

for (const [label, theme] of [['bold', BOLD], ['dark', DARK]]) {
  test(`${label} theme: the email uses the theme's colours and none of the default ones`, () => {
    const P = emailPalette(theme);
    const n = classReminder();
    const e = reminderEmail(n, APP, theme);
    assert.ok(e.html.includes(P.coral), 'brand colour');
    assert.ok(e.html.includes(P.canvas), 'page colour');
    assert.ok(!e.html.includes('#EC706D'));
    assert.ok(!e.html.includes('#F5EFE6'));
    assert.equal(e.subject, n.title);
    checkAttachments(e);
    // icons that need a colour the app never shipped are tinted in memory
    assert.ok(e.attachments.some((a) => Buffer.isBuffer(a.content)));
  });
}

test('the code emails can take a theme too (the preview shows them), and still attach everything', () => {
  const e = codeEmail({ purpose: 'verify', code: '4827' }, BOLD);
  assert.ok(e.html.includes(emailPalette(BOLD).coral));
  checkAttachments(e);
});

test('icons whose colour is a ready-made one still use the existing file', () => {
  const e = reminderEmail({ kind: 'exam', title: 'Exam', body: 'b', url: '/', view: { headline: 'Exam', facts: [{ icon: 'clock', label: 'Time', value: 'x' }] } }, APP, BOLD);
  const sun = e.attachments.find((a) => a.cid.endsWith('-sun'));
  assert.ok(sun.path && sun.content === undefined);
});

test('dark theme tells email apps it is dark and sets the colours as attributes', () => {
  const P = emailPalette(DARK);
  const html = reminderEmail(classReminder(), APP, DARK).html;
  assert.ok(html.includes('content="dark only"'));
  assert.ok(html.includes('content="dark"'));
  assert.ok(html.includes(`<body bgcolor="${P.canvas}"`));
  assert.ok(html.includes(`bgcolor="${P.surface}"`));
});

test('light non-default theme says light only and has no bgcolor attributes', () => {
  const html = reminderEmail(classReminder(), APP, BOLD).html;
  assert.ok(html.includes('content="light only"'));
  assert.ok(!html.includes('bgcolor'));
});

test('a tint failure inside an email gives the nearest ready-made icon, not an error', () => {
  const P = emailPalette(BOLD);
  const ic = iconSet('email', { ...P, icons: { ...P.icons, coral: '#XYZ' } });
  ic.img('bell', 'coral', 20);
  let list;
  assert.doesNotThrow(() => { list = ic.attachments(); });
  assert.equal(list.length, 1);
  assert.equal(list[0].cid, 'ffi-bell-coral');
  assert.ok(fs.existsSync(list[0].path));
});

test('web icons take the palette colour', () => {
  const P = emailPalette(BOLD);
  assert.ok(iconSet('web', P).img('bell', 'coral', 20).includes(`stroke="${P.icons.coral}"`));
  assert.ok(iconSet('web').img('bell', 'coral', 20).includes('stroke="#EC706D"'));
});

test('unknown icons are still a programming error', () => {
  assert.throws(() => iconSet('email', emailPalette(BOLD)).img('no-such-icon', 'coral', 20));
});

// ---- deliver(): the theme is looked up per student and can never stop the email --------------------------
const queued = [];
const queuePath = require.resolve('./emailQueueService');
require.cache[queuePath] = {
  id: queuePath, filename: queuePath, loaded: true,
  exports: { sendBulkEmailQueued: async (to, subject, html, text, attachments) => { queued.push({ to, subject, html, text, attachments }); return true; }, codeEmail: () => null },
};
const { deliver } = require('./notifyChannels');
const user = { userId: 'user-9', email: 'a@example.com' };
const settings = { emailEnabled: true };

test('deliver sends the email in the saved theme, looked up with the student id', async () => {
  queued.length = 0;
  const calls = [];
  const connection = { execute: async (sql, binds) => { calls.push(binds); return { rows: [{ DATA: JSON.stringify({ theme: BOLD }) }] }; } };
  const result = await deliver(connection, user, settings, classReminder());
  assert.deepEqual(result.email, { queued: true });
  assert.deepEqual(calls, [{ userId: 'user-9' }]);
  assert.ok(queued[0].html.includes(emailPalette(BOLD).coral));
});

test('deliver still sends the normal email when the lookup fails, the table is missing or the data is junk', async () => {
  for (const connection of [
    { execute: async () => { throw new Error('relation "user_preferences" does not exist'); } },
    { execute: async () => ({ rows: [{ DATA: '{not json' }] }) },
    { execute: async () => ({ rows: [{ DATA: JSON.stringify({ theme: { brand: 'red' } }) }] }) },
    { execute: async () => ({ rows: [] }) },
  ]) {
    queued.length = 0;
    const result = await quiet(() => deliver(connection, user, settings, classReminder()));
    assert.deepEqual(result.email, { queued: true });
    assert.ok(queued[0].html.includes('#EC706D'));
  }
});

test('the sample themes used by the preview and test-email scripts are valid, and only the default is empty', () => {
  const samples = require('../scripts/sampleThemes');
  const { themeOk } = require('../utils/preferences');
  assert.deepEqual(Object.keys(samples), ['default', 'bold', 'dark']);
  assert.equal(samples.default, null);
  assert.ok(themeOk(samples.bold) && themeOk(samples.dark));
  assert.notEqual(emailPalette(samples.bold), emailPalette(null));
  assert.equal(emailPalette(samples.dark).dark, true);
});
