# Phase 1a — Subjects Backend (additive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `SUBJECTS` + `SUBJECT_SCHEDULE` tables and a full CRUD REST API at `/api/subjects`, **without touching** the existing calendar/tasks/routine tables or code.

**Architecture:** Additive & incremental — the new Subjects spine is created alongside the working app so nothing breaks. The backend uses an Oracle-compatibility shim (`backend/config/database.js`): controllers call `connection.execute(sql, { namedBinds })`, placeholders are `:name`, returned row keys are UPPER-CASED (`row.SUBJECT_ID`), and ids come from `generateId()` (uuid). Routes are guarded by `require('../middleware/auth')`, which sets `req.user.userId`. The backend has **no unit-test framework**, so this plan verifies behavior with **curl smoke-tests** against the running server (self-cleaning).

**Tech Stack:** Node/Express, `pg` (Supabase Postgres) via the compat shim, JWT auth.

**Branch:** `feat/student-pivot`.

**Commands note:** Run from repo root `D:\Reactcourses\FocusFlow` using the **Bash tool (Git Bash)**. The backend must be running on port 5555 for Task 3 (`npm --prefix backend run dev`). The DB connection works from this environment (unlike `git push`).

---

### Task 1: Additive migration — create the Subjects tables

**Files:**
- Create: `backend/scripts/migrate-subjects.js`

- [ ] **Step 1: Write `backend/scripts/migrate-subjects.js`**

```js
// Additive migration: creates SUBJECTS + SUBJECT_SCHEDULE. Idempotent (IF NOT EXISTS).
// Usage: node backend/scripts/migrate-subjects.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS SUBJECTS (
  subject_id   VARCHAR(50) PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  code         VARCHAR(50),
  color        VARCHAR(20),
  instructor   VARCHAR(150),
  credit_hours DOUBLE PRECISION DEFAULT 3,
  term         VARCHAR(100),
  target_grade VARCHAR(10),
  is_archived  SMALLINT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS SUBJECT_SCHEDULE (
  schedule_id VARCHAR(50) PRIMARY KEY,
  subject_id  VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  day_of_week VARCHAR(10),
  start_time  VARCHAR(10),
  end_time    VARCHAR(10),
  room        VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON SUBJECTS(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_schedule ON SUBJECT_SCHEDULE(subject_id);
`;

