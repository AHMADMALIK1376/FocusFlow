// Adversarial checks on every email the module can build, across all 24 ready-made palettes and 200
// seeded random themes: no default colours leaking, inline styles, readable text, sane HTML, no junk text.
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { reminderEmail, codeEmail, KINDS } = require('./emailTemplates');
const { emailPalette, DEFAULT_PALETTE, contrastFailures } = require('./emailTheme');
const { PALETTES } = require('./theme/palettes');
const { hexToRgb, contrastRatio } = require('./theme/color');

const APP = 'https://focusflow.example';
const asTheme = (p) => ({ v: 1, background: p.background, brand: p.brand, accent: p.accent, text: p.text, presetId: p.id });

let seed = 20261008;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const hex = () => `#${Math.floor(rnd() * 0x1000000).toString(16).padStart(6, '0').toUpperCase()}`;
const randomThemes = Array.from({ length: 200 }, () => ({
  v: 1, background: hex(), brand: hex(), accent: hex(), text: rnd() < 0.5 ? 'auto' : hex(), presetId: 'random',
}));
const THEMES = [...PALETTES.map(asTheme), ...randomThemes];

const VIEW = {
  headline: 'Compiler Construction at 13:15',
  sub: 'Room LR26, starts in one hour',
  facts: [{ icon: 'clock', label: 'Time', value: '13:15 to 15:20' }, { icon: 'map-pin', label: 'Room', value: 'LR26' }],
  classes: [{ start: '09:00', end: '10:30', name: 'Databases', room: 'B4' }, { start: '11:00', name: 'Networks' }],
  deadlines: [{ title: 'OS assignment', type: 'Assignment', when: 'Today', time: '23:59', icon: 'send' }, { title: 'Midterm', type: 'Exam', when: 'Tomorrow' }],
  routines: [{ time: '07:00', name: 'Revise' }],
  rows: [{ name: 'Databases', attended: 20, total: 24, pct: 83 }, { name: 'Networks', attended: 9, total: 20, pct: 45 }],
  overall: 70, attended: 29, total: 44,
  justMarked: { status: 'Absent', subjectName: 'Networks' },
};
const ACTIONS = [
  { label: 'Yes, I went', url: `${APP}/a?x=1&y=2`, tone: 'sage' },
  { label: 'Later', url: `${APP}/b`, tone: 'sun' },
  { label: 'No', url: `${APP}/c`, tone: 'coral' },
  { label: 'Open', url: `${APP}/d`, tone: 'plain' },
];

function emailsFor(theme) {
  const out = [];
  for (const kind of Object.keys(KINDS)) {
    out.push([`reminder:${kind}`, reminderEmail({ kind, title: `Title ${kind}`, body: 'Body line one\nline two', url: '/x', actions: ACTIONS, view: VIEW }, APP, theme)]);
    out.push([`reminder-plain:${kind}`, reminderEmail({ kind, title: `Title ${kind}`, body: 'Just text', url: '/x' }, APP, theme)]);
  }
  out.push(['digest-empty', reminderEmail({ kind: 'digest', title: 'Your day', url: '/', view: { classes: [] , deadlines: [{ title: 'T', type: 'Exam', when: 'Today' }] } }, APP, theme)]);
  out.push(['report-good', reminderEmail({ kind: 'report', title: 'Report', url: '/', view: { rows: [{ name: 'A', attended: 9, total: 10, pct: 90 }], overall: 90, attended: 9, total: 10 } }, APP, theme)]);
  out.push(['code-verify', codeEmail({ purpose: 'verify', code: '482913' }, theme)]);
  out.push(['code-reset', codeEmail({ purpose: 'reset', code: '000111' }, theme)]);
  return out;
}

// ---- tiny HTML reader: tags, nesting, inline styles --------------------------------------------
const VOID = new Set(['meta', 'link', 'img', 'br', 'hr', 'input']);
function walk(html) {
  const body = html.replace(/<!doctype[^>]*>/i, '');
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)/g;
  const stack = [];
  const texts = []; // { text, chain: [attrs...] }
  let m;
  while ((m = re.exec(body))) {
    if (m[2]) {
      const name = m[2].toLowerCase();
      if (m[1]) {
        const top = stack.pop();
        assert.ok(top && top.name === name, `unbalanced </${name}> (open: ${top && top.name})`);
      } else if (!VOID.has(name) && !m[3].trim().endsWith('/')) {
        stack.push({ name, attrs: m[3] });
      }
    } else if (m[4].trim()) {
      texts.push({ text: m[4], chain: stack.map((s) => s.attrs) });
    }
  }
  assert.equal(stack.length, 0, `unclosed: ${stack.map((s) => s.name).join(',')}`);
  return texts;
}
const styleOf = (attrs) => ((/style="([^"]*)"/.exec(attrs) || [])[1] || '');
const prop = (style, name) => {
  const m = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*(#[0-9a-fA-F]{6})\\b`).exec(style);
  return m && m[1];
};
const hidden = (style) => /display:none/.test(style);

let pairsChecked = 0;
function readability(html, P) {
  const bad = [];
  for (const { text, chain } of walk(html)) {
    if (text.length > 4000) continue;
    if (chain.some((a) => hidden(styleOf(a)))) continue; // preheader
    let fg = null;
    let bg = null;
    for (let i = chain.length - 1; i >= 0 && !(fg && bg); i -= 1) {
      const s = styleOf(chain[i]);
      if (!fg) fg = prop(s, 'color');
      if (!bg) bg = prop(s, 'background-color') || prop(s, 'background');
    }
    if (!fg || !bg) continue;
    const lenient = [P.coralText, P.success, P.danger].map((c) => c.toUpperCase()).includes(fg.toUpperCase());
    const min = lenient ? 3 : 4.5;
    pairsChecked += 1;
    const r = contrastRatio(hexToRgb(fg), hexToRgb(bg));
    if (r < min) bad.push(`"${text.trim().slice(0, 30)}" ${fg} on ${bg} = ${r.toFixed(2)} < ${min}`);
  }
  return bad;
}

// pictograph blocks, not the plain copyright sign the footer has always had (it is text, not an emoji)
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]|\p{Emoji_Presentation}/u;
const JUNK = /undefined|NaN|\[object Object\]|\bnull\b/;

