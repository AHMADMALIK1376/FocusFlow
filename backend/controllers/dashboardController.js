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
        const statsResult = await connection.execute(
            `SELECT 
                (SELECT current_streak FROM USER_STATS WHERE user_id = :userId) as current_streak,
                (SELECT total_goals_completed FROM USER_STATS WHERE user_id = :userId) as total_goals_completed,
                (SELECT COUNT(*) FROM TASKS WHERE user_id = :userId AND is_completed = 0) as pending_tasks,
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
        
        // Query 3: Get active calendar
        const calendarResult = await connection.execute(
            `SELECT calendar_id, calendar_title 
             FROM CALENDAR_LIST 
             WHERE user_id = :userId 
             ORDER BY is_active DESC, created_at DESC 
             FETCH FIRST 1 ROW ONLY`,
            { userId }
        );
        
        const statsRow = statsResult.rows[0] || {};
        const routineRow = routineResult.rows[0] || { PENDING_COUNT: 0 };
        const activeCalendar = calendarResult.rows[0] || null;
        
        // Query 4: Get today's classes (if active calendar exists)
        let todaysClasses = [];
        
        if (activeCalendar && activeCalendar.CALENDAR_ID) {
            const classesResult = await connection.execute(
                `SELECT ce.subject_name, ce.start_time, ce.end_time, ce.room_number
                 FROM CALENDAR_ENTRIES ce
                 JOIN CALENDAR_ENTRY_DAYS ced ON ce.entry_id = ced.entry_id
                 WHERE ce.calendar_id = :calendarId 
                   AND (ced.day_of_week = :todayName OR ced.day_of_week = :todayShort)
                 ORDER BY ce.start_time ASC`,
                {
                    calendarId: activeCalendar.CALENDAR_ID,
                    todayName: todayName,
                    todayShort: todayShort
                }
            );
            
            for (const cls of classesResult.rows) {
                todaysClasses.push({
                    subject: cls.SUBJECT_NAME,
                    startTime: cls.START_TIME,
                    endTime: cls.END_TIME,
                    room: cls.ROOM_NUMBER,
                    lecturer: null
                });
            }
        }
        
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
                todaysClasses: todaysClasses,
                activeCalendar: activeCalendar?.CALENDAR_TITLE || null
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
// OPTIMIZED: Get quick dashboard stats (lightweight)
// For navbar and widgets
// ==============================================
exports.getQuickStats = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const userId = req.user.userId;
        
        const result = await connection.execute(
            `SELECT 
                (SELECT COUNT(*) FROM TASKS WHERE user_id = :userId AND is_completed = 0) as pending_tasks,
                (SELECT current_streak FROM USER_STATS WHERE user_id = :userId) as streak,
                (SELECT total_goals_completed FROM USER_STATS WHERE user_id = :userId) as completed_goals
            FROM DUAL`,
            { userId }
        );
        
        const row = result.rows[0] || {};
        
        res.json({
            pendingTasks: row.PENDING_TASKS || 0,
            streak: row.STREAK || 0,
            completedGoals: row.COMPLETED_GOALS || 0
        });
        
    } catch (err) {
        console.error('Quick stats error:', err);
        res.status(500).json({ error: 'Failed to get quick stats.' });
    } finally {
        if (connection) await connection.close();
    }
};

// ==============================================
// ORIGINAL: Get dashboard summary (kept for backward compatibility)
// ==============================================
exports.getDashboardSummary = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const todayStr = today();
        const todayName = getDayOfWeek();
        const todayShort = todayName.substring(0, 3);
        
        console.log('='.repeat(50));
        console.log(`📅 Dashboard Summary Request`);
        console.log(`   User ID: ${req.user.userId}`);
        console.log(`   Today: ${todayName} (${todayStr})`);
        console.log(`   Today Short: ${todayShort}`);
        console.log('='.repeat(50));
        
        // 1. Get user stats
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
                 AND rc.user_id = r.user_id AND rc.completion_date = TO_DATE(:todayStr, 'YYYY-MM-DD')
             WHERE r.user_id = :userId 
               AND rd.day_of_week = :todayName
               AND rc.completion_id IS NULL`,
            [todayStr, req.user.userId, todayName]
        );
        const pendingRoutine = routineResult.rows[0].PENDING_COUNT;
        
        // 4. Get today's classes
        let todaysClasses = [];
        
        const calendarResult = await connection.execute(
            `SELECT calendar_id, calendar_title FROM CALENDAR_LIST 
             WHERE user_id = :UserId ORDER BY is_active DESC, created_at DESC`,
            [req.user.userId]
        );
        
        console.log(`📚 Calendars found: ${calendarResult.rows.length}`);
        
        if (calendarResult.rows.length > 0) {
            for (const calendar of calendarResult.rows) {
                const calendarId = calendar.CALENDAR_ID;
                console.log(`   Checking calendar: ${calendar.CALENDAR_TITLE} (${calendarId})`);
                
                const classesResult = await connection.execute(
                    `SELECT ce.subject_name, ce.start_time, ce.end_time, ce.room_number
                     FROM CALENDAR_ENTRIES ce
                     JOIN CALENDAR_ENTRY_DAYS ced ON ce.entry_id = ced.entry_id
                     WHERE ce.calendar_id = :calendarId 
                       AND (ced.day_of_week = :todayName OR ced.day_of_week = :todayShort)
                     ORDER BY ce.start_time ASC`,
                    [calendarId, todayName, todayShort]
                );
                
                console.log(`      Found ${classesResult.rows.length} classes for today`);
                
                for (const cls of classesResult.rows) {
                    todaysClasses.push({
                        subject: cls.SUBJECT_NAME,
                        startTime: cls.START_TIME,
                        endTime: cls.END_TIME,
                        room: cls.ROOM_NUMBER,
                        lecturer: null
                    });
                }
            }
        } else {
            console.log('❌ No calendars found for this user');
        }
        
        console.log(`📊 Total classes for today: ${todaysClasses.length}`);
        
        res.json({
            streakCount: stats.CURRENT_STREAK,
            completedGoals: stats.TOTAL_GOALS_COMPLETED,
            pendingTasks: pendingCount,
            pendingRoutine: pendingRoutine,
            todaysClasses: todaysClasses
        });
        
    } catch (err) {
        console.error('❌ Dashboard summary error:', err);
        res.status(500).json({ error: 'Failed to get dashboard summary.' });
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