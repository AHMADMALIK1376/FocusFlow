const { getConnection } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { calculateAttendance, sendAttendanceWarning } = require('../services/attendanceService');

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
            { userId: req.user.userId }
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
            { calendarId, userId: req.user.userId, title: title.trim() }
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
            { title: title.trim(), id, userId: req.user.userId }
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
        
        await connection.execute(
            `UPDATE CALENDAR_LIST SET is_active = 0 WHERE user_id = :userId`,
            { userId: req.user.userId }
        );
        
        const result = await connection.execute(
            `UPDATE CALENDAR_LIST SET is_active = 1 
             WHERE calendar_id = :id AND user_id = :userId`,
            { id, userId: req.user.userId }
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

// Delete calendar
exports.deleteCalendar = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        
        connection = await getConnection();
        
        const result = await connection.execute(
            `DELETE FROM CALENDAR_LIST 
             WHERE calendar_id = :id AND user_id = :userId`,
            { id, userId: req.user.userId }
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

// Get entries for a calendar - WITH PER-DAY TIMINGS AND ATTENDANCE STATUS
exports.getCalendarEntries = async (req, res) => {
    let connection;
    try {
        const { calendarId } = req.params;
        
        connection = await getConnection();
        
        const calendarCheck = await connection.execute(
            `SELECT calendar_id FROM CALENDAR_LIST 
             WHERE calendar_id = :calendarId AND user_id = :userId`,
            { calendarId, userId: req.user.userId }
        );
        
        if (calendarCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Calendar not found.' });
        }
        
        const entriesResult = await connection.execute(
            `SELECT entry_id, subject_name, start_time, end_time, room_number, is_done, created_at
             FROM CALENDAR_ENTRIES 
             WHERE calendar_id = :calendarId 
             ORDER BY created_at ASC`,
            { calendarId }
        );
        
        const entries = [];
        
        for (const entry of entriesResult.rows) {
            // Get days with per-day timings
            const daysResult = await connection.execute(
                `SELECT day_of_week, day_start_time, day_end_time, day_room_number 
                 FROM CALENDAR_ENTRY_DAYS 
                 WHERE entry_id = :entryId
                 ORDER BY day_of_week`,
                { entryId: entry.ENTRY_ID }
            );
            
            // ========== NEW: Get attendance records for this entry ==========
            const attendanceRecords = await connection.execute(
                `SELECT 
                    TO_CHAR(class_date, 'YYYY-MM-DD') as class_date,
                    status,
                    points_earned,
                    points_possible
                 FROM ATTENDANCE_RECORDS 
                 WHERE user_id = :userId AND entry_id = :entryId
                 ORDER BY class_date ASC`,
                { userId: req.user.userId, entryId: entry.ENTRY_ID }
            );
            
            // Create a map of date -> status for quick lookup
            const dateStatusMap = {};
            attendanceRecords.rows.forEach(record => {
                dateStatusMap[record.CLASS_DATE] = {
                    status: record.STATUS,
                    pointsEarned: record.POINTS_EARNED,
                    pointsPossible: record.POINTS_POSSIBLE
                };
            });
            
            entries.push({
                id: entry.ENTRY_ID,
                subject: entry.SUBJECT_NAME,
                startTime: entry.START_TIME,
                endTime: entry.END_TIME,
                lrNo: entry.ROOM_NUMBER,
                done: entry.IS_DONE === 1,
                days: daysResult.rows.map(d => d.DAY_OF_WEEK),
                // Per-day timing info
                dayDetails: daysResult.rows.map(d => ({
                    day: d.DAY_OF_WEEK,
                    startTime: d.DAY_START_TIME || entry.START_TIME,
                    endTime: d.DAY_END_TIME || entry.END_TIME,
                    room: d.DAY_ROOM_NUMBER || entry.ROOM_NUMBER
                })),
                // ========== NEW: Date-specific attendance status ==========
                dateAttendance: dateStatusMap,
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

// Add entry to calendar - NOW SUPPORTS PER-DAY TIMINGS
exports.addCalendarEntry = async (req, res) => {
    let connection;
    try {
        const { calendarId } = req.params;
        const { subject, startTime, endTime, lrNo, days, dayDetails } = req.body;
        
        if (!subject || !days || days.length === 0) {
            return res.status(400).json({ error: 'Subject and at least one day are required.' });
        }
        
        connection = await getConnection();
        
        const calendarCheck = await connection.execute(
            `SELECT calendar_id FROM CALENDAR_LIST 
             WHERE calendar_id = :calendarId AND user_id = :userId`,
            { calendarId, userId: req.user.userId }
        );
        
        if (calendarCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Calendar not found.' });
        }
        
        const entryId = generateId();
        
        // Insert entry with default times
        await connection.execute(
            `INSERT INTO CALENDAR_ENTRIES 
             (entry_id, calendar_id, subject_name, start_time, end_time, room_number, is_done) 
             VALUES (:entryId, :calendarId, :subject, :startTime, :endTime, :lrNo, 0)`,
            { entryId, calendarId, subject, startTime: startTime || null, endTime: endTime || null, lrNo: lrNo || null }
        );
        
        // Insert days with per-day timings if provided
        for (const day of days) {
            const dayId = generateId();
            const detail = dayDetails ? dayDetails.find(d => d.day === day) : null;
            
            await connection.execute(
                `INSERT INTO CALENDAR_ENTRY_DAYS 
                 (entry_day_id, entry_id, day_of_week, day_start_time, day_end_time, day_room_number) 
                 VALUES (:dayId, :entryId, :day, :dayStartTime, :dayEndTime, :dayRoom)`,
                {
                    dayId, entryId, day,
                    dayStartTime: detail?.startTime || startTime || null,
                    dayEndTime: detail?.endTime || endTime || null,
                    dayRoom: detail?.room || lrNo || null
                }
            );
        }
        
        // Auto-generate attendance sessions
        console.log(`🔄 Auto-generating attendance sessions for: ${subject}`);
        
        const semesterStart = new Date('2026-02-18');
        const semesterEnd = new Date('2026-06-25');
        
        let sessionsCreated = 0;
        const currentDate = new Date(semesterStart);
        
        while (currentDate <= semesterEnd) {
            const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
            
            if (days.includes(dayOfWeek)) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const recordId = generateId();
                
                await connection.execute(
                    `INSERT INTO ATTENDANCE_RECORDS 
                     (record_id, user_id, entry_id, class_date, status, points_earned, points_possible)
                     VALUES (:recordId, :userId, :entryId, TO_DATE(:classDate, 'YYYY-MM-DD'), 'Pending', 0, 2)`,
                    { recordId, userId: req.user.userId, entryId, classDate: dateStr }
                );
                sessionsCreated++;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`✅ Generated ${sessionsCreated} attendance sessions for ${subject}`);
        
        await calculateAttendance(connection, req.user.userId, entryId);
        
        res.status(201).json({
            success: true,
            entry: {
                id: entryId,
                subject,
                startTime,
                endTime,
                lrNo,
                days,
                dayDetails: dayDetails || [],
                done: false,
                sessionsGenerated: sessionsCreated
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
        
        const entryCheck = await connection.execute(
            `SELECT ce.entry_id 
             FROM CALENDAR_ENTRIES ce
             JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
             WHERE ce.entry_id = :entryId AND cl.user_id = :userId`,
            { entryId, userId: req.user.userId }
        );
        
        if (entryCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found.' });
        }
        
        await connection.execute(
            `UPDATE CALENDAR_ENTRIES 
             SET subject_name = :subject, start_time = :startTime, 
                 end_time = :endTime, room_number = :lrNo
             WHERE entry_id = :entryId`,
            { subject, startTime: startTime || null, endTime: endTime || null, lrNo: lrNo || null, entryId }
        );
        
        if (days && days.length > 0) {
            await connection.execute(
                `DELETE FROM CALENDAR_ENTRY_DAYS WHERE entry_id = :entryId`,
                { entryId }
            );
            
            for (const day of days) {
                const dayId = generateId();
                await connection.execute(
                    `INSERT INTO CALENDAR_ENTRY_DAYS (entry_day_id, entry_id, day_of_week) 
                     VALUES (:dayId, :entryId, :day)`,
                    { dayId, entryId, day }
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
            { entryId, userId: req.user.userId }
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

// Toggle done status for entry AND update attendance
exports.toggleEntryDone = async (req, res) => {
    let connection;
    try {
        const { entryId } = req.params;
        
        connection = await getConnection();
        
        const entryResult = await connection.execute(
            `SELECT ce.entry_id, ce.subject_name, ce.calendar_id,
                    cl.user_id, ce.start_time, ce.end_time
             FROM CALENDAR_ENTRIES ce
             JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
             WHERE ce.entry_id = :entryId AND cl.user_id = :userId`,
            { entryId, userId: req.user.userId }
        );
        
        if (entryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found.' });
        }
        
        const entry = entryResult.rows[0];
        
        const statusResult = await connection.execute(
            `SELECT is_done FROM CALENDAR_ENTRIES WHERE entry_id = :entryId`,
            { entryId }
        );
        
        const currentStatus = statusResult.rows[0].IS_DONE;
        const newStatus = currentStatus === 0 ? 1 : 0;
        
        await connection.execute(
            `UPDATE CALENDAR_ENTRIES 
             SET is_done = :newStatus
             WHERE entry_id = :entryId`,
            { newStatus, entryId }
        );
        
        // Update attendance
        const today = new Date();
        const todayDayName = today.toLocaleDateString('en-US', { weekday: 'short' });
        const todayDateStr = today.toISOString().split('T')[0];
        
        const daysResult = await connection.execute(
            `SELECT day_of_week FROM CALENDAR_ENTRY_DAYS WHERE entry_id = :entryId`,
            { entryId }
        );
        
        const entryDays = daysResult.rows.map(d => d.DAY_OF_WEEK);
        const runsToday = entryDays.some(day => day.trim() === todayDayName);
        
        if (runsToday) {
            if (newStatus === 1) {
                const existingRecord = await connection.execute(
                    `SELECT record_id FROM ATTENDANCE_RECORDS 
                     WHERE user_id = :userId AND entry_id = :entryId 
                     AND class_date = TO_DATE(:todayDate, 'YYYY-MM-DD')`,
                    { userId: req.user.userId, entryId, todayDate: todayDateStr }
                );
                
                if (existingRecord.rows.length > 0) {
                    await connection.execute(
                        `UPDATE ATTENDANCE_RECORDS 
                         SET status = 'Present', points_earned = 2
                         WHERE record_id = :recordId`,
                        { recordId: existingRecord.rows[0].RECORD_ID }
                    );
                } else {
                    const recordId = generateId();
                    await connection.execute(
                        `INSERT INTO ATTENDANCE_RECORDS 
                         (record_id, user_id, entry_id, class_date, status, points_earned, points_possible)
                         VALUES (:recordId, :userId, :entryId, TO_DATE(:todayDate, 'YYYY-MM-DD'), 'Present', 2, 2)`,
                        { recordId, userId: req.user.userId, entryId, todayDate: todayDateStr }
                    );
                }
            } else {
                const existingRecord = await connection.execute(
                    `SELECT record_id FROM ATTENDANCE_RECORDS 
                     WHERE user_id = :userId AND entry_id = :entryId 
                     AND class_date = TO_DATE(:todayDate, 'YYYY-MM-DD')`,
                    { userId: req.user.userId, entryId, todayDate: todayDateStr }
                );
                
                if (existingRecord.rows.length > 0) {
                    await connection.execute(
                        `UPDATE ATTENDANCE_RECORDS 
                         SET status = 'Absent', points_earned = 0
                         WHERE record_id = :recordId`,
                        { recordId: existingRecord.rows[0].RECORD_ID }
                    );
                }
            }
            
            await calculateAttendance(connection, req.user.userId, entryId);
        }
        
        res.json({ 
            success: true, 
            message: newStatus === 1 ? 'Marked as done and attendance recorded.' : 'Marked as not done.',
            isDone: newStatus === 1,
            attendanceUpdated: runsToday
        });
        
    } catch (err) {
        console.error('Toggle entry error:', err);
        res.status(500).json({ error: 'Failed to toggle entry status.' });
    } finally {
        if (connection) await connection.close();
    }
};