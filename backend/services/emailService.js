// services/emailService.js
const { 
    sendVerificationEmailQueued, 
    sendPasswordResetCodeQueued,
    sendBulkEmailQueued,
    getEmailQueueStats,
    clearEmailQueue
} = require('./emailQueueService');

// Generate random 4-digit code
const generateVerificationCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send verification email (now queued)
const sendVerificationEmail = async (toEmail, verificationCode) => {
    return await sendVerificationEmailQueued(toEmail, verificationCode);
};

// Send password reset code (now queued)
const sendPasswordResetCode = async (toEmail, resetCode) => {
    return await sendPasswordResetCodeQueued(toEmail, resetCode);
};

// Send class reminder (now queued)
const sendClassReminder = async (toEmail, classDetails) => {
    const { subjectName, startTime, endTime, roomNumber, dayOfWeek, date } = classDetails;
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6c5ce7, #8271ff); border-radius: 20px;">
            <div style="text-align: center; padding: 20px;">
                <h1 style="color: white; margin-bottom: 10px;">📚 FocusFlow</h1>
                <p style="color: rgba(255,255,255,0.9);">Class Reminder</p>
            </div>
            <div style="background: white; border-radius: 20px; padding: 30px;">
                <h2 style="color: #6c5ce7; text-align: center;">Your class starts in 1 hour!</h2>
                <div style="margin: 20px 0; padding: 15px; background: #f0f2f5; border-radius: 15px;">
                    <div><strong>Subject:</strong> ${subjectName}</div>
                    <div><strong>Time:</strong> ${startTime} - ${endTime}</div>
                    <div><strong>Room:</strong> ${roomNumber || 'Not specified'}</div>
                </div>
            </div>
        </div>
    `;
    
    const textContent = `Class Reminder: ${subjectName} at ${startTime}`;
    
    return await sendBulkEmailQueued(toEmail, `🔔 Class Reminder: ${subjectName}`, htmlContent, textContent);
};

// Send daily routine email (now queued)
const sendDailyRoutineEmail = async (toEmail, userName, routines, dayName, dateStr) => {
    // HTML content generation (same as before)
    const htmlContent = `<div>Your routine for ${dayName}</div>`;
    const textContent = `Your routine for ${dayName}`;
    
    return await sendBulkEmailQueued(toEmail, `📅 Your ${dayName} Routine`, htmlContent, textContent);
};

// Send daily schedule email (now queued)
const sendDailyScheduleEmail = async (toEmail, userName, classes) => {
    const htmlContent = `<div>Your schedule for today</div>`;
    const textContent = `Your schedule for today`;
    
    return await sendBulkEmailQueued(toEmail, `📚 Your Schedule for Today`, htmlContent, textContent);
};

module.exports = {
    generateVerificationCode,
    sendVerificationEmail,
    sendPasswordResetCode,
    sendClassReminder,
    sendDailyRoutineEmail,
    sendDailyScheduleEmail,
    getEmailQueueStats,
    clearEmailQueue
};