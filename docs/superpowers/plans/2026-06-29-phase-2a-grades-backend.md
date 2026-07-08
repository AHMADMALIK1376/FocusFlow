# Phase 2a — Grades Backend (additive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `GRADES` table, pure GPA/CGPA computation helpers (unit-tested), and a CRUD + summary REST API at `/api/grades`, linked to subjects. Additive — nothing existing changes.

**Architecture:** `GRADES` rows link to `SUBJECTS(subject_id)` (and `user_id`). GPA math lives in a pure, dependency-free module `backend/utils/gpa.js` so it can be unit-tested with Node's built-in `node:test`/`node:assert` (no test framework needed). `gradeController` follows the same pattern as `subjectController` (compat-shim `connection.execute(sql,{binds})`, UPPER-cased rows, `generateId()`, `req.user.userId`, auth middleware). Verified with `node --test` for the math and curl smoke-tests for the API.

**GPA design (default 4.0 scale; configurable later):**
- Scale by percentage: A≥85→4.0, A-≥80→3.7, B+≥75→3.3, B≥70→3.0, B-≥67→2.7, C+≥63→2.3, C≥60→2.0, C-≥55→1.7, D≥50→1.0, else F→0.0.
- **Subject percent:** if any grade item has a weight>0 → `Σ((score/maxScore)·weight) / Σ(weight) · 100`; else points-based → `Σscore / ΣmaxScore · 100`.
- **CGPA:** `Σ(subjectPoints·creditHours) / Σ(creditHours)` over subjects that have grades.

**Tech Stack:** Node/Express, `pg` compat shim, JWT auth, `node:test`.
**Branch:** `feat/student-pivot`. Backend on :5555. DB reachable from here.

---

### Task 1: `GRADES` table (additive migration)

**Files:** Create `backend/scripts/migrate-grades.js`

- [ ] **Step 1: Write the migration** (mirror `migrate-subjects.js`), body SQL:

```sql
CREATE TABLE IF NOT EXISTS GRADES (
  grade_id     VARCHAR(50) PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id   VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  category     VARCHAR(30),
  score        DOUBLE PRECISION,
  max_score    DOUBLE PRECISION,
  weight       DOUBLE PRECISION DEFAULT 0,
  graded_date  DATE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_grades_user ON GRADES(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON GRADES(subject_id);
```
The runner script prints `to_regclass('public.grades')` and `✅ grades table ready` (same structure as `migrate-subjects.js`).

- [ ] **Step 2: Run** `node backend/scripts/migrate-grades.js` → expect `grades table: grades` + `✅ grades table ready`.
- [ ] **Step 3: Commit** `git add backend/scripts/migrate-grades.js && git commit -m "feat(db): add GRADES table (additive)"`

---

### Task 2: Pure GPA util + unit tests

**Files:** Create `backend/utils/gpa.js`, `backend/utils/gpa.test.js`

- [ ] **Step 1: Write `backend/utils/gpa.js`** — exports `SCALE`, `letterFor(pct)`, `subjectPercent(grades)`, `subjectGrade(grades)`, `cgpa(subjects)` implementing the GPA design above. `subjectPercent` returns `null` when there are no valid items (`maxScore>0`); `subjectGrade` returns `{percent, letter, points}` or `null`; `cgpa` returns a number rounded to 2dp or `null`.

- [ ] **Step 2: Write `backend/utils/gpa.test.js`** using `node:test` + `node:assert/strict`. Cases:
  - points-based: `subjectPercent([{score:45,maxScore:50,weight:0},{score:8,maxScore:10,weight:0}])` → `88.33…` (assert `Math.round(x*100)/100 === 88.33`).
  - weighted: `subjectPercent([{score:90,maxScore:100,weight:40},{score:80,maxScore:100,weight:60}])` → `84`.
  - `subjectGrade` of the weighted case → `{letter:'A-', points:3.7, percent:84}`.
  - empty: `subjectPercent([])` → `null`; `subjectGrade([])` → `null`.
  - `cgpa([{creditHours:3,grades:[{score:90,maxScore:100,weight:0}]},{creditHours:4,grades:[{score:70,maxScore:100,weight:0}]}])` → A(4.0)·3 + B(3.0)·4 = 24/7 = `3.43`.
  - `cgpa([])` → `null`.

