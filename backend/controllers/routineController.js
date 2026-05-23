const { getConnection } = require('../config/database');
const { generateId, today, getDayOfWeek } = require('../utils/helpers');

// Get all routines for the logged-in user
exports.getRoutines = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT routine_id, activity_name, activity_time, created_at 
             FROM DAILY_ROUTINE 
             WHERE user_id = :userId 
             ORDER BY activity_time ASC`,
            [req.user.userId]
        );
        
        const routines = [];
        
        for (const routine of result.rows) {
            // Get repeat days
            const daysResult = await connection.execute(
                `SELECT day_of_week FROM ROUTINE_REPEAT_DAYS 
                 WHERE routine_id = :routineId`,
                [routine.ROUTINE_ID]
            );
            
            // Get completions
            const completionsResult = await connection.execute(
                `SELECT completion_date FROM ROUTINE_COMPLETIONS 
                 WHERE routine_id = :routineId AND user_id = :userId`,
                [routine.ROUTINE_ID, req.user.userId]
            );
            
            routines.push({
                id: routine.ROUTINE_ID,
                activity: routine.ACTIVITY_NAME,
                time: routine.ACTIVITY_TIME,
                repeatOn: daysResult.rows.map(d => d.DAY_OF_WEEK),
                completedDays: completionsResult.rows.map(c => 
                    c.COMPLETION_DATE.toISOString().split('T')[0]
                )
            });
        }
        
        res.json(routines);
        
    } catch (err) {
        console.error('Get routines error:', err);
        res.status(500).json({ error: 'Failed to get routines.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Get today's routine with completion status - FIXED VERSION
exports.getTodayRoutine = async (req, res) => {
    let connection;
    try {
        const todayName = getDayOfWeek();
        const todayStr = today();
        
        console.log(`📋 Fetching today's routine for user: ${req.user.userId}, day: ${todayName}`);
        
        connection = await getConnection();
        
        // FIXED: Using named bind parameters with correct object syntax
        const result = await connection.execute(
            `SELECT r.routine_id, r.activity_name, r.activity_time,
                    NVL((
                        SELECT 1 FROM ROUTINE_COMPLETIONS rc 
                        WHERE rc.routine_id = r.routine_id 
                        AND rc.completion_date = TO_DATE(:todayStr, 'YYYY-MM-DD')
                        AND rc.user_id = r.user_id
                    ), 0) as is_completed
             FROM DAILY_ROUTINE r
             JOIN ROUTINE_REPEAT_DAYS rd ON r.routine_id = rd.routine_id
             WHERE r.user_id = :userId 
             AND rd.day_of_week = :todayName
             ORDER BY r.activity_time ASC`,
            {
                todayStr: todayStr,
                userId: req.user.userId,
                todayName: todayName
            }
        );
        
        const routines = result.rows.map(row => ({
            id: row.ROUTINE_ID,
            activity: row.ACTIVITY_NAME,
            time: row.ACTIVITY_TIME,
            completed: row.IS_COMPLETED === 1
        }));
        
        res.json(routines);
        
    } catch (err) {
        console.error('Get today routine error:', err);
        res.status(500).json({ error: 'Failed to get today\'s routine.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Create a new routine
exports.createRoutine = async (req, res) => {
    let connection;
    try {
        const { activity, time, repeatOn } = req.body;
        
        if (!activity || !time || !repeatOn || repeatOn.length === 0) {
            return res.status(400).json({ error: 'Activity, time, and repeat days are required.' });
        }
        
        const routineId = generateId();
        
        connection = await getConnection();
        
        // Insert routine
        await connection.execute(
            `INSERT INTO DAILY_ROUTINE (routine_id, user_id, activity_name, activity_time) 
             VALUES (:routineId, :userId, :activity, :time)`,
            [routineId, req.user.userId, activity, time]
        );
        
        // Insert repeat days
        for (const day of repeatOn) {
            const dayId = generateId();
            await connection.execute(
                `INSERT INTO ROUTINE_REPEAT_DAYS (repeat_day_id, routine_id, day_of_week) 
                 VALUES (:dayId, :routineId, :day)`,
                [dayId, routineId, day]
            );
        }
        
        res.status(201).json({
            success: true,
            routine: {
                id: routineId,
                activity,
                time,
                repeatOn,
                completedDays: []
            }
        });
        
    } catch (err) {
        console.error('Create routine error:', err);
        res.status(500).json({ error: 'Failed to create routine.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete a routine
exports.deleteRoutine = async (req, res) => {
    let connection;
    try {
        const { routineId } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `DELETE FROM DAILY_ROUTINE 
             WHERE routine_id = :routineId AND user_id = :userId`,
            [routineId, req.user.userId]
        );
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Routine not found.' });
        }
        
        res.json({ success: true, message: 'Routine deleted.' });
        
    } catch (err) {
        console.error('Delete routine error:', err);
        res.status(500).json({ error: 'Failed to delete routine.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete all routines
exports.deleteAllRoutines = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        await connection.execute(
            `DELETE FROM DAILY_ROUTINE WHERE user_id = :userId`,
            [req.user.userId]
        );
        
        res.json({ success: true, message: 'All routines deleted.' });
        
    } catch (err) {
        console.error('Delete all routines error:', err);
        res.status(500).json({ error: 'Failed to delete routines.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Mark routine as completed for today
exports.completeRoutine = async (req, res) => {
    let connection;
    try {
        const { routineId } = req.params;
        const todayStr = today();
        
        connection = await getConnection();
        
        // Check if already completed today
        const checkResult = await connection.execute(
            `SELECT completion_id FROM ROUTINE_COMPLETIONS 
             WHERE routine_id = :routineId AND user_id = :userId AND completion_date = TO_DATE(:today, 'YYYY-MM-DD')`,
            [routineId, req.user.userId, todayStr]
        );
        
        if (checkResult.rows.length > 0) {
            // Uncomplete (delete)
            await connection.execute(
                `DELETE FROM ROUTINE_COMPLETIONS 
                 WHERE routine_id = :routineId AND user_id = :userId AND completion_date = TO_DATE(:today, 'YYYY-MM-DD')`,
                [routineId, req.user.userId, todayStr]
            );
            res.json({ success: true, completed: false });
        } else {
            // Mark as completed
            const completionId = generateId();
            await connection.execute(
                `INSERT INTO ROUTINE_COMPLETIONS (completion_id, routine_id, user_id, completion_date) 
                 VALUES (:completionId, :routineId, :userId, TO_DATE(:today, 'YYYY-MM-DD'))`,
                [completionId, routineId, req.user.userId, todayStr]
            );
            res.json({ success: true, completed: true });
        }
        
    } catch (err) {
        console.error('Complete routine error:', err);
        res.status(500).json({ error: 'Failed to update routine completion.' });
    } finally {
        if (connection) await connection.close();
    }
};