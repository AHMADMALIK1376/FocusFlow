// Clay-style emails in the app's own colours (frontend/src/design/tokens.css):
// mocha-crème page, warm-white clay cards, coral / sage / sunshine accents,
// soft warm shadows with a white top highlight — never dark shading.
// Icons are the app's own lucide line icons (as in the nav bar), never emoji.
//
// Pure functions (no network, no DB) so every template is unit-testable.
// Email clients are picky: tables for layout, inline styles only, and every
// effect (gradients, shadows, web fonts) degrades to a plain colour.
const path = require('path');
const { DEFAULT_PALETTE, emailPalette, shadowsFor } = require('./emailTheme');
const { iconAttachment } = require('./emailIcons');

// Colours come from a palette (services/emailTheme.js): the student's theme, or DEFAULT_PALETTE.
// A palette that cannot be built never stops an email: the default look is used instead.
const paletteOf = (theme) => {
  try {
    return emailPalette(theme);
  } catch (err) {
    console.warn('Email theme: default look used (' + (err && err.message) + ')');
    return DEFAULT_PALETTE;
  }
};
const shadowCache = new WeakMap();
const shadows = (P) => {
  if (!shadowCache.has(P)) shadowCache.set(P, shadowsFor(P));
  return shadowCache.get(P);
};

const FONT = "'Poppins','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "'Fredoka','Arial Rounded MT Bold','Nunito','Poppins','Segoe UI',Arial,sans-serif";

// Clay colourways: tile gradient, the icon colour on that tile, a soft chip.
function tones(P, S) {
  return {
    coral: { tile: [P.coralTop, P.coral], iconTone: 'white', chip: P.blush, chipInk: P.coralChipInk, glow: S.coral },
    sage: { tile: [P.sageTop, P.sage], iconTone: 'sage', chip: P.sageWash, chipInk: P.sageChipInk, glow: S.small },
    sun: { tile: [P.sunTop, P.sun], iconTone: 'sun', chip: P.sunChip, chipInk: P.sunChipInk, glow: S.small },
    blush: { tile: [P.blushTop, P.blush], iconTone: 'blush', chip: P.blush, chipInk: P.coralChipInk, glow: S.small },
  };
}

// Every kind of message has its own face — icons match the app's nav bar.
const KINDS = {
  class: { icon: 'graduation-cap', eyebrow: 'Class reminder', tone: 'coral' },
  attendance: { icon: 'user-check', eyebrow: 'Attendance check', tone: 'sage' },
  exam: { icon: 'calendar-clock', eyebrow: 'Exam ahead', tone: 'sun' },
  submit: { icon: 'send', eyebrow: 'Hand-in check', tone: 'blush' },
  quiz: { icon: 'award', eyebrow: 'Marks time', tone: 'sage' },
  routine: { icon: 'clock', eyebrow: 'Daily routine', tone: 'sage' },
  digest: { icon: 'sun', eyebrow: 'Your day', tone: 'sun' },
  report: { icon: 'chart-column', eyebrow: 'Attendance report', tone: 'sage' },
  test: { icon: 'bell', eyebrow: 'Test reminder', tone: 'coral' },
  verify: { icon: 'shield-check', eyebrow: 'Verify your email', tone: 'coral' },
  reset: { icon: 'key-round', eyebrow: 'Password reset', tone: 'sun' },
};
const kindOf = (k) => KINDS[k] || KINDS.test;

const ASSETS = path.join(__dirname, '..', 'assets');
const ICON_MANIFEST = require('../assets/icons/manifest.json');
const ICON_SVG = require('../assets/icons/icons.json');
const LOGO_CID = 'ff-logo';
const LOGO_GLOW = shadowsFor(DEFAULT_PALETTE).coral; // the logo image is the coral app icon, whatever the theme
const LOGO_ATTACHMENT = { filename: 'focusflow.png', path: path.join(ASSETS, 'logo.png'), cid: LOGO_CID };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const grad = ([top, base]) => `background-color:${base};background-image:linear-gradient(160deg,${top},${base});`;

