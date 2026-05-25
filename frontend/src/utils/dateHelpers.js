// src/utils/dateHelpers.js

// Short day names (for backend/database)
export const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Full day names (for display)
export const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Map short to full
export const shortToFullDay = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
    'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
};

// Map full to short
export const fullToShortDay = {
    'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed',
    'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun'
};

// Get current day in short format (for API calls)
export const getCurrentDayShort = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'short' });
};

// Get current day in full format (for display)
export const getCurrentDayFull = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
};

// Format day for display (convert short to full if needed)
export const formatDayForDisplay = (day) => {
    if (!day) return '';
    if (day.length <= 3) {
        return shortToFullDay[day] || day;
    }
    return day;
};

// Format day for API (convert full to short if needed)
export const formatDayForAPI = (day) => {
    if (!day) return '';
    if (day.length > 3) {
        return fullToShortDay[day] || day.substring(0, 3);
    }
    return day;
};

// Get date range for a week starting from a given date
export const getWeekDates = (referenceDate) => {
    const dates = {};
    const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    
    for (const shortDay of SHORT_DAYS) {
        const targetDay = dayMap[shortDay];
        const currentDay = referenceDate.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(referenceDate);
        monday.setDate(referenceDate.getDate() + mondayOffset);
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + (targetDay - 1));
        dates[shortDay] = targetDate.toISOString().split('T')[0];
    }
    
    return dates;
};