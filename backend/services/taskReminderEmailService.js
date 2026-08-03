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
        const dayOfWeek = getDayOfWeek(task.TASK_DATE);
        const status = task.IS_COMPLETED === 1 ? '✅ Completed' : '⏳ Pending';
        const subject = task.TASK_TYPE || 'General';

        tasksHtml += `
            <div style="background: ${task.IS_COMPLETED === 1 ? '#e8f5e9' : '#fff3e0'}; border-radius: 15px; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${task.IS_COMPLETED === 1 ? '#4caf50' : '#ff9800'};">
                <h3 style="margin: 0 0 5px 0; color: ${task.IS_COMPLETED === 1 ? '#4caf50' : '#ff9800'};">📋 ${task.TASK_TEXT}</h3>
                <p style="margin: 5px 0; color: #333;">📅 Due: ${dueDate} (${dayOfWeek})</p>
                <p style="margin: 5px 0; color: #666;">🏷️ Subject: ${subject}</p>
                <p style="margin: 5px 0; font-weight: bold; color: ${task.IS_COMPLETED === 1 ? '#4caf50' : '#ff9800'};">Status: ${status}</p>
            </div>
        `;

        tasksText += `\n📋 ${task.TASK_TEXT}\n   Due: ${dueDate} (${dayOfWeek})\n   Subject: ${subject}\n   Status: ${status}\n`;
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

// Assignments are the unified to-do/assignment record. They carry a due DATE but
// no due time, so these summaries are date-based only (the old hourly
// "due in 1 hour" reminder had no equivalent and was retired with TASKS).
// Aliased to the legacy TASK_* column names so the email builder is unchanged.
const ASSIGNMENT_SELECT = `
    SELECT u.user_id, u.email, u.full_name,
           a.assignment_id AS task_id,
           a.title AS task_text,
           a.due_date AS task_date,
           COALESCE(s.name, 'General') AS task_type,
           CASE WHEN a.column_id = 'col-done' THEN 1 ELSE 0 END AS is_completed
    FROM USERS u
    JOIN ASSIGNMENTS a ON u.user_id = a.user_id
    LEFT JOIN SUBJECTS s ON s.subject_id = a.subject_id`;

// Group flat rows into { [userId]: { email, name, tasks: [] } }
const groupByUser = (rows) => {
    const byUser = {};
    for (const row of rows) {
        if (!byUser[row.USER_ID]) {
            byUser[row.USER_ID] = {
                email: row.EMAIL,
                name: row.FULL_NAME || row.EMAIL.split('@')[0],
                tasks: [],
            };
        }
        byUser[row.USER_ID].tasks.push(row);
    }
    return byUser;
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
            `${ASSIGNMENT_SELECT}
             WHERE u.is_verified = 1
               AND a.due_date >= TO_DATE(:weekStart, 'YYYY-MM-DD')
               AND a.due_date <= TO_DATE(:weekEnd, 'YYYY-MM-DD')
             ORDER BY u.user_id, a.due_date ASC`,
            { weekStart: weekStartStr, weekEnd: weekEndStr }
        );

        const userTasks = groupByUser(result.rows);

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
            `${ASSIGNMENT_SELECT}
             WHERE u.is_verified = 1 AND a.due_date = TO_DATE(:today, 'YYYY-MM-DD')
             ORDER BY u.user_id, a.board_order ASC`,
            { today: todayStr }
        );

        const userTasks = groupByUser(result.rows);

        for (const userId in userTasks) {
            const user = userTasks[userId];
            await sendTaskReminderEmail(user.email, user.name, user.tasks, 'DAILY', `Today's Assignments (${todayName})`);
        }
    } catch (err) { console.error('Error sending daily summary:', err); }
    finally { if (connection) await connection.close(); }
};

module.exports = { sendWeeklyTaskSummary, sendDailyTaskSummary };
