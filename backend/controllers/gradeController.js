const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { subjectGrade, cgpa } = require('../utils/gpa');

function toGrade(r) {
  return {
    id: r.GRADE_ID,
    subjectId: r.SUBJECT_ID,
    title: r.TITLE,
    category: r.CATEGORY,
    score: r.SCORE,
    maxScore: r.MAX_SCORE,
    weight: r.WEIGHT,
    gradedDate: r.GRADED_DATE,
    createdAt: r.CREATED_AT,
  };
}

// GET /api/grades  (optional ?subjectId=)
exports.getGrades = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const { subjectId } = req.query;
    const cols = `grade_id, subject_id, title, category, score, max_score, weight, TO_CHAR(graded_date,'YYYY-MM-DD') AS graded_date, created_at`;
    const sql = subjectId
      ? `SELECT ${cols} FROM GRADES WHERE user_id = :userId AND subject_id = :subjectId ORDER BY created_at DESC`
      : `SELECT ${cols} FROM GRADES WHERE user_id = :userId ORDER BY created_at DESC`;
    const binds = subjectId ? { userId: req.user.userId, subjectId } : { userId: req.user.userId };
    const result = await connection.execute(sql, binds);
    res.json(result.rows.map(toGrade));
  } catch (err) {
    console.error('Get grades error:', err);
    res.status(500).json({ error: 'Failed to get grades.' });
  } finally {
    if (connection) await connection.close();
  }
};

// POST /api/grades
exports.createGrade = async (req, res) => {
  let connection;
  try {
    const { subjectId, title, category, score, maxScore, weight, gradedDate } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'subjectId is required.' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'Grade title is required.' });
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT subject_id FROM SUBJECTS WHERE subject_id = :subjectId AND user_id = :userId`,
      { subjectId, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Subject not found.' });
    const gradeId = generateId();
    await connection.execute(
      `INSERT INTO GRADES (grade_id, user_id, subject_id, title, category, score, max_score, weight, graded_date)
       VALUES (:id, :userId, :subjectId, :title, :category, :score, :maxScore, :weight, :gradedDate)`,
      {
        id: gradeId, userId: req.user.userId, subjectId, title: title.trim(),
        category: category || null,
        score: score != null ? Number(score) : null,
        maxScore: maxScore != null ? Number(maxScore) : null,
        weight: weight != null ? Number(weight) : 0,
        gradedDate: gradedDate || null,
      }
    );
    res.status(201).json({ success: true, id: gradeId });
  } catch (err) {
    console.error('Create grade error:', err);
    res.status(500).json({ error: 'Failed to create grade.' });
  } finally {
    if (connection) await connection.close();
  }
};

// PUT /api/grades/:id  (client sends the full grade object)
exports.updateGrade = async (req, res) => {
  let connection;
  try {
    const { title, category, score, maxScore, weight, gradedDate } = req.body;
    connection = await getConnection();
    const owned = await connection.execute(
      `SELECT grade_id FROM GRADES WHERE grade_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Grade not found.' });
    await connection.execute(
      `UPDATE GRADES SET
         title = COALESCE(:title, title),
         category = :category,
         score = :score,
         max_score = :maxScore,
         weight = COALESCE(:weight, weight),
         graded_date = :gradedDate
       WHERE grade_id = :id AND user_id = :userId`,
      {
        title: title != null ? String(title).trim() : null,
        category: category != null ? category : null,
        score: score != null ? Number(score) : null,
        maxScore: maxScore != null ? Number(maxScore) : null,
        weight: weight != null ? Number(weight) : null,
        gradedDate: gradedDate != null ? gradedDate : null,
        id: req.params.id, userId: req.user.userId,
      }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update grade error:', err);
    res.status(500).json({ error: 'Failed to update grade.' });
  } finally {
    if (connection) await connection.close();
  }
};

// DELETE /api/grades/:id
exports.deleteGrade = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM GRADES WHERE grade_id = :id AND user_id = :userId`,
      { id: req.params.id, userId: req.user.userId }
    );
    if (!result.rowsAffected) return res.status(404).json({ error: 'Grade not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete grade error:', err);
    res.status(500).json({ error: 'Failed to delete grade.' });
  } finally {
    if (connection) await connection.close();
  }
};

// GET /api/grades/gpa  — per-subject grade + overall CGPA
exports.getGpa = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const subs = await connection.execute(
      `SELECT subject_id, name, code, color, credit_hours
       FROM SUBJECTS WHERE user_id = :userId AND is_archived = 0 ORDER BY created_at DESC`,
      { userId: req.user.userId }
    );
    const grades = await connection.execute(
      `SELECT subject_id, score, max_score, weight FROM GRADES WHERE user_id = :userId`,
      { userId: req.user.userId }
    );
    const bySubject = {};
    for (const g of grades.rows) {
      (bySubject[g.SUBJECT_ID] = bySubject[g.SUBJECT_ID] || []).push({ score: g.SCORE, maxScore: g.MAX_SCORE, weight: g.WEIGHT });
    }
    const subjects = subs.rows.map((s) => {
      const items = bySubject[s.SUBJECT_ID] || [];
      const g = subjectGrade(items);
      return {
        subjectId: s.SUBJECT_ID,
        name: s.NAME,
        code: s.CODE,
        color: s.COLOR,
        creditHours: s.CREDIT_HOURS,
        itemCount: items.length,
        percent: g ? g.percent : null,
        letter: g ? g.letter : null,
        points: g ? g.points : null,
      };
    });
    const totalCredits = subjects.reduce((sum, s) => sum + (s.letter ? Number(s.creditHours) || 0 : 0), 0);
    const overall = cgpa(subs.rows.map((s) => ({ creditHours: s.CREDIT_HOURS, grades: bySubject[s.SUBJECT_ID] || [] })));
    res.json({ cgpa: overall, totalCredits, subjects });
  } catch (err) {
    console.error('Get GPA error:', err);
    res.status(500).json({ error: 'Failed to compute GPA.' });
  } finally {
    if (connection) await connection.close();
  }
};
