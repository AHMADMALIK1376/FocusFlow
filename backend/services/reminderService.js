const { getConnection } = require('../config/database');
const { sendClassReminder } = require('./emailService');

const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
};

// Helper function to convert hour to 12-hour format for display
const formatHourTo12h = (hour) => {
    let h = hour;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:00 ${ampm}`;
};

// Send class reminders - simplified version
const sendClassReminders = async () => {
    let connection;
    try {
        connection = await getConnection();
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const todayDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const todayShort = todayDay.substring(0, 3);
        
        // Calculate target time for 1 hour from now with proper formatting
        const targetHour = currentHour + 1;
        const targetMinute = currentMinute;
        
        // Format for database comparison (24-hour)
        const targetHourFormatted = targetHour.toString().padStart(2, '0');
        const targetMinuteFormatted = targetMinute.toString().padStart(2, '0');
        
        // Convert to 12-hour format for display
        const displayHour = targetHour % 12 || 12;
        const displayAmPm = targetHour >= 12 ? 'PM' : 'AM';
        const displayTime = `${displayHour}:${targetMinuteFormatted} ${displayAmPm}`;
        
        console.log(`🔍 Checking for classes at ${displayTime} (1 hour from now)`);
        
        // Get ALL classes for today (no date filtering in SQL to avoid errors)
        const result = await connection.execute(
            `SELECT 
                ce.entry_id,
                ce.subject_name,
                ce.start_time,
                ce.end_time,
                ce.room_number,
                ced.day_of_week,
                u.user_id,
                u.email,
                u.full_name
             FROM CALENDAR_ENTRIES ce
             JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
             JOIN USERS u ON cl.user_id = u.user_id
             JOIN CALENDAR_ENTRY_DAYS ced ON ce.entry_id = ced.entry_id
             WHERE (ced.day_of_week = :todayDay OR ced.day_of_week = :todayShort)`,
            { todayDay, todayShort }
        );
        
        console.log(`📊 Total classes found for today: ${result.rows.length}`);
        
        // Filter in JavaScript
        let foundCount = 0;
        for (const classItem of result.rows) {
            if (!classItem.START_TIME) continue;
            
            const [classHour, classMinute] = classItem.START_TIME.split(':').map(Number);
            
            // Check if class starts exactly 1 hour from now (matching hour and minute)
            if (classHour === targetHour && classMinute === targetMinute) {
                foundCount++;
                
                // Convert class time to 12-hour format for display
                const classDisplayHour = classHour % 12 || 12;
                const classAmPm = classHour >= 12 ? 'PM' : 'AM';
                const classDisplayTime = `${classDisplayHour}:${classMinute.toString().padStart(2, '0')} ${classAmPm}`;
                
                console.log(`📨 Found class: ${classItem.SUBJECT_NAME} at ${classDisplayTime}`);
                
                const startTimeFormatted = formatTime12h(classItem.START_TIME);
                const endTimeFormatted = formatTime12h(classItem.END_TIME);
                
                const dateFormatted = now.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric' 
                });
                
                const classDetails = {
                    subjectName: classItem.SUBJECT_NAME,
                    startTime: startTimeFormatted,
                    endTime: endTimeFormatted,
                    roomNumber: classItem.ROOM_NUMBER || 'Not specified',
                    dayOfWeek: classItem.DAY_OF_WEEK,
                    date: dateFormatted
                };
                
                const emailSent = await sendClassReminder(classItem.EMAIL, classDetails);
                
                if (emailSent) {
                    console.log(`✅ Class reminder sent to ${classItem.EMAIL} for ${classItem.SUBJECT_NAME}`);
                } else {
                    console.log(`❌ Failed to send email to ${classItem.EMAIL}`);
                }
            }
        }
        
        if (foundCount === 0) {
            // Quiet log - optional
            // console.log(`📭 No classes found at ${displayTime}`);
        }
        
    } catch (err) {
        console.error('Error in sendClassReminders:', err);
    } finally {
        if (connection) await connection.close();
    }
};

// Start the reminder scheduler
const startReminderScheduler = () => {
    const cron = require('node-cron');
    
    // Run every minute to check for classes starting exactly 1 hour from now
    cron.schedule('* * * * *', () => {
        sendClassReminders();
    });
    
    console.log('⏰ Class reminder scheduler started. Will check every minute for classes starting in 1 hour.');
    
    // Run once immediately on startup
    setTimeout(() => {
        console.log('🧪 Running initial class reminder check...');
        sendClassReminders();
    }, 3000);
};

module.exports = { 
    sendClassReminders, 
    startReminderScheduler,
    getUpcomingClasses: async () => [] 
};