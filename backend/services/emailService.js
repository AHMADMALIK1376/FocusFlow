// services/emailService.js
const { 
    sendVerificationEmailQueued, 
    sendPasswordResetCodeQueued,
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

module.exports = {
    generateVerificationCode,
    sendVerificationEmail,
    sendPasswordResetCode,
    getEmailQueueStats,
    clearEmailQueue
};