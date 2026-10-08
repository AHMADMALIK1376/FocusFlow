// The answer pages (opened from reminder emails, notifications and WhatsApp) wear the student's theme,
// and theming can never stop a page from showing or an answer from saving.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { db, reset, TOKENS, get, post } = require('./notifyPages.helpers');

// Lets a test swap in a loader that throws; by default the real one runs.
const emailTheme = require('../services/emailTheme');
const realLoader = emailTheme.loadUserTheme;
let loader = realLoader;
emailTheme.loadUserTheme = (...args) => loader(...args);
const notify = require('./notifyController');

const { PALETTES } = require('../services/theme/palettes');
const { hexToRgb, contrastRatio } = require('../services/theme/color');
const { DEFAULT_PALETTE, emailPalette } = emailTheme;

const themeOf = (id) => {
  const p = PALETTES.find((x) => x.id === id);
  return { v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id };
};
const THEMES = { bold: 'electric-blue', dark: 'midnight', 'light-soft': 'matcha-latte' };
const store = (id) => { db.themeData = JSON.stringify({ theme: themeOf(id) }); };

beforeEach(() => { reset(); loader = realLoader; });

// Colours that belong to the default coral look only (the yellow "sun" colours are shared by every theme).
const DEFAULT_ONLY = ['#EC706D', '#F58C89', '#F5EFE6', '#FFFDF9', '#FAF4EB', '#342E3E', '#80746C', '#FFE2DE', '#FFECE9', '#B8403D', '#CEEAD6', '#B8DCC4', '#284634', '#E2F2E7', '#2F6B47', 'rgba(190,160,122', 'rgba(236,112,109', 'rgba(232,214,190', 'rgba(214,192,162'];
const leaks = (html) => DEFAULT_ONLY.filter((c) => html.toUpperCase().includes(c.toUpperCase()));
const themeCalls = () => db.calls.filter((c) => c.sql && /USER_PREFERENCES/.test(c.sql));

for (const [name, id] of Object.entries(THEMES)) {
  test(`${name} theme: every GET page is in the theme, with no default coral left`, async () => {
    const P = emailPalette(themeOf(id));
    assert.notEqual(P, DEFAULT_PALETTE);
    for (const [label, query] of [['att', { t: TOKENS.att, a: 'present' }], ['sub', { t: TOKENS.sub }], ['quiz', { t: TOKENS.quiz }], ['picker', { t: TOKENS.quizNoSubject }]]) {
      store(id);
      const res = await get(notify, query);
      assert.equal(res.statusCode, 200, label);
      const html = res.sent;
      assert.deepEqual(leaks(html), [], `${label}: default colours leaked`);
      for (const c of [P.canvas, P.surface, P.coral, P.ink, P.muted, P.well, P.sage, P.onSage, P.coralChipInk]) assert.ok(html.toUpperCase().includes(c.toUpperCase()), `${label}: ${c}`);
      assert.ok(html.includes(`<meta name="theme-color" content="${P.coral}">`), `${label}: theme-color`);
      assert.equal(html.includes('color-scheme:dark'), P.dark, `${label}: color-scheme`);
    }
  });

  test(`${name} theme: the confirmation and error pages are in the theme and the answer is saved first`, async () => {
    const P = emailPalette(themeOf(id));
    for (const body of [
      { t: TOKENS.att, a: 'present' }, { t: TOKENS.att, a: 'absent' }, { t: TOKENS.sub, a: 'yes' }, { t: TOKENS.sub, a: 'no' },
      { t: TOKENS.quiz, a: 'save', score: '9', max: '10' }, { t: TOKENS.quiz, a: 'skip' }, { t: TOKENS.att, a: 'maybe' }, { t: TOKENS.quiz, a: 'save', score: '', max: '10' },
    ]) {
      reset();
      store(id);
      const res = await post(notify, body);
      const html = res.sent;
      assert.ok([200, 400].includes(res.statusCode));
      assert.deepEqual(leaks(html), [], `${JSON.stringify(body)}: default colours leaked`);
      assert.ok(html.toUpperCase().includes(P.canvas.toUpperCase()));
      assert.equal(html.includes('color-scheme:dark'), P.dark);
      // the theme is read after the save, never before
      const writeAt = db.calls.findIndex((c) => c.sql && /^\s*(INSERT|UPDATE)/i.test(c.sql));
      const themeAt = db.calls.findIndex((c) => c.sql && /USER_PREFERENCES/.test(c.sql));
      if (writeAt >= 0) assert.ok(writeAt < themeAt, 'saved before the theme was read');
      assert.equal(db.calls.filter((c) => c.opened).length, 1);
      assert.equal(db.calls.filter((c) => c.closed).length, 1);
    }
  });
}

