// Clay-style emails in the app's own colours (frontend/src/design/tokens.css):
// mocha-crème page, warm-white clay cards, coral / sage / sunshine accents,
// soft warm shadows with a white top highlight — never dark shading.
//
// Pure functions (no network, no DB) so every template is unit-testable.
// Email clients are picky: tables for layout, inline styles only, and every
// effect (gradients, shadows, web fonts) degrades to a plain colour.
const path = require('path');

const C = {
  canvas: '#F5EFE6', surface: '#FFFDF9', well: '#FAF4EB', edge: '#EFE4D4',
  ink: '#342E3E', muted: '#80746C',
  coral: '#EC706D', coralTop: '#F58C89',
  sun: '#FFD700', sunTop: '#FFE250',
  sage: '#B8DCC4', sageTop: '#CEEAD6', sageDeep: '#6CB288',
  blush: '#FFE2DE', blushTop: '#FFECE9',
  success: '#3EA06C', danger: '#E85460', track: '#F1E7D9',
};

// Same shadows as the app's --shadow-* tokens.
const SHADOW = {
  card: '0 16px 30px -14px rgba(190,160,122,0.42),0 6px 12px -8px rgba(190,160,122,0.24),inset 0 -6px 12px rgba(232,214,190,0.30),inset 0 6px 10px rgba(255,255,255,0.95)',
  small: '0 8px 16px -8px rgba(190,160,122,0.40),inset 0 -3px 6px rgba(232,214,190,0.30),inset 0 3px 5px rgba(255,255,255,0.9)',
  well: 'inset 0 4px 8px rgba(214,192,162,0.35),inset 0 -2px 4px rgba(255,255,255,0.9)',
  coral: '0 14px 26px -12px rgba(236,112,109,0.50),inset 0 6px 10px rgba(255,255,255,0.38),inset 0 -6px 12px rgba(255,190,185,0.35)',
};

const FONT = "'Poppins','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "'Fredoka','Arial Rounded MT Bold','Nunito','Poppins','Segoe UI',Arial,sans-serif";

// Clay colourways: tile gradient, text on the tile, and a soft chip.
const TONES = {
  coral: { tile: [C.coralTop, C.coral], tileInk: '#FFFFFF', chip: C.blush, chipInk: '#B8403D', glow: SHADOW.coral },
  sage: { tile: [C.sageTop, C.sage], tileInk: '#284634', chip: '#E2F2E7', chipInk: '#2F6B47', glow: SHADOW.small },
  sun: { tile: [C.sunTop, C.sun], tileInk: '#28344E', chip: '#FFF4BF', chipInk: '#6B5200', glow: SHADOW.small },
  blush: { tile: [C.blushTop, C.blush], tileInk: '#B8403D', chip: C.blush, chipInk: '#B8403D', glow: SHADOW.small },
};

// Every kind of message has its own face.
const KINDS = {
  class: { emoji: '📚', eyebrow: 'Class reminder', tone: 'coral' },
  attendance: { emoji: '🎒', eyebrow: 'Attendance check', tone: 'sage' },
  exam: { emoji: '📝', eyebrow: 'Exam ahead', tone: 'sun' },
  submit: { emoji: '📤', eyebrow: 'Hand-in check', tone: 'blush' },
  quiz: { emoji: '📊', eyebrow: 'Marks time', tone: 'sage' },
  routine: { emoji: '🌿', eyebrow: 'Daily routine', tone: 'sage' },
  digest: { emoji: '☀️', eyebrow: 'Your day', tone: 'sun' },
  report: { emoji: '📈', eyebrow: 'Attendance report', tone: 'sage' },
  test: { emoji: '🔔', eyebrow: 'Test reminder', tone: 'coral' },
  verify: { emoji: '🔐', eyebrow: 'Verify your email', tone: 'coral' },
  reset: { emoji: '🔑', eyebrow: 'Password reset', tone: 'sun' },
};
const kindOf = (k) => KINDS[k] || KINDS.test;

const LOGO_CID = 'ff-logo';
const LOGO_ATTACHMENT = { filename: 'focusflow.png', path: path.join(__dirname, '..', 'assets', 'logo.png'), cid: LOGO_CID };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const grad = ([top, base]) => `background-color:${base};background-image:linear-gradient(160deg,${top},${base});`;

// ── building blocks ───────────────────────────────────────────────────────

function chip(text, tone = 'coral') {
  const t = TONES[tone];
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${t.chip};color:${t.chipInk};font:700 11px/1.2 ${FONT};letter-spacing:0.08em;text-transform:uppercase;">${esc(text)}</span>`;
}

