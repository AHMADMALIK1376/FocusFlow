const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const lms = require('./lms');

const TOKEN = 'f3c565c1014ca280a7401e93c5092720';
const b64 = (s) => Buffer.from(s).toString('base64');

test('the key is found in the plain token, the whole app link, the base64 part, or a url-encoded paste', () => {
  assert.equal(lms.parseLaunchText(TOKEN), TOKEN);
  assert.equal(lms.parseLaunchText(`  ${TOKEN.toUpperCase()}\n`), TOKEN);
  const enc = b64(`abc123:::${TOKEN}`);
  assert.equal(lms.parseLaunchText(enc), TOKEN);
  assert.equal(lms.parseLaunchText(`moodlemobile://token=${enc}`), TOKEN);
  assert.equal(lms.parseLaunchText(`https://focusflow.app/settings?open=lms#://token=${enc}`), TOKEN);
  assert.equal(lms.parseLaunchText(encodeURIComponent(`moodlemobile://token=${enc}`)), TOKEN);
  assert.equal(lms.parseLaunchText(`moodlemobile://token=${b64(`abc:::${TOKEN}:::${TOKEN}`)}`), TOKEN); // with a private key part
});

test('anything else is refused, never guessed at', () => {
  for (const bad of ['', '   ', null, undefined, 'hello', 'x'.repeat(5000), `moodlemobile://token=${b64('no separators here')}`, b64('a:::notahexkey')]) {
    assert.equal(lms.parseLaunchText(bad), null);
  }
});

test('the key is stored encrypted, comes back whole, and a wrong key or edited text fails loudly', () => {
  const key = crypto.randomBytes(32);
  const blob = lms.encryptToken(TOKEN, key);
  assert.ok(!blob.includes(TOKEN));
  assert.notEqual(blob, lms.encryptToken(TOKEN, key)); // fresh random iv each time
  assert.equal(lms.decryptToken(blob, key), TOKEN);
  assert.throws(() => lms.decryptToken(blob, crypto.randomBytes(32)));
  const parts = blob.split(':'); parts[3] = Buffer.from('tampered').toString('base64');
  assert.throws(() => lms.decryptToken(parts.join(':'), key));
  assert.throws(() => lms.decryptToken('garbage', key));
});

test('the server key must be exactly 32 bytes, otherwise the feature stays off', () => {
  assert.equal(lms.keyFromEnv({}), null);
  assert.equal(lms.keyFromEnv({ LMS_TOKEN_KEY: 'short' }), null);
  assert.equal(lms.keyFromEnv({ LMS_TOKEN_KEY: crypto.randomBytes(16).toString('base64') }), null);
  assert.equal(lms.keyFromEnv({ LMS_TOKEN_KEY: crypto.randomBytes(32).toString('base64') }).length, 32);
});

test('a course name gives the subject name, code, term, lab flag and its first class slot', () => {
  const c = lms.parseCourseName('ADVANCE DATABASE MANAGEMENT SYSTEMS - IUIC_COURSE_FALL26_576 (FRI 01:15 03:20 LR26)');
  assert.equal(c.name, 'Advance Database Management Systems');
  assert.equal(c.code, 'ADMS'); // a short code, not the LMS's long section name
  assert.equal(c.section, 'IUIC_COURSE_FALL26_576');
  assert.equal(c.term, 'Fall 2026');
  assert.equal(c.isLab, false);
  assert.deepEqual(c.meetings, [{ day: 'Friday', start: '13:15', end: '15:20', room: 'LR26' }]);
  const lab = lms.parseCourseName('HCI & COMPUTER GRAPHICS LAB - IUIC_COURSE_FALL26_589 (THU 09:00 11:00 CL2)');
  assert.equal(lab.name, 'HCI & Computer Graphics Lab');
  assert.equal(lab.isLab, true);
  assert.deepEqual(lab.meetings, [{ day: 'Thursday', start: '09:00', end: '11:00', room: 'CL2' }]);
});

