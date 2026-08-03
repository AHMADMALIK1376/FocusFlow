// One-time data migration: copies legacy CALENDAR_*/TASKS/ATTENDANCE_RECORDS rows
// forward into the student-pivot tables (SUBJECTS/SUBJECT_SCHEDULE/ASSIGNMENTS/
// SUBJECT_ATTENDANCE) so no data is lost when the old pages are retired.
//
// Purely additive: only INSERTs into the new tables. Never touches/deletes the
// legacy tables. Safe to re-run (skips rows that already look migrated).
//
// Usage:
//   node backend/scripts/migrate-legacy-data-to-subjects.js           (dry run, prints plan)
//   node backend/scripts/migrate-legacy-data-to-subjects.js --commit  (actually writes)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const COMMIT = process.argv.includes('--commit');

function toISODate(d) {
  if (!d) return null;
  return new Date(d).toISOString().slice(0, 10);
}

async function main() {
  const client = new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query('BEGIN');

  try {
    // ---------------------------------------------------------------------
    // 1. Resolve/create a SUBJECTS row for every distinct CALENDAR_ENTRIES.subject_name,
    //    per user, matching by case-insensitive name where one already exists.
    // ---------------------------------------------------------------------
    const { rows: calEntries } = await client.query(`
      SELECT ce.entry_id, cl.user_id, ce.subject_name
      FROM CALENDAR_ENTRIES ce
      JOIN CALENDAR_LIST cl ON cl.calendar_id = ce.calendar_id
    `);

    const { rows: existingSubjects } = await client.query(`SELECT subject_id, user_id, name FROM SUBJECTS`);
    const subjectKey = (userId, name) => `${userId}::${name.trim().toLowerCase()}`;
    const subjectMap = new Map(); // key -> subject_id
    for (const s of existingSubjects) subjectMap.set(subjectKey(s.user_id, s.name), s.subject_id);

    const newSubjects = [];
    for (const ce of calEntries) {
      const key = subjectKey(ce.user_id, ce.subject_name);
      if (!subjectMap.has(key)) {
        const id = uuidv4();
        subjectMap.set(key, id);
        newSubjects.push({ id, userId: ce.user_id, name: ce.subject_name.trim() });
      }
    }
    console.log(`\n[Subjects] ${newSubjects.length} new subject(s) to create from calendar entries without a match:`);
    newSubjects.forEach((s) => console.log(`   + "${s.name}" for user ${s.userId}`));
    for (const s of newSubjects) {
      await client.query(
        `INSERT INTO SUBJECTS (subject_id, user_id, name, credit_hours, is_archived) VALUES ($1, $2, $3, 3, 0)`,
        [s.id, s.userId, s.name]
      );
    }

    // Entry -> resolved subject_id lookup
    const entrySubject = new Map(); // entry_id -> subject_id
    for (const ce of calEntries) entrySubject.set(ce.entry_id, subjectMap.get(subjectKey(ce.user_id, ce.subject_name)));

    // ---------------------------------------------------------------------
    // 2. CALENDAR_ENTRY_DAYS -> SUBJECT_SCHEDULE
    // ---------------------------------------------------------------------
    const { rows: entryDays } = await client.query(`
      SELECT ced.entry_id, ced.day_of_week, ced.day_start_time, ced.day_end_time, ced.day_room_number
      FROM CALENDAR_ENTRY_DAYS ced
    `);
    let scheduleInserted = 0, scheduleSkipped = 0;
    for (const d of entryDays) {
      const subjectId = entrySubject.get(d.entry_id);
      if (!subjectId) continue;
      const { rows: dupe } = await client.query(
        `SELECT 1 FROM SUBJECT_SCHEDULE WHERE subject_id = $1 AND day_of_week = $2 AND start_time = $3`,
        [subjectId, d.day_of_week, d.day_start_time]
      );
      if (dupe.length) { scheduleSkipped++; continue; }
      await client.query(
        `INSERT INTO SUBJECT_SCHEDULE (schedule_id, subject_id, day_of_week, start_time, end_time, room)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), subjectId, d.day_of_week, d.day_start_time, d.day_end_time, d.day_room_number]
      );
      scheduleInserted++;
    }
    console.log(`\n[Schedule] ${scheduleInserted} inserted, ${scheduleSkipped} already present (skipped)`);

    // ---------------------------------------------------------------------
    // 3. ATTENDANCE_RECORDS -> SUBJECT_ATTENDANCE
    // ---------------------------------------------------------------------
    const { rows: attRecords } = await client.query(`
      SELECT ar.user_id, ar.entry_id, TO_CHAR(ar.class_date,'YYYY-MM-DD') AS class_date, ar.status
      FROM ATTENDANCE_RECORDS ar
      WHERE ar.status IN ('Present','Absent','Late','Excused')
    `);
    let attInserted = 0, attSkipped = 0;
    for (const r of attRecords) {
      const subjectId = entrySubject.get(r.entry_id);
      if (!subjectId) { attSkipped++; continue; }
      const result = await client.query(
        `INSERT INTO SUBJECT_ATTENDANCE (record_id, user_id, subject_id, class_date, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (subject_id, class_date) DO NOTHING`,
        [uuidv4(), r.user_id, subjectId, r.class_date, r.status]
      );
      if (result.rowCount) attInserted++; else attSkipped++;
    }
    console.log(`[Attendance] ${attInserted} inserted, ${attSkipped} skipped (already present or unmatched subject)`);

    // ---------------------------------------------------------------------
    // 4. TASKS -> ASSIGNMENTS (general to-dos; no subject link, task_time kept in note)
    // ---------------------------------------------------------------------
    const { rows: tasks } = await client.query(`
      SELECT task_id, user_id, task_text, TO_CHAR(task_date,'YYYY-MM-DD') AS task_date, task_time, is_completed
      FROM TASKS
    `);
    const { rows: existingAssignments } = await client.query(`SELECT user_id, title, due_date FROM ASSIGNMENTS`);
    const assignmentSeen = new Set(
      existingAssignments.map((a) => `${a.user_id}::${a.title}::${toISODate(a.due_date)}`)
    );
    // Seed per-user/per-column order counters from current counts.
    const { rows: colCounts } = await client.query(
      `SELECT user_id, column_id, COUNT(*)::int AS c FROM ASSIGNMENTS GROUP BY user_id, column_id`
    );
    const orderCounter = new Map(); // `${userId}::${col}` -> next order
    for (const c of colCounts) orderCounter.set(`${c.user_id}::${c.column_id}`, c.c);

    let taskInserted = 0, taskSkipped = 0;
    for (const t of tasks) {
      const dueDate = t.task_date;
      const dedupeKey = `${t.user_id}::${t.task_text}::${dueDate}`;
      if (assignmentSeen.has(dedupeKey)) { taskSkipped++; continue; }
      const col = t.is_completed === 1 ? 'col-done' : 'col-todo';
      const counterKey = `${t.user_id}::${col}`;
      const order = orderCounter.get(counterKey) || 0;
      orderCounter.set(counterKey, order + 1);
      const note = t.task_time ? `Migrated from Tasks · ${t.task_time}` : 'Migrated from Tasks';
      await client.query(
        `INSERT INTO ASSIGNMENTS (assignment_id, user_id, subject_id, title, note, due_date, column_id, board_order)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)`,
        [uuidv4(), t.user_id, t.task_text, note, dueDate, col, order]
      );
      assignmentSeen.add(dedupeKey);
      taskInserted++;
    }
    console.log(`[Tasks->Assignments] ${taskInserted} inserted, ${taskSkipped} skipped (already present)`);

    if (COMMIT) {
      await client.query('COMMIT');
      console.log('\nCOMMITTED — legacy data has been copied into the new tables.');
    } else {
      await client.query('ROLLBACK');
      console.log('\nDRY RUN — nothing written. Re-run with --commit to apply.');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('ERROR (rolled back):', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
