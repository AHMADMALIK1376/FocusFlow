const { getConnection } = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendDailyRoutineEmail = async (userEmail, userName, routines, dayName, dateStr) => {
    if (!routines || routines.length === 0) return;

    const sortedRoutines = [...routines].sort((a, b) => (a.ACTIVITY_TIME || '').localeCompare(b.ACTIVITY_TIME || ''));

    const formatTime = (time24) => {
        if (!time24) return '';
        const [h, m] = time24.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    };

    const routineRows = sortedRoutines.map(routine => `
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #6c5ce7; font-size: 14px;">
                ⏰ ${formatTime(routine.ACTIVITY_TIME)}
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #1f2937; font-size: 14px;">
                ${routine.ACTIVITY_NAME}
            </td>
        </tr>
    `).join('');

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `📅 Your ${dayName} Routine - ${dateStr}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6c5ce7, #a29bfe); border-radius: 20px;">
                <div style="text-align: center; padding: 20px;">
                    <h1 style="color: white; margin-bottom: 5px;">🌅 Good Morning, ${userName}!</h1>
                    <p style="color: rgba(255,255,255,0.9); font-size: 14px;">Here's your routine for ${dayName}, ${dateStr}</p>
                </div>
                <div style="background: white; border-radius: 20px; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="font-size: 40px;">🕒</span>
                        <h2 style="color: #1f2937; margin: 8px 0;">${routines.length} Activities Scheduled</h2>
                    </div>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f0f2f5;">
                                <th style="padding: 10px; text-align: center; border-radius: 10px 0 0 0; font-size: 10px; text-transform: uppercase; color: #6b7280;">Time</th>
                                <th style="padding: 10px; text-align: left; border-radius: 0 10px 0 0; font-size: 10px; text-transform: uppercase; color: #6b7280;">Activity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${routineRows}
                        </tbody>
                    </table>
                    
                    <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f0f2f5; border-radius: 12px;">
                        <p style="color: #6c5ce7; font-weight: bold; font-size: 13px;">✨ Stay consistent. Every routine builds discipline.</p>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; color: rgba(255,255,255,0.7); font-size: 11px;">
                    <p>FocusFlow - Your Daily Routine Tracker</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Daily routine email sent to ${userEmail} for ${dayName}`);
        return true;
    } catch (error) {
        console.error('Error sending routine email:', error);
        return false;
    }
};

const sendAllDailyRoutines = async () => {
    let connection;
    try {
        connection = await getConnection();
        
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }); // "Monday"
        const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        console.log(`📅 Sending daily routine emails for ${dayName}`);
        console.log(`   Day name being queried: "${dayName}"`);
        
        // Get all verified users
        const usersResult = await connection.execute(
            `SELECT user_id, email, full_name FROM USERS WHERE is_verified = 1`
        );
        
        console.log(`   Found ${usersResult.rows.length} verified users`);
        
        let emailsSent = 0;
        
        for (const user of usersResult.rows) {
            console.log(`   Checking routines for: ${user.EMAIL}`);
            
            // Get today's routines - using named bind parameters
            const routinesResult = await connection.execute(
                `SELECT dr.activity_name, dr.activity_time 
                 FROM DAILY_ROUTINE dr
                 JOIN ROUTINE_REPEAT_DAYS rrd ON dr.routine_id = rrd.routine_id
                 WHERE dr.user_id = :userId 
                   AND rrd.day_of_week = :dayName
                 ORDER BY dr.activity_time ASC`,
                { 
                    userId: user.USER_ID, 
                    dayName: dayName  // "Monday"
                }
            );
            
            console.log(`   Found ${routinesResult.rows.length} routines for ${user.EMAIL} on ${dayName}`);
            
            if (routinesResult.rows.length > 0) {
                // Log each routine
                routinesResult.rows.forEach(r => {
                    console.log(`      - ${r.ACTIVITY_NAME} at ${r.ACTIVITY_TIME}`);
                });
                
                await sendDailyRoutineEmail(
                    user.EMAIL,
                    user.FULL_NAME || user.EMAIL.split('@')[0],
                    routinesResult.rows,
                    dayName,
                    dateStr
                );
                emailsSent++;
            }
        }
        
        console.log(`✅ Sent ${emailsSent} daily routine emails`);
        
    } catch (err) {
        console.error('Error sending daily routines:', err.message);
        console.error('Full error:', err);
    } finally {
        if (connection) await connection.close();
    }
};

module.exports = { sendAllDailyRoutines, sendDailyRoutineEmail };