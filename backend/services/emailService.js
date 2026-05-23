const nodemailer = require('nodemailer');

// Configure email transporter
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

// Send verification email for registration
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
        console.log(`✅ Verification email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

// Send password reset code
const sendPasswordResetCode = async (toEmail, resetCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'FocusFlow - Password Reset Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6c5ce7, #8271ff); border-radius: 20px;">
                <div style="text-align: center; padding: 20px;">
                    <h1 style="color: white; margin-bottom: 10px;">🔐 FocusFlow</h1>
                    <p style="color: rgba(255,255,255,0.9);">Password Reset Request</p>
                </div>
                <div style="background: white; border-radius: 20px; padding: 30px; text-align: center;">
                    <h2 style="color: #6c5ce7;">Your Password Reset Code</h2>
                    <div style="font-size: 48px; font-weight: bold; color: #6c5ce7; letter-spacing: 10px; margin: 20px 0; padding: 20px; background: #f0f2f5; border-radius: 15px;">
                        ${resetCode}
                    </div>
                    <p style="color: #666;">Use this code to reset your password.</p>
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
        console.log(`✅ Password reset email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('Password reset email sending error:', error);
        return false;
    }
};

// Send class reminder email
const sendClassReminder = async (toEmail, classDetails) => {
    const { subjectName, startTime, endTime, roomNumber, dayOfWeek, date } = classDetails;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: `🔔 Class Reminder: ${subjectName} in 1 hour!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #6c5ce7, #8271ff); border-radius: 20px;">
                <div style="text-align: center; padding: 20px;">
                    <h1 style="color: white; margin-bottom: 10px;">📚 FocusFlow</h1>
                    <p style="color: rgba(255,255,255,0.9);">Class Reminder</p>
                </div>
                <div style="background: white; border-radius: 20px; padding: 30px;">
                    <h2 style="color: #6c5ce7; text-align: center;">Your class starts in 1 hour!</h2>
                    
                    <div style="margin: 20px 0; padding: 15px; background: #f0f2f5; border-radius: 15px;">
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 24px;">📖</span>
                            <strong style="color: #6c5ce7; margin-left: 10px;">Subject:</strong>
                            <span style="margin-left: 10px;">${subjectName}</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 24px;">⏰</span>
                            <strong style="color: #6c5ce7; margin-left: 10px;">Time:</strong>
                            <span style="margin-left: 10px;">${startTime} - ${endTime}</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 24px;">📅</span>
                            <strong style="color: #6c5ce7; margin-left: 10px;">Day & Date:</strong>
                            <span style="margin-left: 10px;">${dayOfWeek}, ${date}</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <span style="font-size: 24px;">📍</span>
                            <strong style="color: #6c5ce7; margin-left: 10px;">Room/Lab:</strong>
                            <span style="margin-left: 10px;">${roomNumber || 'Not specified'}</span>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <p style="color: #666;">Get ready for your class!</p>
                        <p style="color: #999; font-size: 12px;">FocusFlow - Stay organized, stay ahead.</p>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7); font-size: 12px;">
                    <p>You received this reminder because you have a class scheduled.</p>
                    <p>&copy; 2024 FocusFlow. All rights reserved.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Class reminder sent to ${toEmail} for ${subjectName}`);
        return true;
    } catch (error) {
        console.error('Class reminder email error:', error);
        return false;
    }
};

module.exports = { 
    generateVerificationCode, 
    sendVerificationEmail,
    sendPasswordResetCode,
    sendClassReminder
};