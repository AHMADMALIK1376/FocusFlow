# Phase 6b — Attendance on Subjects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-subject attendance tied to the Subjects spine — a live **Attendance** panel on the Subject hub (mark Present/Absent/Late for a date, see the subject's %). Additive; the legacy calendar-based attendance is untouched.

**Architecture:** New `SUBJECT_ATTENDANCE` table (unique per subject+date; status Present/Absent/Late/Excused). `subjectAttendanceController` = get-for-subject (records + computed summary) + mark (upsert) + remove. Percentage = `(present + late) / (present + absent + late)` (Excused not counted). Frontend `subjectAttendanceAPI` + a hub `AttendancePanel` replacing the "Attendance" placeholder.

**Tech Stack:** Node/Express + pg shim; React 19 CRA.
**Branch:** `feat/student-pivot`. Backend on :5555 (restart if down).

---

### Task 1: Table + backend

**Files:** Create `backend/scripts/migrate-subject-attendance.js`, `backend/controllers/subjectAttendanceController.js`, `backend/routes/subjectAttendanceRoutes.js`; Modify `backend/server.js`.

Migration SQL:
```sql
CREATE TABLE IF NOT EXISTS SUBJECT_ATTENDANCE (
  record_id  VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) NOT NULL REFERENCES SUBJECTS(subject_id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  status     VARCHAR(12) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uniq_subject_date UNIQUE (subject_id, class_date)
);
CREATE INDEX IF NOT EXISTS idx_subatt_subject ON SUBJECT_ATTENDANCE(subject_id);
```

Controller (pure `summarize(records)` → `{present,absent,late,excused,total,percentage}`, percentage `null` when nothing counted):
- `getForSubject` `GET /subjects/:subjectId` — verify subject ownership; records `[{id,date,status}]` ordered `class_date DESC`; `+ summary`.
- `mark` `POST /subjects/:subjectId {date,status}` — verify ownership; `INSERT ... ON CONFLICT (subject_id, class_date) DO UPDATE SET status = EXCLUDED.status`; date default today; status one of Present/Absent/Late/Excused.
- `remove` `DELETE /records/:recordId` — scoped to `user_id`.

Routes (auth): `GET /subjects/:subjectId`, `POST /subjects/:subjectId`, `DELETE /records/:recordId`. Mount `app.use('/api/subject-attendance', ...)` next to flashcards.

- [ ] **Step 1:** migration → `node backend/scripts/migrate-subject-attendance.js`.
- [ ] **Step 2:** controller + routes + mount; `node --check` all three → OK.
- [ ] **Step 3:** commit `feat(db+api): SUBJECT_ATTENDANCE + /api/subject-attendance`.
- [ ] **Step 4:** smoke: login → pick subject → mark 4 dates (3 Present, 1 Absent) → GET (summary percentage 75) → mark an existing date Absent (upsert, count changes) → delete a record → GET reflects it. Self-cleaning.

---

### Task 2: Frontend (API + hub panel)

**Files:** Modify `services/api.js` (`subjectAttendanceAPI`); Create `components/subjects/AttendancePanel.js`; Modify `Pages/SubjectHubPage.js` (drop `attendance` from `COMING`; render `<AttendancePanel subjectId={id} />`).

- [ ] **Step 1: `subjectAttendanceAPI`** (after flashcardAPI): `getForSubject(subjectId)`, `mark(subjectId, data)`, `removeRecord(recordId)` under `/subject-attendance`.
- [ ] **Step 2: `AttendancePanel.js`** — loads `getForSubject(subjectId)` into `{records,summary}`. Header shows the % (or "—") with a `tone` Badge (success ≥75, focus <75). A "Mark today" row: date `Input type=date` (default today) + Present / Absent / Late buttons → `mark` → refresh. Recent records list (date + status Badge + delete). EmptyState when none.
- [ ] **Step 3: `SubjectHubPage.js`** — remove `{ key: "attendance", ... }` from `COMING`, import `AttendancePanel`, render `<AttendancePanel subjectId={id} />` after `<GradesPanel subjectId={id} />` (before Exams).
- [ ] **Step 4:** `cd frontend && CI=true npm run build` → `Compiled successfully.`
- [ ] **Step 5:** Browser: open a subject hub → mark today Present → panel shows a record + % updates; verify via API. DOM-verify.
- [ ] **Step 6:** `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|FAIL"` → all pass.
- [ ] **Step 7:** commit `feat(fe): subject-hub Attendance panel (mark + %)`.

---

## Self-Review

**Spec coverage:** Adds subject-linked attendance (spec §4/§5 attendance-on-subjects; Phase 6). Fills the Attendance hub placeholder. Legacy attendance untouched (additive). No unimplemented requirement for this slice.

**Placeholder scan:** Migration SQL, controller contracts, percentage formula, routes, API, and panel behavior are concrete. No plan placeholders.

**Type/identifier consistency:** Record `{id,date,status}` + summary `{present,absent,late,excused,total,percentage}` used by controller + API + panel. Upsert key `(subject_id, class_date)`. Routes `/subjects/:subjectId`, `/records/:recordId` match `subjectAttendanceAPI` + mount `/api/subject-attendance`. Status values Present/Absent/Late/Excused consistent across mark + summarize.