test('odd course names never crash: no code, no times, two slots, a missing room', () => {
  assert.deepEqual(lms.parseCourseName('Plain Course'), { name: 'Plain Course', code: 'PC', section: null, isLab: false, term: null, meetings: [] });
  assert.deepEqual(lms.parseCourseName('').meetings, []);
  assert.deepEqual(lms.parseCourseName(undefined).meetings, []);
  const two = lms.parseCourseName('WEB ENGINEERING - IUIC_COURSE_FALL26_592 (MON 12:41 02:00 LR3, WED 10:00 11:30)');
  assert.deepEqual(two.meetings.map((m) => [m.day, m.start, m.end, m.room]), [['Monday', '12:41', '14:00', 'LR3'], ['Wednesday', '10:00', '11:30', null]]);
  const cut = lms.parseCourseName('ARTIFICIAL INTELLIGENCE - IUIC_COURSE_FALL26_580 (WED ...');
  assert.deepEqual(cut.meetings, []);
});

test('names match a subject the student already has, ignoring case and symbols', () => {
  assert.equal(lms.normalizeName('HCI & Computer Graphics'), lms.normalizeName('hci  and computer graphics'.replace('and', '&')));
  assert.notEqual(lms.normalizeName('Web Engineering'), lms.normalizeName('Web Engineering Lab'));
});

test('LMS times become the student\'s local date (Karachi by default), not UTC', () => {
  assert.equal(lms.localDate(Date.UTC(2026, 9, 29, 20, 0) / 1000), '2026-10-30'); // 01:00 on the 30th in Karachi
  assert.equal(lms.localDate(Date.UTC(2026, 9, 29, 20, 0) / 1000, 'UTC'), '2026-10-29');
  assert.equal(lms.localDate(0), null);
  assert.equal(lms.localDate('nope'), null);
});

test('assignment state round-trips, even when the title holds a bar', () => {
  const s = lms.assignmentState(true, 1761782400, 'Lab 4 | part A');
  assert.deepEqual(lms.parseAssignmentState(s), { submitted: true, due: 1761782400, title: 'Lab 4 | part A' });
  assert.deepEqual(lms.parseAssignmentState(lms.assignmentState(null, undefined, 'x')), { submitted: false, due: 0, title: 'x' });
  assert.deepEqual(lms.parseAssignmentState(undefined), { submitted: false, due: 0, title: '' });
});

test('session diff: only new, moved and vanished sessions are touched', () => {
  const existing = [{ id: 1, subjectId: 'a', date: '2026-10-05' }, { id: 2, subjectId: 'a', date: '2026-10-06' }, { id: 3, subjectId: 'b', date: '2026-10-07' }];
  const wanted = [{ id: 1, subjectId: 'a', date: '2026-10-05' }, { id: 2, subjectId: 'a', date: '2026-10-13' }, { id: 4, subjectId: 'b', date: '2026-10-08' }];
  const d = lms.diffSessions(existing, wanted);
  assert.deepEqual(d.add.map((x) => x.id), [4]);
  assert.deepEqual(d.update.map((x) => x.id), [2]);
  assert.deepEqual(d.remove.map((x) => x.id), [3]);
  assert.deepEqual(lms.diffSessions(wanted, wanted), { add: [], update: [], remove: [] });
});

test('finished courses older than a month are left out', () => {
  const now = 1_800_000_000;
  assert.equal(lms.isCurrentCourse({ enddate: 0 }, now), true);
  assert.equal(lms.isCurrentCourse({ enddate: now + 86400 }, now), true);
  assert.equal(lms.isCurrentCourse({ enddate: now - 10 * 86400 }, now), true);
  assert.equal(lms.isCurrentCourse({ enddate: now - 40 * 86400 }, now), false);
});

test('the clock time of a quiz is the student\'s local time, 24 hour, not UTC', () => {
  assert.equal(lms.localTime(Date.UTC(2026, 9, 29, 20, 5) / 1000), '01:05'); // Karachi is UTC+5
  assert.equal(lms.localTime(Date.UTC(2026, 9, 29, 20, 5) / 1000, 'UTC'), '20:05');
  assert.equal(lms.localTime(0), null);
});

