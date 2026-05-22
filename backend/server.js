require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initialize } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const taskRoutes = require('./routes/taskRoutes');
const routineRoutes = require('./routes/routineRoutes');
const focusRoutes = require('./routes/focusRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

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
        await initialize();
        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log(`🚀 FocusFlow Backend running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
            console.log('='.repeat(50));
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