function emojiTile(emoji, tone, size = 64) {
  const t = TONES[tone];
  return `<div style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.34)}px;${grad(t.tile)}box-shadow:${t.glow};text-align:center;line-height:${size}px;font-size:${Math.round(size * 0.5)}px;">${emoji}</div>`;
}

// tone: coral (main action), sage (yes / good), sun (later), plain (secondary)
function button(label, url, tone = 'coral') {
  const look = {
    coral: `${grad([C.coralTop, C.coral])}color:#FFFFFF;box-shadow:${SHADOW.coral};`,
    sage: `${grad([C.sageTop, C.sage])}color:#284634;box-shadow:${SHADOW.small};`,
    sun: `${grad([C.sunTop, C.sun])}color:#28344E;box-shadow:${SHADOW.small};`,
    plain: `background-color:${C.well};color:${C.ink};box-shadow:${SHADOW.small};`,
  }[tone] || '';
  return `<a href="${esc(url)}" style="display:inline-block;margin:0 10px 12px 0;padding:14px 26px;border-radius:999px;${look}font:700 15px/1.2 ${FONT};text-decoration:none;">${esc(label)}</a>`;
}

function hero({ kind, headline, sub }) {
  const k = kindOf(kind);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="76" valign="top" style="padding:0 14px 0 0;">${emojiTile(k.emoji, k.tone)}</td>
    <td valign="middle">
      ${chip(k.eyebrow, k.tone)}
      <h1 style="margin:10px 0 0;font:700 24px/1.25 ${DISPLAY};color:${C.ink};">${esc(headline)}</h1>
      ${sub ? `<p style="margin:6px 0 0;font:500 15px/1.5 ${FONT};color:${C.muted};">${esc(sub)}</p>` : ''}
    </td></tr></table>`;
}

// [{icon, label, value}] → soft "pressed-in" clay wells.
function facts(list) {
  const rows = (list || []).filter((f) => f && f.value);
  if (!rows.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:separate;border-spacing:0 10px;">
    ${rows.map((f) => `<tr><td style="background-color:${C.well};border-radius:20px;box-shadow:${SHADOW.well};padding:12px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" valign="middle" style="font-size:20px;line-height:1;">${f.icon || '•'}</td>
        <td valign="middle"><div style="font:700 11px/1.3 ${FONT};letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${esc(f.label)}</div>
          <div style="font:700 16px/1.4 ${FONT};color:${C.ink};">${esc(f.value)}</div></td>
      </tr></table></td></tr>`).join('')}
  </table>`;
}

function textBlock(body) {
  if (!body) return '';
  return `<div style="margin-top:22px;background-color:${C.well};border-radius:20px;box-shadow:${SHADOW.well};padding:16px 18px;font:500 15px/1.65 ${FONT};color:${C.ink};white-space:pre-wrap;">${esc(body)}</div>`;
}

function sectionTitle(text, count) {
  return `<p style="margin:26px 0 8px;font:700 13px/1.3 ${FONT};letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${esc(text)}${count != null ? ` <span style="display:inline-block;margin-left:6px;padding:2px 9px;border-radius:999px;background:${C.blush};color:#B8403D;letter-spacing:0;">${count}</span>` : ''}</p>`;
}

// Morning digest: today's classes as a timeline, then what's due, then routine.
function digestBody(v) {
  let html = '';
  if (v.classes && v.classes.length) {
    html += sectionTitle("Today's classes", v.classes.length);
    html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px;">
      ${v.classes.map((c) => `<tr>
        <td width="92" valign="top" style="padding:12px 10px 0 0;">
          <div style="font:700 15px/1.2 ${FONT};color:${C.coral};">${esc(c.start)}</div>
          ${c.end ? `<div style="font:500 12px/1.4 ${FONT};color:${C.muted};">to ${esc(c.end)}</div>` : ''}
        </td>
        <td style="background-color:${C.well};border-radius:20px;box-shadow:${SHADOW.well};padding:12px 16px;">
          <div style="font:700 16px/1.35 ${FONT};color:${C.ink};">${esc(c.name)}</div>
          ${c.room ? `<div style="font:500 13px/1.5 ${FONT};color:${C.muted};">📍 ${esc(c.room)}</div>` : ''}
        </td></tr>`).join('')}
    </table>`;
  } else {
    html += `<div style="margin-top:22px;${grad([C.sageTop, '#E2F2E7'])}border-radius:20px;box-shadow:${SHADOW.small};padding:16px 18px;font:600 15px/1.5 ${FONT};color:#284634;">🌤️ No classes today — enjoy the breathing room.</div>`;
  }
  if (v.deadlines && v.deadlines.length) {
    html += sectionTitle('Coming up', v.deadlines.length);
    html += v.deadlines.map((d) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
      <td style="background-color:${C.surface};border:1px solid ${C.edge};border-radius:20px;box-shadow:${SHADOW.small};padding:12px 16px;">
        <span style="font-size:18px;">${d.emoji}</span>
        <span style="font:700 15px/1.4 ${FONT};color:${C.ink};">&nbsp;${esc(d.title)}</span><br>
        <span style="font:500 13px/1.6 ${FONT};color:${C.muted};">${esc(d.type)} · </span>${chip(d.when === 'Today' ? `Today${d.time ? ` ${d.time}` : ''}` : `Tomorrow${d.time ? ` ${d.time}` : ''}`, d.when === 'Today' ? 'coral' : 'sun')}
      </td></tr></table>`).join('');
  }
  if (v.routines && v.routines.length) {
    html += sectionTitle('Routine');
    html += `<div>${v.routines.map((r) => `<span style="display:inline-block;margin:0 8px 8px 0;padding:9px 14px;border-radius:999px;${grad([C.sageTop, C.sage])}box-shadow:${SHADOW.small};font:600 13px/1.2 ${FONT};color:#284634;">🌿 ${esc(r.time)} · ${esc(r.name)}</span>`).join('')}</div>`;
  }
  return html;
}

