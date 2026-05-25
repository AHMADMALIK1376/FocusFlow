// services/cronLogger.js

class CronLogger {
    constructor() {
        this.jobStats = new Map();
    }
    
    start(jobName, details = {}) {
        const startTime = Date.now();
        this.jobStats.set(jobName, { startTime, details });
        console.log(`⏰ [${new Date().toISOString()}] Starting ${jobName}${details.message ? ': ' + details.message : ''}`);
        return startTime;
    }
    
    end(jobName, count = 0, details = {}) {
        const stats = this.jobStats.get(jobName);
        const duration = stats ? ((Date.now() - stats.startTime) / 1000).toFixed(2) : '?';
        console.log(`✅ [${new Date().toISOString()}] Completed ${jobName}: ${count} processed (${duration}s)${details.message ? ' - ' + details.message : ''}`);
        this.jobStats.delete(jobName);
    }
    
    error(jobName, error, details = {}) {
        console.error(`❌ [${new Date().toISOString()}] ${jobName} failed:`, error.message);
        if (details.stack && process.env.NODE_ENV === 'development') {
            console.error(`   Stack: ${details.stack}`);
        }
    }
    
    warn(jobName, message) {
        console.warn(`⚠️ [${new Date().toISOString()}] ${jobName}: ${message}`);
    }
    
    info(jobName, message) {
        console.log(`ℹ️ [${new Date().toISOString()}] ${jobName}: ${message}`);
    }
    
    getStats() {
        const stats = {};
        for (const [jobName, data] of this.jobStats) {
            stats[jobName] = {
                running: true,
                startedAt: new Date(data.startTime).toISOString(),
                duration: ((Date.now() - data.startTime) / 1000).toFixed(2) + 's'
            };
        }
        return stats;
    }
}

module.exports = new CronLogger();