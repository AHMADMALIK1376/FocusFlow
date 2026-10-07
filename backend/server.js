require('dotenv').config();
const express = require('express');
const { corsMiddleware } = require('./middleware/cors');
const helmet = require('helmet');
const compression = require('compression');
const { initialize, healthCheck: dbHealthCheck, getPoolStats, closePool } = require('./config/database');
const { startNotificationScheduler } = require('./services/notificationScheduler');
const { getEmailQueueStats, clearEmailQueue } = require('./services/emailService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const routineRoutes = require('./routes/routineRoutes');
const focusRoutes = require('./routes/focusRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const examRoutes = require('./routes/examRoutes');
const noteRoutes = require('./routes/noteRoutes');
const goalRoutes = require('./routes/goalRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const subjectAttendanceRoutes = require('./routes/subjectAttendanceRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const habitRoutes = require('./routes/habitRoutes');
const studyHoursRoutes = require('./routes/studyHoursRoutes');
const notifyRoutes = require('./routes/notifyRoutes');
const preferencesRoutes = require('./routes/preferencesRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================
// CORS CONFIGURATION - MUST BE FIRST!
// ==============================================
// Development: any origin. Production: only APP_URL and ALLOWED_ORIGINS (middleware/cors.js).
app.use(corsMiddleware());

// ==============================================
// ENVIRONMENT VARIABLE VALIDATION
// ==============================================
const requiredEnv = ['JWT_SECRET', 'PGHOST', 'PGUSER', 'PGPASSWORD', 'EMAIL_USER', 'EMAIL_PASS'];
const missing = requiredEnv.filter(varName => !process.env[varName]);

if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and restart the server.');
    process.exit(1);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️ WARNING: JWT_SECRET should be at least 32 characters long for production!');
}

console.log('✅ Environment variables validated');

// ==============================================
// OTHER MIDDLEWARE
// ==============================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(compression({
    level: 6,
    threshold: 1024,
}));

// ==============================================
// RATE LIMITING
// ==============================================
// Requests reach the API through Vercel (which passes /api on) and then Render's
// own proxy, so the real client IP is two hops back. With one hop every student
// would share Vercel's address and the limits would be counted together.
// (Someone calling Render directly can fake the IP, which is why logins are also
// limited per account below.)
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 2);

const { globalLimiter, loginLimiter, loginEmailLimiter, emailLimiter, codeLimiter } = require('./middleware/rateLimiters');

app.use('/api/', globalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use(['/api/auth/register', '/api/auth/resend-verification', '/api/auth/forgot-password'], emailLimiter);
app.use(['/api/auth/verify-email', '/api/auth/verify-reset-code', '/api/auth/reset-password'], codeLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Needs the parsed body (it counts wrong passwords per email address).
app.use('/api/auth/login', loginEmailLimiter);

// Request timeout
const REQUEST_TIMEOUT_MS = 30000;
const SLOW_REQUEST_WARNING_MS = 5000;

app.use((req, res, next) => {
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        console.error(`❌ Request timeout: ${req.method} ${req.path}`);
        if (!res.headersSent) {
            res.status(408).json({ error: 'Request timeout' });
        }
    });
    
    res.setTimeout(REQUEST_TIMEOUT_MS, () => {
        console.error(`❌ Response timeout: ${req.method} ${req.path}`);
        if (!res.headersSent) {
            res.status(408).json({ error: 'Response timeout' });
        }
    });
    
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (duration > SLOW_REQUEST_WARNING_MS) {
            console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
    });
    
    next();
});

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ==============================================
// API ROUTES
// ==============================================
app.use('/api/auth', authRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/subject-attendance', subjectAttendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/study-hours', studyHoursRoutes);
app.use('/api/notify', notifyRoutes);
app.use('/api/preferences', preferencesRoutes);

// ==============================================
// HEALTH CHECK
// ==============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.2.0',
        uptime: process.uptime(),
        cors: 'enabled',
        rateLimiting: 'enabled'
    });
});

app.get('/api/health/detailed', async (req, res) => {
    const dbHealth = await dbHealthCheck();
    const poolStats = await getPoolStats();
    const emailStats = getEmailQueueStats();
    
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealth,
        pool: poolStats,
        emailQueue: emailStats,
        cors: 'enabled',
        rateLimiting: 'enabled'
    });
});

// Email queue endpoints
app.get('/api/email/queue/stats', (req, res) => {
    try {
        const stats = getEmailQueueStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get queue statistics' });
    }
});

app.delete('/api/email/queue/clear', (req, res) => {
    try {
        const cleared = clearEmailQueue();
        res.json({ success: true, message: `Cleared ${cleared} emails from queue` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear queue' });
    }
});

// Error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==============================================
// CRON JOBS
// ==============================================
async function startServer() {
    try {
        await initialize();
        console.log('✅ Database connection pool created');
        
        // Class / exam / routine reminders, morning digest and attendance prompts.
        startNotificationScheduler();

        app.listen(PORT, () => {
            console.log('='.repeat(60));
            console.log(`🚀 FocusFlow Backend running on port ${PORT}`);
            console.log(`📍 Health: http://localhost:${PORT}/api/health`);
            console.log(`📍 CORS Enabled for http://localhost:3000`);
            console.log('🛡️ Rate limiting is ON');
            console.log('='.repeat(60));
        });
        
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
}

// Graceful shutdown
let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

    await closePool();
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
    gracefulShutdown('unhandledRejection');
});

startServer();