// Icons for one message. Emails embed small PNGs by cid (email apps can't show
// SVG); web pages get inline SVG. tone: white | coral | sage | sun | blush.
function iconSet(mode = 'email', P = DEFAULT_PALETTE) {
  const used = new Map();
  return {
    img(name, tone, size) {
      if (!ICON_SVG[name] || !ICON_MANIFEST.tones[tone]) throw new Error(`Unknown icon ${name}/${tone} — add it to assets/icons/manifest.json`);
      if (mode === 'web') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${P.icons[tone]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">${ICON_SVG[name]}</svg>`;
      }
      const cid = `ffi-${name}-${tone}`;
      if (!used.has(cid)) used.set(cid, { name, tone, cid });
      return `<img src="cid:${cid}" width="${size}" height="${size}" alt="" style="display:block;border:0;width:${size}px;height:${size}px;">`;
    },
    // A ready-made colour attaches its file; any other is tinted (or falls back to the nearest file).
    attachments: () => [...used.values()].map(({ name, tone, cid }) => ({ ...iconAttachment(name, tone, P.icons[tone]), cid })),
  };
}

// ── building blocks ───────────────────────────────────────────────────────

function chip(P, text, tone = 'coral') {
  const t = tones(P, shadows(P))[tone];
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${t.chip};color:${t.chipInk};font:700 11px/1.2 ${FONT};letter-spacing:0.08em;text-transform:uppercase;">${esc(text)}</span>`;
}

function iconTile(P, ic, name, tone, size = 64) {
  const t = tones(P, shadows(P))[tone];
  const inner = Math.round(size * 0.46);
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.34)}px;${grad(t.tile)}box-shadow:${t.glow};">${ic.img(name, t.iconTone, inner)}</td></tr></table>`;
}

// Icon + text on one line, aligned the same in every email app.
function withIcon(ic, name, tone, size, html) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="middle" style="padding-right:8px;">${ic.img(name, tone, size)}</td><td valign="middle">${html}</td></tr></table>`;
}

// tone: coral (main action), sage (yes / good), sun (later), plain (secondary)
function button(P, label, url, tone = 'coral') {
  const S = shadows(P);
  const look = {
    coral: `${grad([P.coralTop, P.coral])}color:${P.onCoral};box-shadow:${S.coral};`,
    sage: `${grad([P.sageTop, P.sage])}color:${P.onSage};box-shadow:${S.small};`,
    sun: `${grad([P.sunTop, P.sun])}color:${P.onSun};box-shadow:${S.small};`,
    plain: `background-color:${P.well};color:${P.ink};box-shadow:${S.small};`,
  }[tone] || '';
  return `<a href="${esc(url)}" style="display:inline-block;margin:0 10px 12px 0;padding:14px 26px;border-radius:999px;${look}font:700 15px/1.2 ${FONT};text-decoration:none;">${esc(label)}</a>`;
}

function hero(P, ic, { kind, headline, sub }) {
  const k = kindOf(kind);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="76" valign="top" style="padding:0 14px 0 0;">${iconTile(P, ic, k.icon, k.tone)}</td>
    <td valign="middle">
      ${chip(P, k.eyebrow, k.tone)}
      <h1 style="margin:10px 0 0;font:700 24px/1.25 ${DISPLAY};color:${P.ink};">${esc(headline)}</h1>
      ${sub ? `<p style="margin:6px 0 0;font:500 15px/1.5 ${FONT};color:${P.muted};">${esc(sub)}</p>` : ''}
    </td></tr></table>`;
}

