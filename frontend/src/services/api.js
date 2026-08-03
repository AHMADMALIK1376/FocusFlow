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
// NOTE APIs
// ==============================================
export const noteAPI = {
    getAll: async () => authFetch('/notes'),
    getForSubject: async (subjectId) => authFetch(`/notes?subjectId=${subjectId}`),
    create: async (data) => authFetch('/notes', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/notes/${id}`, { method: 'DELETE' }),
};

// ==============================================
// GOAL APIs
// ==============================================
export const goalAPI = {
    getAll: async () => authFetch('/goals'),
    createGoal: async (data) => authFetch('/goals', { method: 'POST', body: JSON.stringify(data) }),
    updateGoal: async (id, data) => authFetch(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteGoal: async (id) => authFetch(`/goals/${id}`, { method: 'DELETE' }),
    addMilestone: async (goalId, data) => authFetch(`/goals/${goalId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
    toggleMilestone: async (milestoneId) => authFetch(`/goals/milestones/${milestoneId}/toggle`, { method: 'PUT' }),
    removeMilestone: async (milestoneId) => authFetch(`/goals/milestones/${milestoneId}`, { method: 'DELETE' }),
};

// ==============================================
// BUDGET APIs
// ==============================================
export const budgetAPI = {
    get: async () => authFetch('/budget'),
    addEntry: async (data) => authFetch('/budget/entries', { method: 'POST', body: JSON.stringify(data) }),
    removeEntry: async (id) => authFetch(`/budget/entries/${id}`, { method: 'DELETE' }),
    saveSettings: async (data) => authFetch('/budget/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ==============================================
// FLASHCARD APIs
// ==============================================
export const flashcardAPI = {
    getDecks: async () => authFetch('/flashcards/decks'),
    getDecksForSubject: async (subjectId) => authFetch(`/flashcards/decks?subjectId=${subjectId}`),
    createDeck: async (data) => authFetch('/flashcards/decks', { method: 'POST', body: JSON.stringify(data) }),
    getDeck: async (id) => authFetch(`/flashcards/decks/${id}`),
    deleteDeck: async (id) => authFetch(`/flashcards/decks/${id}`, { method: 'DELETE' }),
    addCard: async (deckId, data) => authFetch(`/flashcards/decks/${deckId}/cards`, { method: 'POST', body: JSON.stringify(data) }),
    updateCard: async (cardId, data) => authFetch(`/flashcards/cards/${cardId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCard: async (cardId) => authFetch(`/flashcards/cards/${cardId}`, { method: 'DELETE' }),
    reviewCard: async (cardId, correct) => authFetch(`/flashcards/cards/${cardId}/review`, { method: 'POST', body: JSON.stringify({ correct }) }),
};

// ==============================================
// SUBJECT ATTENDANCE APIs
// ==============================================
export const subjectAttendanceAPI = {
    getAllForUser: async () => authFetch('/subject-attendance/all'),
    // Per-subject percentages + overall figure, for the dashboard.
    getOverview: async () => authFetch('/subject-attendance/overview'),
    getForSubject: async (subjectId) => authFetch(`/subject-attendance/subjects/${subjectId}`),
    mark: async (subjectId, data) => authFetch(`/subject-attendance/subjects/${subjectId}`, { method: 'POST', body: JSON.stringify(data) }),
    removeRecord: async (recordId) => authFetch(`/subject-attendance/records/${recordId}`, { method: 'DELETE' }),
};

// ==============================================
// ASSIGNMENT APIs
// ==============================================
export const assignmentAPI = {
    getAll: async () => authFetch('/assignments'),
    getForSubject: async (subjectId) => authFetch(`/assignments?subjectId=${subjectId}`),
    create: async (data) => authFetch('/assignments', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    move: async (id, data) => authFetch(`/assignments/${id}/move`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/assignments/${id}`, { method: 'DELETE' }),
};

// ==============================================
// STUDY STREAK (HABITS) APIs
// ==============================================
export const habitAPI = {
    getAll: async () => authFetch('/habits'),
    create: async (data) => authFetch('/habits', { method: 'POST', body: JSON.stringify(data) }),
    rename: async (id, data) => authFetch(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/habits/${id}`, { method: 'DELETE' }),
    toggleDay: async (id, day) => authFetch(`/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify({ day }) }),
};

// ==============================================
// STUDY HOURS APIs
// ==============================================
export const studyHoursAPI = {
    getAll: async () => authFetch('/study-hours'),
    create: async (data) => authFetch('/study-hours', { method: 'POST', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/study-hours/${id}`, { method: 'DELETE' }),
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
    
    deleteSession: async (sessionId) => {
        return authFetch(`/focus/sessions/${sessionId}`, { method: 'DELETE' });
    },

    deleteAll: async () => {
        return authFetch('/focus/sessions', { method: 'DELETE' });
    }
};

// ==============================================
// DASHBOARD APIs
// ==============================================
export const dashboardAPI = {
    // Combined endpoint - ONE CALL instead of multiple.
    getComplete: async () => {
        return authFetch('/dashboard/complete');
    },

    getStats: async () => {
        return authFetch('/dashboard/stats');
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