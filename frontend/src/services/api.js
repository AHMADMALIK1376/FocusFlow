// src/services/api.js

// ==============================================
// API CONFIGURATION
// ==============================================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5555';
const API_URL = `${API_BASE_URL}/api`;

// Helper function to handle responses
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || data.message || 'Something went wrong');
    }
    return data;
};

// Helper for authorized requests
const authFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('focus_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });
    
    return handleResponse(response);
};

// Token management
export const setToken = (token) => {
    if (token) {
        localStorage.setItem('focus_token', token);
    } else {
        localStorage.removeItem('focus_token');
    }
};

export const getToken = () => {
    return localStorage.getItem('focus_token');
};

// ==============================================
// AUTH APIs
// ==============================================
export const authAPI = {
    register: async (email, password, fullName) => {
        return authFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName })
        });
    },
    
    login: async (email, password) => {
        return authFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    verifyEmail: async (email, code) => {
        return authFetch('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
    },
    
    resendVerification: async (email) => {
        return authFetch('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },
    
    forgotPassword: async (email) => {
        return authFetch('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },
    
    verifyResetCode: async (email, code) => {
        return authFetch('/auth/verify-reset-code', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
    },
    
    resetPassword: async (email, code, newPassword) => {
        return authFetch('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, code, newPassword })
        });
    },
    
    logout: () => {
        setToken(null);
        localStorage.removeItem('focus_username');
        localStorage.removeItem('focus_email');
    },
    
    getMe: async () => {
        return authFetch('/auth/me');
    }
};

// ==============================================
// TASK APIs
// ==============================================
export const taskAPI = {
    getAll: async () => {
        return authFetch('/tasks');
    },
    
    create: async (taskData) => {
        return authFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    },
    
    toggleComplete: async (taskId) => {
        return authFetch(`/tasks/${taskId}/complete`, {
            method: 'PUT'
        });
    },
    
    delete: async (taskId) => {
        return authFetch(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    },
    
    deleteAll: async () => {
        return authFetch('/tasks', {
            method: 'DELETE'
        });
    },
    
    deleteByType: async (type, completed) => {
        const url = `/tasks/type/${type}${completed !== undefined ? `?completed=${completed}` : ''}`;
        return authFetch(url, { method: 'DELETE' });
    }
};

// ==============================================
// CALENDAR APIs
// ==============================================
export const calendarAPI = {
    getAll: async () => {
        return authFetch('/calendars');
    },
    
    create: async (title, semesterStart, semesterEnd, semesterName) => {
        return authFetch('/calendars', {
            method: 'POST',
            body: JSON.stringify({ title, semesterStart, semesterEnd, semesterName })
        });
    },
    
    update: async (calendarId, title, semesterStart, semesterEnd, semesterName) => {
        return authFetch(`/calendars/${calendarId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, semesterStart, semesterEnd, semesterName })
        });
    },
    
    setActive: async (calendarId) => {
        return authFetch(`/calendars/${calendarId}/activate`, {
            method: 'PUT'
        });
    },
    
    delete: async (calendarId) => {
        return authFetch(`/calendars/${calendarId}`, {
            method: 'DELETE'
        });
    },
    
    getEntries: async (calendarId) => {
        return authFetch(`/calendars/${calendarId}/entries`);
    },
    
    addEntry: async (calendarId, entryData) => {
        return authFetch(`/calendars/${calendarId}/entries`, {
            method: 'POST',
            body: JSON.stringify(entryData)
        });
    },
    
    updateEntry: async (entryId, entryData) => {
        return authFetch(`/calendars/entries/${entryId}`, {
            method: 'PUT',
            body: JSON.stringify(entryData)
        });
    },
    
    deleteEntry: async (entryId) => {
        return authFetch(`/calendars/entries/${entryId}`, {
            method: 'DELETE'
        });
    },
    
    toggleEntryDone: async (entryId) => {
        return authFetch(`/calendars/entries/${entryId}/toggle-done`, {
            method: 'PUT'
        });
    }
};

// ==============================================
// SUBJECT APIs
// ==============================================
export const subjectAPI = {
    getAll: async () => authFetch('/subjects'),
    get: async (id) => authFetch(`/subjects/${id}`),
    create: async (data) => authFetch('/subjects', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/subjects/${id}`, { method: 'DELETE' }),
};

// ==============================================
// GRADE APIs
// ==============================================
export const gradeAPI = {
    getForSubject: async (subjectId) => authFetch(`/grades?subjectId=${subjectId}`),
    getGpa: async () => authFetch('/grades/gpa'),
    create: async (data) => authFetch('/grades', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/grades/${id}`, { method: 'DELETE' }),
};

// ==============================================
// EXAM APIs
// ==============================================
export const examAPI = {
    getAll: async () => authFetch('/exams'),
    getForSubject: async (subjectId) => authFetch(`/exams?subjectId=${subjectId}`),
    create: async (data) => authFetch('/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggle: async (id) => authFetch(`/exams/${id}/toggle`, { method: 'PUT' }),
    remove: async (id) => authFetch(`/exams/${id}`, { method: 'DELETE' }),
};

// ==============================================
// ROUTINE APIs
// ==============================================
export const routineAPI = {
    getAll: async () => {
        return authFetch('/routines');
    },
    
    getToday: async () => {
        return authFetch('/routines/today');
    },
    
    create: async (routineData) => {
        return authFetch('/routines', {
            method: 'POST',
            body: JSON.stringify(routineData)
        });
    },
    
    update: async (routineId, routineData) => {
        return authFetch(`/routines/${routineId}`, {
            method: 'PUT',
            body: JSON.stringify(routineData)
        });
    },
    
    delete: async (routineId) => {
        return authFetch(`/routines/${routineId}`, {
            method: 'DELETE'
        });
    },
    
    deleteAll: async () => {
        return authFetch('/routines', { method: 'DELETE' });
    },
    
    complete: async (routineId) => {
        return authFetch(`/routines/${routineId}/complete`, {
            method: 'POST'
        });
    }
};

// ==============================================
// FOCUS APIs
// ==============================================
export const focusAPI = {
    getSessions: async () => {
        return authFetch('/focus/sessions');
    },
    
    getSession: async (sessionId) => {
        return authFetch(`/focus/sessions/${sessionId}`);
    },
    
    createSession: async (sessionData) => {
        return authFetch('/focus/sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    },
    
    deleteAll: async () => {
        return authFetch('/focus/sessions', { method: 'DELETE' });
    }
};

// ==============================================
// DASHBOARD APIs - UPDATED WITH COMBINED ENDPOINT
// ==============================================
export const dashboardAPI = {
    // NEW: Combined endpoint - ONE CALL instead of multiple!
    // This reduces rate limiting by 90%+
    getComplete: async () => {
        return authFetch('/dashboard/complete');
    },
    
    // Quick stats for navbar (lightweight)
    getQuick: async () => {
        return authFetch('/dashboard/quick');
    },
    
    // Legacy endpoints (kept for backward compatibility)
    getSummary: async () => {
        return authFetch('/dashboard/summary');
    },
    
    getStats: async () => {
        return authFetch('/dashboard/stats');
    }
};

// ATTENDANCE APIs
export const attendanceAPI = {
    getDashboard: async () => {
        return authFetch('/attendance/dashboard');
    },
    
    getSummary: async () => {
        return authFetch('/attendance/summary');
    },
    
    getRecords: async (entryId) => {
        return authFetch(`/attendance/records/${entryId}`);
    },
    
    getTrend: async (entryId) => {
        return authFetch(`/attendance/trend/${entryId}`);
    },
    
    updateAttendance: async (entryId, classDate, status, pointsEarned, remarks) => {
        return authFetch(`/attendance/${entryId}/${classDate}`, {
            method: 'PUT',
            body: JSON.stringify({ status, pointsEarned, remarks: remarks || '' })
        });
    },
    
    generateSessions: async (entryId) => {
        return authFetch(`/attendance/generate/${entryId}`, {
            method: 'POST'
        });
    }
};

// ==============================================
// UTILITY - Clear all user data on logout
// ==============================================
export const clearAllUserData = () => {
    localStorage.removeItem('focus_token');
    localStorage.removeItem('focus_username');
    localStorage.removeItem('focus_email');
    sessionStorage.clear();
};