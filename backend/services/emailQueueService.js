// services/emailQueueService.js
const { getProvider, describeProvider } = require('./emailProviders');
const { codeEmail } = require('./emailTemplates');

// Remembers (in the database, best effort) whether email is working, so Settings can show it.
function recordEmailResult(ok, message) {
    try { require('./schedulerStatus').recordEmail(ok, message); } catch (e) { /* status is optional */ }
}

// Shows as "FocusFlow" in the inbox instead of the bare Gmail address.
const FROM = () => ({ name: 'FocusFlow', address: process.env.EMAIL_USER });

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
        this.provider = null;
        this.lastSuccessAt = null;
        this.lastError = null;
        this.stats = {
            totalSent: 0,
            totalFailed: 0,
            totalRetried: 0,
            startTime: Date.now()
        };
    }
    
    // The way mail leaves the server (EMAIL_PROVIDER, see emailProviders.js).
    getProvider() {
        if (!this.provider) this.provider = getProvider(process.env);
        return this.provider;
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
        
        // NOTE: do NOT check queue.length here. During processQueue() the email
        // being sent is held in a local `batch`, so the queue is momentarily
        // empty — including queue.length would wrongly block the send and loop
        // forever. This is a rate-limit check only; the while-loop guards length.
        return (
            this.sentCount.minute < EMAIL_CONFIG.emailsPerMinute &&
            this.sentCount.hour < EMAIL_CONFIG.emailsPerHour &&
            this.sentCount.day < EMAIL_CONFIG.emailsPerDay
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
    // options.wait: resolve with the REAL outcome ({delivered, error}) once the email was sent or
    // failed, or {pending: true} if that takes longer than options.waitMs. A caller that waits does
    // its own retrying, so no background retries are scheduled for it (options.retry === false).
    async addEmail(mailOptions, priority = 'normal', options = {}) {
        if (this.queue.length >= EMAIL_CONFIG.maxQueueSize) {
            console.error('❌ Email queue is full!');
            return { queued: false, error: 'Queue full' };
        }
        
        const emailItem = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            mailOptions,
            priority: priority === 'high' ? 0 : 1,
            retries: 0,
            retriesAllowed: options.retry !== false,
            createdAt: new Date(),
            status: 'queued',
            settle: () => {}
        };
        const outcome = options.wait
            ? new Promise((resolve) => { emailItem.settle = resolve; })
            : null;
        
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
        
        if (!outcome) return { queued: true, id: emailItem.id };
        const waitMs = options.waitMs || 20000;
        const result = await Promise.race([
            outcome,
            new Promise((resolve) => setTimeout(() => resolve({ pending: true }), waitMs))
        ]);
        return { queued: true, id: emailItem.id, ...result };
    }
    
    // Send a single email (retrying in the background only if its caller isn't waiting for the result)
    async sendEmail(emailItem) {
        const provider = this.getProvider();
        try {
            const info = await provider.send(emailItem.mailOptions);

            // Update counters
            this.sentCount.minute++;
            this.sentCount.hour++;
            this.sentCount.day++;
            this.stats.totalSent++;
            this.lastSuccessAt = new Date();
            this.lastError = null;
            recordEmailResult(true);

            console.log(`✅ Email sent: ${emailItem.id} to ${emailItem.mailOptions.to} (${provider.name})`);
            emailItem.settle({ delivered: true });
            return { success: true, info };

        } catch (error) {
            const message = (error && error.message) || String(error);
            const permanent = Boolean(error && error.permanent);
            this.lastError = { at: new Date(), message, permanent };
            console.error(`❌ Email failed: ${emailItem.id} (${provider.name}): ${message}`);

            // Retry in the background unless it is hopeless or the caller handles retrying
            if (!permanent && emailItem.retriesAllowed && emailItem.retries < EMAIL_CONFIG.maxRetries) {
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

            emailItem.status = 'failed';
            this.stats.totalFailed++;
            recordEmailResult(false, message);
            console.error(`❌ Email permanently failed: ${emailItem.id}${permanent ? ' (not worth retrying)' : ` after ${emailItem.retries} retries`}`);
            emailItem.settle({ delivered: false, error: message, permanent });
            return { success: false, error: message };
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
            lastSuccessAt: this.lastSuccessAt,
            lastError: this.lastError,
            setup: describeProvider(process.env),
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

// Sign-up and reset codes: wait (briefly) for the REAL outcome so the app can say honestly when the
// email could not be sent. Result: { ok, pending?, permanent?, error? }. "pending" means the provider
// was slow, so it may still arrive; the app tells the student to wait a moment, then resend.
const CODE_WAIT_MS = 14000;
const toOutcome = (r) => ({
    ok: Boolean(r.queued) && r.delivered !== false,
    pending: Boolean(r.pending),
    permanent: Boolean(r.permanent),
    error: r.error || (r.queued ? undefined : 'Queue full')
});

async function sendCodeEmail(toEmail, purpose, code) {
    const { subject, html, text, attachments } = codeEmail({ purpose, code });
    const result = await getEmailQueue().addEmail(
        { from: FROM(), to: toEmail, subject, html, text, attachments },
        'high',
        { wait: true, waitMs: CODE_WAIT_MS, retry: false }
    );
    return toOutcome(result);
}

// Send verification email via queue
function sendVerificationEmailQueued(toEmail, verificationCode) {
    return sendCodeEmail(toEmail, 'verify', verificationCode);
}

// Send password reset email via queue
function sendPasswordResetCodeQueued(toEmail, resetCode) {
    return sendCodeEmail(toEmail, 'reset', resetCode);
}

// Send bulk email via queue (reminders, reports, etc.). With options.wait it resolves with the real
// outcome ({ queued, delivered, error, pending }) instead of just "queued".
async function sendBulkEmailQueued(toEmail, subject, htmlContent, textContent, attachments, options = {}) {
    const mailOptions = {
        from: FROM(),
        to: toEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
        ...(attachments && attachments.length ? { attachments } : {})
    };
    const result = await getEmailQueue().addEmail(mailOptions, 'normal', options);
    return options.wait ? result : result.queued;
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