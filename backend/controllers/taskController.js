const { getConnection } = require('../config/database');
const { generateId, formatDate } = require('../utils/helpers');

// Get all tasks for the logged-in user
exports.getTasks = async (req, res) => {
    let connection;
    try {
        const { completed, type } = req.query;
        
        let query = `SELECT task_id, task_text, task_date, task_time, task_type, is_completed, completed_at, created_at 
                     FROM TASKS WHERE user_id = :userId`;
        const params = [req.user.userId];
        
        if (completed !== undefined) {
            query += ` AND is_completed = :completed`;
            params.push(completed === 'true' ? 1 : 0);
        }
        
        if (type) {
            query += ` AND task_type = :type`;
            params.push(type);
        }
        
        query += ` ORDER BY task_date ASC, task_time ASC`;
        
        connection = await getConnection();
        const result = await connection.execute(query, params);
        
        const tasks = result.rows.map(row => ({
            id: row.TASK_ID,
            text: row.TASK_TEXT,
            date: row.TASK_DATE ? row.TASK_DATE.toISOString().split('T')[0] : null,
            time: row.TASK_TIME,
            type: row.TASK_TYPE,
            completed: row.IS_COMPLETED === 1,
            completedAt: row.COMPLETED_AT,
            createdAt: row.CREATED_AT
        }));
        
        res.json(tasks);
        
    } catch (err) {
        console.error('Get tasks error:', err);
        res.status(500).json({ error: 'Failed to get tasks.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Create a new task
exports.createTask = async (req, res) => {
    let connection;
    try {
        const { text, date, time, type } = req.body;
        
        if (!text || !date) {
            return res.status(400).json({ error: 'Task text and date are required.' });
        }
        
        const taskId = generateId();
        const taskDate = new Date(date);
        
        connection = await getConnection();
        
        await connection.execute(
            `INSERT INTO TASKS (task_id, user_id, task_text, task_date, task_time, task_type, is_completed) 
             VALUES (:taskId, :userId, :text, :taskDate, :time, :type, 0)`,
            [taskId, req.user.userId, text, taskDate, time || null, type || 'Assignment']
        );
        
        res.status(201).json({
            success: true,
            task: {
                id: taskId,
                text,
                date,
                time: time || null,
                type: type || 'Assignment',
                completed: false
            }
        });
        
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ error: 'Failed to create task.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Toggle task completion
exports.toggleTaskComplete = async (req, res) => {
    let connection;
    try {
        const { taskId } = req.params;
        
        connection = await getConnection();
        
        // Get current status
        const taskCheck = await connection.execute(
            `SELECT is_completed FROM TASKS 
             WHERE task_id = :taskId AND user_id = :userId`,
            [taskId, req.user.userId]
        );
        
        if (taskCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        
        const wasCompleted = taskCheck.rows[0].IS_COMPLETED === 1;
        const newStatus = wasCompleted ? 0 : 1;
        const completedAt = newStatus === 1 ? new Date() : null;
        
        // Update task
        await connection.execute(
            `UPDATE TASKS 
             SET is_completed = :newStatus, completed_at = :completedAt
             WHERE task_id = :taskId AND user_id = :userId`,
            [newStatus, completedAt, taskId, req.user.userId]
        );
        
        // Update user stats if task was completed
        if (newStatus === 1) {
            await connection.execute(
                `UPDATE USER_STATS 
                 SET total_goals_completed = total_goals_completed + 1
                 WHERE user_id = :userId`,
                [req.user.userId]
            );
        }
        
        res.json({ 
            success: true, 
            completed: newStatus === 1,
            message: newStatus === 1 ? 'Task completed!' : 'Task reopened.'
        });
        
    } catch (err) {
        console.error('Toggle task error:', err);
        res.status(500).json({ error: 'Failed to update task.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete a single task
exports.deleteTask = async (req, res) => {
    let connection;
    try {
        const { taskId } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `DELETE FROM TASKS 
             WHERE task_id = :taskId AND user_id = :userId`,
            [taskId, req.user.userId]
        );
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        
        res.json({ success: true, message: 'Task deleted.' });
        
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ error: 'Failed to delete task.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete all tasks
exports.deleteAllTasks = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        await connection.execute(
            `DELETE FROM TASKS WHERE user_id = :userId`,
            [req.user.userId]
        );
        
        res.json({ success: true, message: 'All tasks deleted.' });
        
    } catch (err) {
        console.error('Delete all tasks error:', err);
        res.status(500).json({ error: 'Failed to delete tasks.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete tasks by type
exports.deleteTasksByType = async (req, res) => {
    let connection;
    try {
        const { type } = req.params;
        const { completed } = req.query;
        
        let query = `DELETE FROM TASKS 
                     WHERE user_id = :userId AND task_type = :type`;
        const params = [req.user.userId, type];
        
        if (completed !== undefined) {
            query += ` AND is_completed = :completed`;
            params.push(completed === 'true' ? 1 : 0);
        }
        
        connection = await getConnection();
        const result = await connection.execute(query, params);
        
        res.json({ success: true, message: `Tasks of type "${type}" deleted.` });
        
    } catch (err) {
        console.error('Delete by type error:', err);
        res.status(500).json({ error: 'Failed to delete tasks.' });
    } finally {
        if (connection) await connection.close();
    }
};