test('the theme is read for the user named in the signed link, with a bound query', async () => {
  store('midnight');
  await get(notify, { t: TOKENS.att });
  const calls = themeCalls();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, { userId: 'u1' });
  assert.ok(!calls[0].sql.includes('u1'));
  assert.equal(db.calls.filter((c) => c.closed).length, 1);
});

test('the expired and invalid link pages have no user: default look, no database used', async () => {
  const before = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '__fixtures__', 'answer-pages-default.json'), 'utf8'));
  store('midnight');
  const res = await get(notify, { t: 'nope' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.sent, before.expired.html);
  const posted = await post(notify, { t: 'nope', a: 'present' });
  assert.equal(posted.sent, before['sorry-expired'].html);
  assert.equal(db.calls.length, 0);
});

// Every way theming can go wrong gives the plain default page, status 200, and still saves.
const BROKEN = {
  'the theme loader throws': () => { loader = async () => { throw new Error('boom'); }; },
  'the theme loader returns undefined': () => { loader = async () => undefined; },
  'the theme query fails': () => { db.themeThrows = true; },
  'the stored theme is not JSON': () => { db.themeData = '{nope'; },
  'the stored theme is malformed': () => { db.themeData = JSON.stringify({ theme: { v: 1, brand: 'not a colour', background: 5 } }); },
  'the stored theme is not an object': () => { db.themeData = JSON.stringify({ theme: 'midnight' }); },
  'the stored data is huge': () => { db.themeData = JSON.stringify({ theme: themeOf('midnight'), junk: 'x'.repeat(400000) }); },
  'there is no stored theme': () => { db.themeData = undefined; },
};
for (const [what, breakIt] of Object.entries(BROKEN)) {
  test(`${what}: the default look, the page still shows and the answer still saves`, async () => {
    const want = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '__fixtures__', 'answer-pages-default.json'), 'utf8'));
    breakIt();
    const shown = await get(notify, { t: TOKENS.att, a: 'present' });
    assert.equal(shown.statusCode, 200);
    assert.equal(shown.sent, want['att-picked-present'].html);
    reset(); breakIt();
    const saved = await post(notify, { t: TOKENS.att, a: 'present' });
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.sent, want['done-att-present'].html);
    assert.ok(db.calls.some((c) => c.sql && /INSERT INTO SUBJECT_ATTENDANCE/.test(c.sql)), 'answer saved');
    assert.equal(db.calls.filter((c) => c.closed).length, 1);
  });
}

test('no database for the GET page: the default look, status 200', async () => {
  const want = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '__fixtures__', 'answer-pages-default.json'), 'utf8'));
  db.connectFails = true;
  for (const [key, query] of [['att', { t: TOKENS.att }], ['sub', { t: TOKENS.sub }], ['quiz', { t: TOKENS.quiz }]]) {
    const res = await get(notify, query);
    assert.equal(res.statusCode, 200);
    assert.equal(res.sent, want[key].html);
  }
});

test('no database for the POST: the answer cannot be saved and says so, in the default look', async () => {
  const want = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '__fixtures__', 'answer-pages-default.json'), 'utf8'));
  db.connectFails = true;
  const res = await post(notify, { t: TOKENS.att, a: 'present' });
  assert.equal(res.statusCode, 500);
  assert.ok(res.sent.includes('Could not save your answer'));
  assert.equal(res.sent, want['sorry-att-bad-answer'].html.replace(/Choose Attended or Missed\./, 'Could not save your answer. Please try again.'));
});

test('a link with no user claim gets the default look and never touches the theme', async () => {
  const want = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '__fixtures__', 'answer-pages-default.json'), 'utf8'));
  store('midnight');
  const res = await get(notify, { t: TOKENS.attNoUser });
  assert.equal(res.statusCode, 200);
  assert.ok(res.sent.includes('Did you attend Compiler?'));
  assert.ok(!res.sent.includes('color-scheme'));
  assert.equal(themeCalls().length, 0);
  const posted = await post(notify, { t: TOKENS.attNoUser, a: 'present' });
  assert.equal(posted.statusCode, 200);
  assert.equal(themeCalls().length, 0);
  assert.ok(want.att);
});