(async () => {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(SQL);
  const a = await client.query("SELECT to_regclass('public.subjects') AS t");
  const b = await client.query("SELECT to_regclass('public.subject_schedule') AS t");
  console.log('subjects table:', a.rows[0].t);
  console.log('subject_schedule table:', b.rows[0].t);
  console.log('✅ subjects tables ready');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
```

- [ ] **Step 2: Run the migration**

Run: `node backend/scripts/migrate-subjects.js`
Expected:
```
subjects table: subjects
subject_schedule table: subject_schedule
✅ subjects tables ready
```
(If it prints `null` for a table name, the CREATE failed — read the ERROR line and fix before continuing.)

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/migrate-subjects.js
git commit -m "feat(db): add SUBJECTS + SUBJECT_SCHEDULE tables (additive migration)"
```

---

### Task 2: Subjects controller, routes, and server mount

**Files:**
- Create: `backend/controllers/subjectController.js`
- Create: `backend/routes/subjectRoutes.js`
- Modify: `backend/server.js` (add require + `app.use`)

- [ ] **Step 1: Write `backend/controllers/subjectController.js`**

```js
const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// Map a SUBJECTS row (+ its schedule rows) to the API shape.
function toSubject(row, scheduleRows) {
  return {
    id: row.SUBJECT_ID,
    name: row.NAME,
    code: row.CODE,
    color: row.COLOR,
    instructor: row.INSTRUCTOR,
    creditHours: row.CREDIT_HOURS,
    term: row.TERM,
    targetGrade: row.TARGET_GRADE,
    isArchived: row.IS_ARCHIVED === 1,
    createdAt: row.CREATED_AT,
    schedule: (scheduleRows || []).map((s) => ({
      id: s.SCHEDULE_ID,
      day: s.DAY_OF_WEEK,
      start: s.START_TIME,
      end: s.END_TIME,
      room: s.ROOM,
    })),
  };
}

// GET /api/subjects
exports.getSubjects = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const subs = await connection.execute(
      `SELECT subject_id, name, code, color, instructor, credit_hours, term, target_grade, is_archived, created_at
       FROM SUBJECTS WHERE user_id = :userId ORDER BY created_at DESC`,
      { userId: req.user.userId }
    );
    const sched = await connection.execute(
      `SELECT s.schedule_id, s.subject_id, s.day_of_week, s.start_time, s.end_time, s.room
       FROM SUBJECT_SCHEDULE s
       JOIN SUBJECTS sub ON sub.subject_id = s.subject_id
       WHERE sub.user_id = :userId`,
      { userId: req.user.userId }
    );
    const bySubject = {};
    for (const r of sched.rows) {
      (bySubject[r.SUBJECT_ID] = bySubject[r.SUBJECT_ID] || []).push(r);
    }
    res.json(subs.rows.map((row) => toSubject(row, bySubject[row.SUBJECT_ID])));
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Failed to get subjects.' });
  } finally {
    if (connection) await connection.close();
  }
};

// GET /api/subjects/:id
exports.getSubject = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const subs = await connection.execute(
      `SELECT subject_id, name, code, color, instructor, credit_hours, term, target_grade, is_archived, created_at
       FROM SUBJECTS WHERE subject_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (subs.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });
    const sched = await connection.execute(
      `SELECT schedule_id, subject_id, day_of_week, start_time, end_time, room
       FROM SUBJECT_SCHEDULE WHERE subject_id = :id`,
      { id: req.params.id }
    );
    res.json(toSubject(subs.rows[0], sched.rows));
  } catch (err) {
    console.error('Get subject error:', err);
    res.status(500).json({ error: 'Failed to get subject.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/subjects
exports.createSubject = async (req, res) => {
  let connection;
  try {
    const { name, code, color, instructor, creditHours, term, targetGrade, schedule } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Subject name is required.' });

    const subjectId = generateId();
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO SUBJECTS (subject_id, user_id, name, code, color, instructor, credit_hours, term, target_grade, is_archived)
       VALUES (:id, :userId, :name, :code, :color, :instructor, :creditHours, :term, :targetGrade, 0)`,
      {
        id: subjectId,
        userId: req.user.userId,
        name: name.trim(),
        code: code || null,
        color: color || null,
        instructor: instructor || null,
        creditHours: creditHours != null ? creditHours : 3,
        term: term || null,
        targetGrade: targetGrade || null,
      }
    );
    if (Array.isArray(schedule)) {
      for (const slot of schedule) {
        await connection.execute(
          `INSERT INTO SUBJECT_SCHEDULE (schedule_id, subject_id, day_of_week, start_time, end_time, room)
           VALUES (:id, :subjectId, :day, :start, :end, :room)`,
          { id: generateId(), subjectId, day: slot.day || null, start: slot.start || null, end: slot.end || null, room: slot.room || null }
        );
      }
    }
    res.status(201).json({ success: true, id: subjectId });
  } catch (err) {
    console.error('Create subject error:', err);
    res.status(500).json({ error: 'Failed to create subject.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/subjects/:id  (client sends the full subject object)
exports.updateSubject = async (req, res) => {
  let connection;
  try {
    const { name, code, color, instructor, creditHours, term, targetGrade, isArchived, schedule } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT subject_id FROM SUBJECTS WHERE subject_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });

    await connection.execute(
      `UPDATE SUBJECTS SET
         name = COALESCE(:name, name),
         code = :code,
         color = :color,
         instructor = :instructor,
         credit_hours = COALESCE(:creditHours, credit_hours),
         term = :term,
         target_grade = :targetGrade,
         is_archived = COALESCE(:isArchived, is_archived)
       WHERE subject_id = :id AND user_id = :userId`,
      {
        name: name != null ? name.trim() : null,
        code: code != null ? code : null,
        color: color != null ? color : null,
        instructor: instructor != null ? instructor : null,
        creditHours: creditHours != null ? creditHours : null,
        term: term != null ? term : null,
        targetGrade: targetGrade != null ? targetGrade : null,
        isArchived: isArchived != null ? (isArchived ? 1 : 0) : null,
        id: req.params.id,
        userId: req.user.userId,
      }
    );
    if (Array.isArray(schedule)) {
      await connection.execute(`DELETE FROM SUBJECT_SCHEDULE WHERE subject_id = :id`, { id: req.params.id });
      for (const slot of schedule) {
        await connection.execute(
          `INSERT INTO SUBJECT_SCHEDULE (schedule_id, subject_id, day_of_week, start_time, end_time, room)
           VALUES (:id, :subjectId, :day, :start, :end, :room)`,
          { id: generateId(), subjectId: req.params.id, day: slot.day || null, start: slot.start || null, end: slot.end || null, room: slot.room || null }
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ error: 'Failed to update subject.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/subjects/:id
exports.deleteSubject = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM SUBJECTS WHERE subject_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Subject not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete subject error:', err);
    res.status(500).json({ error: 'Failed to delete subject.' });
  } finally {
    if (connection) await connection.close();
  }
};
```

- [ ] **Step 2: Write `backend/routes/subjectRoutes.js`**

```js
const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, subjectController.getSubjects);
router.post('/', authMiddleware, subjectController.createSubject);
router.get('/:id', authMiddleware, subjectController.getSubject);
router.put('/:id', authMiddleware, subjectController.updateSubject);
router.delete('/:id', authMiddleware, subjectController.deleteSubject);

module.exports = router;
```

- [ ] **Step 3: Mount the route in `backend/server.js`**

Add the require alongside the other route imports — change:

```js
const attendanceRoutes = require('./routes/attendanceRoutes');
```

to:

```js
const attendanceRoutes = require('./routes/attendanceRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
```

And add the mount alongside the other `app.use` route lines — change:

```js
app.use('/api/attendance', attendanceRoutes);
```

to:

```js
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectRoutes);
```

- [ ] **Step 4: Syntax-check the three files (no server start needed)**

Run: `node --check backend/controllers/subjectController.js && node --check backend/routes/subjectRoutes.js && node --check backend/server.js && echo OK`
Expected: `OK` (no syntax errors).

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/subjectController.js backend/routes/subjectRoutes.js backend/server.js
git commit -m "feat(api): subjects CRUD endpoints at /api/subjects"
```

---

### Task 3: End-to-end API smoke test

**Files:**
- Modify: none (verification only)

- [ ] **Step 1: Ensure the backend is running on port 5555**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5555/api/health`
Expected: `200`. If not, start it: `npm --prefix backend run dev` (wait until it logs `running on port 5555`), then re-check.

- [ ] **Step 2: Run the self-cleaning smoke test**

Run:
```bash
TOKEN=$(curl -s -X POST http://localhost:5555/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ahmadmalik1376@gmail.com","password":"411711376"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "token: ${TOKEN:0:12}..."

echo "--- create ---"
SID=$(curl -s -X POST http://localhost:5555/api/subjects -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Data Structures","code":"CS201","color":"#2D4759","instructor":"Dr. Khan","creditHours":3,"term":"Fall 2026","targetGrade":"A","schedule":[{"day":"Monday","start":"09:00","end":"10:30","room":"A-101"}]}' \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "created id: $SID"

echo "--- list (should include Data Structures with 1 schedule slot) ---"
curl -s http://localhost:5555/api/subjects -H "Authorization: Bearer $TOKEN" | head -c 600; echo

echo "--- get one ---"
curl -s http://localhost:5555/api/subjects/$SID -H "Authorization: Bearer $TOKEN" | head -c 600; echo

echo "--- update (rename + change schedule) ---"
curl -s -X PUT http://localhost:5555/api/subjects/$SID -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Data Structures & Algorithms","code":"CS201","creditHours":4,"schedule":[{"day":"Tuesday","start":"11:00","end":"12:30","room":"B-204"}]}'; echo

echo "--- get one after update (name=DSA, creditHours=4, Tuesday) ---"
curl -s http://localhost:5555/api/subjects/$SID -H "Authorization: Bearer $TOKEN" | head -c 600; echo

echo "--- delete (cleanup) ---"
curl -s -X DELETE http://localhost:5555/api/subjects/$SID -H "Authorization: Bearer $TOKEN"; echo

echo "--- get one after delete (should be 404) ---"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5555/api/subjects/$SID -H "Authorization: Bearer $TOKEN"
```

Expected:
- `create` prints a UUID `created id`.
- `list` JSON contains `"name":"Data Structures"` with a `schedule` array of length 1 (`"day":"Monday"`).
- first `get one` shows the same.
- `update` prints `{"success":true}`.
- `get one after update` shows `"name":"Data Structures & Algorithms"`, `"creditHours":4`, and schedule `"day":"Tuesday"`.
- `delete` prints `{"success":true}`.
- final status code is `404`.

If every line matches, the Subjects API is verified end-to-end and self-cleaned (the test subject is deleted). No commit needed for this task.

---

## Self-Review

**Spec coverage:** This sub-plan implements the spec's `SUBJECTS` + `SUBJECT_SCHEDULE` tables (§4 "The spine") and the backend half of the "Subjects hub" (§5). It is additive per the agreed Phase 1 strategy — calendar/tasks/routine are untouched. Frontend (Subjects list + hub pages, AppContext wiring) is deferred to Plan 1b. Migrating timetable/attendance onto subjects and retiring the calendar tables is a later phase. No spec requirement for *this sub-plan* is unimplemented.

**Placeholder scan:** No TBD/TODO. Full code is given for the migration, controller, and routes; every command has expected output. Clean.

**Type/identifier consistency:** The API shape from `toSubject` (`id, name, code, color, instructor, creditHours, term, targetGrade, isArchived, createdAt, schedule[{id,day,start,end,room}]`) matches the smoke-test assertions and the create/update request bodies. SQL column names (`subject_id, credit_hours, day_of_week, start_time, end_time, room`) are consistent between the migration, controller queries, and `toSubject` mapping. Route paths (`/api/subjects`, `/:id`) match the server mount and the smoke-test URLs. `req.user.userId` matches the existing auth middleware contract used by `calendarController`.
