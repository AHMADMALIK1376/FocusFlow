# FocusFlow — Student-Focused Pivot — Design Spec

**Date:** 2026-06-29
**Status:** Approved (design); pending implementation planning
**Owner:** Ahmad Malik

## 1. Goal & Audience

Re-focus FocusFlow from a general-purpose productivity app ("office workers, housewives, etc.") to a **single target audience: students** — school, college, and university, of all ages.

Remove everything not relevant to studying, reshape borderline tools into study tools, and add genuinely student-specific features. The product is organized **around the student's subjects/courses**: a subject is the spine that ties together schedule, attendance, grades, notes, assignments, and flashcards.

Everything is **database-backed per account** (cross-device, single source of truth) — not browser-local.

## 2. Final Feature Set

### Keep (academic core)
Dashboard · Assignments & to-dos · Class Timetable · Attendance · Focus sessions · Daily Routine · Notes · Academic Goals.

### Keep, reshaped
- **Assignment board** ← Kanban (To-do / Doing / Done for assignments & group projects)
- **Study-hours log** ← Time Tracking (per-subject study hours; complements Focus)
- **Study streaks** ← Habits (daily study-habit streaks; reuses routine tables)
- **Budget** ← Finance (student pocket-money budgeting — see §5)

### Add (new)
- **Subjects/Courses hub** (the spine)
- **Grades / GPA / CGPA tracker**
- **Exams & Deadlines** (with countdown) — replaces Events
- **Flashcards** (spaced repetition)

### Delete completely (frontend only — none exist in the DB)
**Shopping · Contacts · Mood · Events.**
(Events is superseded by Exams & Deadlines.)

> Note: the deleted features and most "tool" features were previously **localStorage-only**; the database never held them. The DB today holds only the academic core (timetable, attendance, tasks, routine, focus).

## 3. Information Architecture (navigation)

Grouped sidebar (12 items + Settings in the profile menu):

- **STUDY** — Dashboard · Subjects · Timetable · Assignments · Exams & Deadlines
- **TRACK** — Attendance · Grades (GPA/CGPA) · Focus & Study-Hours · Budget
- **LEARN** — Notes · Flashcards
- **PLAN** — Habits & Goals *(daily routine + study streaks + academic goals on one page)*
- **Settings** (profile menu)

**Subject hub** is the centerpiece: opening a subject shows its class times, attendance %, current grade, recent notes, open assignments, and flashcard decks. The top-level Attendance / Grades / Notes pages are cross-subject overviews of the same data.

## 4. Data Model

**Clean rebuild, not a migration:** the database is effectively empty (wiped earlier; one demo account we control). We re-init the schema and re-seed the demo account. Low risk.

Conventions: `VARCHAR(50)` UUID primary keys, `user_id` FK to `USERS` with `ON DELETE CASCADE`, `SMALLINT` 0/1 flags, timestamps default `CURRENT_TIMESTAMP` (consistent with the existing schema).

### Kept tables
- **USERS** — unchanged (user_id, email, password_hash, full_name, username, is_verified, verification/reset codes, timestamps).
- **USER_STATS** — unchanged (current_streak, total_goals_completed, last_streak_update).

### The spine
**SUBJECTS**
- subject_id PK · user_id FK · name · code · color · instructor · credit_hours (NUMERIC) · term (VARCHAR) · target_grade (VARCHAR) · is_archived SMALLINT · created_at

**SUBJECT_SCHEDULE** (class times — replaces calendar entries/days)
- schedule_id PK · subject_id FK · day_of_week · start_time · end_time · room

### Hangs off a subject
**ATTENDANCE_RECORDS** (attendance % computed on the fly; ATTENDANCE_SUMMARY dropped)
- record_id PK · user_id FK · subject_id FK · class_date DATE · status (Present/Absent/Late/Excused) · note · created_at

**ASSIGNMENTS** (unified assignments + to-dos; replaces TASKS)
- assignment_id PK · user_id FK · subject_id FK **nullable** (null = general to-do) · title · description · due_date DATE · due_time · priority (low/med/high) · status (todo/doing/done) · board_order INT · is_completed SMALLINT · completed_at · created_at

