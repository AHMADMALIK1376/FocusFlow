-- ==============================================
-- FOCUSFLOW POSTGRESQL SCHEMA (migrated from Oracle)
-- Run via: node scripts/run-init.js  (or paste into Supabase SQL editor)
-- Flags use SMALLINT (0/1) and percentage uses DOUBLE PRECISION so the
-- existing controllers' comparisons/math keep working unchanged.
--
-- ⚠️ Section 1 (legacy core) is a destructive DROP+CREATE — it wipes
--    USERS/CALENDAR_*/TASKS/DAILY_ROUTINE/FOCUS_SESSIONS/ATTENDANCE_*
--    every time it runs. Only run this against a fresh/demo database.
-- Section 2 (student-pivot tables) was previously spread across 11
--    separate backend/scripts/migrate-*.js files, each run by hand
--    against Supabase. They're consolidated here, unchanged in shape,
--    using the same idempotent CREATE TABLE IF NOT EXISTS pattern those
--    scripts used — so re-running this file is safe and won't drop or
--    touch any existing SUBJECTS/GRADES/ASSIGNMENTS/etc. data.
-- ==============================================

DROP TABLE IF EXISTS TASK_REMINDER_LOG CASCADE;
DROP TABLE IF EXISTS ATTENDANCE_SUMMARY CASCADE;
DROP TABLE IF EXISTS ATTENDANCE_RECORDS CASCADE;
DROP TABLE IF EXISTS FOCUS_SESSIONS CASCADE;
DROP TABLE IF EXISTS ROUTINE_COMPLETIONS CASCADE;
DROP TABLE IF EXISTS ROUTINE_REPEAT_DAYS CASCADE;
DROP TABLE IF EXISTS DAILY_ROUTINE CASCADE;
DROP TABLE IF EXISTS TASKS CASCADE;
DROP TABLE IF EXISTS CALENDAR_ENTRY_DAYS CASCADE;
DROP TABLE IF EXISTS CALENDAR_ENTRIES CASCADE;
DROP TABLE IF EXISTS CALENDAR_LIST CASCADE;
DROP TABLE IF EXISTS USER_STATS CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;

