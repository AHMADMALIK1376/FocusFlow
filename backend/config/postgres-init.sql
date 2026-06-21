-- ==============================================
-- FOCUSFLOW POSTGRESQL SCHEMA (migrated from Oracle)
-- Run via: node scripts/run-init.js  (or paste into Supabase SQL editor)
-- Flags use SMALLINT (0/1) and percentage uses DOUBLE PRECISION so the
-- existing controllers' comparisons/math keep working unchanged.
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
