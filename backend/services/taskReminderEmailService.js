// backend/services/taskReminderEmailService.js
const { getConnection } = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const formatTime12h = (time24) => {
    if (!time24) return 'Time not set';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
};

const formatDateReadable = (dateStr) => {
    if (!dateStr) return 'Date not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
    });
};

const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const sendTaskReminderEmail = async (userEmail, userName, tasks, reminderType, subjectPrefix) => {
    if (tasks.length === 0) return false;
    
    let tasksHtml = '';
    let tasksText = '';
    
    tasks.forEach(task => {
        const dueDate = formatDateReadable(task.TASK_DATE);
        const dueTime = formatTime12h(task.TASK_TIME);
        const dayOfWeek = getDayOfWeek(task.TASK_DATE);
        const status = task.IS_COMPLETED === 1 ? '✅ Completed' : '⏳ Pending';
        
        tasksHtml += `
            <div style="background: ${task.IS_COMPLETED === 1 ? '#e8f5e9' : '#fff3e0'}; border-radius: 15px; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${task.IS_COMPLETED === 1 ? '#4caf50' : '#ff9800'};">
                <h3 style="margin: 0 0 5px 0; color: ${task.IS_COMPLETED === 1 ? '#4caf50' : '#ff9800'};">📋 ${task.TASK_TEXT}</h3>
                <p style="margin: 5px 0; color: #333;">📅 Date: ${dueDate} (${dayOfWeek})</p>
                <p style="margin: 5px 0; color: #333;">⏰ Time: ${dueTime}</p>
                <p style="margin: 5px 0; color: #666;">🏷️ Category: ${task.TASK_TYPE}</p>
                <p style="margin: 5px 0; font-weight: bold; color: ${task.IS_COMPLETED === 1 ? '#4caf50' : '#ff9800'};">Status: ${status}</p>
            </div>
        `;
        
        tasksText += `\n📋 ${task.TASK_TEXT}\n   Date: ${dueDate} (${dayOfWeek})\n   Time: ${dueTime}\n   Category: ${task.TASK_TYPE}\n   Status: ${status}\n`;
    });
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6c5ce7, #8271ff); border-radius: 20px;">
            <div style="text-align: center; padding: 20px;">
                <h1 style="color: white; margin-bottom: 10px;">📋 FocusFlow</h1>
                <p style="color: rgba(255,255,255,0.9);">${subjectPrefix}</p>
            </div>
            <div style="background: white; border-radius: 20px; padding: 30px;">
                <h2 style="color: #6c5ce7; margin-top: 0;">Hello ${userName}!</h2>
                <p style="color: #666;">You have <strong>${tasks.length}</strong> task(s) to review:</p>
                
                ${tasksHtml}
                
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
                    <p style="color: #999; font-size: 12px;">Log in to FocusFlow to manage your tasks.</p>
                    <p style="color: #999; font-size: 12px;">Stay organized, stay ahead! 🌟</p>
                </div>
            </div>
            <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
                <p>FocusFlow - Your Academic Companion</p>
            </div>
        </div>
    `;
    
    const textContent = `
FocusFlow Task Reminder - ${subjectPrefix}
${'='.repeat(50)}

Hello ${userName}!

You have ${tasks.length} task(s) to review:

${tasksText}

Log in to FocusFlow to manage your tasks.
Stay organized, stay ahead!
    `;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `📋 FocusFlow - ${subjectPrefix} (${tasks.length} tasks)`,
        html: htmlContent,
        text: textContent
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ ${reminderType} reminder sent to ${userEmail} (${tasks.length} tasks)`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return false;
    }
};

// FIXED: Using positional bind parameters (no reserved keyword issues)
const logReminderSent = async (connection, taskId, userId, reminderType, reminderDate) => {
    const reminderId = require('crypto').randomUUID();
    await connection.execute(
        `INSERT INTO TASK_REMINDER_LOG (reminder_id, task_id, user_id, reminder_type, reminder_date) 
         VALUES (:1, :2, :3, :4, TO_DATE(:5, 'YYYY-MM-DD'))`,
        [reminderId, taskId, userId, reminderType, reminderDate]
    );
};

