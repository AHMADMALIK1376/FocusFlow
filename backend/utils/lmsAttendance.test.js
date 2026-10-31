const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseAttendanceText, diffAttendance, isoDate } = require('./lmsAttendance');

// What copying the page in Chrome gives: cells separated by tabs, dates and times on separate lines.
const PAGE = [
  'This course\tAll courses\tAll sessions',
  'October',
  'Date\tDescription\tStatus\tPoints\tRemarks',
  'Fri 16 Oct 2026',
  '1AM - 3:20AM\tRegular class session\tPresent\t2 / 2\t',
  'Fri 23 Oct 2026',
  '1AM - 3:20AM\tRegular class session\tPresent\t2 / 2\t',
  'Fri 9 Oct 2026',
  '1AM - 3:20AM\tRegular class session\tUser enrolment starts 10.10.2026',
  'Fri 30 Oct 2026',
  '1AM - 3:20AM\tRegular class session\t?\t? / 2\t',
  'Taken sessions: 2',
  'Points over taken sessions: 4 / 4',
].join('\n');

test('marked class days are read from the copied page; unmarked ("?") days and notes are skipped', () => {
  assert.deepEqual(parseAttendanceText(PAGE), [
    { date: '2026-10-16', status: 'Present' },
    { date: '2026-10-23', status: 'Present' },
  ]);
});

test('every status word is understood, in any case, on one line or many, and the output is in date order', () => {
  const text = 'Mon 5 Oct 2026 8AM Class absent 0 / 2 Tue 6 Oct 2026 Class LATE 1 / 2 Wed, 7 Oct 2026 Class Excused  Thu 1 Oct 2026 Class Present 2 / 2';
  assert.deepEqual(parseAttendanceText(text), [
    { date: '2026-10-01', status: 'Present' },
    { date: '2026-10-05', status: 'Absent' },
    { date: '2026-10-06', status: 'Late' },
    { date: '2026-10-07', status: 'Excused' },
  ]);
});

test('two sessions on one day give one record: Present only if every marked session was Present', () => {
  const t = (a, b) => parseAttendanceText(`Fri 16 Oct 2026 Lab ${a} 1 / 1\nFri 16 Oct 2026 Lab ${b} 1 / 1`);
  assert.deepEqual(t('Present', 'Present'), [{ date: '2026-10-16', status: 'Present' }]);
  assert.deepEqual(t('Present', 'Absent'), [{ date: '2026-10-16', status: 'Absent' }]);
  assert.deepEqual(t('Late', 'Present'), [{ date: '2026-10-16', status: 'Late' }]);
  assert.deepEqual(parseAttendanceText('Fri 16 Oct 2026 Lab Present\nFri 16 Oct 2026 Lab ?'), [{ date: '2026-10-16', status: 'Present' }]);
});

test('text with nothing readable gives nothing, and never throws', () => {
  for (const bad of ['', null, undefined, 'hello world', 'Fri 31 Feb 2026 Present', 'Fri 16 Octember 2026 Present', 12345]) {
    assert.deepEqual(parseAttendanceText(bad), []);
  }
});

test('dates are real: no 31 February, three-letter or full month names only', () => {
  assert.equal(isoDate(31, 'Feb', 2026), null);
  assert.equal(isoDate(29, 'Feb', 2028), '2028-02-29');
  assert.equal(isoDate(29, 'Feb', 2027), null);
  assert.equal(isoDate(5, 'October', 2026), '2026-10-05');
  assert.equal(isoDate(5, 'Xyz', 2026), null);
});

test('very long pasted text is cut, not trusted', () => {
  const big = 'Fri 16 Oct 2026 Present\n'.repeat(5000);
  assert.ok(parseAttendanceText(big).length <= 400);
  assert.deepEqual(parseAttendanceText('x'.repeat(100000) + ' Fri 16 Oct 2026 Present'), []); // the date is beyond the limit
});

test('the preview counts what would be new, changed or already the same', () => {
  const parsed = [{ date: '2026-10-16', status: 'Present' }, { date: '2026-10-23', status: 'Absent' }, { date: '2026-10-30', status: 'Late' }];
  const existing = [{ date: '2026-10-16', status: 'Present' }, { date: '2026-10-23', status: 'Present' }];
  const d = diffAttendance(existing, parsed);
  assert.deepEqual([d.add.map((x) => x.date), d.change.map((x) => x.date), d.same], [['2026-10-30'], ['2026-10-23'], 1]);
  assert.deepEqual(diffAttendance(undefined, parsed).add.length, 3);
});
