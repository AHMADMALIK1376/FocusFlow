// controllers/dashboardController.js
const { getConnection } = require('../config/database');
const { today, getDayOfWeek } = require('../utils/helpers');

// ==============================================
// NEW: COMBINED DASHBOARD ENDPOINT - ONE CALL INSTEAD OF 15+
// Reduces rate limiting by 90%+
// ==============================================
exports.getCompleteDashboard = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const userId = req.user.userId;
        const todayStr = today();
        const todayName = getDayOfWeek();
        const todayShort = todayName.substring(0, 3);
        
        console.log('='.repeat(50));
        console.log(`📅 Complete Dashboard Request (Combined)`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Today: ${todayName} (${todayStr})`);
        console.log(`   Today Short: ${todayShort}`);
        console.log('='.repeat(50));
        
        // Query 1: Get user stats and counts
        // "Pending tasks" now means assignments not yet in the Done column.
        const statsResult = await connection.execute(
            `SELECT
                (SELECT current_streak FROM USER_STATS WHERE user_id = :userId) as current_streak,
                (SELECT total_goals_completed FROM USER_STATS WHERE user_id = :userId) as total_goals_completed,
                (SELECT COUNT(*) FROM ASSIGNMENTS WHERE user_id = :userId AND column_id <> 'col-done') as pending_tasks,
                (SELECT COUNT(*) FROM FOCUS_SESSIONS WHERE user_id = :userId) as total_focus_sessions
            FROM DUAL`,
            { userId }
        );
        
        // Query 2: Get pending routines for today
        const routineResult = await connection.execute(
            `SELECT COUNT(*) as pending_count
             FROM DAILY_ROUTINE r
             JOIN ROUTINE_REPEAT_DAYS rd ON r.routine_id = rd.routine_id
             LEFT JOIN ROUTINE_COMPLETIONS rc ON r.routine_id = rc.routine_id 
                 AND rc.user_id = r.user_id 
                 AND rc.completion_date = TO_DATE(:todayStr, 'YYYY-MM-DD')
             WHERE r.user_id = :userId 
               AND rd.day_of_week = :todayName
               AND rc.completion_id IS NULL`,
            { 
                todayStr: todayStr,
                userId: userId,
                todayName: todayName
            }
        );
        
        const statsRow = statsResult.rows[0] || {};
        const routineRow = routineResult.rows[0] || { PENDING_COUNT: 0 };

        // Query 3: Today's classes, straight off the subject schedule.
        const classesResult = await connection.execute(
            `SELECT s.name AS subject_name, s.color, ss.start_time, ss.end_time, ss.room, s.instructor
             FROM SUBJECT_SCHEDULE ss
             JOIN SUBJECTS s ON s.subject_id = ss.subject_id
             WHERE s.user_id = :userId
               AND s.is_archived = 0
               AND (ss.day_of_week = :todayName OR ss.day_of_week = :todayShort)
             ORDER BY ss.start_time ASC`,
            { userId, todayName, todayShort }
        );

        const todaysClasses = classesResult.rows.map((cls) => ({
            subject: cls.SUBJECT_NAME,
            startTime: cls.START_TIME,
            endTime: cls.END_TIME,
            room: cls.ROOM,
            color: cls.COLOR,
            lecturer: cls.INSTRUCTOR || null
        }));

        console.log(`📊 Total classes for today: ${todaysClasses.length}`);

        // Return combined response
        res.json({
            success: true,
            data: {
                streakCount: statsRow.CURRENT_STREAK || 0,
                completedGoals: statsRow.TOTAL_GOALS_COMPLETED || 0,
                pendingTasks: statsRow.PENDING_TASKS || 0,
                pendingRoutine: routineRow.PENDING_COUNT || 0,
                totalFocusSessions: statsRow.TOTAL_FOCUS_SESSIONS || 0,
                todaysClasses: todaysClasses
            }
        });
        
    } catch (err) {
        console.error('❌ Complete dashboard error:', err);
        res.status(500).json({ error: 'Failed to get dashboard data.', details: err.message });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// Get user stats only
// ==============================================
exports.getUserStats = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT current_streak, total_goals_completed, last_streak_update 
             FROM USER_STATS WHERE user_id = :userId`,
            [req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User stats not found.' });
        }
        
        const stats = result.rows[0];
        
        res.json({
            currentStreak: stats.CURRENT_STREAK,
            totalGoalsCompleted: stats.TOTAL_GOALS_COMPLETED,
            lastStreakUpdate: stats.LAST_STREAK_UPDATE
        });
        
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Failed to get user stats.' });
    } finally {
        if (connection) await connection.close();
    }
};