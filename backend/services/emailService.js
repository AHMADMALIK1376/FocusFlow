const nodemailer = require('nodemailer');

// Configure email transporter
// Using Gmail as example (you can use any SMTP service)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // App password (not regular password)
    }
});

// Generate random 4-digit code
const generateVerificationCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send verification email
const sendVerificationEmail = async (toEmail, verificationCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'FocusFlow - Verify Your Email',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6c5ce7, #8271ff); border-radius: 20px;">
                <div style="text-align: center; padding: 20px;">
                    <h1 style="color: white; margin-bottom: 10px;">🔐 FocusFlow</h1>
                    <p style="color: rgba(255,255,255,0.9);">Verify Your Email Address</p>
                </div>
                <div style="background: white; border-radius: 20px; padding: 30px; text-align: center;">
                    <h2 style="color: #6c5ce7;">Your Verification Code</h2>
                    <div style="font-size: 48px; font-weight: bold; color: #6c5ce7; letter-spacing: 10px; margin: 20px 0; padding: 20px; background: #f0f2f5; border-radius: 15px;">
                        ${verificationCode}
                    </div>
                    <p style="color: #666;">Enter this code to complete your registration.</p>
                    <p style="color: #999; font-size: 12px;">Code expires in 10 minutes.</p>
                </div>
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
                    <p>If you didn't request this, please ignore this email.</p>
                    <p>&copy; 2024 FocusFlow. All rights reserved.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

module.exports = { generateVerificationCode, sendVerificationEmail };