// services/emailQueueService.js
const { codeEmail } = require('./emailTemplates');
const { getProvider } = require('./emailProviders');

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

const NOT_CONFIGURED_TEXT = 'Email is not set up on the server yet.';
const CODE_WAIT_MS = 20000;

// ==============================================
// EMAIL QUEUE CLASS
// ==============================================
class EmailQueue {
    constructor({ provider = getProvider() } = {}) {
        this.provider = provider;
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
        // Last good / last bad send, for the status line. Never holds a message body.
        this.health = { lastOk: null, lastError: null };
        this.stats = {
            totalSent: 0,
            totalFailed: 0,
            totalRetried: 0,
            startTime: Date.now()
        };
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
    
    // Add email to queue. `outcome` only ever resolves (never rejects): { status: 'sent', id }
    // or { status: 'failed', error }.
    async addEmail(mailOptions, priority = 'normal', { maxRetries = EMAIL_CONFIG.maxRetries, retryDelayMs = EMAIL_CONFIG.retryDelayMs } = {}) {
        if (!this.provider.describe().configured) {
            this.health.lastError = { at: Date.now(), reason: NOT_CONFIGURED_TEXT };
            return { queued: false, error: NOT_CONFIGURED_TEXT, outcome: Promise.resolve({ status: 'failed', error: NOT_CONFIGURED_TEXT }) };
        }
        if (this.queue.length >= EMAIL_CONFIG.maxQueueSize) {
            console.error('Email queue is full.');
            return { queued: false, error: 'Queue full', outcome: Promise.resolve({ status: 'failed', error: 'The email queue is full.' }) };
        }
        
        const emailItem = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            mailOptions,
            priority: priority === 'high' ? 0 : 1,
            retries: 0,
            maxRetries,
            retryDelayMs,
            abandoned: false,
            createdAt: new Date(),
            status: 'queued'
        };
        const outcome = new Promise((resolve) => { emailItem.resolve = resolve; });
        
        // Insert at correct position based on priority
        if (emailItem.priority === 0) {
            this.queue.unshift(emailItem); // High priority at front
        } else {
            this.queue.push(emailItem);    // Normal priority at back
        }
        
        console.log(`Email queued: ${emailItem.id} (Queue size: ${this.queue.length})`);
        
        // Start processing if not already
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        const result = { queued: true, id: emailItem.id, outcome };
        // Lets waitForOutcome() stop a late retry without widening the result's shape.
        Object.defineProperty(result, 'abandon', { value: () => { emailItem.abandoned = true; } });
        return result;
    }
    
    // Send a single email; retries (per item) go back to the front of the queue after a delay
    async sendEmail(emailItem) {
        let r;
        try {
            r = await this.provider.send(emailItem.mailOptions);
        } catch {
            r = { ok: false, error: 'Email could not be sent.' };
        }
        
        if (r && r.ok) {
            // Update counters
            this.sentCount.minute++;
            this.sentCount.hour++;
            this.sentCount.day++;
            this.stats.totalSent++;
            this.health.lastOk = { at: Date.now() };
            emailItem.status = 'sent';
            console.log(`Email sent: ${emailItem.id} to ${emailItem.mailOptions.to}`);
            emailItem.resolve({ status: 'sent', id: r.id });
            return { success: true };
        }
        
        const reason = (r && r.error) || 'Email could not be sent.';
        this.health.lastError = { at: Date.now(), reason };
        console.error(`Email failed: ${emailItem.id}: ${reason}`);
        
        if (emailItem.retries < emailItem.maxRetries && !emailItem.abandoned) {
            emailItem.retries++;
            emailItem.retryDelay = emailItem.retryDelayMs * Math.pow(EMAIL_CONFIG.retryBackoffMultiplier, emailItem.retries - 1);
            emailItem.status = 'retrying';
            this.stats.totalRetried++;
            
            // Re-add to queue after delay
            setTimeout(() => {
                console.log(`Retrying email ${emailItem.id} (attempt ${emailItem.retries}/${emailItem.maxRetries})`);
                this.queue.unshift(emailItem);
                this.processQueue();
            }, emailItem.retryDelay);
            
            return { success: false, retrying: true };
        }
        
        emailItem.status = 'failed';
        this.stats.totalFailed++;
        emailItem.resolve({ status: 'failed', error: reason });
        return { success: false, error: reason };
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
                    console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                continue;
            }
            
            // Process a batch
            const batch = this.queue.splice(0, EMAIL_CONFIG.batchSize);
            
