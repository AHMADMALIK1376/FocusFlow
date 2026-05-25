// services/emailQueueService.js
const nodemailer = require('nodemailer');

// ==============================================
// EMAIL QUEUE CONFIGURATION
// ==============================================
const EMAIL_CONFIG = {
    // Rate limiting (per minute)
    emailsPerMinute: 15,        // Safe limit (Gmail allows ~20)
    emailsPerHour: 90,          // Safe limit (Gmail allows 100)
    emailsPerDay: 450,          // Safe limit (Gmail allows 500)
    
    // Retry settings
    maxRetries: 3,
    retryDelayMs: 5000,         // 5 seconds between retries
    retryBackoffMultiplier: 2,   // Exponential backoff
    
    // Queue processing
    batchSize: 5,               // Process 5 emails at a time
    batchDelayMs: 1000,         // Wait 1 second between batches
    maxQueueSize: 10000         // Max pending emails
};

// ==============================================
// EMAIL QUEUE CLASS
// ==============================================
class EmailQueue {
    constructor() {
        this.queue = [];           // Pending emails
        this.sentCount = {         // Counters for rate limiting
            minute: 0,
            hour: 0,
            day: 0,
            lastMinuteReset: Date.now(),
            lastHourReset: Date.now(),
            lastDayReset: Date.now()
        };
        this.isProcessing = false;
        this.transporter = null;
        this.stats = {
            totalSent: 0,
            totalFailed: 0,
            totalRetried: 0,
            startTime: Date.now()
        };
        
        this.initTransporter();
    }
    
