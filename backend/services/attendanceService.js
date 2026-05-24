const { getConnection } = require('../config/database');
const nodemailer = require('nodemailer');

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
    const totalPastSessions = row.ATTENDED_SESSIONS + row.ABSENT_SESSIONS;
    const pointsEarned = row.TOTAL_EARNED || 0;
    const pointsPossibleForPast = totalPastSessions * 2;
    const percentage = pointsPossibleForPast > 0 ? (pointsEarned / pointsPossibleForPast) * 100 : 0;
    
    // Update summary table
    await connection.execute(
        `MERGE INTO ATTENDANCE_SUMMARY dest
         USING (SELECT :userId as user_id, :entryId as entry_id FROM DUAL) src
         ON (dest.user_id = src.user_id AND dest.entry_id = src.entry_id)
         WHEN MATCHED THEN UPDATE SET
            total_sessions = :totalSessions,
            attended_sessions = :attendedSessions,
            absent_sessions = :absentSessions,
            upcoming_sessions = :upcomingSessions,
            total_points_earned = :totalEarned,
            total_points_possible = :totalPossible,
            percentage = :percentage,
            is_warning = CASE WHEN :percentage < 60 THEN 1 ELSE 0 END,
            updated_at = CURRENT_TIMESTAMP
         WHEN NOT MATCHED THEN INSERT
            (summary_id, user_id, entry_id, total_sessions, attended_sessions, 
             absent_sessions, upcoming_sessions, total_points_earned, total_points_possible, 
             percentage, is_warning)
         VALUES
            (SYS_GUID(), :userId, :entryId, :totalSessions, :attendedSessions,
             :absentSessions, :upcomingSessions, :totalEarned, :totalPossible, 
             :percentage, CASE WHEN :percentage < 60 THEN 1 ELSE 0 END)`,
        {
            userId, entryId,
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
// Marks all pending past classes as Absent
// =====================================================
const autoMarkAbsent = async () => {
    let connection;
    try {
        connection = await getConnection();
        
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log('🕐 [AUTO-ABSENT] Checking for unmarked classes before:', today.toISOString().split('T')[0]);
        
        // Find all pending records where class_date is before today
        const pendingResult = await connection.execute(
            `SELECT record_id, user_id, entry_id, TO_CHAR(class_date, 'YYYY-MM-DD') as class_date_str
             FROM ATTENDANCE_RECORDS 
             WHERE status = 'Pending' 
               AND class_date < :today`,
            { today: today }
        );
        
        if (pendingResult.rows.length === 0) {
            console.log('✅ [AUTO-ABSENT] No pending classes to mark as absent');
            return;
        }
        
        console.log(`📋 [AUTO-ABSENT] Found ${pendingResult.rows.length} pending classes to mark as absent`);
        
        // Mark all found records as Absent
        const updateResult = await connection.execute(
            `UPDATE ATTENDANCE_RECORDS 
             SET status = 'Absent', points_earned = 0
             WHERE status = 'Pending' 
               AND class_date < :today`,
            { today: today }
        );
        
        console.log(`✅ [AUTO-ABSENT] Marked ${updateResult.rowsAffected} classes as Absent`);
        
        // Get unique user/entry combinations to recalculate summaries
        const uniqueEntries = new Map();
        pendingResult.rows.forEach(row => {
            const key = `${row.USER_ID}|${row.ENTRY_ID}`;
            if (!uniqueEntries.has(key)) {
                uniqueEntries.set(key, { userId: row.USER_ID, entryId: row.ENTRY_ID });
            }
        });
        
        console.log(`🔄 [AUTO-ABSENT] Recalculating ${uniqueEntries.size} attendance summaries...`);
        
        // Recalculate attendance for each affected subject
        for (const [key, { userId, entryId }] of uniqueEntries) {
            await calculateAttendance(connection, userId, entryId);
            
            // Get subject name for logging
            const subjectResult = await connection.execute(
                `SELECT subject_name FROM CALENDAR_ENTRIES WHERE entry_id = :entryId`,
                { entryId }
            );
            const subjectName = subjectResult.rows[0]?.SUBJECT_NAME || 'Unknown';
            
            // Get user email for logging
            const userResult = await connection.execute(
                `SELECT email FROM USERS WHERE user_id = :userId`,
                { userId }
            );
            const userEmail = userResult.rows[0]?.EMAIL || 'Unknown';
            
            // Check if below 60% to send warning
            const summaryResult = await connection.execute(
                `SELECT percentage, is_warning, total_points_earned, total_points_possible 
                 FROM ATTENDANCE_SUMMARY 
                 WHERE user_id = :userId AND entry_id = :entryId`,
                { userId, entryId }
            );
            
            if (summaryResult.rows.length > 0) {
                const summary = summaryResult.rows[0];
                console.log(`   📊 ${subjectName} (${userEmail}): ${summary.PERCENTAGE.toFixed(1)}%`);
                
                if (summary.PERCENTAGE < 60 && summary.IS_WARNING === 0) {
                    console.log(`   ⚠️ ${subjectName} below 60%! Sending warning email...`);
                    
                    const fullUserResult = await connection.execute(
                        `SELECT full_name FROM USERS WHERE user_id = :userId`,
                        { userId }
                    );
                    
                    await sendAttendanceWarning(
                        userEmail,
                        fullUserResult.rows[0]?.FULL_NAME || userEmail.split('@')[0],
                        subjectName,
                        summary.PERCENTAGE,
                        summary.TOTAL_POINTS_EARNED || 0,
                        summary.TOTAL_POINTS_POSSIBLE || 0
                    );
                    
                    // Mark warning as sent
                    await connection.execute(
                        `UPDATE ATTENDANCE_SUMMARY SET is_warning = 1 WHERE user_id = :userId AND entry_id = :entryId`,
                        { userId, entryId }
                    );
                }
            }
        }
        
        await connection.execute('COMMIT');
        
        console.log(`✅ [AUTO-ABSENT] Complete: ${updateResult.rowsAffected} classes marked absent, ${uniqueEntries.size} summaries updated`);
        
    } catch (err) {
        console.error('❌ [AUTO-ABSENT] Error:', err.message);
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
        console.log(`✅ Attendance warning sent to ${userEmail} for ${subjectName}`);
        return true;
    } catch (error) {
        console.error('Error sending attendance warning:', error);
        return false;
    }
};

// Check all subjects for low attendance
const checkLowAttendance = async () => {
    let connection;
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
        
        for (const row of result.rows) {
            await sendAttendanceWarning(
                row.EMAIL,
                row.FULL_NAME || row.EMAIL.split('@')[0],
                row.SUBJECT_NAME,
                row.PERCENTAGE,
                row.TOTAL_POINTS_EARNED,
                row.TOTAL_POINTS_POSSIBLE
            );
            
            await connection.execute(
                `UPDATE ATTENDANCE_SUMMARY SET is_warning = 1 WHERE summary_id = :id`,
                [row.SUMMARY_ID]
            );
        }
        
        console.log(`✅ Checked attendance warnings - ${result.rows.length} warnings sent`);
        
    } catch (err) {
        console.error('Error checking attendance:', err);
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { calculateAttendance, checkLowAttendance, sendAttendanceWarning, autoMarkAbsent };