            for (let i = 0; i < batch.length; i++) {
                if (this.canSend()) {
                    await this.sendEmail(batch[i]);
                } else {
                    // Put back only the ones not sent yet (the earlier ones already went out)
                    this.queue.unshift(...batch.slice(i));
                    break;
                }
            }
            
            // Wait between batches
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, EMAIL_CONFIG.batchDelayMs));
            }
        }
        
        this.isProcessing = false;
        console.log('Email queue empty. Processing stopped.');
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
    
    // Plain status for Settings and the heartbeat: never a body, never a secret
    getHealth() {
        const provider = this.provider.describe();
        const { lastOk, lastError } = this.health;
        let state = 'unknown';
        let reason = null;
        if (!provider.configured) {
            state = 'not_configured';
            reason = NOT_CONFIGURED_TEXT;
        } else if (lastError && (!lastOk || lastError.at > lastOk.at)) {
            state = 'failing';
            reason = lastError.reason;
        } else if (lastOk) {
            state = 'working';
        }
        return {
            provider,
            state,
            reason,
            lastOkAt: lastOk ? lastOk.at : null,
            lastErrorAt: lastError ? lastError.at : null,
            sent: this.stats.totalSent,
            failed: this.stats.totalFailed
        };
    }
    
    // Clear queue (for emergency)
    clearQueue() {
        const clearedCount = this.queue.length;
        this.queue = [];
        console.log(`Cleared ${clearedCount} emails from queue`);
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
        console.log('Email queue service initialized');
    }
    return emailQueueInstance;
}

// ==============================================
// WRAPPER FUNCTIONS FOR EXISTING EMAIL SERVICES
// ==============================================

// Wait for an email's final outcome, but never longer than `ms`. On timeout the item is marked
// abandoned (no more retries); a send already in flight cannot be recalled.
function waitForOutcome(result, ms) {
    let timer;
    const timeout = new Promise((resolve) => {
        timer = setTimeout(() => {
            if (result.abandon) result.abandon();
            resolve({ status: 'timeout' });
        }, ms);
        if (timer.unref) timer.unref();
    });
    return Promise.race([result.outcome, timeout]).then((o) => { clearTimeout(timer); return o; });
}

// Sign-up / reset codes: one quick retry, then wait for the real answer.
async function sendCodeEmailQueued(toEmail, template) {
    const { subject, html, text, attachments } = codeEmail(template);
    const result = await getEmailQueue().addEmail(
        { from: FROM(), to: toEmail, subject, html, text, attachments },
        'high',
        { maxRetries: 1, retryDelayMs: 1000 }
    );
    if (!result.queued) {
        return { ok: false, error: result.error, notConfigured: result.error === NOT_CONFIGURED_TEXT };
    }
    const o = await waitForOutcome(result, CODE_WAIT_MS);
    if (o.status === 'sent') return { ok: true };
    if (o.status === 'timeout') return { ok: false, error: 'Sending the email took too long.', notConfigured: false };
    return { ok: false, error: o.error, notConfigured: o.error === NOT_CONFIGURED_TEXT };
}

// Send verification email via queue -> { ok: true } | { ok: false, error, notConfigured }
function sendVerificationEmailQueued(toEmail, verificationCode) {
    return sendCodeEmailQueued(toEmail, { purpose: 'verify', code: verificationCode });
}

// Send password reset email via queue -> same shape
function sendPasswordResetCodeQueued(toEmail, resetCode) {
    return sendCodeEmailQueued(toEmail, { purpose: 'reset', code: resetCode });
}

// Send bulk email via queue (reminders, reports, etc.) -> { queued, id?, error?, outcome }
async function sendBulkEmailQueued(toEmail, subject, htmlContent, textContent, attachments, { maxRetries } = {}) {
    const mailOptions = {
        from: FROM(),
        to: toEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
        ...(attachments && attachments.length ? { attachments } : {})
    };
    return getEmailQueue().addEmail(mailOptions, 'normal', maxRetries === undefined ? {} : { maxRetries });
}

// Get queue statistics
function getEmailQueueStats() {
    const queue = getEmailQueue();
    return queue.getStats();
}

// Plain email status (working / failing / not configured / unknown)
function getEmailHealth() {
    return getEmailQueue().getHealth();
}

// Clear queue (emergency)
function clearEmailQueue() {
    const queue = getEmailQueue();
    return queue.clearQueue();
}

module.exports = {
    EmailQueue,
    getEmailQueue,
    waitForOutcome,
    getEmailHealth,
    NOT_CONFIGURED_TEXT,
    sendVerificationEmailQueued,
    sendPasswordResetCodeQueued,
    sendBulkEmailQueued,
    getEmailQueueStats,
    clearEmailQueue
};