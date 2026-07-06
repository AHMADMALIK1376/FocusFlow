require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { initialize, healthCheck: dbHealthCheck, getPoolStats, closePool } = require('./config/database');
const { startReminderScheduler } = require('./services/reminderService');
const { sendAllDailySchedules } = require('./services/dailyScheduleEmailService');
const { 
    sendWeeklyTaskSummary, 
    sendDailyTaskSummary, 
    sendHourlyTaskReminders 
} = require('./services/taskReminderEmailService');
const { autoMarkAbsent } = require('./services/attendanceService');
const { sendAllDailyRoutines } = require('./services/dailyRoutineEmailService');
const { getEmailQueueStats, clearEmailQueue } = require('./services/emailService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const taskRoutes = require('./routes/taskRoutes');
const routineRoutes = require('./routes/routineRoutes');
const focusRoutes = require('./routes/focusRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const examRoutes = require('./routes/examRoutes');
const noteRoutes = require('./routes/noteRoutes');
const goalRoutes = require('./routes/goalRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const subjectAttendanceRoutes = require('./routes/subjectAttendanceRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================
// CORS CONFIGURATION - MUST BE FIRST!
// ==============================================
app.use((req, res, next) => {
    // Allow all origins in development
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin');
    res.header('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).json({});
    }
    next();
});

// Standard CORS as backup
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

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
// RATE LIMITING - TEMPORARILY DISABLED FOR TESTING
// ==============================================

// const globalLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 100,
//     message: { error: 'Too many requests, please try again later.' },
//     standardHeaders: true,
//     legacyHeaders: false,
// });

// const authLimiter = rateLimit({
//     windowMs: 60 * 1000,
//     max: 5,
//     message: { error: 'Too many login attempts, please try again later.' },
//     skipSuccessfulRequests: true,
// });

// app.use('/api/', globalLimiter);
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', authLimiter);
// app.use('/api/auth/forgot-password', authLimiter);
// app.use('/api/auth/reset-password', authLimiter);

console.log('⚠️ Rate limiting is DISABLED for testing');

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/calendars', calendarRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/subject-attendance', subjectAttendanceRoutes);
app.use('/api/assignments', assignmentRoutes);

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
        rateLimiting: 'disabled (testing)'
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
        rateLimiting: 'disabled (testing)'
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
let isAutoMarking = false;
let isHourlyRemindersRunning = false;

async function startServer() {
    try {
        await initialize();
        console.log('✅ Database connection pool created');
        
        startReminderScheduler();
        console.log('⏰ Class reminder scheduler started');
        
        cron.schedule('0 6 * * *', () => {
            console.log('📅 [6:00 AM] Sending daily class schedule emails...');
            sendAllDailySchedules().catch(err => console.error('Daily schedule error:', err));
        });
        
        cron.schedule('0 7 * * *', () => {
            console.log('🕒 [7:00 AM] Sending daily routine emails...');
            sendAllDailyRoutines().catch(err => console.error('Daily routine error:', err));
        });
        
        cron.schedule('0 7 * * 1', () => {
            console.log('📋 [Monday 7:00 AM] Sending weekly task summary...');
            sendWeeklyTaskSummary().catch(err => console.error('Weekly summary error:', err));
        });
        
        cron.schedule('0 8 * * *', () => {
            console.log('📋 [8:00 AM] Sending daily task summary...');
            sendDailyTaskSummary().catch(err => console.error('Daily summary error:', err));
        });
        
        cron.schedule('* * * * *', async () => {
            if (isHourlyRemindersRunning) return;
            isHourlyRemindersRunning = true;
            try {
                await sendHourlyTaskReminders();
            } catch (err) {
                console.error('❌ Hourly reminders error:', err.message);
            } finally {
                isHourlyRemindersRunning = false;
            }
        });
        
        cron.schedule('5 0 * * *', async () => {
            if (isAutoMarking) return;
            console.log('🕐 [12:05 AM] Auto-marking past pending classes as absent...');
            isAutoMarking = true;
            try {
                await autoMarkAbsent();
            } catch (err) {
                console.error('❌ Auto-mark absent error:', err.message);
            } finally {
                isAutoMarking = false;
            }
        });
        
        app.listen(PORT, () => {
            console.log('='.repeat(60));
            console.log(`🚀 FocusFlow Backend running on port ${PORT}`);
            console.log(`📍 Health: http://localhost:${PORT}/api/health`);
            console.log(`📍 CORS Enabled for http://localhost:3000`);
            console.log(`⚠️ Rate limiting is DISABLED for testing`);
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
    
    let waitCount = 0;
    while ((isAutoMarking || isHourlyRemindersRunning) && waitCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitCount++;
    }
    
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