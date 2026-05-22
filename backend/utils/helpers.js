const { v4: uuidv4 } = require('uuid');

// Generate unique ID
const generateId = () => uuidv4();

// Format date for Oracle
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

// Get today's date in Oracle format
const today = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
};

// Get current timestamp for Oracle
const now = () => new Date();

// Get day of week (Monday, Tuesday, etc.)
const getDayOfWeek = (date = new Date()) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Format time from "09:00" to "9:00 AM"
const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
};

module.exports = {
    generateId,
    formatDate,
    today,
    now,
    getDayOfWeek,
    formatTime12h
};