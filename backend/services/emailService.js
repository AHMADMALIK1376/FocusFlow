// services/emailService.js
const { 
    sendVerificationEmailQueued, 
    sendPasswordResetCodeQueued,
    getEmailQueueStats,
    getEmailHealth
} = require('./emailQueueService');
const { getProvider } = require('./emailProviders');

// Generate random 4-digit code
const generateVerificationCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send verification email (queued) -> { ok } | { ok: false, error, notConfigured }
const sendVerificationEmail = async (toEmail, verificationCode) => {
    return await sendVerificationEmailQueued(toEmail, verificationCode);
};

// Send password reset code (queued) -> same shape
const sendPasswordResetCode = async (toEmail, resetCode) => {
    return await sendPasswordResetCodeQueued(toEmail, resetCode);
};

module.exports = {
    generateVerificationCode,
    sendVerificationEmail,
    sendPasswordResetCode,
    getEmailQueueStats,
    getEmailHealth,
    describeEmailProvider: () => getProvider().describe()
};