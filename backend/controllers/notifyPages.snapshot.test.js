// Proof that the default look of every answer page never changes. The fixture was captured with the
// code as it was BEFORE the answer pages were themed; with no theme the HTML must stay byte-for-byte the
// same. To re-capture on purpose: UPDATE_PAGE_SNAPSHOT=1 npm test
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reset, TOKENS, get, post } = require('./notifyPages.helpers');
const notify = require('./notifyController');

const FIXTURE = path.join(__dirname, '__fixtures__', 'answer-pages-default.json');
beforeEach(reset);

async function buildAll() {
  const out = {};
  const page = (name, res) => { out[name] = { status: res.statusCode, html: res.sent }; };
  page('att', await get(notify, { t: TOKENS.att }));
  page('att-picked-present', await get(notify, { t: TOKENS.att, a: 'present' }));
  page('att-picked-absent', await get(notify, { t: TOKENS.att, a: 'absent' }));
  page('att-bad-pick', await get(notify, { t: TOKENS.att, a: 'bogus' }));
  page('sub', await get(notify, { t: TOKENS.sub }));
  page('sub-picked-yes', await get(notify, { t: TOKENS.sub, a: 'yes' }));
  page('sub-picked-no', await get(notify, { t: TOKENS.sub, a: 'no' }));
  page('quiz', await get(notify, { t: TOKENS.quiz }));
  page('quiz-subject-picker', await get(notify, { t: TOKENS.quizNoSubject }));
  page('expired', await get(notify, { t: 'nope' }));
  page('expired-empty', await get(notify, {}));
  page('done-att-present', await post(notify, { t: TOKENS.att, a: 'present' }));
  page('done-att-absent', await post(notify, { t: TOKENS.att, a: 'absent' }));
  page('sorry-att-bad-answer', await post(notify, { t: TOKENS.att, a: 'maybe' }));
  page('done-sub-yes', await post(notify, { t: TOKENS.sub, a: 'yes' }));
  page('done-sub-no', await post(notify, { t: TOKENS.sub, a: 'no' }));
  page('sorry-sub-bad-answer', await post(notify, { t: TOKENS.sub, a: 'x' }));
  page('done-quiz-skip', await post(notify, { t: TOKENS.quiz, a: 'skip' }));
  page('done-quiz-high', await post(notify, { t: TOKENS.quiz, a: 'save', score: '9', max: '10' }));
  page('done-quiz-low', await post(notify, { t: TOKENS.quiz, a: 'save', score: '4', max: '10' }));
  page('sorry-quiz-blank', await post(notify, { t: TOKENS.quiz, a: 'save', score: '', max: '10' }));
  page('sorry-quiz-too-high', await post(notify, { t: TOKENS.quiz, a: 'save', score: '11', max: '10' }));
  page('sorry-expired', await post(notify, { t: 'nope', a: 'present' }));
  return out;
}

test('every answer page keeps its default look byte for byte', async () => {
  const now = await buildAll();
  if (process.env.UPDATE_PAGE_SNAPSHOT) fs.writeFileSync(FIXTURE, JSON.stringify(now, null, 1));
  const before = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(Object.keys(now), Object.keys(before));
  for (const key of Object.keys(before)) {
    assert.equal(now[key].status, before[key].status, `${key}: status`);
    assert.equal(now[key].html, before[key].html, `${key}: html`);
  }
});

test('the snapshot really covers every page type', async () => {
  const before = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const all = Object.values(before).map((p) => p.html).join('\n');
  for (const text of ['Attendance check', 'Hand-in check', 'Marks time', 'Link expired', 'Not saved', 'Marked attended', 'Marked missed', 'Marks saved', 'Still open', 'Skipped', ' picked"', 'Choose…']) {
    assert.ok(all.includes(text), text);
  }
});
