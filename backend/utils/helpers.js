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

// A "YYYY-MM-DD" the app sent for a routine tick, or null if it isn't a real
// date in a sensible range: not more than a day past today in UTC (time zones
// ahead of UTC are already on tomorrow) and not more than a year back.
const completionDate = (s, at = new Date()) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
    const dayMs = 24 * 60 * 60 * 1000;
    const todayUtc = Date.parse(`${at.toISOString().slice(0, 10)}T00:00:00Z`);
    if (d.getTime() > todayUtc + dayMs || d.getTime() < todayUtc - 366 * dayMs) return null;
    return s;
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
    completionDate,
    now,
    getDayOfWeek,
    formatTime12h
};