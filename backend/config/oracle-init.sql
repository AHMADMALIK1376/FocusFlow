-- ==============================================
-- FOCUSFLOW ORACLE DATABASE INITIALIZATION
-- Run this in Oracle SQL Developer or SQLcl
-- ==============================================

-- Drop tables if they exist (in reverse order of dependencies)
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE FOCUS_SESSIONS CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE ROUTINE_COMPLETIONS CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE ROUTINE_REPEAT_DAYS CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE DAILY_ROUTINE CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE TASKS CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE CALENDAR_ENTRY_DAYS CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE CALENDAR_ENTRIES CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE CALENDAR_LIST CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE USER_STATS CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE USERS CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

-- 1. USERS TABLE
CREATE TABLE USERS (
    user_id VARCHAR2(50) PRIMARY KEY,
    email VARCHAR2(255) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    full_name VARCHAR2(100),
    username VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER_STATS TABLE
CREATE TABLE USER_STATS (
    user_id VARCHAR2(50) PRIMARY KEY,
    current_streak NUMBER DEFAULT 0,
    total_goals_completed NUMBER DEFAULT 0,
    last_streak_update DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 3. CALENDAR_LIST
CREATE TABLE CALENDAR_LIST (
    calendar_id VARCHAR2(50) PRIMARY KEY,
    user_id VARCHAR2(50) NOT NULL,
    calendar_title VARCHAR2(200) NOT NULL,
    is_active NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_calendar_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 4. CALENDAR_ENTRIES
CREATE TABLE CALENDAR_ENTRIES (
    entry_id VARCHAR2(50) PRIMARY KEY,
    calendar_id VARCHAR2(50) NOT NULL,
    subject_name VARCHAR2(200) NOT NULL,
    start_time VARCHAR2(10),
    end_time VARCHAR2(10),
    room_number VARCHAR2(50),
    is_done NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entry_calendar FOREIGN KEY (calendar_id) REFERENCES CALENDAR_LIST(calendar_id) ON DELETE CASCADE
);

-- 5. CALENDAR_ENTRY_DAYS
CREATE TABLE CALENDAR_ENTRY_DAYS (
    entry_day_id VARCHAR2(50) PRIMARY KEY,
    entry_id VARCHAR2(50) NOT NULL,
    day_of_week VARCHAR2(10),
    CONSTRAINT fk_day_entry FOREIGN KEY (entry_id) REFERENCES CALENDAR_ENTRIES(entry_id) ON DELETE CASCADE,
    CONSTRAINT unique_entry_day UNIQUE (entry_id, day_of_week)
);

-- 6. TASKS
CREATE TABLE TASKS (
    task_id VARCHAR2(50) PRIMARY KEY,
    user_id VARCHAR2(50) NOT NULL,
    task_text VARCHAR2(500) NOT NULL,
    task_date DATE NOT NULL,
    task_time VARCHAR2(10),
    task_type VARCHAR2(50),
    is_completed NUMBER(1) DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 7. DAILY_ROUTINE
CREATE TABLE DAILY_ROUTINE (
    routine_id VARCHAR2(50) PRIMARY KEY,
    user_id VARCHAR2(50) NOT NULL,
    activity_name VARCHAR2(200) NOT NULL,
    activity_time VARCHAR2(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_routine_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 8. ROUTINE_REPEAT_DAYS
CREATE TABLE ROUTINE_REPEAT_DAYS (
    repeat_day_id VARCHAR2(50) PRIMARY KEY,
    routine_id VARCHAR2(50) NOT NULL,
    day_of_week VARCHAR2(20),
    CONSTRAINT fk_repeat_routine FOREIGN KEY (routine_id) REFERENCES DAILY_ROUTINE(routine_id) ON DELETE CASCADE,
    CONSTRAINT unique_routine_day UNIQUE (routine_id, day_of_week)
);

-- 9. ROUTINE_COMPLETIONS
CREATE TABLE ROUTINE_COMPLETIONS (
    completion_id VARCHAR2(50) PRIMARY KEY,
    routine_id VARCHAR2(50) NOT NULL,
    user_id VARCHAR2(50) NOT NULL,
    completion_date DATE NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_completion_routine FOREIGN KEY (routine_id) REFERENCES DAILY_ROUTINE(routine_id) ON DELETE CASCADE,
    CONSTRAINT fk_completion_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_routine_date UNIQUE (routine_id, completion_date)
);

-- 10. FOCUS_SESSIONS
CREATE TABLE FOCUS_SESSIONS (
    session_id VARCHAR2(50) PRIMARY KEY,
    user_id VARCHAR2(50) NOT NULL,
    activity_name VARCHAR2(200) NOT NULL,
    duration_set_seconds NUMBER,
    actual_done_seconds NUMBER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    session_status VARCHAR2(20),
    remaining_seconds NUMBER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_tasks_user_date ON TASKS(user_id, task_date);
CREATE INDEX idx_tasks_user_completed ON TASKS(user_id, is_completed);
CREATE INDEX idx_calendar_user ON CALENDAR_LIST(user_id);
CREATE INDEX idx_calendar_active ON CALENDAR_LIST(user_id, is_active);
CREATE INDEX idx_routine_user ON DAILY_ROUTINE(user_id);
CREATE INDEX idx_focus_user ON FOCUS_SESSIONS(user_id, start_time);
CREATE INDEX idx_calendar_entries ON CALENDAR_ENTRIES(calendar_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER update_users_updated_at
BEFORE UPDATE ON USERS
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER update_stats_updated_at
BEFORE UPDATE ON USER_STATS
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Insert sample user (password is "password123" hashed with bcrypt)
-- This is just for testing. Remove in production.
INSERT INTO USERS (user_id, email, password_hash, full_name, username) 
VALUES ('user_001', 'test@focusflow.com', '$2a$10$rQdXQ4XQ4XQ4XQ4XQ4XQ4u', 'Test User', 'testuser');

INSERT INTO USER_STATS (user_id, current_streak, total_goals_completed) 
VALUES ('user_001', 5, 12);

COMMIT;

SELECT '✅ Database initialized successfully!' AS status FROM DUAL;