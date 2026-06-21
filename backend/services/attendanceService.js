const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const nodemailer = require('nodemailer');
const cronLogger = require('./cronLogger');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const calculateAttendance = async (connection, userId, entryId) => {
    const result = await connection.execute(
        `SELECT 
            COUNT(*) as total_sessions,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as attended_sessions,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_sessions,
            SUM(CASE WHEN status = 'Pending' AND class_date > SYSDATE THEN 1 ELSE 0 END) as upcoming_sessions,
            SUM(CASE WHEN status = 'Present' THEN points_earned ELSE 0 END) as total_earned,
            SUM(points_possible) as total_possible
         FROM ATTENDANCE_RECORDS 
         WHERE user_id = :userId AND entry_id = :entryId`,
        { userId, entryId }
    );
    
    const row = result.rows[0];
    const totalPastSessions = (row.ATTENDED_SESSIONS || 0) + (row.ABSENT_SESSIONS || 0);
    const pointsEarned = row.TOTAL_EARNED || 0;
    const pointsPossibleForPast = totalPastSessions * 2;
    const percentage = pointsPossibleForPast > 0 ? (pointsEarned / pointsPossibleForPast) * 100 : 0;
    
    // Use generateId() instead of SYS_GUID() for consistency
    const summaryId = generateId();
    
    // Update summary table using MERGE with generateId()
    await connection.execute(
        `INSERT INTO ATTENDANCE_SUMMARY
            (summary_id, user_id, entry_id, total_sessions, attended_sessions,
             absent_sessions, upcoming_sessions, total_points_earned, total_points_possible,
             percentage, is_warning)
         VALUES
            (:summaryId, :userId, :entryId, :totalSessions, :attendedSessions,
             :absentSessions, :upcomingSessions, :totalEarned, :totalPossible,
             :percentage, CASE WHEN :percentage < 60 THEN 1 ELSE 0 END)
         ON CONFLICT (user_id, entry_id) DO UPDATE SET
            total_sessions = EXCLUDED.total_sessions,
            attended_sessions = EXCLUDED.attended_sessions,
            absent_sessions = EXCLUDED.absent_sessions,
            upcoming_sessions = EXCLUDED.upcoming_sessions,
            total_points_earned = EXCLUDED.total_points_earned,
            total_points_possible = EXCLUDED.total_points_possible,
            percentage = EXCLUDED.percentage,
            is_warning = CASE WHEN EXCLUDED.percentage < 60 THEN 1 ELSE 0 END,
            updated_at = CURRENT_TIMESTAMP`,
        {
            userId, entryId, summaryId,
            totalSessions: row.TOTAL_SESSIONS,
            attendedSessions: row.ATTENDED_SESSIONS,
            absentSessions: row.ABSENT_SESSIONS,
            upcomingSessions: row.UPCOMING_SESSIONS,
            totalEarned: row.TOTAL_EARNED,
            totalPossible: row.TOTAL_POSSIBLE,
            percentage: percentage
        }
    );
    
    return {
        totalSessions: row.TOTAL_SESSIONS,
        attendedSessions: row.ATTENDED_SESSIONS,
        absentSessions: row.ABSENT_SESSIONS,
        upcomingSessions: row.UPCOMING_SESSIONS,
        totalPointsEarned: pointsEarned,
        totalPointsPossible: row.TOTAL_POSSIBLE,
        percentage
    };
};

// =====================================================
// AUTO-MARK ABSENT - Runs at midnight every day
// =====================================================
const autoMarkAbsent = async () => {
    const jobName = 'Auto-Mark Absent';
    let connection;
    let markedCount = 0;
    let uniqueCount = 0;
    
    cronLogger.start(jobName);
    
    try {
        connection = await getConnection();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        cronLogger.info(jobName, `Checking for unmarked classes before: ${today.toISOString().split('T')[0]}`);
        
        // Start transaction
        await connection.execute('BEGIN TRANSACTION');
        
        const pendingResult = await connection.execute(
            `SELECT record_id, user_id, entry_id, TO_CHAR(class_date, 'YYYY-MM-DD') as class_date_str
             FROM ATTENDANCE_RECORDS 
             WHERE status = 'Pending' 
               AND class_date < :today`,
            { today: today }
        );
        
        if (pendingResult.rows.length === 0) {
            cronLogger.info(jobName, 'No pending classes to mark as absent');
            await connection.execute('COMMIT');
            cronLogger.end(jobName, 0, { message: 'No pending classes found' });
            return;
        }
        
        cronLogger.info(jobName, `Found ${pendingResult.rows.length} pending classes to mark as absent`);
        
        const updateResult = await connection.execute(
            `UPDATE ATTENDANCE_RECORDS 
             SET status = 'Absent', points_earned = 0
             WHERE status = 'Pending' 
               AND class_date < :today`,
            { today: today }
        );
        
        markedCount = updateResult.rowsAffected;
        cronLogger.info(jobName, `Marked ${markedCount} classes as Absent`);
        
        // Get unique user/entry combinations
        const uniqueEntries = new Map();
        pendingResult.rows.forEach(row => {
            const key = `${row.USER_ID}|${row.ENTRY_ID}`;
            if (!uniqueEntries.has(key)) {
                uniqueEntries.set(key, { userId: row.USER_ID, entryId: row.ENTRY_ID });
            }
        });
        
        uniqueCount = uniqueEntries.size;
        cronLogger.info(jobName, `Recalculating ${uniqueCount} attendance summaries...`);
        
        let warningsSent = 0;
        
        for (const [key, { userId, entryId }] of uniqueEntries) {
            await calculateAttendance(connection, userId, entryId);
            
            const subjectResult = await connection.execute(
                `SELECT subject_name FROM CALENDAR_ENTRIES WHERE entry_id = :entryId`,
                { entryId }
            );
            const subjectName = subjectResult.rows[0]?.SUBJECT_NAME || 'Unknown';
            
            const userResult = await connection.execute(
                `SELECT email, full_name FROM USERS WHERE user_id = :userId`,
                { userId }
            );
            const userEmail = userResult.rows[0]?.EMAIL || 'Unknown';
            const userName = userResult.rows[0]?.FULL_NAME || userEmail.split('@')[0];
            
            const summaryResult = await connection.execute(
                `SELECT percentage, is_warning, total_points_earned, total_points_possible 
                 FROM ATTENDANCE_SUMMARY 
                 WHERE user_id = :userId AND entry_id = :entryId`,
                { userId, entryId }
            );
            
            if (summaryResult.rows.length > 0) {
                const summary = summaryResult.rows[0];
                cronLogger.info(jobName, `${subjectName} (${userEmail}): ${summary.PERCENTAGE.toFixed(1)}%`);
                
                if (summary.PERCENTAGE < 60 && summary.IS_WARNING === 0) {
                    cronLogger.warn(jobName, `${subjectName} below 60%! Sending warning email...`);
                    warningsSent++;
                    
                    await sendAttendanceWarning(
                        userEmail,
                        userName,
                        subjectName,
                        summary.PERCENTAGE,
                        summary.TOTAL_POINTS_EARNED || 0,
                        summary.TOTAL_POINTS_POSSIBLE || 0
                    );
                    
                    await connection.execute(
                        `UPDATE ATTENDANCE_SUMMARY SET is_warning = 1 WHERE user_id = :userId AND entry_id = :entryId`,
                        { userId, entryId }
                    );
                }
            }
        }
        
        await connection.execute('COMMIT');
        cronLogger.end(jobName, markedCount, { 
            message: `Marked ${markedCount} classes absent, updated ${uniqueCount} summaries, sent ${warningsSent} warnings`
        });
        
    } catch (err) {
        cronLogger.error(jobName, err, { stack: err.stack });
        if (connection) {
            try { await connection.execute('ROLLBACK'); } catch (e) {}
        }
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) {}
        }
    }
};