// Default literals that must not appear in a themed email (sun colours stay default on purpose).
const DEFAULT_FAMILY = ['canvas', 'surface', 'well', 'edge', 'track', 'ink', 'muted', 'coral', 'coralTop', 'coralText', 'sage', 'sageTop',
  'sageWash', 'onSage', 'sageChipInk', 'sageDeep', 'blush', 'blushTop', 'coralChipInk', 'success', 'danger'];

test('every email, for 24 palettes and 200 random themes, is themed, readable, inline, balanced and clean', () => {
  let checked = 0;
  for (const theme of THEMES) {
    const P = emailPalette(theme);
    const label = JSON.stringify(theme);
    if (P === DEFAULT_PALETTE) continue;
    assert.deepEqual(contrastFailures(P), [], label);
    const own = new Set(Object.values(P).filter((v) => typeof v === 'string').map((v) => v.toUpperCase()));
    for (const [what, e] of emailsFor(theme)) {
      const ctx = `${label} ${what}`;
      checked += 1;
      // leaks of the default look
      for (const f of DEFAULT_FAMILY) {
        const lit = DEFAULT_PALETTE[f].toUpperCase();
        if (own.has(lit)) continue;
        assert.ok(!e.html.toUpperCase().includes(lit), `${ctx}: default ${f} ${lit} leaked`);
      }
      // the only coral glow left is the logo's
      const glowless = e.html.split('0 14px 26px -12px rgba(236,112,109,0.50),inset 0 6px 10px rgba(255,255,255,0.38),inset 0 -6px 12px rgba(255,190,185,0.35)').join('');
      if (P.coral.toUpperCase() !== DEFAULT_PALETTE.coral) assert.ok(!/rgba\(236,112,109/.test(glowless), `${ctx}: default coral glow`);
      // only inline styles: the one known media-query block has no colours; the one external sheet is the font
      const styleBlocks = [...e.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((s) => s[1]);
      assert.equal(styleBlocks.length, 1, ctx);
      assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb|hsl/.test(styleBlocks[0]), `${ctx}: colour in <style>`);
      const links = [...e.html.matchAll(/<link\b[^>]*>/g)].map((l) => l[0]);
      assert.ok(links.every((l) => l.includes('https://fonts.googleapis.com/')), ctx);
      assert.ok(!/<script|@import|url\(/i.test(e.html), ctx);
      // dark themes carry bgcolor and the scheme meta; light ones do not
      assert.equal(/bgcolor=/.test(e.html), P.dark, ctx);
      assert.ok(e.html.includes(P.dark ? 'content="dark only"' : 'content="light only"'), ctx);
      // text readable on its backdrop; balanced tags
      assert.deepEqual(readability(e.html, P), [], ctx);
      // clean strings, no emoji
      for (const s of [e.html, e.text, e.subject]) {
        assert.doesNotMatch(s, JUNK, ctx);
        assert.doesNotMatch(s, EMOJI, ctx);
      }
      // every cid used has an attachment
      const cids = e.attachments.map((a) => a.cid);
      for (const [, cid] of e.html.matchAll(/cid:([\w-]+)/g)) assert.ok(cids.includes(cid), `${ctx}: ${cid}`);
    }
  }
  assert.ok(checked > 224 * 20, `only ${checked} emails checked`);
  assert.ok(pairsChecked > checked * 8, `only ${pairsChecked} text/backdrop pairs checked`);
});

test('the default look is also free of junk, emoji and unbalanced tags', () => {
  for (const [what, e] of emailsFor(null)) {
    walk(e.html);
    for (const s of [e.html, e.text, e.subject]) {
      assert.doesNotMatch(s, JUNK, what);
      assert.doesNotMatch(s, EMOJI, what);
    }
  }
});

test('the checker itself notices low contrast and a missing close tag', () => {
  assert.ok(readability('<div style="background-color:#FFFFFF;"><p style="color:#EEEEEE;">faint</p></div>', DEFAULT_PALETTE).length === 1);
  assert.throws(() => walk('<div><p>x</div>'));
  assert.throws(() => walk('<div>'));
});

test('user text with markup is escaped, so a hostile subject cannot add tags', () => {
  const evil = '"><script>alert(1)</script><img src=x onerror=alert(1)>';
  const e = reminderEmail({ kind: 'class', title: evil, body: evil, url: '/', view: { headline: evil, sub: evil, facts: [{ icon: 'clock', label: evil, value: evil }] } }, APP, THEMES[30]);
  assert.ok(!e.html.includes('<script'));
  assert.ok(!/<img src=x/.test(e.html));
  walk(e.html);
});