// Attendance report: overall score, then a soft progress bar per subject.
function reportBody(v) {
  const good = (p) => p >= 75;
  let html = '';
  if (v.justMarked) {
    const present = v.justMarked.status !== 'Absent';
    html += `<div style="margin-top:22px;${grad(present ? [C.sageTop, '#E2F2E7'] : [C.blushTop, C.blush])}border-radius:20px;box-shadow:${SHADOW.small};padding:14px 18px;font:600 15px/1.5 ${FONT};color:${present ? '#284634' : '#B8403D'};">${present ? '✅' : '❌'} Marked ${esc(v.justMarked.status.toLowerCase())} for ${esc(v.justMarked.subjectName)}</div>`;
  }
  if (v.overall != null) {
    html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
      <td width="110" valign="middle" style="padding-right:14px;">
        <div style="width:96px;height:96px;border-radius:32px;${grad(good(v.overall) ? [C.sageTop, C.sage] : [C.blushTop, C.blush])}box-shadow:${SHADOW.small};text-align:center;line-height:96px;font:700 28px/96px ${DISPLAY};color:${good(v.overall) ? '#284634' : '#B8403D'};">${v.overall}%</div>
      </td>
      <td valign="middle"><div style="font:700 17px/1.4 ${FONT};color:${C.ink};">Overall attendance</div>
        <div style="font:500 14px/1.5 ${FONT};color:${C.muted};">${v.attended} of ${v.total} classes${good(v.overall) ? ' — keep it up!' : ' — below 75%, try not to miss more.'}</div></td>
    </tr></table>`;
  }
  const rows = (v.rows || []).filter((r) => r.total > 0);
  if (rows.length) {
    html += sectionTitle('By subject');
    html += rows.map((r) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr><td style="font:600 14px/1.4 ${FONT};color:${C.ink};">${esc(r.name)} <span style="font-weight:500;color:${C.muted};">· ${r.attended}/${r.total}</span></td>
          <td align="right" style="font:700 14px/1.4 ${FONT};color:${good(r.pct) ? C.success : C.danger};">${r.pct}%${good(r.pct) ? '' : ' ⚠️'}</td></tr>
      <tr><td colspan="2" style="padding-top:6px;"><div style="height:10px;border-radius:999px;background-color:${C.track};box-shadow:${SHADOW.well};">
        <div style="width:${Math.max(4, Math.min(100, r.pct))}%;height:10px;border-radius:999px;background-color:${good(r.pct) ? C.sageDeep : C.coral};"></div></div></td></tr>
    </table>`).join('');
  }
  if (!html) html = textBlock('No attendance recorded yet.');
  return html;
}

// ── page frame ────────────────────────────────────────────────────────────

function frame({ title, preheader, content, footer }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
<style>@media (max-width:480px){.ff-card{padding:24px 18px !important}.ff-outer{padding:18px 10px !important}}</style>
</head>
<body style="margin:0;padding:0;background-color:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.canvas};">${esc(preheader || '')}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.canvas};">
<tr><td align="center" class="ff-outer" style="padding:30px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td align="center" style="padding:0 0 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="padding-right:10px;"><img src="cid:${LOGO_CID}" width="44" height="44" alt="" style="display:block;border:0;border-radius:15px;box-shadow:${SHADOW.coral};"></td>
        <td valign="middle" style="font:700 22px/1 ${DISPLAY};color:${C.coral};">FocusFlow</td>
      </tr></table>
    </td></tr>
    <tr><td class="ff-card" style="background-color:${C.surface};border:1px solid ${C.edge};border-radius:28px;box-shadow:${SHADOW.card};padding:30px 28px;">
      ${content}
    </td></tr>
    <tr><td align="center" style="padding:20px 16px 0;font:500 12px/1.6 ${FONT};color:${C.muted};">${footer}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ── public templates ──────────────────────────────────────────────────────