// Send attendance warning email
const sendAttendanceWarning = async (userEmail, userName, subjectName, percentage, currentPoints, maxPoints) => {
    const jobName = 'Send Attendance Warning';
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `⚠️ Attendance Warning: ${subjectName} - ${percentage.toFixed(1)}%`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 20px;">
                <div style="text-align: center; padding: 20px;">
                    <h1 style="color: white; margin-bottom: 10px;">⚠️ Attendance Alert</h1>
                    <p style="color: rgba(255,255,255,0.9);">FocusFlow Attendance Tracker</p>
                </div>
                <div style="background: white; border-radius: 20px; padding: 30px;">
                    <h2 style="color: #e74c3c;">Dear ${userName},</h2>
                    <p>Your attendance in <strong>${subjectName}</strong> is below 60%!</p>
                    
                    <div style="background: #f0f2f5; border-radius: 15px; padding: 20px; margin: 20px 0;">
                        <p><strong>📊 Current Attendance:</strong> ${percentage.toFixed(1)}%</p>
                        <p><strong>📅 Points Earned:</strong> ${currentPoints} / ${maxPoints}</p>
                        <p><strong>⚠️ Status:</strong> <span style="color: #e74c3c;">Below Required Threshold</span></p>
                    </div>
                    
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404;">
                            <strong>⚠️ Important:</strong> If your attendance falls below 60%, you may not be eligible to take the final examination.
                            Please ensure regular attendance in upcoming classes.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <p style="color: #666;">Log in to FocusFlow to view detailed attendance records.</p>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
                    <p>FocusFlow - Stay on track with your attendance!</p>
                </div>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        cronLogger.info(jobName, `Warning sent to ${userEmail} for ${subjectName}`);
        return true;
    } catch (error) {
        cronLogger.error(jobName, error);
        return false;
    }
};

// Check all subjects for low attendance
const checkLowAttendance = async () => {
    const jobName = 'Check Low Attendance';
    let connection;
    let warningsSent = 0;
    
    cronLogger.start(jobName);
    
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT 
                s.summary_id,
                s.user_id,
                s.entry_id,
                s.percentage,
                s.total_points_earned,
                s.total_points_possible,
                s.is_warning,
                u.email,
                u.full_name,
                ce.subject_name
             FROM ATTENDANCE_SUMMARY s
             JOIN USERS u ON s.user_id = u.user_id
             JOIN CALENDAR_ENTRIES ce ON s.entry_id = ce.entry_id
             WHERE s.percentage < 60 AND s.is_warning = 0
             AND u.is_verified = 1`
        );
        
        cronLogger.info(jobName, `Found ${result.rows.length} subjects below 60% threshold`);
        
        for (const row of result.rows) {
            const emailSent = await sendAttendanceWarning(
                row.EMAIL,
                row.FULL_NAME || row.EMAIL.split('@')[0],
                row.SUBJECT_NAME,
                row.PERCENTAGE,
                row.TOTAL_POINTS_EARNED,
                row.TOTAL_POINTS_POSSIBLE
            );
            
            if (emailSent) {
                warningsSent++;
                await connection.execute(
                    `UPDATE ATTENDANCE_SUMMARY SET is_warning = 1 WHERE summary_id = :id`,
                    [row.SUMMARY_ID]
                );
            }
        }
        
        cronLogger.end(jobName, warningsSent, { 
            message: `Sent ${warningsSent} attendance warnings`
        });
        
    } catch (err) {
        cronLogger.error(jobName, err, { stack: err.stack });
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { 
    calculateAttendance, 
    checkLowAttendance, 
    sendAttendanceWarning, 
    autoMarkAbsent 
};