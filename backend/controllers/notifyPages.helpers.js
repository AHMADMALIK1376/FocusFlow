// Shared by the answer-page tests: a fake database in place of config/database, signed sample
// links with a fixed issue time (so the output never changes), and fake request / response objects.
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.APP_URL = 'https://focusflow.example';

// What the fake database does. Tests change these fields; reset() puts them back.
const db = { calls: [], connectFails: false, themeData: undefined, themeThrows: false, subjects: [], attendanceRows: [] };
const reset = () => Object.assign(db, { calls: [], connectFails: false, themeData: undefined, themeThrows: false, subjects: [{ SUBJECT_ID: 'S1', NAME: 'Compiler <b>' }], attendanceRows: [{ SUBJECT_ID: 'S1', NAME: 'Compiler', STATUS: 'Present' }] });
reset();

const dbPath = path.join(__dirname, '..', 'config', 'database.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getConnection: async () => {
      if (db.connectFails) throw new Error('no database');
      let open = true;
      db.calls.push({ opened: true });
      return {
        execute: async (sql, params) => {
          db.calls.push({ sql, params });
          if (/FROM USER_PREFERENCES/i.test(sql)) {
            if (db.themeThrows) throw new Error('theme query failed');
            return { rows: db.themeData === undefined ? [] : [{ DATA: db.themeData }] };
          }
          if (/FROM SUBJECTS WHERE subject_id/i.test(sql)) return { rows: [{ SUBJECT_ID: params.s }] };
          if (/FROM SUBJECTS WHERE user_id/i.test(sql)) return { rows: db.subjects };
          if (/FROM SUBJECTS s/i.test(sql)) return { rows: db.attendanceRows };
          if (/RETURNING notif_key/i.test(sql)) return { rows: [] }; // already reported: no email is sent
          if (/RETURNING/i.test(sql)) return { rows: [{ ID: 1 }] };
          return { rows: [], rowCount: 1 };
        },
        close: async () => { open = false; db.calls.push({ closed: true }); },
        get isOpen() { return open; },
      };
    },
  },
};

const sign = (claims) => jwt.sign({ iat: 1790000000, ...claims }, process.env.JWT_SECRET);
const TOKENS = {
  att: sign({ p: 'att', u: 'u1', s: 'S1', n: 'Compiler <b>', d: '2026-10-06' }),
  sub: sign({ p: 'sub', u: 'u1', id: 'E1', src: 'exam', n: 'Parser "project"' }),
  quiz: sign({ p: 'quiz', u: 'u1', s: 'S1', e: 'E2', n: 'AI Quiz 1', ty: 'Quiz', d: '2026-10-06' }),
  quizNoSubject: sign({ p: 'quiz', u: 'u1', e: 'E2', n: 'AI Quiz 1', ty: 'Quiz', d: '2026-10-06' }),
  attNoUser: sign({ p: 'att', s: 'S1', n: 'Compiler', d: '2026-10-06' }),
};

function fakeRes() {
  const res = { statusCode: 200, body: null, sent: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.send = (b) => { res.sent = b; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}
const get = async (controller, query) => { const res = fakeRes(); await controller.answerPage({ query }, res); return res; };
const post = async (controller, body) => { const res = fakeRes(); await controller.answer({ body, is: () => false }, res); return res; };

module.exports = { db, reset, sign, TOKENS, fakeRes, get, post };