test('the teacher\'s HTML becomes plain words, with line breaks, entities decoded and a length limit', () => {
  assert.equal(lms.htmlToText('<p>Read chapter&nbsp;3 &amp; do <b>Q1</b>.</p><p>Submit a PDF.</p><script>alert(1)</script>'), 'Read chapter 3 & do Q1.\nSubmit a PDF.');
  assert.equal(lms.htmlToText(''), '');
  assert.equal(lms.htmlToText(undefined), '');
  assert.equal(lms.htmlToText('a<br>b<br/>c'), 'a\nb\nc');
  const long = lms.htmlToText('x'.repeat(2000), 50);
  assert.equal(long.length, 50);
  assert.ok(long.endsWith('…'));
  assert.equal(lms.htmlToText('&lt;b&gt;'), '<b>');
  assert.equal(lms.htmlToText('&amp;lt;'), '&lt;'); // decoded once only
});

test('only a file path on the LMS itself is accepted', () => {
  const base = 'https://lms.iqra.edu.pk';
  assert.equal(lms.relativeFilePath('https://lms.iqra.edu.pk/webservice/pluginfile.php/12/mod_assign/introattachment/0/Lab%201.pdf?token=x', base), '/webservice/pluginfile.php/12/mod_assign/introattachment/0/Lab%201.pdf');
  assert.equal(lms.relativeFilePath('https://lms.iqra.edu.pk/pluginfile.php/1/a.pdf', base), '/pluginfile.php/1/a.pdf');
  assert.equal(lms.relativeFilePath('https://evil.example/webservice/pluginfile.php/1/a.pdf', base), null);
  assert.equal(lms.relativeFilePath('https://lms.iqra.edu.pk.evil.example/pluginfile.php/1/a.pdf', base), null);
  assert.equal(lms.relativeFilePath('https://lms.iqra.edu.pk/admin/tool/x.php', base), null);
  assert.equal(lms.relativeFilePath('http://lms.iqra.edu.pk/pluginfile.php/1/a.pdf', base), null);
  assert.equal(lms.relativeFilePath('not a url', base), null);
  assert.equal(lms.relativeFilePath(undefined, base), null);
});

test('names the LMS sends HTML-escaped read as the words they are, once', () => {
  assert.equal(lms.decodeEntities('HCI &amp; Computer Graphics'), 'HCI & Computer Graphics');
  assert.equal(lms.decodeEntities('Q&amp;A &lt;draft&gt; it&#39;s &quot;ok&quot;&nbsp;now'), 'Q&A <draft> it\'s "ok" now');
  assert.equal(lms.decodeEntities('&amp;amp;'), '&amp;');
  assert.equal(lms.decodeEntities('&#65;&#x41;'), 'A&#x41;');
  assert.equal(lms.decodeEntities(null), '');
  const c = lms.parseCourseName('HCI &amp; COMPUTER GRAPHICS LAB - IUIC_COURSE_FALL26_589 (THU 09:00 11:00 CL2)');
  assert.equal(c.name, 'HCI & Computer Graphics Lab');
  assert.equal(c.code, 'HCICGL');
  assert.equal(c.isLab, true);
});

test('a short code is the first letters of the words, keeping a whole acronym, at most six characters', () => {
  assert.equal(lms.acronym('Advance Database Management Systems'), 'ADMS');
  assert.equal(lms.acronym('HCI & Computer Graphics'), 'HCICG');
  assert.equal(lms.acronym('Internet of Things'), 'IT');
  assert.equal(lms.acronym('Web Engineering Lab'), 'WEL');
  assert.equal(lms.acronym('A Very Long Name With Many Many Words Here'), 'AVLNMM');
  assert.equal(lms.acronym(''), '');
  assert.equal(lms.acronym(undefined), '');
});