// [{icon (lucide name), label, value}] → soft "pressed-in" clay wells.
function facts(P, ic, list) {
  const S = shadows(P);
  const rows = (list || []).filter((f) => f && f.value);
  if (!rows.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:separate;border-spacing:0 10px;">
    ${rows.map((f) => `<tr><td style="background-color:${P.well};border-radius:20px;box-shadow:${S.well};padding:12px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" valign="middle">${ic.img(f.icon && ICON_SVG[f.icon] ? f.icon : 'check', 'coral', 20)}</td>
        <td valign="middle"><div style="font:700 11px/1.3 ${FONT};letter-spacing:0.08em;text-transform:uppercase;color:${P.muted};">${esc(f.label)}</div>
          <div style="font:700 16px/1.4 ${FONT};color:${P.ink};">${esc(f.value)}</div></td>
      </tr></table></td></tr>`).join('')}
  </table>`;
}

function textBlock(P, body) {
  if (!body) return '';
  const S = shadows(P);
  return `<div style="margin-top:22px;background-color:${P.well};border-radius:20px;box-shadow:${S.well};padding:16px 18px;font:500 15px/1.65 ${FONT};color:${P.ink};white-space:pre-wrap;">${esc(body)}</div>`;
}

function sectionTitle(P, text, count) {
  return `<p style="margin:26px 0 8px;font:700 13px/1.3 ${FONT};letter-spacing:0.08em;text-transform:uppercase;color:${P.muted};">${esc(text)}${count != null ? ` <span style="display:inline-block;margin-left:6px;padding:2px 9px;border-radius:999px;background:${P.blush};color:${P.coralChipInk};letter-spacing:0;">${count}</span>` : ''}</p>`;
}

// Morning digest: today's classes as a timeline, then what's due, then routine.
function digestBody(P, ic, v) {
  const S = shadows(P);
  let html = '';
  if (v.classes && v.classes.length) {
    html += sectionTitle(P, "Today's classes", v.classes.length);
    html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px;">
      ${v.classes.map((c) => `<tr>
        <td width="92" valign="top" style="padding:12px 10px 0 0;">
          <div style="font:700 15px/1.2 ${FONT};color:${P.coralText};">${esc(c.start)}</div>
          ${c.end ? `<div style="font:500 12px/1.4 ${FONT};color:${P.muted};">to ${esc(c.end)}</div>` : ''}
        </td>
        <td style="background-color:${P.well};border-radius:20px;box-shadow:${S.well};padding:12px 16px;">
          <div style="font:700 16px/1.35 ${FONT};color:${P.ink};">${esc(c.name)}</div>
          ${c.room ? `<div style="padding-top:4px;">${withIcon(ic, 'map-pin', 'coral', 14, `<span style="font:500 13px/1.4 ${FONT};color:${P.muted};">${esc(c.room)}</span>`)}</div>` : ''}
        </td></tr>`).join('')}
    </table>`;
  } else {
    html += `<div style="margin-top:22px;${grad([P.sageTop, P.sageWash])}border-radius:20px;box-shadow:${S.small};padding:16px 18px;">${withIcon(ic, 'sun', 'sage', 22, `<span style="font:600 15px/1.5 ${FONT};color:${P.onSage};">No classes today — enjoy the breathing room.</span>`)}</div>`;
  }
  if (v.deadlines && v.deadlines.length) {
    html += sectionTitle(P, 'Coming up', v.deadlines.length);
    html += v.deadlines.map((d) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
      <td style="background-color:${P.surface};border:1px solid ${P.edge};border-radius:20px;box-shadow:${S.small};padding:12px 16px;">
        ${withIcon(ic, d.icon && ICON_SVG[d.icon] ? d.icon : 'calendar-clock', 'coral', 18, `<span style="font:700 15px/1.4 ${FONT};color:${P.ink};">${esc(d.title)}</span>`)}
        <div style="padding-top:6px;"><span style="font:500 13px/1.6 ${FONT};color:${P.muted};">${esc(d.type)} · </span>${chip(P, d.when === 'Today' ? `Today${d.time ? ` ${d.time}` : ''}` : `Tomorrow${d.time ? ` ${d.time}` : ''}`, d.when === 'Today' ? 'coral' : 'sun')}</div>
      </td></tr></table>`).join('');
  }
  if (v.routines && v.routines.length) {
    html += sectionTitle(P, 'Routine');
    html += `<div>${v.routines.map((r) => `<span style="display:inline-block;margin:0 8px 8px 0;padding:9px 14px;border-radius:999px;${grad([P.sageTop, P.sage])}box-shadow:${S.small};">${withIcon(ic, 'clock', 'sage', 14, `<span style="font:600 13px/1.2 ${FONT};color:${P.onSage};">${esc(r.time)} · ${esc(r.name)}</span>`)}</span>`).join('')}</div>`;
  }
  return html;
}

// Attendance report: overall score, then a soft progress bar per subject.
// `ic` defaults to web icons so answer pages can reuse it.
function reportBody(v, ic = iconSet('web'), P = DEFAULT_PALETTE) {
  const S = shadows(P);
  const good = (p) => p >= 75;
  let html = '';
  if (v.justMarked) {
    const present = v.justMarked.status !== 'Absent';
    html += `<div style="margin-top:22px;${grad(present ? [P.sageTop, P.sageWash] : [P.blushTop, P.blush])}border-radius:20px;box-shadow:${S.small};padding:14px 18px;">${withIcon(ic, present ? 'circle-check' : 'circle-x', present ? 'sage' : 'blush', 20,
      `<span style="font:600 15px/1.5 ${FONT};color:${present ? P.onSage : P.coralChipInk};">Marked ${esc(v.justMarked.status.toLowerCase())} for ${esc(v.justMarked.subjectName)}</span>`)}</div>`;
  }
  if (v.overall != null) {
    html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
      <td width="110" valign="middle" style="padding-right:14px;">
        <div style="width:96px;height:96px;border-radius:32px;${grad(good(v.overall) ? [P.sageTop, P.sage] : [P.blushTop, P.blush])}box-shadow:${S.small};text-align:center;line-height:96px;font:700 28px/96px ${DISPLAY};color:${good(v.overall) ? P.onSage : P.coralChipInk};">${v.overall}%</div>
      </td>
      <td valign="middle"><div style="font:700 17px/1.4 ${FONT};color:${P.ink};">Overall attendance</div>
        <div style="font:500 14px/1.5 ${FONT};color:${P.muted};">${v.attended} of ${v.total} classes${good(v.overall) ? ' — keep it up!' : ' — below 75%, try not to miss more.'}</div></td>
    </tr></table>`;
  }
  const rows = (v.rows || []).filter((r) => r.total > 0);
  if (rows.length) {
    html += sectionTitle(P, 'By subject');
    html += rows.map((r) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr><td style="font:600 14px/1.4 ${FONT};color:${P.ink};">${esc(r.name)} <span style="font-weight:500;color:${P.muted};">· ${r.attended}/${r.total}</span></td>
          <td align="right" style="font:700 14px/1.4 ${FONT};color:${good(r.pct) ? P.success : P.danger};">${good(r.pct) ? `${r.pct}%` : `<table role="presentation" cellpadding="0" cellspacing="0" align="right"><tr><td valign="middle" style="padding-right:5px;">${ic.img('triangle-alert', 'coral', 14)}</td><td valign="middle" style="font:700 14px/1.4 ${FONT};color:${P.danger};">${r.pct}%</td></tr></table>`}</td></tr>
      <tr><td colspan="2" style="padding-top:6px;"><div style="height:10px;border-radius:999px;background-color:${P.track};box-shadow:${S.well};">
        <div style="width:${Math.max(4, Math.min(100, r.pct))}%;height:10px;border-radius:999px;background-color:${good(r.pct) ? P.sageDeep : P.coral};"></div></div></td></tr>
    </table>`).join('');
  }
  if (!html) html = textBlock(P, 'No attendance recorded yet.');
  return html;
}

// ── page frame ────────────────────────────────────────────────────────────

function frame(P, { title, preheader, content, footer }) {
  const S = shadows(P);
  // Dark themes: say so to email apps and set the colours as attributes too, so they do not invert it.
  const scheme = P.dark ? 'dark only' : 'light only';
  const supported = P.dark ? 'dark' : 'light';
  const bg = (colour) => (P.dark ? ` bgcolor="${colour}"` : '');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="${scheme}"><meta name="supported-color-schemes" content="${supported}">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
<style>@media (max-width:480px){.ff-card{padding:24px 18px !important}.ff-outer{padding:18px 10px !important}}</style>
</head>
<body${bg(P.canvas)} style="margin:0;padding:0;background-color:${P.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${P.canvas};">${esc(preheader || '')}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"${bg(P.canvas)} style="background-color:${P.canvas};">
<tr><td align="center" class="ff-outer" style="padding:30px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td align="center" style="padding:0 0 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="padding-right:10px;"><img src="cid:${LOGO_CID}" width="44" height="44" alt="" style="display:block;border:0;border-radius:15px;box-shadow:${LOGO_GLOW};"></td>
        <td valign="middle" style="font:700 22px/1 ${DISPLAY};color:${P.coralText};">FocusFlow</td>
      </tr></table>
    </td></tr>
    <tr><td class="ff-card"${bg(P.surface)} style="background-color:${P.surface};border:1px solid ${P.edge};border-radius:28px;box-shadow:${S.card};padding:30px 28px;">
      ${content}
    </td></tr>
    <tr><td align="center" style="padding:20px 16px 0;font:500 12px/1.6 ${FONT};color:${P.muted};">${footer}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ── public templates ──────────────────────────────────────────────────────

/**
 * Reminder / question email.
 * n = { kind, title, body, url, actions?: [{label, url, tone?}], view?: {headline, sub, facts, classes, deadlines, routines, rows, overall…} }
 */
function reminderEmail(n, appUrl, theme = null) {
  const P = paletteOf(theme);
  const ic = iconSet('email', P);
  const v = n.view || {};
  const openUrl = `${appUrl}${n.url || '/'}`;
  let body;
  if (n.kind === 'digest' && (v.classes || v.deadlines || v.routines)) body = digestBody(P, ic, v);
  else if (n.kind === 'report' && v.rows) body = reportBody(v, ic, P);
  else body = v.facts ? facts(P, ic, v.facts) : textBlock(P, n.body);

  const actions = n.actions && n.actions.length ? n.actions : [{ label: 'Open FocusFlow', url: openUrl, tone: 'coral' }];
  const content = `${hero(P, ic, { kind: n.kind, headline: v.headline || n.title, sub: v.sub })}
    ${body}
    <div style="margin-top:26px;">${actions.map((a) => button(P, a.label, a.url, a.tone)).join('')}</div>
    ${n.actions && n.actions.length ? `<p style="margin:6px 0 0;font:500 13px/1.5 ${FONT};"><a href="${esc(openUrl)}" style="color:${P.coralText};font-weight:700;text-decoration:none;">Open FocusFlow →</a></p>` : ''}`;

  const footer = `You're getting this because reminders are on.<br>Change them any time in <a href="${esc(appUrl)}/settings" style="color:${P.coralText};font-weight:700;text-decoration:none;">Settings → Reminders</a>.`;
  const lines = [v.headline || n.title, v.sub, ...(v.facts || []).filter((f) => f && f.value).map((f) => `${f.label}: ${f.value}`)].filter(Boolean);
  const text = `${lines.join('\n')}\n\n${n.body || ''}${actions.map((a) => `\n${a.label}: ${a.url}`).join('')}\n\nFocusFlow`;
  const html = frame(P, { title: n.title, preheader: v.sub || String(n.body || '').split('\n')[0], content, footer });
  return { subject: n.title, html, text, attachments: [LOGO_ATTACHMENT, ...ic.attachments()] };
}

/** Sign-up verification / password-reset code. purpose: 'verify' | 'reset' */
function codeEmail({ purpose, code }, theme = null) {
  const P = paletteOf(theme);
  const S = shadows(P);
  const ic = iconSet('email', P);
  const reset = purpose === 'reset';
  const k = kindOf(reset ? 'reset' : 'verify');
  const digits = String(code).split('').map((d) => `<td style="padding:0 5px;"><div style="width:52px;height:64px;border-radius:18px;background-color:${P.well};box-shadow:${S.well};text-align:center;font:700 32px/64px ${DISPLAY};color:${P.coralText};">${esc(d)}</div></td>`).join('');
  const content = `${hero(P, ic, {
      kind: reset ? 'reset' : 'verify',
      headline: reset ? 'Reset your password' : 'Welcome to FocusFlow!',
      sub: reset ? 'Use this code to choose a new password.' : 'Enter this code to finish creating your account.',
    })}
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto 6px;"><tr>${digits}</tr></table>
    <p style="margin:14px 0 0;text-align:center;">${chip(P, 'Expires in 10 minutes', k.tone)}</p>
    <p style="margin:22px 0 0;text-align:center;font:500 13px/1.6 ${FONT};color:${P.muted};">Didn't ask for this? You can safely ignore this email — nothing changes without the code.</p>`;
  const subject = reset ? 'Reset your FocusFlow password' : 'Verify your FocusFlow email';
  return {
    subject,
    html: frame(P, { title: subject, preheader: 'Your code expires in 10 minutes.', content, footer: '© FocusFlow · Made for students' }),
    text: `${reset ? 'Your FocusFlow password reset code' : 'Your FocusFlow verification code'}: ${code}\nIt expires in 10 minutes. If you didn't ask for this, ignore this email.`,
    attachments: [LOGO_ATTACHMENT, ...ic.attachments()],
  };
}

module.exports = { reminderEmail, codeEmail, reportBody, iconSet, KINDS, COLORS: DEFAULT_PALETTE, SHADOW: shadowsFor(DEFAULT_PALETTE), LOGO_GLOW, FONT, DISPLAY, LOGO_CID, LOGO_ATTACHMENT, escapeHtml: esc };
