const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');

// ========== CALENDAR LIST OPERATIONS ==========

// Get all calendars for user
exports.getCalendars = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT calendar_id, calendar_title, is_active, created_at 
             FROM CALENDAR_LIST 
             WHERE user_id = :userId 
             ORDER BY is_active DESC, created_at DESC`,
            [req.user.userId]
        );
        
        const calendars = result.rows.map(row => ({
            id: row.CALENDAR_ID,
            title: row.CALENDAR_TITLE,
            isActive: row.IS_ACTIVE === 1,
            createdAt: row.CREATED_AT
        }));
        
        res.json(calendars);
        
    } catch (err) {
        console.error('Get calendars error:', err);
        res.status(500).json({ error: 'Failed to get calendars.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Create new calendar
exports.createCalendar = async (req, res) => {
    let connection;
    try {
        const { title } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Calendar title is required.' });
        }
        
        const calendarId = generateId();
        
        connection = await getConnection();
        
        await connection.execute(
            `INSERT INTO CALENDAR_LIST (calendar_id, user_id, calendar_title, is_active) 
             VALUES (:calendarId, :userId, :title, 0)`,
            [calendarId, req.user.userId, title.trim()]
        );
        
        res.status(201).json({
            success: true,
            calendar: {
                id: calendarId,
                title: title.trim(),
                isActive: false
            }
        });
        
    } catch (err) {
        console.error('Create calendar error:', err);
        res.status(500).json({ error: 'Failed to create calendar.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Update calendar title
exports.updateCalendar = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { title } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Calendar title is required.' });
        }
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `UPDATE CALENDAR_LIST 
             SET calendar_title = :title 
             WHERE calendar_id = :id AND user_id = :userId`,
            [title.trim(), id, req.user.userId]
        );
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Calendar not found.' });
        }
        
        res.json({ success: true, message: 'Calendar updated successfully.' });
        
    } catch (err) {
        console.error('Update calendar error:', err);
        res.status(500).json({ error: 'Failed to update calendar.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Set active calendar
exports.setActiveCalendar = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        connection = await getConnection();
        
        // First, deactivate all calendars for this user
        await connection.execute(
            `UPDATE CALENDAR_LIST SET is_active = 0 WHERE user_id = :userId`,
            [req.user.userId]
        );
        
        // Then activate the selected calendar
        const result = await connection.execute(
            `UPDATE CALENDAR_LIST SET is_active = 1 
             WHERE calendar_id = :id AND user_id = :userId`,
            [id, req.user.userId]
        );
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Calendar not found.' });
        }
        
        res.json({ success: true, message: 'Active calendar updated.' });
        
    } catch (err) {
        console.error('Set active calendar error:', err);
        res.status(500).json({ error: 'Failed to set active calendar.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete calendar (cascade deletes all entries)
exports.deleteCalendar = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `DELETE FROM CALENDAR_LIST 
             WHERE calendar_id = :id AND user_id = :userId`,
            [id, req.user.userId]
        );
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Calendar not found.' });
        }
        
        res.json({ success: true, message: 'Calendar deleted successfully.' });
        
    } catch (err) {
        console.error('Delete calendar error:', err);
        res.status(500).json({ error: 'Failed to delete calendar.' });
    } finally {
        if (connection) await connection.close();
    }
};

// ========== CALENDAR ENTRIES (Subjects) OPERATIONS ==========

// Get entries for a calendar
exports.getCalendarEntries = async (req, res) => {
    let connection;
    try {
        const { calendarId } = req.params;
        
        connection = await getConnection();
        
        // Verify calendar belongs to user
        const calendarCheck = await connection.execute(
            `SELECT calendar_id FROM CALENDAR_LIST 
             WHERE calendar_id = :calendarId AND user_id = :userId`,
            [calendarId, req.user.userId]
        );
        
        if (calendarCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Calendar not found.' });
        }
        
        // Get entries with their days
        const entriesResult = await connection.execute(
            `SELECT entry_id, subject_name, start_time, end_time, room_number, is_done, created_at
             FROM CALENDAR_ENTRIES 
             WHERE calendar_id = :calendarId 
             ORDER BY created_at ASC`,
            [calendarId]
        );
        
        const entries = [];
        
        for (const entry of entriesResult.rows) {
            // Get days for this entry
            const daysResult = await connection.execute(
                `SELECT day_of_week FROM CALENDAR_ENTRY_DAYS 
                 WHERE entry_id = :entryId`,
                [entry.ENTRY_ID]
            );
            
            entries.push({
                id: entry.ENTRY_ID,
                subject: entry.SUBJECT_NAME,
                startTime: entry.START_TIME,
                endTime: entry.END_TIME,
                lrNo: entry.ROOM_NUMBER,
                done: entry.IS_DONE === 1,
                days: daysResult.rows.map(d => d.DAY_OF_WEEK),
                createdAt: entry.CREATED_AT
            });
        }
        
        res.json(entries);
        
    } catch (err) {
        console.error('Get entries error:', err);
        res.status(500).json({ error: 'Failed to get calendar entries.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Add entry to calendar
exports.addCalendarEntry = async (req, res) => {
    let connection;
    try {
        const { calendarId } = req.params;
        const { subject, startTime, endTime, lrNo, days } = req.body;
        
        if (!subject || !days || days.length === 0) {
            return res.status(400).json({ error: 'Subject and at least one day are required.' });
        }
        
        connection = await getConnection();
        
        // Verify calendar belongs to user
        const calendarCheck = await connection.execute(
            `SELECT calendar_id FROM CALENDAR_LIST 
             WHERE calendar_id = :calendarId AND user_id = :userId`,
            [calendarId, req.user.userId]
        );
        
        if (calendarCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Calendar not found.' });
        }
        
        const entryId = generateId();
        
        // Insert entry
        await connection.execute(
            `INSERT INTO CALENDAR_ENTRIES 
             (entry_id, calendar_id, subject_name, start_time, end_time, room_number, is_done) 
             VALUES (:entryId, :calendarId, :subject, :startTime, :endTime, :lrNo, 0)`,
            [entryId, calendarId, subject, startTime || null, endTime || null, lrNo || null]
        );
        
        // Insert days
        for (const day of days) {
            const dayId = generateId();
            await connection.execute(
                `INSERT INTO CALENDAR_ENTRY_DAYS (entry_day_id, entry_id, day_of_week) 
                 VALUES (:dayId, :entryId, :day)`,
                [dayId, entryId, day]
            );
        }
        
        res.status(201).json({
            success: true,
            entry: {
                id: entryId,
                subject,
                startTime,
                endTime,
                lrNo,
                days,
                done: false
            }
        });
        
    } catch (err) {
        console.error('Add entry error:', err);
        res.status(500).json({ error: 'Failed to add calendar entry.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Update calendar entry
exports.updateCalendarEntry = async (req, res) => {
    let connection;
    try {
        const { entryId } = req.params;
        const { subject, startTime, endTime, lrNo, days } = req.body;
        
        connection = await getConnection();
        
        // Verify entry belongs to user's calendar
        const entryCheck = await connection.execute(
            `SELECT ce.entry_id 
             FROM CALENDAR_ENTRIES ce
             JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
             WHERE ce.entry_id = :entryId AND cl.user_id = :userId`,
            [entryId, req.user.userId]
        );
        
        if (entryCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found.' });
        }
        
        // Update entry
        await connection.execute(
            `UPDATE CALENDAR_ENTRIES 
             SET subject_name = :subject, start_time = :startTime, 
                 end_time = :endTime, room_number = :lrNo
             WHERE entry_id = :entryId`,
            [subject, startTime || null, endTime || null, lrNo || null, entryId]
        );
        
        // Update days if provided
        if (days && days.length > 0) {
            // Delete existing days
            await connection.execute(
                `DELETE FROM CALENDAR_ENTRY_DAYS WHERE entry_id = :entryId`,
                [entryId]
            );
            
            // Insert new days
            for (const day of days) {
                const dayId = generateId();
                await connection.execute(
                    `INSERT INTO CALENDAR_ENTRY_DAYS (entry_day_id, entry_id, day_of_week) 
                     VALUES (:dayId, :entryId, :day)`,
                    [dayId, entryId, day]
                );
            }
        }
        
        res.json({ success: true, message: 'Entry updated successfully.' });
        
    } catch (err) {
        console.error('Update entry error:', err);
        res.status(500).json({ error: 'Failed to update calendar entry.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Delete calendar entry
exports.deleteCalendarEntry = async (req, res) => {
    let connection;
    try {
        const { entryId } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `DELETE FROM CALENDAR_ENTRIES 
             WHERE entry_id = :entryId 
             AND calendar_id IN (SELECT calendar_id FROM CALENDAR_LIST WHERE user_id = :userId)`,
            [entryId, req.user.userId]
        );
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Entry not found.' });
        }
        
        res.json({ success: true, message: 'Entry deleted successfully.' });
        
    } catch (err) {
        console.error('Delete entry error:', err);
        res.status(500).json({ error: 'Failed to delete calendar entry.' });
    } finally {
        if (connection) await connection.close();
    }
};

// Toggle done status for entry
exports.toggleEntryDone = async (req, res) => {
    let connection;
    try {
        const { entryId } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `UPDATE CALENDAR_ENTRIES 
             SET is_done = CASE WHEN is_done = 0 THEN 1 ELSE 0 END
             WHERE entry_id = :entryId 
             AND calendar_id IN (SELECT calendar_id FROM CALENDAR_LIST WHERE user_id = :userId)`,
            [entryId, req.user.userId]
        );
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Entry not found.' });
        }
        
        res.json({ success: true, message: 'Entry status toggled.' });
        
    } catch (err) {
        console.error('Toggle entry error:', err);
        res.status(500).json({ error: 'Failed to toggle entry status.' });
    } finally {
        if (connection) await connection.close();
    }
};