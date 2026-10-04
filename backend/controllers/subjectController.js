const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// Per-subject reminder override in minutes; blank/null → use Settings.
const toOverride = (v) => (v === null || v === undefined || v === '' ? null : Math.max(0, Math.min(1440, Math.round(Number(v)) || 0)));

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
    remindBefore: row.REMIND_BEFORE_MIN,
    attendanceAfter: row.ATTENDANCE_AFTER_MIN,
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
      `SELECT subject_id, name, code, color, instructor, credit_hours, term, target_grade, is_archived, created_at,
              remind_before_min, attendance_after_min
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
      `SELECT subject_id, name, code, color, instructor, credit_hours, term, target_grade, is_archived, created_at,
              remind_before_min, attendance_after_min
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
    const { name, code, color, instructor, creditHours, term, targetGrade, schedule, remindBefore, attendanceAfter } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Subject name is required.' });

    const subjectId = generateId();
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO SUBJECTS (subject_id, user_id, name, code, color, instructor, credit_hours, term, target_grade, is_archived,
         remind_before_min, attendance_after_min)
       VALUES (:id, :userId, :name, :code, :color, :instructor, :creditHours, :term, :targetGrade, 0, :remindBefore, :attendanceAfter)`,
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
        remindBefore: toOverride(remindBefore),
        attendanceAfter: toOverride(attendanceAfter),
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
    // Only touch the reminder overrides when the client sent them.
    const has = (k) => Object.prototype.hasOwnProperty.call(req.body, k);
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
         is_archived = COALESCE(:isArchived, is_archived),
         remind_before_min = CASE WHEN :setRB = 1 THEN CAST(:remindBefore AS INTEGER) ELSE remind_before_min END,
         attendance_after_min = CASE WHEN :setAA = 1 THEN CAST(:attendanceAfter AS INTEGER) ELSE attendance_after_min END
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
        setRB: has('remindBefore') ? 1 : 0,
        remindBefore: toOverride(req.body.remindBefore),
        setAA: has('attendanceAfter') ? 1 : 0,
        attendanceAfter: toOverride(req.body.attendanceAfter),
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
