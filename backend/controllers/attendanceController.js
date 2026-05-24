const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { calculateAttendance, sendAttendanceWarning } = require('../services/attendanceService');

// =====================================================
// GET ATTENDANCE DASHBOARD
// =====================================================
exports.getAttendanceDashboard = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT 
                COUNT(DISTINCT ce.entry_id) as total_subjects,
                NVL(SUM(s.total_points_earned), 0) as total_earned,
                NVL(SUM(s.total_points_possible), 0) as total_possible,
                ROUND(NVL(AVG(s.percentage), 0), 1) as overall_percentage,
                SUM(CASE WHEN NVL(s.percentage, 0) < 60 THEN 1 ELSE 0 END) as subjects_at_risk,
                SUM(CASE WHEN NVL(s.percentage, 0) >= 60 AND NVL(s.percentage, 0) < 75 THEN 1 ELSE 0 END) as subjects_warning,
                SUM(CASE WHEN NVL(s.percentage, 0) >= 75 THEN 1 ELSE 0 END) as subjects_safe
             FROM CALENDAR_ENTRIES ce
             JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
             LEFT JOIN ATTENDANCE_SUMMARY s ON ce.entry_id = s.entry_id AND s.user_id = :userId
             WHERE cl.user_id = :userId AND cl.is_active = 1`,
            { userId: req.user.userId }
        );
        
        const row = result.rows[0];
        
        res.json({
            totalSubjects: row.TOTAL_SUBJECTS || 0,
            totalEarned: row.TOTAL_EARNED || 0,
            totalPossible: row.TOTAL_POSSIBLE || 0,
            overallPercentage: row.OVERALL_PERCENTAGE || 0,
            subjectsAtRisk: row.SUBJECTS_AT_RISK || 0,
            subjectsWarning: row.SUBJECTS_WARNING || 0,
            subjectsSafe: row.SUBJECTS_SAFE || 0
        });
        
    } catch (err) {
        console.error('Get attendance dashboard error:', err.message);
        res.status(500).json({ error: 'Failed to get attendance dashboard' });
    } finally {
        if (connection) await connection.close();
    }
};

// =====================================================
// GET ATTENDANCE SUMMARY FOR ALL SUBJECTS
// =====================================================
exports.getAttendanceSummary = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        // Get all subjects from active calendar
        const result = await connection.execute(
            `SELECT 
                ce.entry_id,
                ce.subject_name,
                ce.start_time,
                ce.end_time,
                ce.room_number,
                NVL(s.total_sessions, 0) as total_sessions,
                NVL(s.attended_sessions, 0) as attended_sessions,
                NVL(s.total_points_earned, 0) as total_points_earned,
                NVL(s.total_points_possible, 0) as total_points_possible,
                NVL(s.percentage, 0) as percentage,
                NVL(s.is_warning, 0) as is_warning
             FROM CALENDAR_ENTRIES ce
             JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
             LEFT JOIN ATTENDANCE_SUMMARY s ON ce.entry_id = s.entry_id AND s.user_id = :userId
             WHERE cl.user_id = :userId AND cl.is_active = 1
             ORDER BY NVL(s.percentage, 0) ASC`,
            { userId: req.user.userId }
        );
        
        const subjects = [];
        for (const row of result.rows) {
            // Get days for this subject
            const daysResult = await connection.execute(
                `SELECT day_of_week FROM CALENDAR_ENTRY_DAYS 
                 WHERE entry_id = :entryId 
                 ORDER BY day_of_week`,
                { entryId: row.ENTRY_ID }
            );
            const days = daysResult.rows.map(d => d.DAY_OF_WEEK).join(', ');
            
            // Get absent and upcoming counts from attendance records
            const statsResult = await connection.execute(
                `SELECT 
                    SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
                    SUM(CASE WHEN status = 'Pending' AND class_date > SYSDATE THEN 1 ELSE 0 END) as upcoming
                 FROM ATTENDANCE_RECORDS 
                 WHERE user_id = :userId AND entry_id = :entryId`,
                { 
                    userId: req.user.userId, 
                    entryId: row.ENTRY_ID 
                }
            );
            
            subjects.push({
                entryId: row.ENTRY_ID,
                subjectName: row.SUBJECT_NAME,
                startTime: row.START_TIME,
                endTime: row.END_TIME,
                roomNumber: row.ROOM_NUMBER,
                days: days,
                totalSessions: row.TOTAL_SESSIONS,
                attendedSessions: row.ATTENDED_SESSIONS,
                absentSessions: statsResult.rows[0].ABSENT || 0,
                upcomingSessions: statsResult.rows[0].UPCOMING || 0,
                totalPointsEarned: row.TOTAL_POINTS_EARNED,
                totalPointsPossible: row.TOTAL_POINTS_POSSIBLE,
                percentage: row.PERCENTAGE,
                isWarning: row.IS_WARNING === 1
            });
        }
        
        console.log(`✅ Attendance summary: ${subjects.length} subjects`);
        res.json(subjects);
        
    } catch (err) {
        console.error('Get attendance summary error:', err.message);
        res.status(500).json({ error: 'Failed to get attendance summary' });
    } finally {
        if (connection) await connection.close();
    }
};

// =====================================================
// GENERATE SESSIONS FOR A SUBJECT
// =====================================================
exports.generateSessions = async (req, res) => {
    let connection;
    try {
        const { entryId } = req.params;
        
        connection = await getConnection();
        
        const entryResult = await connection.execute(
            `SELECT ce.entry_id, ce.subject_name, cl.user_id
             FROM CALENDAR_ENTRIES ce
             JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
             WHERE ce.entry_id = :entryId AND cl.user_id = :userId`,
            { entryId: entryId, userId: req.user.userId }
        );
        
        if (entryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        
        const daysResult = await connection.execute(
            `SELECT day_of_week FROM CALENDAR_ENTRY_DAYS WHERE entry_id = :entryId`,
            { entryId: entryId }
        );
        
        const days = daysResult.rows.map(d => d.DAY_OF_WEEK);
        const semesterStart = new Date('2026-02-18');
        const semesterEnd = new Date('2026-06-25');
        
        let sessionsCreated = 0;
        const currentDate = new Date(semesterStart);
        
        while (currentDate <= semesterEnd) {
            const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
            
            if (days.includes(dayOfWeek)) {
                const dateStr = currentDate.toISOString().split('T')[0];
                
                const existingCheck = await connection.execute(
                    `SELECT record_id FROM ATTENDANCE_RECORDS 
                     WHERE entry_id = :entryId AND class_date = TO_DATE(:classDate, 'YYYY-MM-DD')`,
                    { entryId: entryId, classDate: dateStr }
                );
                
                if (existingCheck.rows.length === 0) {
                    const recordId = generateId();
                    await connection.execute(
                        `INSERT INTO ATTENDANCE_RECORDS 
                         (record_id, user_id, entry_id, class_date, status, points_earned, points_possible)
                         VALUES (:recordId, :userId, :entryId, TO_DATE(:classDate, 'YYYY-MM-DD'), 'Pending', 0, 2)`,
                        { 
                            recordId: recordId, 
                            userId: req.user.userId, 
                            entryId: entryId, 
                            classDate: dateStr 
                        }
                    );
                    sessionsCreated++;
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        await calculateAttendance(connection, req.user.userId, entryId);
        
        res.json({ 
            success: true, 
            message: `Generated ${sessionsCreated} sessions`,
            sessionsCreated 
        });
        
    } catch (err) {
        console.error('Generate sessions error:', err.message);
        res.status(500).json({ error: 'Failed to generate sessions' });
    } finally {
        if (connection) await connection.close();
    }
};

// =====================================================
// GET ATTENDANCE RECORDS FOR A SUBJECT
// =====================================================
exports.getAttendanceRecords = async (req, res) => {
    let connection;
    try {
        const { entryId } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT 
                record_id,
                TO_CHAR(class_date, 'YYYY-MM-DD') as class_date,
                TO_CHAR(class_date, 'Dy Mon DD YYYY') as formatted_date,
                status,
                points_earned,
                points_possible,
                remarks,
                CASE 
                    WHEN class_date > SYSDATE THEN 'upcoming'
                    WHEN status = 'Pending' AND class_date <= SYSDATE THEN 'pending'
                    ELSE 'past'
                END as session_type
             FROM ATTENDANCE_RECORDS 
             WHERE user_id = :userId AND entry_id = :entryId
             ORDER BY class_date ASC`,
            { userId: req.user.userId, entryId: entryId }
        );
        
        const records = result.rows.map(row => ({
            recordId: row.RECORD_ID,
            classDate: row.CLASS_DATE,
            formattedDate: row.FORMATTED_DATE,
            status: row.STATUS,
            pointsEarned: row.POINTS_EARNED,
            pointsPossible: row.POINTS_POSSIBLE,
            remarks: row.REMARKS,
            sessionType: row.SESSION_TYPE
        }));
        
        const stats = calculateSessionStats(records);
        
        res.json({ records, stats });
        
    } catch (err) {
        console.error('Get attendance records error:', err.message);
        res.status(500).json({ error: 'Failed to get attendance records' });
    } finally {
        if (connection) await connection.close();
    }
};

