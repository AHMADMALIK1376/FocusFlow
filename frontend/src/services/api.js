// src/services/api.js

// ==============================================
// API CONFIGURATION
// ==============================================
// Empty means "the same address the app is served from": in production Vercel
// passes /api on to the server (vercel.json), in development the dev server does
// (package.json "proxy"). One address keeps the sign-in cookie first-party.
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const SIGNED_IN_KEY = 'focus_signedin';
const LEGACY_TOKEN_KEY = 'focus_token';
const API_URL = `${API_BASE_URL}/api`;

// Helper function to handle responses
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || data.message || 'Something went wrong');
    }
    return data;
};

const SESSION_OVER = ['USER_NOT_FOUND', 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'NO_TOKEN'];

// A request got no answer, or a 502/503/504 from the host. The connection
// gate (components/errors/ConnectionGate) hears this, asks /api/health itself,
// and only then shows the offline or "server unreachable" page.
export const SERVER_TROUBLE_EVENT = 'ff:server-trouble';
const reportServerTrouble = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(SERVER_TROUBLE_EVENT));
};

// Is the FocusFlow server answering? true / false within `timeoutMs`.
export const pingServer = async (timeoutMs = 6000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`${API_URL}/health`, { cache: 'no-store', signal: ctrl.signal });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
};

// Helper for authorized requests.
// The sign-in itself is an HttpOnly cookie the browser attaches by itself, so
// no script (ours or anyone else's) can read it. What the page keeps is only a
// "signed in" marker (SIGNED_IN_KEY), to decide which screens to show.
// X-Requested-With is the CSRF guard the server asks for on every change.
const authFetch = async (endpoint, options = {}) => {
    const signedIn = !!getToken();
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'FocusFlow',
        ...options.headers,
    };

    // Browsers signed in before the cookie existed still hold the old login.
    // It is sent one last time; the server answers by setting the cookie.
    if (legacyToken) {
        headers['Authorization'] = `Bearer ${legacyToken}`;
    }

    let response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
        });
    } catch (err) {
        // No answer at all: offline, or the server is down.
        reportServerTrouble();
        throw err;
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
        reportServerTrouble();
    }

    // The old login worked, so the cookie is now set: stop keeping the old one
    // where scripts can read it.
    if (legacyToken && response.ok) {
        setToken('session');
    }

    // The saved login no longer works (account deleted, expired, cookie gone):
    // forget it and go to the sign-in page instead of failing every save.
    if (response.status === 401 && signedIn) {
        const body = await response.clone().json().catch(() => ({}));
        if (SESSION_OVER.includes(body.code)) {
            clearAllUserData();
            if (!/^\/(login|signup|verify|forgot-password|reset-password)/.test(window.location.pathname)) {
                window.location.assign('/login');
            }
        }
    }

    return handleResponse(response);
};

// Tells the rest of the app when this browser signs in or out (the saved
// preferences listen: they are loaded from the account on sign-in and cleared
// on sign-out, so the next person on this computer starts clean).
export const AUTH_EVENT = 'ff:auth';
const announceAuth = (signedIn) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { signedIn } }));
};

// "Signed in" marker. (The name is kept from when the login itself was saved
// here.) Passing any value marks the browser as signed in; null signs it out.
export const setToken = (token) => {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    if (token) {
        localStorage.setItem(SIGNED_IN_KEY, '1');
    } else {
        localStorage.removeItem(SIGNED_IN_KEY);
    }
    announceAuth(!!token);
};

// Truthy while this browser is signed in.
export const getToken = () => {
    return localStorage.getItem(LEGACY_TOKEN_KEY) || (localStorage.getItem(SIGNED_IN_KEY) ? 'session' : null);
};

// ==============================================
// PREFERENCES (dashboard layout, workspace name, profile, mascot)
// ==============================================
export const prefsAPI = {
    get: async () => authFetch('/preferences'),
    save: async (data, options = {}) => authFetch('/preferences', {
        method: 'PUT',
        body: JSON.stringify({ data }),
        ...options,
    }),
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
        // The server empties the sign-in cookie (the page can't touch it itself).
        fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'X-Requested-With': 'FocusFlow' },
            credentials: 'include',
            keepalive: true,
        }).catch(() => {});
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
    getAll: async () => authFetch('/grades'),
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
// Reminders: settings, phone push subscription, test sends.
export const notifyAPI = {
    getSettings: async () => authFetch('/notify/settings'),
    saveSettings: async (data) => authFetch('/notify/settings', { method: 'PUT', body: JSON.stringify(data) }),
    subscribe: async (subscription) => authFetch('/notify/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
    unsubscribe: async (endpoint) => authFetch('/notify/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
    sendTest: async (kind = 'basic') => authFetch('/notify/test', { method: 'POST', body: JSON.stringify({ kind }) }),
};

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
    
    // Ticks (or unticks) a routine for one local date, "YYYY-MM-DD".
    complete: async (routineId, date) => {
        return authFetch(`/routines/${routineId}/complete`, {
            method: 'POST',
            body: JSON.stringify(date ? { date } : {})
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
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(SIGNED_IN_KEY);
    announceAuth(false);
    localStorage.removeItem('focus_username');
    localStorage.removeItem('focus_email');
    sessionStorage.clear();
};