/**
 * Reminder / question email.
 * n = { kind, title, body, url, actions?: [{label, url, tone?}], view?: {headline, sub, facts, classes, deadlines, routines, rows, overall…} }
 */
function reminderEmail(n, appUrl) {
  const k = kindOf(n.kind);
  const v = n.view || {};
  const openUrl = `${appUrl}${n.url || '/'}`;
  let body;
  if (n.kind === 'digest' && (v.classes || v.deadlines || v.routines)) body = digestBody(v);
  else if (n.kind === 'report' && v.rows) body = reportBody(v);
  else body = v.facts ? facts(v.facts) : textBlock(n.body);

  const actions = n.actions && n.actions.length ? n.actions : [{ label: 'Open FocusFlow', url: openUrl, tone: 'coral' }];
  const content = `${hero({ kind: n.kind, headline: v.headline || n.title, sub: v.sub })}
    ${body}
    <div style="margin-top:26px;">${actions.map((a) => button(a.label, a.url, a.tone)).join('')}</div>
    ${n.actions && n.actions.length ? `<p style="margin:6px 0 0;font:500 13px/1.5 ${FONT};"><a href="${esc(openUrl)}" style="color:${C.coral};font-weight:700;text-decoration:none;">Open FocusFlow →</a></p>` : ''}`;

  const footer = `You're getting this because reminders are on.<br>Change them any time in <a href="${esc(appUrl)}/settings" style="color:${C.coral};font-weight:700;text-decoration:none;">Settings → Reminders</a>.`;
  const lines = [v.headline || n.title, v.sub, ...(v.facts || []).filter((f) => f && f.value).map((f) => `${f.label}: ${f.value}`)].filter(Boolean);
  const text = `${lines.join('\n')}\n\n${n.body || ''}${actions.map((a) => `\n${a.label}: ${a.url}`).join('')}\n\nFocusFlow`;
  return {
    subject: `${k.emoji} ${n.title}`,
    html: frame({ title: n.title, preheader: v.sub || String(n.body || '').split('\n')[0], content, footer }),
    text,
    attachments: [LOGO_ATTACHMENT],
  };
}

/** Sign-up verification / password-reset code. purpose: 'verify' | 'reset' */
function codeEmail({ purpose, code }) {
  const reset = purpose === 'reset';
  const k = kindOf(reset ? 'reset' : 'verify');
  const digits = String(code).split('').map((d) => `<td style="padding:0 5px;"><div style="width:52px;height:64px;border-radius:18px;background-color:${C.well};box-shadow:${SHADOW.well};text-align:center;font:700 32px/64px ${DISPLAY};color:${C.coral};">${esc(d)}</div></td>`).join('');
  const content = `${hero({
      kind: reset ? 'reset' : 'verify',
      headline: reset ? 'Reset your password' : 'Welcome to FocusFlow!',
      sub: reset ? 'Use this code to choose a new password.' : 'Enter this code to finish creating your account.',
    })}
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto 6px;"><tr>${digits}</tr></table>
    <p style="margin:14px 0 0;text-align:center;">${chip('Expires in 10 minutes', k.tone)}</p>
    <p style="margin:22px 0 0;text-align:center;font:500 13px/1.6 ${FONT};color:${C.muted};">Didn't ask for this? You can safely ignore this email — nothing changes without the code.</p>`;
  const subject = reset ? `${k.emoji} Reset your FocusFlow password` : `${k.emoji} Verify your FocusFlow email`;
  return {
    subject,
    html: frame({ title: subject, preheader: 'Your code expires in 10 minutes.', content, footer: '© FocusFlow · Made for students' }),
    text: `${reset ? 'Your FocusFlow password reset code' : 'Your FocusFlow verification code'}: ${code}\nIt expires in 10 minutes. If you didn't ask for this, ignore this email.`,
    attachments: [LOGO_ATTACHMENT],
  };
}

module.exports = { reminderEmail, codeEmail, reportBody, KINDS, COLORS: C, SHADOW, FONT, DISPLAY, LOGO_CID, LOGO_ATTACHMENT, escapeHtml: esc };
