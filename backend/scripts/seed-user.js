// Seeds a ready-to-use demo account with data across the DB-backed features
// (tasks, routine, calendar/schedule, focus sessions, attendance, stats).
// Usage: node scripts/seed-user.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const EMAIL = 'ahmadmalik1376@gmail.com';
const PASSWORD = '411711376';
const FULL_NAME = 'Ahmad Malik';
const USERNAME = 'ahmadmalik';

const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const at = (dayOffset, h, m = 0) => { const d = addDays(dayOffset); d.setHours(h, m, 0, 0); return d; };

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
  const q = (sql, params) => client.query(sql, params);

  // ── Fresh user (cascade-clears any prior data for this email) ──────────────
  await q('DELETE FROM users WHERE email = $1', [EMAIL]);
  const userId = uuid();
  const hash = bcrypt.hashSync(PASSWORD, 10);
  await q(
    `INSERT INTO users (user_id, email, password_hash, full_name, username, is_verified)
     VALUES ($1,$2,$3,$4,$5,1)`,
    [userId, EMAIL, hash, FULL_NAME, USERNAME]
  );
  await q(
    `INSERT INTO user_stats (user_id, current_streak, total_goals_completed, last_streak_update)
     VALUES ($1, 6, 9, $2)`,
    [userId, ymd(new Date())]
  );

  // ── Tasks: a spread across the week so the activity chart fills ────────────
  const POOL = [
    'Finish DS assignment', 'Review lecture notes', 'Read chapter 4', 'Gym session',
    'Group project sync', 'Prep for quiz', 'Submit lab report', 'Email professor',
    'Practice LeetCode', 'Plan weekend', 'Update portfolio', 'Water the plants',
    'Call home', 'Backup laptop', 'Outline essay', 'Stretch + walk',
  ];
  let pick = 0;
  let tasks = 0, tasksDone = 0;
  for (let i = -6; i <= 1; i++) {
    const count = i === 0 ? 4 : 2;
    for (let j = 0; j < count; j++) {
      const text = POOL[pick++ % POOL.length];
      // past days mostly done; today: first 2 done; future: pending
      const done = i < 0 ? (j === 0 || Math.random() < 0.6) : i === 0 ? j < 2 : false;
      await q(
        `INSERT INTO tasks (task_id, user_id, task_text, task_date, task_time, task_type, is_completed, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuid(), userId, text, ymd(addDays(i)), `${9 + j}:00`, 'task', done ? 1 : 0, done ? at(i, 9 + j) : null]
      );
      tasks++; if (done) tasksDone++;
    }
  }

  // ── Daily routine ──────────────────────────────────────────────────────────
  const routines = [
    ['Morning workout', '07:00', ['Monday', 'Wednesday', 'Friday'], 'brand'],
    ['Deep work block', '10:00', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 'info'],
    ['Read 30 minutes', '21:00', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 'success'],
  ];
  for (const [name, time, days, color] of routines) {
    const rid = uuid();
    await q(`INSERT INTO daily_routine (routine_id, user_id, activity_name, activity_time) VALUES ($1,$2,$3,$4)`, [rid, userId, name, time]);
    for (const day of days) {
      await q(`INSERT INTO routine_repeat_days (repeat_day_id, routine_id, day_of_week, color) VALUES ($1,$2,$3,$4)`, [uuid(), rid, day, color]);
    }
  }

  // ── Calendar + classes (drives "Today's schedule" + attendance) ────────────
  const calId = uuid();
  await q(
    `INSERT INTO calendar_list (calendar_id, user_id, calendar_title, is_active, semester_start, semester_end, semester_name)
     VALUES ($1,$2,$3,1,$4,$5,$6)`,
    [calId, userId, 'Iqra University — Fall 2026', ymd(addDays(-30)), ymd(addDays(90)), 'Fall 2026']
  );
  const subjects = [
    ['Data Structures', '09:00', '10:30', 'A-101', ['Monday', 'Wednesday']],
    ['Database Systems', '11:00', '12:30', 'B-204', ['Tuesday', 'Thursday']],
    ['Operating Systems', '13:00', '14:30', 'C-310', ['Monday', 'Wednesday', 'Friday']],
    ['Calculus II', '15:00', '16:30', 'D-110', ['Tuesday', 'Thursday']],
  ];
  const entryIds = [];
  for (const [name, st, et, room, days] of subjects) {
    const eid = uuid();
    await q(`INSERT INTO calendar_entries (entry_id, calendar_id, subject_name, start_time, end_time, room_number) VALUES ($1,$2,$3,$4,$5,$6)`, [eid, calId, name, st, et, room]);
    for (const day of days) {
      await q(`INSERT INTO calendar_entry_days (entry_day_id, entry_id, day_of_week, day_start_time, day_end_time, day_room_number) VALUES ($1,$2,$3,$4,$5,$6)`, [uuid(), eid, day, st, et, room]);
    }
    entryIds.push(eid);
  }

  // ── Focus sessions (drives Focus count + ring) ─────────────────────────────
  const focusNames = ['Data Structures', 'Reading', 'Assignment', 'Revision', 'Coding practice', 'Project'];
  for (let i = 0; i < 6; i++) {
    const dur = 25 * 60;
    await q(
      `INSERT INTO focus_sessions (session_id, user_id, activity_name, duration_set_seconds, actual_done_seconds, start_time, end_time, session_status, remaining_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'completed',0)`,
      [uuid(), userId, focusNames[i], dur, dur, at(-i, 10), at(-i, 10, 25)]
    );
  }

  // ── Attendance: records + summary per subject (~85% attended) ──────────────
  for (const eid of entryIds) {
    const total = 12, attended = 10, absent = 2;
    for (let i = 0; i < total; i++) {
      const status = i < attended ? 'Present' : 'Absent';
      await q(
        `INSERT INTO attendance_records (record_id, user_id, entry_id, class_date, status, points_earned, points_possible)
         VALUES ($1,$2,$3,$4,$5,$6,2)`,
        [uuid(), userId, eid, ymd(addDays(-(i * 2 + 1))), status, status === 'Present' ? 2 : 0]
      );
    }
    const pct = Math.round((attended / total) * 1000) / 10;
    await q(
      `INSERT INTO attendance_summary (summary_id, user_id, entry_id, total_sessions, attended_sessions, absent_sessions, upcoming_sessions, total_points_earned, total_points_possible, percentage, is_warning)
       VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10)`,
      [uuid(), userId, eid, total, attended, absent, attended * 2, total * 2, pct, pct < 75 ? 1 : 0]
    );
  }

  console.log('✅ Seeded DB account:', EMAIL);
  console.log(`   user_id: ${userId}`);
  console.log(`   tasks: ${tasks} (${tasksDone} done) · focus: 6 · subjects: ${subjects.length} · routines: ${routines.length}`);
  console.log('   login: ahmadmalik1376@gmail.com / 411711376');
  await client.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
