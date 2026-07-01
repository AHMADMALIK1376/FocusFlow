# Phase 3a — Exams & Deadlines Backend (additive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `EXAMS_DEADLINES` table and a CRUD + toggle-done REST API at `/api/exams`, optionally linked to a subject. Additive — nothing existing changes. Replaces the removed Events feature with a student-focused exams/quizzes/deadlines model.

**Architecture:** Rows belong to `user_id`; `subject_id` is **nullable** (general deadline) with `ON DELETE SET NULL` so deleting a subject keeps the item but unlinks it. `examController` follows `subjectController`/`gradeController` (compat-shim `connection.execute(sql,{binds})`, UPPER rows, `generateId()`, `req.user.userId`, auth). Verified with curl smoke-tests.

**Tech Stack:** Node/Express, `pg` compat shim, JWT auth.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: `EXAMS_DEADLINES` table (additive migration)

**Files:** Create `backend/scripts/migrate-exams.js` (mirror `migrate-grades.js`), SQL:
```sql
CREATE TABLE IF NOT EXISTS EXAMS_DEADLINES (
  item_id    VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title      VARCHAR(200) NOT NULL,
  type       VARCHAR(20),
  event_date DATE NOT NULL,
  event_time VARCHAR(10),
  location   VARCHAR(100),
  notes      VARCHAR(500),
  is_done    SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exams_user ON EXAMS_DEADLINES(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON EXAMS_DEADLINES(subject_id);
```
Prints `to_regclass('public.exams_deadlines')` + `✅ exams table ready`.

- [ ] **Step 1:** write it. **Step 2:** `node backend/scripts/migrate-exams.js` → expect table name + ready. **Step 3:** `git add backend/scripts/migrate-exams.js && git commit -m "feat(db): add EXAMS_DEADLINES table (additive)"`.

---

### Task 2: Exam controller, routes, mount

**Files:** Create `backend/controllers/examController.js`, `backend/routes/examRoutes.js`; Modify `backend/server.js`.

- [ ] **Step 1: `examController.js`** — methods:
  - `getExams(req,res)` — LEFT JOIN SUBJECTS for `subject_name`/`subject_color`; optional `?subjectId=`; optional `?upcoming=1` (event_date >= CURRENT_DATE and is_done=0); order `event_date ASC, event_time ASC NULLS LAST`; map to `{id,subjectId,subjectName,subjectColor,title,type,date,time,location,notes,isDone,createdAt}` (`date` via `TO_CHAR(event_date,'YYYY-MM-DD')`).
  - `createExam(req,res)` — body `{subjectId,title,type,date,time,location,notes}`; require `title` + `date`; if `subjectId` given, verify subject ownership (404 if not); insert; 201 `{success,id}`.
  - `updateExam(req,res)` — by `:id` scoped; COALESCE title/date, set others.
  - `deleteExam(req,res)` — by `:id` scoped; 404 if none.
  - `toggleDone(req,res)` — by `:id` scoped; `UPDATE ... SET is_done = 1 - is_done`; return `{success}`.

- [ ] **Step 2: `examRoutes.js`** (all `authMiddleware`; `/:id/toggle` before `/:id`):
```js
router.get('/', authMiddleware, examController.getExams);
router.post('/', authMiddleware, examController.createExam);
router.put('/:id/toggle', authMiddleware, examController.toggleDone);
router.put('/:id', authMiddleware, examController.updateExam);
router.delete('/:id', authMiddleware, examController.deleteExam);
```

- [ ] **Step 3: mount** in `server.js` — `const examRoutes = require('./routes/examRoutes');` next to grade routes require; `app.use('/api/exams', examRoutes);` next to grades mount.

- [ ] **Step 4:** `node --check backend/controllers/examController.js && node --check backend/routes/examRoutes.js && node --check backend/server.js && echo OK`.

- [ ] **Step 5:** `git add -A && git commit -m "feat(api): exams & deadlines CRUD at /api/exams"`.

---

### Task 3: API smoke test

- [ ] Ensure backend healthy. Self-cleaning smoke test: login → pick a subject id → `POST /api/exams` a future exam linked to it + a general deadline (no subject) → `GET /api/exams` shows both ordered by date with `subjectName` populated/null → `GET /api/exams?upcoming=1` shows them → `PUT /api/exams/:id/toggle` flips `isDone` → `DELETE` both → confirm gone. Expected: create returns ids; list ordered ascending; toggle returns `{success:true}` and subsequent list shows `isDone:true`; deletes `{success:true}`.

---

## Self-Review

**Spec coverage:** Implements the spec's `EXAMS_DEADLINES` table (§4) + Exams & Deadlines behavior (§5), replacing Events, as an additive backend linked (optionally) to subjects. Frontend is Plan 3b. No 3a requirement unimplemented.

**Placeholder scan:** Migration SQL, controller method contracts, route order, and smoke expectations are concrete; full controller code written in the build following the in-repo pattern. No plan placeholders.

**Type/identifier consistency:** Exam shape `{id,subjectId,subjectName,subjectColor,title,type,date,time,location,notes,isDone,createdAt}` is used by controller + smoke test + (future) 3b. Column names (`item_id,event_date,event_time,is_done`) consistent across migration, SQL, mappers. `/:id/toggle` precedes `/:id`. `subject_id` nullable + `ON DELETE SET NULL` matches the "general deadline" and "keep on subject delete" requirements.
