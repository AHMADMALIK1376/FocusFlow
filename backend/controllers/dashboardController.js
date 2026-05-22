const { getConnection } = require('../config/database');
const { today, getDayOfWeek } = require('../utils/helpers');

// Get dashboard summary with real data from database
exports.getDashboardSummary = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const todayStr = today();
        const todayName = getDayOfWeek();
        const todayShort = todayName.substring(0, 3);
        
        // 1. Get user stats (streak and goals)
        const statsResult = await connection.execute(
            `SELECT current_streak, total_goals_completed 
             FROM USER_STATS WHERE user_id = :userId`,
            [req.user.userId]
        );
        
        const stats = statsResult.rows[0] || { CURRENT_STREAK: 0, TOTAL_GOALS_COMPLETED: 0 };
        
        // 2. Get pending tasks count
        const tasksResult = await connection.execute(
            `SELECT COUNT(*) as pending_count 
             FROM TASKS 
             WHERE user_id = :userId AND is_completed = 0`,
            [req.user.userId]
        );
        
        const pendingCount = tasksResult.rows[0].PENDING_COUNT;
        
        // 3. Get today's pending routine count
        const routineResult = await connection.execute(
            `SELECT COUNT(*) as pending_count
             FROM DAILY_ROUTINE r
             JOIN ROUTINE_REPEAT_DAYS rd ON r.routine_id = rd.routine_id
             LEFT JOIN ROUTINE_COMPLETIONS rc ON r.routine_id = rc.routine_id 
                 AND rc.user_id = r.user_id AND rc.completion_date = :todayStr
             WHERE r.user_id = :userId 
               AND rd.day_of_week = :todayName
               AND rc.completion_id IS NULL`,
            [todayStr, req.user.userId, todayName]
        );
        
        const pendingRoutine = routineResult.rows[0].PENDING_COUNT;
        
        // 4. Get today's classes from active calendar
        let todaysClasses = [];
        
        const activeCalendarResult = await connection.execute(
            `SELECT calendar_id FROM CALENDAR_LIST 
             WHERE user_id = :userId AND is_active = 1`,
            [req.user.userId]
        );
        
        if (activeCalendarResult.rows.length > 0) {
            const activeCalendarId = activeCalendarResult.rows[0].CALENDAR_ID;
            
            const classesResult = await connection.execute(
                `SELECT ce.subject_name, ce.start_time, ce.end_time, ce.room_number
                 FROM CALENDAR_ENTRIES ce
                 JOIN CALENDAR_ENTRY_DAYS ced ON ce.entry_id = ced.entry_id
                 WHERE ce.calendar_id = :calendarId 
                   AND (ced.day_of_week = :todayName OR ced.day_of_week = :todayShort)
                 ORDER BY ce.start_time ASC`,
                [activeCalendarId, todayName, todayShort]
            );
            
            todaysClasses = classesResult.rows.map(row => ({
                subject: row.SUBJECT_NAME,
                startTime: row.START_TIME,
                endTime: row.END_TIME,
                room: row.ROOM_NUMBER,
                lecturer: null
            }));
        }
        
        res.json({
            streakCount: stats.CURRENT_STREAK,
            completedGoals: stats.TOTAL_GOALS_COMPLETED,
            pendingTasks: pendingCount,
            pendingRoutine: pendingRoutine,
            todaysClasses: todaysClasses
        });
        
    } catch (err) {
        console.error('Dashboard summary error:', err);
        res.status(500).json({ error: 'Failed to get dashboard summary.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Get user stats only
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