    // Initialize email transporter
    initTransporter() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // Connection timeout
            connectionTimeout: 10000,
            // Socket timeout
            socketTimeout: 15000
        });
    }
    
    // Reset rate limit counters
    resetCounters() {
        const now = Date.now();
        
        // Reset minute counter (every 60 seconds)
        if (now - this.sentCount.lastMinuteReset >= 60000) {
            this.sentCount.minute = 0;
            this.sentCount.lastMinuteReset = now;
        }
        
        // Reset hour counter (every 3600 seconds)
        if (now - this.sentCount.lastHourReset >= 3600000) {
            this.sentCount.hour = 0;
            this.sentCount.lastHourReset = now;
        }
        
        // Reset day counter (every 86400 seconds)
        if (now - this.sentCount.lastDayReset >= 86400000) {
            this.sentCount.day = 0;
            this.sentCount.lastDayReset = now;
        }
    }
    
    // Check if we can send more emails
    canSend() {
        this.resetCounters();
        
        return (
            this.sentCount.minute < EMAIL_CONFIG.emailsPerMinute &&
            this.sentCount.hour < EMAIL_CONFIG.emailsPerHour &&
            this.sentCount.day < EMAIL_CONFIG.emailsPerDay &&
            this.queue.length > 0
        );
    }
    
    // Get wait time before next send (ms)
    getWaitTime() {
        this.resetCounters();
        
        if (this.sentCount.minute >= EMAIL_CONFIG.emailsPerMinute) {
            const nextMinute = this.sentCount.lastMinuteReset + 60000;
            return Math.max(0, nextMinute - Date.now());
        }
        
        if (this.sentCount.hour >= EMAIL_CONFIG.emailsPerHour) {
            const nextHour = this.sentCount.lastHourReset + 3600000;
            return Math.max(0, nextHour - Date.now());
        }
        
        if (this.sentCount.day >= EMAIL_CONFIG.emailsPerDay) {
            const nextDay = this.sentCount.lastDayReset + 86400000;
            return Math.max(0, nextDay - Date.now());
        }
        
        return 0;
    }
    
    // Add email to queue
    async addEmail(mailOptions, priority = 'normal') {
        if (this.queue.length >= EMAIL_CONFIG.maxQueueSize) {
            console.error('❌ Email queue is full!');
            return { queued: false, error: 'Queue full' };
        }
        
        const emailItem = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            mailOptions,
            priority: priority === 'high' ? 0 : 1,
            retries: 0,
            createdAt: new Date(),
            status: 'queued'
        };
        
        // Insert at correct position based on priority
        if (emailItem.priority === 0) {
            this.queue.unshift(emailItem); // High priority at front
        } else {
            this.queue.push(emailItem);    // Normal priority at back
        }
        
        console.log(`📧 Email queued: ${emailItem.id} (Queue size: ${this.queue.length})`);
        
        // Start processing if not already
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        return { queued: true, id: emailItem.id };
    }
    
    // Send a single email with retry
    async sendEmail(emailItem) {
        try {
            const info = await this.transporter.sendMail(emailItem.mailOptions);
            
            // Update counters
            this.sentCount.minute++;
            this.sentCount.hour++;
            this.sentCount.day++;
            this.stats.totalSent++;
            
            console.log(`✅ Email sent: ${emailItem.id} to ${emailItem.mailOptions.to}`);
            return { success: true, info };
            
        } catch (error) {
            console.error(`❌ Email failed: ${emailItem.id}`, error.message);
            
            // Check if we should retry
            if (emailItem.retries < EMAIL_CONFIG.maxRetries) {
                emailItem.retries++;
                emailItem.retryDelay = EMAIL_CONFIG.retryDelayMs * Math.pow(EMAIL_CONFIG.retryBackoffMultiplier, emailItem.retries - 1);
                emailItem.status = 'retrying';
                this.stats.totalRetried++;
                
                // Re-add to queue after delay
                setTimeout(() => {
                    console.log(`🔄 Retrying email ${emailItem.id} (attempt ${emailItem.retries}/${EMAIL_CONFIG.maxRetries})`);
                    this.queue.unshift(emailItem);
                    this.processQueue();
                }, emailItem.retryDelay);
                
                return { success: false, retrying: true, error };
            }
            
            // Max retries exceeded
            emailItem.status = 'failed';
            this.stats.totalFailed++;
            console.error(`❌ Email permanently failed: ${emailItem.id} after ${EMAIL_CONFIG.maxRetries} attempts`);
            return { success: false, error: 'Max retries exceeded' };
        }
    }
    
    // Process the email queue
    async processQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        while (this.queue.length > 0) {
            // Check if we can send more
            if (!this.canSend()) {
                const waitTime = this.getWaitTime();
                if (waitTime > 0) {
                    console.log(`⏸️ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                continue;
            }
            
            // Process a batch
            const batch = this.queue.splice(0, EMAIL_CONFIG.batchSize);
            
            for (const emailItem of batch) {
                if (this.canSend()) {
                    await this.sendEmail(emailItem);
                } else {
                    // Put back remaining emails
                    this.queue.unshift(...batch);
                    break;
                }
            }
            
            // Wait between batches
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, EMAIL_CONFIG.batchDelayMs));
            }
        }
        
        this.isProcessing = false;
        console.log('📬 Email queue empty. Processing stopped.');
    }
    
    // Get queue statistics
    getStats() {
        return {
            queueSize: this.queue.length,
            sentToday: this.sentCount.day,
            sentThisHour: this.sentCount.hour,
            sentThisMinute: this.sentCount.minute,
            totalSent: this.stats.totalSent,
            totalFailed: this.stats.totalFailed,
            totalRetried: this.stats.totalRetried,
            uptime: Math.floor((Date.now() - this.stats.startTime) / 1000),
            limits: {
                perMinute: EMAIL_CONFIG.emailsPerMinute,
                perHour: EMAIL_CONFIG.emailsPerHour,
                perDay: EMAIL_CONFIG.emailsPerDay
            }
        };
    }
    
    // Clear queue (for emergency)
    clearQueue() {
        const clearedCount = this.queue.length;
        this.queue = [];
        console.log(`🗑️ Cleared ${clearedCount} emails from queue`);
        return clearedCount;
    }
}

// ==============================================
// SINGLETON INSTANCE
// ==============================================
let emailQueueInstance = null;

function getEmailQueue() {
    if (!emailQueueInstance) {
        emailQueueInstance = new EmailQueue();
        console.log('📧 Email queue service initialized');
    }
    return emailQueueInstance;
}

// ==============================================
// WRAPPER FUNCTIONS FOR EXISTING EMAIL SERVICES
// ==============================================

// Send verification email via queue
async function sendVerificationEmailQueued(toEmail, verificationCode) {
    const queue = getEmailQueue();
    
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
    
    const result = await queue.addEmail(mailOptions, 'high');
    return result.queued;
}

// Send password reset email via queue
async function sendPasswordResetCodeQueued(toEmail, resetCode) {
    const queue = getEmailQueue();
    
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
    
    const result = await queue.addEmail(mailOptions, 'high');
    return result.queued;
}

// Send bulk email via queue (for daily routines, schedules, etc.)
async function sendBulkEmailQueued(toEmail, subject, htmlContent, textContent) {
    const queue = getEmailQueue();
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: subject,
        html: htmlContent,
        text: textContent
    };
    
    const result = await queue.addEmail(mailOptions, 'normal');
    return result.queued;
}

// Get queue statistics
function getEmailQueueStats() {
    const queue = getEmailQueue();
    return queue.getStats();
}

// Clear queue (emergency)
function clearEmailQueue() {
    const queue = getEmailQueue();
    return queue.clearQueue();
}

module.exports = {
    getEmailQueue,
    sendVerificationEmailQueued,
    sendPasswordResetCodeQueued,
    sendBulkEmailQueued,
    getEmailQueueStats,
    clearEmailQueue
};