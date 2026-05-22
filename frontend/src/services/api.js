// API Service for FocusFlow - Complete Version
const API_URL = 'http://localhost:5555/api';
// Helper function to handle responses
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    return data;
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
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName })
        });
        return handleResponse(response);
    },
    
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return handleResponse(response);
    },
    
    logout: () => {
        setToken(null);
    },
    
    getMe: async () => {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    }
};

// ==============================================
// TASK APIs
// ==============================================
export const taskAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    create: async (taskData) => {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(taskData)
        });
        return handleResponse(response);
    },
    
    toggleComplete: async (taskId) => {
        const response = await fetch(`${API_URL}/tasks/${taskId}/complete`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    delete: async (taskId) => {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    deleteAll: async () => {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    deleteByType: async (type, completed) => {
        const url = `${API_URL}/tasks/type/${type}${completed !== undefined ? `?completed=${completed}` : ''}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    }
};

// ==============================================
// CALENDAR APIs
// ==============================================
export const calendarAPI = {
    // Calendar list operations
    getAll: async () => {
        const response = await fetch(`${API_URL}/calendars`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    create: async (title) => {
        const response = await fetch(`${API_URL}/calendars`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ title })
        });
        return handleResponse(response);
    },
    
    update: async (calendarId, title) => {
        const response = await fetch(`${API_URL}/calendars/${calendarId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ title })
        });
        return handleResponse(response);
    },
    
    setActive: async (calendarId) => {
        const response = await fetch(`${API_URL}/calendars/${calendarId}/activate`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    delete: async (calendarId) => {
        const response = await fetch(`${API_URL}/calendars/${calendarId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    // Calendar entries (subjects) operations
    getEntries: async (calendarId) => {
        const response = await fetch(`${API_URL}/calendars/${calendarId}/entries`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    addEntry: async (calendarId, entryData) => {
        const response = await fetch(`${API_URL}/calendars/${calendarId}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(entryData)
        });
        return handleResponse(response);
    },
    
    updateEntry: async (entryId, entryData) => {
        const response = await fetch(`${API_URL}/calendars/entries/${entryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(entryData)
        });
        return handleResponse(response);
    },
    
    deleteEntry: async (entryId) => {
        const response = await fetch(`${API_URL}/calendars/entries/${entryId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    toggleEntryDone: async (entryId) => {
        const response = await fetch(`${API_URL}/calendars/entries/${entryId}/toggle-done`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    }
};

// ==============================================
// ROUTINE APIs
// ==============================================
export const routineAPI = {
    getAll: async () => {
        const response = await fetch(`${API_URL}/routines`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    getToday: async () => {
        const response = await fetch(`${API_URL}/routines/today`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    create: async (routineData) => {
        const response = await fetch(`${API_URL}/routines`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(routineData)
        });
        return handleResponse(response);
    },
    
    delete: async (routineId) => {
        const response = await fetch(`${API_URL}/routines/${routineId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    deleteAll: async () => {
        const response = await fetch(`${API_URL}/routines`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    complete: async (routineId) => {
        const response = await fetch(`${API_URL}/routines/${routineId}/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    }
};

// ==============================================
// FOCUS SESSION APIs
// ==============================================
export const focusAPI = {
    getSessions: async () => {
        const response = await fetch(`${API_URL}/focus/sessions`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    getSession: async (sessionId) => {
        const response = await fetch(`${API_URL}/focus/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    createSession: async (sessionData) => {
        const response = await fetch(`${API_URL}/focus/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(sessionData)
        });
        return handleResponse(response);
    },
    
    deleteAll: async () => {
        const response = await fetch(`${API_URL}/focus/sessions`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    }
};

// ==============================================
// DASHBOARD APIs
// ==============================================
export const dashboardAPI = {
    getSummary: async () => {
        const response = await fetch(`${API_URL}/dashboard/summary`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    },
    
    getStats: async () => {
        const response = await fetch(`${API_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        return handleResponse(response);
    }
};