**GRADES**
- grade_id PK · user_id FK · subject_id FK · title · category (quiz/assignment/midterm/final/project/other) · score NUMERIC · max_score NUMERIC · weight NUMERIC (percent) · graded_date DATE · created_at

**EXAMS_DEADLINES**
- item_id PK · user_id FK · subject_id FK **nullable** · title · type (exam/quiz/deadline/submission) · event_date DATE · event_time · location · notes · is_done SMALLINT · created_at

**NOTES**
- note_id PK · user_id FK · subject_id FK **nullable** · title · body TEXT (markdown) · is_pinned SMALLINT · color · updated_at · created_at

**FLASHCARD_DECKS**
- deck_id PK · user_id FK · subject_id FK **nullable** · name · description · created_at

**FLASHCARDS**
- card_id PK · deck_id FK · front TEXT · back TEXT · box SMALLINT default 1 · due_date DATE · last_reviewed · created_at

**FOCUS_SESSIONS** (kept; extended — doubles as the study-hours log)
- session_id PK · user_id FK · **subject_id FK nullable** · activity_name · duration_set_seconds · actual_done_seconds · start_time · end_time · session_status · remaining_seconds · **source (pomodoro/manual)** · created_at

### Personal (not subject-linked)
**HABITS** (study streaks + daily routine; replaces DAILY_ROUTINE family)
- habit_id PK · user_id FK · name · time (nullable) · color · category (routine/habit) · created_at

**HABIT_REPEAT_DAYS** — id PK · habit_id FK · day_of_week
**HABIT_COMPLETIONS** — id PK · habit_id FK · user_id FK · completion_date DATE · created_at · UNIQUE(habit_id, completion_date)

**GOALS** — goal_id PK · user_id FK · title · description · target_date · is_completed SMALLINT · created_at
**GOAL_MILESTONES** — milestone_id PK · goal_id FK · title · is_done SMALLINT · sort_order INT

**BUDGET_ENTRIES** — entry_id PK · user_id FK · type (income/expense) · amount NUMERIC · category · note · entry_date DATE · created_at
**BUDGET_SETTINGS** — user_id PK/FK · monthly_allowance NUMERIC · currency VARCHAR (default 'PKR') · savings_goal NUMERIC · savings_target_date DATE · updated_at

### Dropped tables
`CALENDAR_LIST`, `CALENDAR_ENTRIES`, `CALENDAR_ENTRY_DAYS` → SUBJECTS + SUBJECT_SCHEDULE.
`TASKS` → ASSIGNMENTS.
`ATTENDANCE_SUMMARY` → computed.
`DAILY_ROUTINE`, `ROUTINE_REPEAT_DAYS`, `ROUTINE_COMPLETIONS` → HABITS family.
`TASK_REMINDER_LOG` → dropped for now (reminders can return later, repointed to assignments).

## 5. Feature Behaviors

- **Subjects hub** — CRUD subjects (name, code, color, credits, instructor, term, target grade). Subject card shows current grade, attendance %, next class. Hub page aggregates that subject's schedule, attendance, grades, notes, assignments, flashcard decks, study hours.
- **Grades / GPA** — per subject, add grade items (score/max/weight/category) → weighted subject % → letter + grade points → **CGPA** weighted by credit-hours. Default 4.0 scale, editable in Settings. Charts: grade breakdown per subject, CGPA trend per term.
- **Exams & Deadlines** — agenda of upcoming exams/quizzes/submissions, **countdown** ("3 days left"), sorted soonest-first, mark done. Dashboard surfaces the nearest few.
- **Flashcards** — decks (per subject or general) of front/back cards. Study mode uses **Leitner spaced repetition**: correct → card moves up a box (longer interval); wrong → back to box 1. "Due today" count drives review.
- **Assignment board** — To-do/Doing/Done columns; cards = assignments; drag updates `status`+`board_order`. Same data as the Assignments list. Filter by subject.
- **Study-hours log** — Focus sessions carry `subject_id`; `source='manual'` allows logging past hours. Charts: hours per subject, per week.
- **Study streaks** — daily study habits with current/best streak + calendar heatmap.
- **Notes** — markdown body, optional subject tag, pin; cross-subject list + per-subject in hub.
- **Goals** — academic goals with milestone checklists and progress.
- **Budget** — students log pocket money/allowance (income) and expenses by category (food, transport, books/supplies, mobile/data, entertainment, misc). Shows monthly allowance vs spent, remaining, and a savings goal. Charts: spending by category, allowance vs spent. Single currency from Settings (default PKR ₨).

