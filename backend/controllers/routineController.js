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
            { userId: req.user.userId }
        );
        
        const routines = [];
        
        for (const routine of result.rows) {
            // ✅ Get days with per-day colors
            const daysResult = await connection.execute(
                `SELECT day_of_week, NVL(color, '#6366f1') as color 
                 FROM ROUTINE_REPEAT_DAYS 
                 WHERE routine_id = :routineId`,
                { routineId: routine.ROUTINE_ID }
            );
            
            const completionsResult = await connection.execute(
                `SELECT completion_date FROM ROUTINE_COMPLETIONS 
                 WHERE routine_id = :routineId AND user_id = :userId`,
                { routineId: routine.ROUTINE_ID, userId: req.user.userId }
            );
            
            // Build dayColors map: { "Monday": "#ff0000", "Tuesday": "#00ff00" }
            const dayColors = {};
            daysResult.rows.forEach(d => {
                dayColors[d.DAY_OF_WEEK] = d.COLOR;
            });
            
            routines.push({
                id: routine.ROUTINE_ID,
                activity: routine.ACTIVITY_NAME,
                time: routine.ACTIVITY_TIME,
                repeatOn: daysResult.rows.map(d => d.DAY_OF_WEEK),
                dayColors: dayColors, // ✅ Per-day colors
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

// Get today's routine with completion status
exports.getTodayRoutine = async (req, res) => {
    let connection;
    try {
        const todayName = getDayOfWeek();
        const todayStr = today();
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT r.routine_id, r.activity_name, r.activity_time, 
                    NVL(rd.color, '#6366f1') as color,
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
            { todayStr, userId: req.user.userId, todayName }
        );
        
        const routines = result.rows.map(row => ({
            id: row.ROUTINE_ID,
            activity: row.ACTIVITY_NAME,
            time: row.ACTIVITY_TIME,
            color: row.COLOR,
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
        const { activity, time, repeatOn, dayColors } = req.body;
        
        if (!activity || !time || !repeatOn || repeatOn.length === 0) {
            return res.status(400).json({ error: 'Activity, time, and repeat days are required.' });
        }
        
        const routineId = generateId();
        connection = await getConnection();
        
        await connection.execute(
            `INSERT INTO DAILY_ROUTINE (routine_id, user_id, activity_name, activity_time) 
             VALUES (:routineId, :userId, :activity, :time)`,
            { routineId, userId: req.user.userId, activity, time }
        );
        
        // ✅ Insert days with per-day colors
        for (const day of repeatOn) {
            const dayId = generateId();
            const dayColor = (dayColors && dayColors[day]) || '#6366f1';
            await connection.execute(
                `INSERT INTO ROUTINE_REPEAT_DAYS (repeat_day_id, routine_id, day_of_week, color) 
                 VALUES (:dayId, :routineId, :day, :color)`,
                { dayId, routineId, day, color: dayColor }
            );
        }
        
        res.status(201).json({
            success: true,
            routine: {
                id: routineId,
                activity,
                time,
                repeatOn,
                dayColors: dayColors || {},
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

// Update a routine
exports.updateRoutine = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { activity, time, repeatOn, dayColors } = req.body;
        
        connection = await getConnection();
        
        const checkResult = await connection.execute(
            `SELECT routine_id FROM DAILY_ROUTINE WHERE routine_id = :id AND user_id = :userId`,
            { id, userId: req.user.userId }
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Routine not found' });
        }
        
        await connection.execute(
            `UPDATE DAILY_ROUTINE 
             SET activity_name = :activity, activity_time = :time 
             WHERE routine_id = :id AND user_id = :userId`,
            { activity, time, id, userId: req.user.userId }
        );
        
        // ✅ Update days with per-day colors
        if (repeatOn && repeatOn.length > 0) {
            // Delete existing days
            await connection.execute(
                `DELETE FROM ROUTINE_REPEAT_DAYS WHERE routine_id = :id`,
                { id }
            );
            
            // Re-insert with colors
            for (const day of repeatOn) {
                const dayId = generateId();
                const dayColor = (dayColors && dayColors[day]) || '#6366f1';
                await connection.execute(
                    `INSERT INTO ROUTINE_REPEAT_DAYS (repeat_day_id, routine_id, day_of_week, color) 
                     VALUES (:dayId, :id, :day, :color)`,
                    { dayId, id, day, color: dayColor }
                );
            }
        }
        
        await connection.execute('COMMIT');
        res.json({ success: true, message: 'Routine updated successfully' });
        
    } catch (err) {
        console.error('Update routine error:', err);
        if (connection) await connection.execute('ROLLBACK');
        res.status(500).json({ error: 'Failed to update routine' });
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
            `DELETE FROM DAILY_ROUTINE WHERE routine_id = :routineId AND user_id = :userId`,
            { routineId, userId: req.user.userId }
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
        await connection.execute(`DELETE FROM DAILY_ROUTINE WHERE user_id = :userId`, { userId: req.user.userId });
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
        const checkResult = await connection.execute(
            `SELECT completion_id FROM ROUTINE_COMPLETIONS 
             WHERE routine_id = :routineId AND user_id = :userId AND completion_date = TO_DATE(:today, 'YYYY-MM-DD')`,
            { routineId, userId: req.user.userId, today: todayStr }
        );
        if (checkResult.rows.length > 0) {
            await connection.execute(
                `DELETE FROM ROUTINE_COMPLETIONS WHERE routine_id = :routineId AND user_id = :userId AND completion_date = TO_DATE(:today, 'YYYY-MM-DD')`,
                { routineId, userId: req.user.userId, today: todayStr }
            );
            res.json({ success: true, completed: false });
        } else {
            const completionId = generateId();
            await connection.execute(
                `INSERT INTO ROUTINE_COMPLETIONS (completion_id, routine_id, user_id, completion_date) 
                 VALUES (:completionId, :routineId, :userId, TO_DATE(:today, 'YYYY-MM-DD'))`,
                { completionId, routineId, userId: req.user.userId, today: todayStr }
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