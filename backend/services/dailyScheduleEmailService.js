// backend/services/dailyScheduleEmailService.js
const { getConnection } = require('../config/database');
const nodemailer = require('nodemailer');

// Configure email transporter (using your existing Gmail setup)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper to format 24hr time to 12hr
const formatTime12h = (time24) => {
    if (!time24) return 'Time TBD';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
};

// Send daily schedule email to a specific user
const sendDailyScheduleEmail = async (userEmail, userName, classes) => {
    const today = new Date();
    const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    // Build HTML email content
    let classesHtml = '';
    
    if (classes.length === 0) {
        classesHtml = '<p style="color: #666; font-size: 16px;">🎉 You have no classes scheduled for today! Enjoy your day off.</p>';
    } else {
        classes.forEach(cls => {
            const startTime = formatTime12h(cls.START_TIME);
            const endTime = formatTime12h(cls.END_TIME);
            classesHtml += `
                <div style="background: #f0f2f5; border-radius: 15px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #6c5ce7;">
                    <h3 style="margin: 0 0 5px 0; color: #6c5ce7;">📖 ${cls.SUBJECT_NAME}</h3>
                    <p style="margin: 5px 0; color: #333;">⏰ ${startTime} - ${endTime}</p>
                    ${cls.ROOM_NUMBER ? `<p style="margin: 5px 0; color: #666;">📍 Room: ${cls.ROOM_NUMBER}</p>` : ''}
                </div>
            `;
        });
    }
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6c5ce7, #8271ff); border-radius: 20px;">
            <div style="text-align: center; padding: 20px;">
                <h1 style="color: white; margin-bottom: 10px;">📚 FocusFlow</h1>
                <p style="color: rgba(255,255,255,0.9);">Your Daily Schedule</p>
            </div>
            <div style="background: white; border-radius: 20px; padding: 30px;">
                <h2 style="color: #6c5ce7; margin-top: 0;">Good ${getTimeOfDay()}, ${userName}!</h2>
                <p style="color: #666;">Here's your schedule for <strong>${todayDay}, ${dateStr}</strong>:</p>
                
                ${classesHtml}
                
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
                    <p style="color: #999; font-size: 12px;">Stay organized, stay ahead! 🌟</p>
                </div>
            </div>
            <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
                <p>FocusFlow - Your Academic Companion</p>
            </div>
        </div>
    `;
    
    const textContent = `
FocusFlow Daily Schedule for ${todayDay}, ${dateStr}
${'='.repeat(40)}
${classes.length === 0 ? 'No classes today! Enjoy your day off.' : classes.map(cls => {
    const startTime = formatTime12h(cls.START_TIME);
    const endTime = formatTime12h(cls.END_TIME);
    return `${cls.SUBJECT_NAME}: ${startTime} - ${endTime}${cls.ROOM_NUMBER ? ` (Room: ${cls.ROOM_NUMBER})` : ''}`;
}).join('\n')}
    `;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `📚 FocusFlow - Your Schedule for ${todayDay}, ${dateStr}`,
        html: htmlContent,
        text: textContent
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Daily schedule email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending daily schedule email:', error);
        return false;
    }
};

// Helper to get time of day greeting
const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

// Main function to send daily schedules to ALL verified users
const sendAllDailySchedules = async () => {
    let connection;
    try {
        connection = await getConnection();
        
        const now = new Date();
        const todayDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const todayShort = todayDay.substring(0, 3);
        
        console.log(`📧 Sending daily schedule emails for ${todayDay}`);
        
        // Get all verified users
        const usersResult = await connection.execute(
            `SELECT user_id, email, full_name FROM USERS WHERE is_verified = 1`,
            []
        );
        
        console.log(`📊 Found ${usersResult.rows.length} verified users`);
        
        for (const user of usersResult.rows) {
            // Get today's classes for this user
            const classesResult = await connection.execute(
                `SELECT 
                    ce.subject_name,
                    ce.start_time,
                    ce.end_time,
                    ce.room_number
                 FROM CALENDAR_ENTRIES ce
                 JOIN CALENDAR_LIST cl ON ce.calendar_id = cl.calendar_id
                 JOIN CALENDAR_ENTRY_DAYS ced ON ce.entry_id = ced.entry_id
                 WHERE cl.user_id = :userId
                 AND (ced.day_of_week = :todayDay OR ced.day_of_week = :todayShort)
                 ORDER BY ce.start_time ASC`,
                { userId: user.USER_ID, todayDay: todayDay, todayShort: todayShort }
            );
            
            const userName = user.FULL_NAME || user.EMAIL.split('@')[0];
            await sendDailyScheduleEmail(user.EMAIL, userName, classesResult.rows);
        }
        
        console.log('✅ All daily schedule emails sent successfully');
        
    } catch (err) {
        console.error('❌ Error sending daily schedules:', err);
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { sendAllDailySchedules, sendDailyScheduleEmail };