- [ ] **Step 3: Run the tests** `node --test backend/utils/` → expect all pass (`# pass 6`, `# fail 0`).
- [ ] **Step 4: Commit** `git add backend/utils/gpa.js backend/utils/gpa.test.js && git commit -m "feat: GPA/CGPA computation helpers + unit tests"`

---

### Task 3: Grade controller, routes, mount

**Files:** Create `backend/controllers/gradeController.js`, `backend/routes/gradeRoutes.js`; Modify `backend/server.js`

- [ ] **Step 1: Write `backend/controllers/gradeController.js`** (pattern = `subjectController`). Methods:
  - `getGrades(req,res)` — all grades for `req.user.userId`, optional `?subjectId=` filter; map rows to `{id,subjectId,title,category,score,maxScore,weight,gradedDate,createdAt}`.
  - `createGrade(req,res)` — body `{subjectId,title,category,score,maxScore,weight,gradedDate}`; require `subjectId` + `title`; verify the subject belongs to the user (SELECT ownership) else 404; insert; 201 `{success,id}`.
  - `updateGrade(req,res)` — by `:id` scoped to user; `COALESCE` fields.
  - `deleteGrade(req,res)` — by `:id` scoped to user; 404 if none.
  - `getGpa(req,res)` — join `SUBJECTS` + `GRADES` for the user; group grades by subject; use `gpa.js` to compute per-subject `{subjectId,name,code,color,creditHours,percent,letter,points,itemCount}` and overall `cgpa`; respond `{cgpa, totalCredits, subjects:[...]}`.

- [ ] **Step 2: Write `backend/routes/gradeRoutes.js`** — all `authMiddleware`. **Order matters** (`/gpa` before `/:id`):
```js
router.get('/', authMiddleware, gradeController.getGrades);
router.post('/', authMiddleware, gradeController.createGrade);
router.get('/gpa', authMiddleware, gradeController.getGpa);
router.put('/:id', authMiddleware, gradeController.updateGrade);
router.delete('/:id', authMiddleware, gradeController.deleteGrade);
```

- [ ] **Step 3: Mount in `backend/server.js`** — add `const gradeRoutes = require('./routes/gradeRoutes');` next to the subject routes require, and `app.use('/api/grades', gradeRoutes);` next to the subjects mount.

- [ ] **Step 4: Syntax check** `node --check backend/controllers/gradeController.js && node --check backend/routes/gradeRoutes.js && node --check backend/server.js && echo OK` → `OK`.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(api): grades CRUD + GPA summary at /api/grades"`

---

### Task 4: API smoke test

**Files:** none (verification)

- [ ] **Step 1:** ensure backend healthy (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5555/api/health` → 200; start `npm --prefix backend run dev` if needed).
- [ ] **Step 2:** run a self-cleaning smoke test: login → pick a subject id from `/api/subjects` → `POST /api/grades` two items for it → `GET /api/grades?subjectId=...` shows them → `GET /api/grades/gpa` returns a `cgpa` number and that subject with a `letter`/`points` → `DELETE` both grade items → confirm gone. Expected: create returns ids; gpa response has numeric `cgpa` and the subject with `percent`/`letter`/`points`; deletes return `{success:true}`.

---

## Self-Review

**Spec coverage:** Implements the spec's `GRADES` table (§4) and the Grades/GPA behavior (§5) as an additive backend, linked to the subjects spine. Frontend (hub panel + Grades overview page) is Plan 2b. Grading scale is the documented default (spec says "editable later"). No 2a requirement unimplemented.

**Placeholder scan:** Migration SQL + GPA formulas + scale + route order + smoke expectations are all concrete. `gpa.js`/controller full code is written in the build (following the in-repo `subjectController` pattern) with the exact method contracts listed. No plan placeholders.

**Type/identifier consistency:** Grade API shape `{id,subjectId,title,category,score,maxScore,weight,gradedDate}` is consistent across controller, smoke test, and (future) 2b. `gpa.js` contracts (`subjectPercent`→number|null, `subjectGrade`→{percent,letter,points}|null, `cgpa`→number|null) match the test cases and `getGpa` usage. Route `/gpa` precedes `/:id` so it isn't captured as an id. `subject_id`/`max_score`/`graded_date` column names are consistent between migration, controller SQL, and mappers.
