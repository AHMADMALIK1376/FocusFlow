const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// Get all focus sessions for the logged-in user
exports.getSessions = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT session_id, activity_name, duration_set_seconds, actual_done_seconds, 
                    start_time, end_time, session_status, remaining_seconds, created_at
             FROM FOCUS_SESSIONS 
             WHERE user_id = :userId 
             ORDER BY created_at DESC`,
            [req.user.userId]
        );
        
        const sessions = result.rows.map(row => ({
            id: row.SESSION_ID,
            activityName: row.ACTIVITY_NAME,
            durationSetSeconds: row.DURATION_SET_SECONDS,
            actualDoneSeconds: row.ACTUAL_DONE_SECONDS,
            startTime: row.START_TIME,
            endTime: row.END_TIME,
            status: row.SESSION_STATUS,
            remainingSeconds: row.REMAINING_SECONDS,
            createdAt: row.CREATED_AT
        }));
        
        res.json(sessions);
        
    } catch (err) {
        console.error('Get sessions error:', err);
        res.status(500).json({ error: 'Failed to get focus sessions.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Get a single focus session by ID
exports.getSession = async (req, res) => {
    let connection;
    try {
        const { sessionId } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT session_id, activity_name, duration_set_seconds, actual_done_seconds, 
                    start_time, end_time, session_status, remaining_seconds
             FROM FOCUS_SESSIONS 
             WHERE session_id = :sessionId AND user_id = :userId`,
            [sessionId, req.user.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        
        const row = result.rows[0];
        
        res.json({
            id: row.SESSION_ID,
            activityName: row.ACTIVITY_NAME,
            durationSetSeconds: row.DURATION_SET_SECONDS,
            actualDoneSeconds: row.ACTUAL_DONE_SECONDS,
            startTime: row.START_TIME,
            endTime: row.END_TIME,
            status: row.SESSION_STATUS,
            remainingSeconds: row.REMAINING_SECONDS
        });
        
    } catch (err) {
        console.error('Get session error:', err);
        res.status(500).json({ error: 'Failed to get focus session.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Create a new focus session
exports.createSession = async (req, res) => {
    let connection;
    try {
        const { 
            activityName, 
            durationSetSeconds, 
            actualDoneSeconds, 
            startTime, 
            endTime, 
            status, 
            remainingSeconds 
        } = req.body;
        
        const sessionId = generateId();
        
        connection = await getConnection();
        
        await connection.execute(
            `INSERT INTO FOCUS_SESSIONS 
             (session_id, user_id, activity_name, duration_set_seconds, actual_done_seconds, 
              start_time, end_time, session_status, remaining_seconds) 
             VALUES 
             (:sessionId, :userId, :activityName, :durationSetSeconds, :actualDoneSeconds,
              :startTime, :endTime, :status, :remainingSeconds)`,
            [
                sessionId, 
                req.user.userId, 
                activityName, 
                durationSetSeconds || null, 
                actualDoneSeconds || null,
                startTime || null, 
                endTime || null, 
                status || 'Completed', 
                remainingSeconds || null
            ]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Focus session saved successfully.',
            sessionId: sessionId
        });
        
    } catch (err) {
        console.error('Create session error:', err);
        res.status(500).json({ error: 'Failed to save focus session.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete all focus sessions
exports.deleteAllSessions = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        await connection.execute(
            `DELETE FROM FOCUS_SESSIONS WHERE user_id = :userId`,
            [req.user.userId]
        );
        
        res.json({ success: true, message: 'All focus sessions cleared.' });
        
    } catch (err) {
        console.error('Delete sessions error:', err);
        res.status(500).json({ error: 'Failed to clear focus sessions.' });
    } finally {
        if (connection) await connection.close();
    }
};