test('themed pages keep escaping, inline CSS only, and the same fonts link as before', async () => {
  store('midnight');
  const html = (await get(notify, { t: TOKENS.att })).sent;
  assert.ok(html.includes('Compiler &lt;b&gt;'));
  assert.ok(!html.includes('<b>'));
  assert.ok(html.includes('<style>'));
  assert.equal((html.match(/<link /g) || []).length, 2); // the icon and the Google Fonts link, as ever
  assert.ok(!/<script|@import/.test(html));
  reset(); store('midnight');
  const sub = (await post(notify, { t: TOKENS.sub, a: 'no' })).sent;
  assert.ok(sub.includes('Parser &quot;project&quot;'));
  assert.ok(!sub.includes('Parser "project"'));
});

test('the default stays the default: no theme means no dark scheme and the plain coral palette', async () => {
  const html = (await get(notify, { t: TOKENS.att })).sent;
  assert.ok(!html.includes('color-scheme'));
  assert.ok(html.includes('#EC706D') && html.includes('#F5EFE6'));
});

// Text and outlines on the page, checked for all 24 ready-made palettes.
const ratio = (P, a, b) => contrastRatio(hexToRgb(P[a]), hexToRgb(P[b]));
const TEXT_PAIRS = [
  ['ink', 'well'], // typed text in the inputs, and the "Missed" / "Skip" button labels
  ['ink', 'surface'], ['ink', 'canvas'],
  ['muted', 'surface'], // paragraphs, hint, field labels
  ['muted', 'canvas'], // the footer line
  ['coralText', 'surface'], // the "Open FocusFlow" link
  ['onCoral', 'coral'], ['onSage', 'sage'], ['onSage', 'sageTop'], ['onSun', 'sun'], ['onSun', 'sunTop'], // button labels
  ['coralChipInk', 'blush'], ['coralChipInk', 'blushTop'], ['sageChipInk', 'sageWash'], ['sunChipInk', 'sunChip'], // chips and tiles
];
const OUTLINE_PAIRS = [
  ['coralText', 'surface'], // picked answer outline and the focus ring, against the card
  ['coralText', 'well'], // the focus ring around an input
  ['coralText', 'canvas'], // the FocusFlow wordmark (large bold text)
  ['coralChipInk', 'well'], // the "Missed" icon on its plain button
];
test('page text and outlines are readable on all 24 ready-made palettes', () => {
  assert.equal(PALETTES.length, 24);
  for (const p of PALETTES) {
    const P = emailPalette(themeOf(p.id));
    for (const [a, b] of TEXT_PAIRS) assert.ok(ratio(P, a, b) >= 4.5, `${p.id}: ${a} on ${b} = ${ratio(P, a, b).toFixed(2)}`);
    for (const [a, b] of OUTLINE_PAIRS) assert.ok(ratio(P, a, b) >= 3, `${p.id}: ${a} on ${b} = ${ratio(P, a, b).toFixed(2)}`);
  }
});

// An unreachable or slow database must not hold the question page back (it needs no database).
test('GET: a failing connection gives the default-look page straight away, after a single try', async () => {
  db.connectFails = true;
  const res = await get(notify, { t: TOKENS.att });
  assert.equal(res.statusCode, 200);
  assert.ok(res.sent.includes('Did you attend'));
  assert.ok(res.sent.includes('#EC706D'));
  assert.deepEqual(db.connectArgs, [[1, 0]], 'one try, no pause between tries');
});

test('GET: a connection that is too slow gives the default look after the wait, and is closed when it does arrive', async () => {
  const { mock } = require('node:test');
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let open;
    db.connectGate = new Promise((resolve) => { open = resolve; });
    store('midnight');
    const pending = get(notify, { t: TOKENS.att });
    await new Promise((resolve) => setImmediate(resolve));
    mock.timers.tick(1500);
    const res = await pending;
    assert.equal(res.statusCode, 200);
    assert.ok(res.sent.includes('#EC706D'), 'default look, not the stored theme');
    open();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(db.calls.filter((c) => c.opened).length, 1);
    assert.equal(db.calls.filter((c) => c.closed).length, 1, 'the late connection is closed');
  } finally {
    mock.timers.reset();
  }
});