const sendWeeklyTaskSummary = async () => {
    let connection;
    try {
        connection = await getConnection();
        
        const now = new Date();
        const currentDay = now.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        
        console.log(`📅 Sending weekly task summary for week of ${weekStartStr} to ${weekEndStr}`);
        
        const result = await connection.execute(
            `SELECT u.user_id, u.email, u.full_name, t.task_id, t.task_text, t.task_date, t.task_time, t.task_type, t.is_completed
             FROM USERS u JOIN TASKS t ON u.user_id = t.user_id
             WHERE u.is_verified = 1 AND t.task_date >= TO_DATE(:weekStart, 'YYYY-MM-DD') AND t.task_date <= TO_DATE(:weekEnd, 'YYYY-MM-DD')
             ORDER BY u.user_id, t.task_date ASC, t.task_time ASC`,
            { weekStart: weekStartStr, weekEnd: weekEndStr }
        );
        
        const userTasks = {};
        for (const row of result.rows) {
            if (!userTasks[row.USER_ID]) userTasks[row.USER_ID] = { email: row.EMAIL, name: row.FULL_NAME || row.EMAIL.split('@')[0], tasks: [] };
            userTasks[row.USER_ID].tasks.push(row);
        }
        
        for (const userId in userTasks) {
            const user = userTasks[userId];
            await sendTaskReminderEmail(user.email, user.name, user.tasks, 'WEEKLY', `Weekly Task Summary (${weekStartStr} to ${weekEndStr})`);
        }
    } catch (err) { console.error('Error sending weekly summary:', err); } 
    finally { if (connection) await connection.close(); }
};

const sendDailyTaskSummary = async () => {
    let connection;
    try {
        connection = await getConnection();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        
        console.log(`📅 Sending daily task summary for ${todayName}, ${todayStr}`);
        
        const result = await connection.execute(
            `SELECT u.user_id, u.email, u.full_name, t.task_id, t.task_text, t.task_date, t.task_time, t.task_type, t.is_completed
             FROM USERS u JOIN TASKS t ON u.user_id = t.user_id
             WHERE u.is_verified = 1 AND t.task_date = TO_DATE(:today, 'YYYY-MM-DD')
             ORDER BY t.task_time ASC`,
            { today: todayStr }
        );
        
        const userTasks = {};
        for (const row of result.rows) {
            if (!userTasks[row.USER_ID]) userTasks[row.USER_ID] = { email: row.EMAIL, name: row.FULL_NAME || row.EMAIL.split('@')[0], tasks: [] };
            userTasks[row.USER_ID].tasks.push(row);
        }
        
        for (const userId in userTasks) {
            const user = userTasks[userId];
            await sendTaskReminderEmail(user.email, user.name, user.tasks, 'DAILY', `Today's Tasks (${todayName})`);
        }
    } catch (err) { console.error('Error sending daily summary:', err); }
    finally { if (connection) await connection.close(); }
};

const sendHourlyTaskReminders = async () => {
    let connection;
    try {
        connection = await getConnection();
        
        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = now.toISOString().split('T')[0];
        const targetHour = currentHour + 1;
        const targetHourFormatted = targetHour.toString().padStart(2, '0');
        const displayHour = targetHour % 12 || 12;
        const displayAmPm = targetHour >= 12 ? 'PM' : 'AM';
        
        console.log(`⏰ [${now.toLocaleTimeString()}] Checking for tasks due at hour ${displayHour}:00 ${displayAmPm}`);
        
        const result = await connection.execute(
            `SELECT u.user_id, u.email, u.full_name, t.task_id, t.task_text, t.task_date, t.task_time, t.task_type, t.is_completed
             FROM USERS u JOIN TASKS t ON u.user_id = t.user_id
             WHERE u.is_verified = 1 AND t.is_completed = 0 AND t.task_date = TO_DATE(:today, 'YYYY-MM-DD')
             AND SUBSTR(t.task_time, 1, 2) = :targetHour
             AND NOT EXISTS (SELECT 1 FROM TASK_REMINDER_LOG l WHERE l.task_id = t.task_id AND l.user_id = u.user_id
             AND l.reminder_type = 'HOURLY' AND l.reminder_date = TO_DATE(:today, 'YYYY-MM-DD'))`,
            { today: todayStr, targetHour: targetHourFormatted }
        );
        
        if (result.rows.length > 0) {
            console.log(`📊 Found ${result.rows.length} task(s):`);
            for (const row of result.rows) console.log(`   📋 ${row.TASK_TEXT} at ${formatTime12h(row.TASK_TIME)}`);
            
            const userTasks = {};
            for (const row of result.rows) {
                if (!userTasks[row.USER_ID]) userTasks[row.USER_ID] = { email: row.EMAIL, name: row.FULL_NAME || row.EMAIL.split('@')[0], tasks: [] };
                userTasks[row.USER_ID].tasks.push(row);
            }
            
            for (const userId in userTasks) {
                const user = userTasks[userId];
                await sendTaskReminderEmail(user.email, user.name, user.tasks, 'HOURLY', `⏰ Task Reminder - Due in 1 hour!`);
                for (const task of user.tasks) await logReminderSent(connection, task.TASK_ID, userId, 'HOURLY', todayStr);
            }
        }
    } catch (err) { console.error('Error sending hourly reminders:', err); }
    finally { if (connection) await connection.close(); }
};

module.exports = { sendWeeklyTaskSummary, sendDailyTaskSummary, sendHourlyTaskReminders };
