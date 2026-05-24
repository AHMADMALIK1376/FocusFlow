require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { initialize } = require('./config/database');
const { startReminderScheduler } = require('./services/reminderService');
const { sendAllDailySchedules } = require('./services/dailyScheduleEmailService');
const { 
    sendWeeklyTaskSummary, 
    sendDailyTaskSummary, 
    sendHourlyTaskReminders 
} = require('./services/taskReminderEmailService');
const { autoMarkAbsent } = require('./services/attendanceService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const taskRoutes = require('./routes/taskRoutes');
const routineRoutes = require('./routes/routineRoutes');
const focusRoutes = require('./routes/focusRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
    try {
        // Initialize Oracle Database connection pool
        await initialize();
        console.log('✅ Oracle Database connection pool created');
        
        // ==============================================
        // CLASS REMINDERS (1 hour before class)
        // ==============================================
        startReminderScheduler();
        console.log('⏰ Class reminder scheduler started. Will check every minute.');
        
        // ==============================================
        // DAILY SCHEDULE EMAIL (Classes for today)
        // ==============================================
        cron.schedule('0 6 * * *', () => {
            console.log('📅 Running 6:00 AM daily schedule email job...');
            sendAllDailySchedules();
        });
        console.log('📧 Daily schedule email job scheduled for 6:00 AM');
        
        // ==============================================
        // TASK REMINDERS
        // ==============================================
        
        // 1. WEEKLY TASK SUMMARY - Every Monday at 7:00 AM
        cron.schedule('0 7 * * 1', () => {
            console.log('📋 Running weekly task summary job...');
            sendWeeklyTaskSummary();
        });
        console.log('📋 Weekly task summary scheduled for Monday at 7:00 AM');
        
        // 2. DAILY TASK SUMMARY - Every day at 8:00 AM
        cron.schedule('0 8 * * *', () => {
            console.log('📋 Running daily task summary job...');
            sendDailyTaskSummary();
        });
        console.log('📋 Daily task summary scheduled for 8:00 AM');
        
        // 3. HOURLY TASK REMINDERS - Every minute (1 hour before task due)
        cron.schedule('* * * * *', () => {
            sendHourlyTaskReminders();
        });
        console.log('⏰ Hourly task reminder scheduler started. Will check every minute.');
        
        // ==============================================
        // AUTO-MARK ABSENT - Every day at 12:05 AM
        // ==============================================
        cron.schedule('5 0 * * *', () => {
            console.log('🕐 [MIDNIGHT] Running auto-absent check...');
            autoMarkAbsent();
        });
        console.log('⏰ Auto-absent scheduler: Daily at 12:05 AM - Marks unmarked classes as Absent');
        
        // ==============================================
        // TESTING - Run auto-absent 10 seconds after startup
        // REMOVE THIS FOR PRODUCTION
        // ==============================================
        setTimeout(() => {
            console.log('🧪 [TEST] Running auto-absent check immediately...');
            autoMarkAbsent();
        }, 10000);
        
        // Start Express server
        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log(`🚀 FocusFlow Backend running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
            console.log('='.repeat(50));
            console.log('📋 REMINDER SCHEDULE SUMMARY:');
            console.log('   🕐 Auto-Absent: 12:05 AM (marks past pending as absent)');
            console.log('   🏫 Class Reminders: Every minute (1 hour before class)');
            console.log('   📅 Daily Schedule: 6:00 AM');
            console.log('   📋 Weekly Tasks: Monday at 7:00 AM');
            console.log('   📋 Daily Tasks: 8:00 AM');
            console.log('   ⏰ Hourly Task Reminders: Every minute');
            console.log('='.repeat(50));
        });
        
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

startServer();