CREATE TABLE USERS (
  user_id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  username VARCHAR(50),
  is_verified SMALLINT DEFAULT 0,
  verification_code VARCHAR(10),
  verification_code_expires TIMESTAMP,
  reset_code VARCHAR(10),
  reset_code_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE USER_STATS (
  user_id VARCHAR(50) PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  total_goals_completed INTEGER DEFAULT 0,
  last_streak_update DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CALENDAR_LIST (
  calendar_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  calendar_title VARCHAR(200) NOT NULL,
  is_active SMALLINT DEFAULT 0,
  semester_start DATE,
  semester_end DATE,
  semester_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CALENDAR_ENTRIES (
  entry_id VARCHAR(50) PRIMARY KEY,
  calendar_id VARCHAR(50) NOT NULL REFERENCES CALENDAR_LIST(calendar_id) ON DELETE CASCADE,
  subject_name VARCHAR(200) NOT NULL,
  start_time VARCHAR(10),
  end_time VARCHAR(10),
  room_number VARCHAR(50),
  is_done SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CALENDAR_ENTRY_DAYS (
  entry_day_id VARCHAR(50) PRIMARY KEY,
  entry_id VARCHAR(50) NOT NULL REFERENCES CALENDAR_ENTRIES(entry_id) ON DELETE CASCADE,
  day_of_week VARCHAR(10),
  day_start_time VARCHAR(10),
  day_end_time VARCHAR(10),
  day_room_number VARCHAR(50),
  CONSTRAINT unique_entry_day UNIQUE (entry_id, day_of_week)
);

CREATE TABLE TASKS (
  task_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  task_text VARCHAR(500) NOT NULL,
  task_date DATE NOT NULL,
  task_time VARCHAR(10),
  task_type VARCHAR(50),
  is_completed SMALLINT DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE DAILY_ROUTINE (
  routine_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  activity_name VARCHAR(200) NOT NULL,
  activity_time VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ROUTINE_REPEAT_DAYS (
  repeat_day_id VARCHAR(50) PRIMARY KEY,
  routine_id VARCHAR(50) NOT NULL REFERENCES DAILY_ROUTINE(routine_id) ON DELETE CASCADE,
  day_of_week VARCHAR(20),
  color VARCHAR(20),
  CONSTRAINT unique_routine_day UNIQUE (routine_id, day_of_week)
);

CREATE TABLE ROUTINE_COMPLETIONS (
  completion_id VARCHAR(50) PRIMARY KEY,
  routine_id VARCHAR(50) NOT NULL REFERENCES DAILY_ROUTINE(routine_id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_routine_date UNIQUE (routine_id, completion_date)
);

CREATE TABLE FOCUS_SESSIONS (
  session_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  activity_name VARCHAR(200) NOT NULL,
  duration_set_seconds INTEGER,
  actual_done_seconds INTEGER,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  session_status VARCHAR(20),
  remaining_seconds INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ATTENDANCE_RECORDS (
  record_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  entry_id VARCHAR(50) NOT NULL REFERENCES CALENDAR_ENTRIES(entry_id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  points_earned INTEGER DEFAULT 0,
  points_possible INTEGER DEFAULT 2,
  remarks VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_attendance_record UNIQUE (user_id, entry_id, class_date)
);

CREATE TABLE ATTENDANCE_SUMMARY (
  summary_id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  entry_id VARCHAR(50) NOT NULL REFERENCES CALENDAR_ENTRIES(entry_id) ON DELETE CASCADE,
  total_sessions INTEGER DEFAULT 0,
  attended_sessions INTEGER DEFAULT 0,
  absent_sessions INTEGER DEFAULT 0,
  upcoming_sessions INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_points_possible INTEGER DEFAULT 0,
  percentage DOUBLE PRECISION DEFAULT 0,
  is_warning SMALLINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_attendance_summary UNIQUE (user_id, entry_id)
);

CREATE TABLE TASK_REMINDER_LOG (
  reminder_id VARCHAR(50) PRIMARY KEY,
  task_id VARCHAR(50) NOT NULL REFERENCES TASKS(task_id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  reminder_type VARCHAR(20),
  reminder_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tasks_user_date ON TASKS(user_id, task_date);
CREATE INDEX idx_tasks_user_completed ON TASKS(user_id, is_completed);
CREATE INDEX idx_calendar_user ON CALENDAR_LIST(user_id);
CREATE INDEX idx_calendar_active ON CALENDAR_LIST(user_id, is_active);
CREATE INDEX idx_routine_user ON DAILY_ROUTINE(user_id);
CREATE INDEX idx_focus_user ON FOCUS_SESSIONS(user_id, start_time);
CREATE INDEX idx_calendar_entries ON CALENDAR_ENTRIES(calendar_id);
CREATE INDEX idx_attendance_user_entry ON ATTENDANCE_RECORDS(user_id, entry_id);
CREATE INDEX idx_attendance_status_date ON ATTENDANCE_RECORDS(status, class_date);
CREATE INDEX idx_summary_user_entry ON ATTENDANCE_SUMMARY(user_id, entry_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON USERS
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_userstats_updated BEFORE UPDATE ON USER_STATS
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ==============================================
-- SECTION 2: STUDENT-PIVOT TABLES (additive, idempotent)
-- Consolidated from backend/scripts/migrate-*.js (2026-06-29 pivot).
-- Source of truth for exact shape: those scripts + the design spec at
-- docs/superpowers/specs/2026-06-29-student-focused-pivot-design.md
-- ==============================================

-- Subjects (the spine) -------------------------------------------------
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

-- Subject attendance (parallel to legacy ATTENDANCE_RECORDS above) ----
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

-- Assignments (unified assignments + to-dos; parallel to legacy TASKS) -
CREATE TABLE IF NOT EXISTS ASSIGNMENTS (
  assignment_id VARCHAR(50) PRIMARY KEY,
  user_id       VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id    VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title         VARCHAR(300) NOT NULL,
  note          VARCHAR(1000),
  due_date      DATE,
  column_id     VARCHAR(20) DEFAULT 'col-todo',
  board_order   INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON ASSIGNMENTS(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON ASSIGNMENTS(subject_id);

-- Grades / GPA -----------------------------------------------------------
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

-- Exams & deadlines --------------------------------------------------------
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

-- Notes --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS NOTES (
  note_id    VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title      VARCHAR(300),
  body       TEXT,
  is_pinned  SMALLINT DEFAULT 0,
  color      VARCHAR(20),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON NOTES(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON NOTES(subject_id);

-- Goals ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS GOALS (
  goal_id      VARCHAR(50) PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  description  VARCHAR(1000),
  target_date  DATE,
  is_completed SMALLINT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS GOAL_MILESTONES (
  milestone_id VARCHAR(50) PRIMARY KEY,
  goal_id      VARCHAR(50) NOT NULL REFERENCES GOALS(goal_id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  is_done      SMALLINT DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON GOALS(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal ON GOAL_MILESTONES(goal_id);

-- Budget -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS BUDGET_ENTRIES (
  entry_id   VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  type       VARCHAR(10) NOT NULL,
  amount     DOUBLE PRECISION NOT NULL,
  category   VARCHAR(100),
  note       VARCHAR(300),
  entry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS BUDGET_SETTINGS (
  user_id           VARCHAR(50) PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
  monthly_allowance DOUBLE PRECISION DEFAULT 0,
  currency          VARCHAR(10) DEFAULT 'PKR',
  savings_goal      DOUBLE PRECISION DEFAULT 0,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_budget_user ON BUDGET_ENTRIES(user_id, entry_date);

-- Flashcards -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS FLASHCARD_DECKS (
  deck_id     VARCHAR(50) PRIMARY KEY,
  user_id     VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id  VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  name        VARCHAR(200) NOT NULL,
  description VARCHAR(500),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS FLASHCARDS (
  card_id       VARCHAR(50) PRIMARY KEY,
  deck_id       VARCHAR(50) NOT NULL REFERENCES FLASHCARD_DECKS(deck_id) ON DELETE CASCADE,
  front         TEXT NOT NULL,
  back          TEXT NOT NULL,
  box           SMALLINT DEFAULT 1,
  due_date      DATE,
  last_reviewed TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_decks_user ON FLASHCARD_DECKS(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON FLASHCARDS(deck_id);

-- Habits / study streaks ------------------------------------------------
CREATE TABLE IF NOT EXISTS HABITS (
  habit_id   VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  color      VARCHAR(20) DEFAULT 'brand',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS HABIT_LOG (
  log_id   VARCHAR(50) PRIMARY KEY,
  habit_id VARCHAR(50) NOT NULL REFERENCES HABITS(habit_id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  CONSTRAINT uniq_habit_day UNIQUE (habit_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON HABITS(user_id);
CREATE INDEX IF NOT EXISTS idx_habitlog_habit ON HABIT_LOG(habit_id);

-- Study hours (manual log; complements FOCUS_SESSIONS pomodoro data) ---
CREATE TABLE IF NOT EXISTS STUDY_HOURS (
  entry_id   VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  label      VARCHAR(300),
  seconds    INTEGER DEFAULT 0,
  start_time TIMESTAMP,
  end_time   TIMESTAMP,
  entry_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_studyhours_user ON STUDY_HOURS(user_id, entry_date);