## 6. Dashboard (student-focused, adaptive)

Keeps the greeting + clock. Widgets: **Next class** · **Due soon** (assignments) · **Nearest exam countdown** · **Attendance warnings** (subjects < 75%) · **Today's focus + study streak** · **CGPA snapshot** · **Budget remaining** · **Quick-add** (assignment/note). Widgets adapt to which features are enabled.

## 7. Deletions — exact removal list

For each of **Shopping, Contacts, Mood, Events**, remove:
- Page: `frontend/src/Pages/{Shopping,Contacts,Mood,Events}Page.js`
- Feature module: `frontend/src/features/{shopping,contacts,mood,eventsx}/` (logic + hook)
- Dashboard widget: `frontend/src/components/dashboard/widgets/{Shopping,Contacts,Mood,Events}Card.js`
- Registry entries in `frontend/src/components/dashboard/registry.js`
- Routes in the app router; sidebar nav entries
- Settings feature toggles
- i18n keys in `frontend/src/i18n/`
- Tests referencing them
- Orphaned localStorage keys can be ignored (they simply stop being read)

No database changes are required for deletions (these features were never in the DB).

## 8. Backend & Frontend Surface

**Backend** (new/renamed controllers + routes): subjects, assignments (rename from tasks), grades, exams-deadlines, notes, flashcards, budget, habits (rename from routine), goals; update attendance, focus, dashboard. New `postgres-init.sql`. Update `reset-db.js` table list and `seed-user.js` to the new schema.

**Frontend**: pages per nav item + the Subject hub; update `registry.js`, router, `Sidebar`, Settings toggles, i18n. Migrate kept localStorage features (Notes, Goals, Budget, board, study-hours, streaks) to API-backed hooks. Reuse the existing DashKit / charts / UI kit and Indigo Night theme.

## 9. Rollout Phases (each ships working software)

0. **Delete** the 4 cut features (frontend cleanup) — fast, safe.
1. **Schema rebuild + Subjects spine + Subject hub** (calendar→subjects, tasks→assignments, focus subject_id, drop attendance_summary; backend + FE).
2. **Grades / GPA**.
3. **Exams & Deadlines** (replaces Events).
4. **Notes + Goals + Budget → DB**.
5. **Flashcards** (SRS).
6. **Reshape** Assignment board / Study-hours / Study streaks + **Dashboard rework** + re-seed demo.

Each phase is independently planned via the writing-plans skill.

## 10. Testing

- Unit-test pure logic: GPA/CGPA computation, Leitner SRS scheduling, attendance %, budget totals/remaining.
- Keep the existing 243-test suite green; update/remove tests for deleted features.
- Add controller tests per new entity (CRUD + auth scoping by user_id).

## 11. Resolved Decisions

- **Scope:** pure study tool (+ Budget as the one student-life feature, justified by pocket-money budgeting).
- **Structure:** subject-centric.
- **Data:** full DB, subject-centric; migrate kept tools to DB.
- **Budget currency:** single, from Settings, default PKR ₨.
- **Assignments & to-dos:** unified in one table (to-do = assignment with null subject).
- **Routine:** folded into Habits & Goals; routine tables reused for habits.

## 12. Out of Scope (later)

Study planner / revision scheduler, task reminders/notifications, collaboration/study groups, citation helper, multi-currency, dark mode.