// =====================================================
// GET ATTENDANCE TREND DATA
// =====================================================
exports.getAttendanceTrend = async (req, res) => {
    let connection;
    try {
        const { entryId } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT 
                class_date,
                status,
                points_earned,
                points_possible,
                SUM(points_earned) OVER (ORDER BY class_date) as cumulative_earned,
                SUM(points_possible) OVER (ORDER BY class_date) as cumulative_possible,
                ROUND(
                    (SUM(points_earned) OVER (ORDER BY class_date) / 
                     NULLIF(SUM(points_possible) OVER (ORDER BY class_date), 0)) * 100, 1
                ) as running_percentage
             FROM ATTENDANCE_RECORDS
             WHERE user_id = :userId 
               AND entry_id = :entryId
               AND class_date <= SYSDATE
               AND status IN ('Present', 'Absent')
             ORDER BY class_date ASC`,
            { userId: req.user.userId, entryId: entryId }
        );
        
        const trendData = result.rows.map(row => ({
            date: row.CLASS_DATE,
            status: row.STATUS,
            pointsEarned: row.POINTS_EARNED,
            pointsPossible: row.POINTS_POSSIBLE,
            cumulativeEarned: row.CUMULATIVE_EARNED,
            cumulativePossible: row.CUMULATIVE_POSSIBLE,
            runningPercentage: row.RUNNING_PERCENTAGE
        }));
        
        res.json(trendData);
        
    } catch (err) {
        console.error('Get attendance trend error:', err.message);
        res.status(500).json({ error: 'Failed to get attendance trend' });
    } finally {
        if (connection) await connection.close();
    }
};

// =====================================================
// UPDATE ATTENDANCE RECORD
// =====================================================
exports.updateAttendance = async (req, res) => {
    let connection;
    try {
        const { entryId, classDate } = req.params;
        const { status, pointsEarned, remarks } = req.body;
        
        connection = await getConnection();
        
        const existing = await connection.execute(
            `SELECT record_id FROM ATTENDANCE_RECORDS 
             WHERE user_id = :userId AND entry_id = :entryId AND class_date = TO_DATE(:classDate, 'YYYY-MM-DD')`,
            { userId: req.user.userId, entryId: entryId, classDate: classDate }
        );
        
        if (existing.rows.length > 0) {
            await connection.execute(
                `UPDATE ATTENDANCE_RECORDS 
                 SET status = :status, points_earned = :pointsEarned, remarks = :remarks
                 WHERE user_id = :userId AND entry_id = :entryId AND class_date = TO_DATE(:classDate, 'YYYY-MM-DD')`,
                { 
                    status: status, 
                    pointsEarned: pointsEarned || 0, 
                    remarks: remarks || '',
                    userId: req.user.userId, 
                    entryId: entryId, 
                    classDate: classDate 
                }
            );
        } else {
            const recordId = generateId();
            await connection.execute(
                `INSERT INTO ATTENDANCE_RECORDS 
                 (record_id, user_id, entry_id, class_date, status, points_earned, points_possible, remarks)
                 VALUES (:recordId, :userId, :entryId, TO_DATE(:classDate, 'YYYY-MM-DD'), :status, :pointsEarned, 2, :remarks)`,
                { 
                    recordId: recordId, 
                    userId: req.user.userId, 
                    entryId: entryId, 
                    classDate: classDate, 
                    status: status, 
                    pointsEarned: pointsEarned || 0, 
                    remarks: remarks || '' 
                }
            );
        }
        
        const summary = await calculateAttendance(connection, req.user.userId, entryId);
        
        if (summary.percentage < 60) {
            const userResult = await connection.execute(
                `SELECT email, full_name FROM USERS WHERE user_id = :userId`,
                { userId: req.user.userId }
            );
            const subjectResult = await connection.execute(
                `SELECT subject_name FROM CALENDAR_ENTRIES WHERE entry_id = :entryId`,
                { entryId: entryId }
            );
            
            if (userResult.rows.length > 0 && subjectResult.rows.length > 0) {
                await sendAttendanceWarning(
                    userResult.rows[0].EMAIL,
                    userResult.rows[0].FULL_NAME || userResult.rows[0].EMAIL.split('@')[0],
                    subjectResult.rows[0].SUBJECT_NAME,
                    summary.percentage,
                    summary.attendedSessions * 2,
                    summary.totalSessions * 2
                );
            }
        }
        
        res.json({ success: true, summary });
        
    } catch (err) {
        console.error('Update attendance error:', err.message);
        res.status(500).json({ error: 'Failed to update attendance' });
    } finally {
        if (connection) await connection.close();
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getAttendanceStatus(percentage) {
    if (percentage >= 80) return 'good';
    if (percentage >= 60) return 'warning';
    return 'danger';
}

function calculateSessionStats(records) {
    const pastSessions = records.filter(r => r.sessionType === 'past' || 
        (r.status !== 'Pending' && r.sessionType !== 'upcoming'));
    const upcomingSessions = records.filter(r => r.sessionType === 'upcoming');
    const pendingSessions = records.filter(r => r.sessionType === 'pending');
    
    const totalPast = pastSessions.length;
    const attended = pastSessions.filter(r => r.status === 'Present').length;
    const absent = pastSessions.filter(r => r.status === 'Absent').length;
    
    const pointsEarned = pastSessions.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
    const pointsPossible = pastSessions.length * 2;
    const currentPercentage = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;
    
    const totalPossible = (pastSessions.length + upcomingSessions.length) * 2;
    const maxPoints = pointsEarned + (upcomingSessions.length * 2);
    const maxPercentage = totalPossible > 0 ? (maxPoints / totalPossible) * 100 : 0;
    
    const pointsNeeded = Math.ceil(0.6 * totalPossible) - pointsEarned;
    const sessionsNeeded = Math.ceil(pointsNeeded / 2);
    
    return {
        totalPast,
        attended,
        absent,
        upcoming: upcomingSessions.length,
        pending: pendingSessions.length,
        pointsEarned,
        pointsPossible,
        currentPercentage: Math.round(currentPercentage * 10) / 10,
        maxPercentage: Math.round(maxPercentage * 10) / 10,
        pointsNeeded: Math.max(0, pointsNeeded),
        sessionsNeeded: Math.max(0, sessionsNeeded),
        canRecover: maxPercentage >= 60
    };
}