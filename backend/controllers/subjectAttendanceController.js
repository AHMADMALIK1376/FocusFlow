const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];

// Pure summary: % = (present + late) / (present + absent + late); Excused not counted.
function summarize(records) {
  let present = 0, absent = 0, late = 0, excused = 0;
  for (const r of records) {
    if (r.status === 'Present') present++;
    else if (r.status === 'Absent') absent++;
    else if (r.status === 'Late') late++;
    else if (r.status === 'Excused') excused++;
  }
  const counted = present + absent + late;
  const percentage = counted > 0 ? Math.round(((present + late) / counted) * 100) : null;
  return { present, absent, late, excused, total: records.length, percentage };
}

// GET /api/subject-attendance/subjects/:subjectId
exports.getForSubject = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :id AND user_id = :userId`, { id: req.params.subjectId, userId: req.user.userId });
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });
    const result = await connection.execute(
      `SELECT record_id, TO_CHAR(class_date,'YYYY-MM-DD') AS class_date, status
       FROM SUBJECT_ATTENDANCE WHERE subject_id = :id AND user_id = :userId ORDER BY class_date DESC`,
      { id: req.params.subjectId, userId: req.user.userId }
    );
    const records = result.rows.map((r) => ({ id: r.RECORD_ID, date: r.CLASS_DATE, status: r.STATUS }));
    res.json({ records, summary: summarize(records) });
  } catch (err) {
    console.error('Get subject attendance error:', err);
    res.status(500).json({ error: 'Failed to get attendance.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/subject-attendance/subjects/:subjectId  { date, status }
exports.mark = async (req, res) => {
  let connection;
  try {
    const { date, status } = req.body;
    const st = STATUSES.includes(status) ? status : 'Present';
    connection = await getConnection();
    const owned = await connection.execute(`SELECT subject_id FROM SUBJECTS WHERE subject_id = :id AND user_id = :userId`, { id: req.params.subjectId, userId: req.user.userId });
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });
    await connection.execute(
      `INSERT INTO SUBJECT_ATTENDANCE (record_id, user_id, subject_id, class_date, status)
       VALUES (:id, :userId, :subjectId, :date, :status)
       ON CONFLICT (subject_id, class_date) DO UPDATE SET status = EXCLUDED.status`,
      {
        id: generateId(), userId: req.user.userId, subjectId: req.params.subjectId,
        date: date || new Date().toISOString().slice(0, 10), status: st,
      }
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Failed to mark attendance.' });
  } finally {
    if (connection) await connection.close();
  }
};

// GET /api/subject-attendance/all — every record for the user, across all subjects,
// grouped by date (for the dashboard's contribution-style heatmap).
exports.getAllForUser = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT TO_CHAR(class_date,'YYYY-MM-DD') AS class_date, status
       FROM SUBJECT_ATTENDANCE WHERE user_id = :userId ORDER BY class_date ASC`,
      { userId: req.user.userId }
    );
    const byDate = new Map();
    for (const r of result.rows) {
      const date = r.CLASS_DATE;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push({ status: r.STATUS });
    }
    const days = [...byDate.entries()].map(([date, records]) => ({ date, ...summarize(records) }));
    res.json(days);
  } catch (err) {
    console.error('Get all attendance error:', err);
    res.status(500).json({ error: 'Failed to get attendance.' });
  } finally {
    if (connection) await connection.close();
  }
};

// GET /api/subject-attendance/overview — per-subject percentages plus an overall
// figure, for the dashboard. Replaces the old calendar-entry-based summary.
const AT_RISK_BELOW = 75;

exports.getOverview = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT s.subject_id, s.name, s.color, sa.status
       FROM SUBJECTS s
       LEFT JOIN SUBJECT_ATTENDANCE sa
         ON sa.subject_id = s.subject_id AND sa.user_id = :userId
       WHERE s.user_id = :userId AND s.is_archived = 0`,
      { userId: req.user.userId }
    );

    const bySubject = new Map();
    for (const r of result.rows) {
      if (!bySubject.has(r.SUBJECT_ID)) {
        bySubject.set(r.SUBJECT_ID, { id: r.SUBJECT_ID, name: r.NAME, color: r.COLOR, records: [] });
      }
      // LEFT JOIN yields a null status for subjects with no records yet.
      if (r.STATUS) bySubject.get(r.SUBJECT_ID).records.push({ status: r.STATUS });
    }

    const subjects = [...bySubject.values()].map((s) => {
      const summary = summarize(s.records);
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        ...summary,
        isAtRisk: summary.percentage !== null && summary.percentage < AT_RISK_BELOW,
      };
    });

    // Overall = pooled across every subject, not an average of averages.
    const allRecords = [...bySubject.values()].flatMap((s) => s.records);
    const overall = summarize(allRecords);

    res.json({
      subjects,
      overallPercentage: overall.percentage,
      totalRecords: overall.total,
      subjectsAtRisk: subjects.filter((s) => s.isAtRisk).length,
      atRiskBelow: AT_RISK_BELOW,
    });
  } catch (err) {
    console.error('Get attendance overview error:', err);
    res.status(500).json({ error: 'Failed to get attendance overview.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/subject-attendance/records/:recordId
exports.remove = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`DELETE FROM SUBJECT_ATTENDANCE WHERE record_id = :id AND user_id = :userId`, { id: req.params.recordId, userId: req.user.userId });
    if (!result.rowsAffected) return res.status(404).json({ error: 'Record not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Remove attendance error:', err);
    res.status(500).json({ error: 'Failed to remove record.' });
  } finally {
    if (connection) await connection.close();
  }
};
