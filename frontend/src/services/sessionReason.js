// Why this browser was signed out, so the sign-in page can say so in one calm line.
// It lives in localStorage on purpose: clearAllUserData() empties sessionStorage.
export const REASON_KEY = 'ff_signout_reason';

export const saveSignOutReason = (code) => {
    try {
        localStorage.setItem(REASON_KEY, JSON.stringify({ code, at: new Date().toISOString() }));
    } catch { /* storage full or blocked: the line is a nicety */ }
};

export const readSignOutReason = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(REASON_KEY));
        return parsed && typeof parsed.code === 'string' ? { code: parsed.code, at: parsed.at } : null;
    } catch {
        return null;
    }
};

export const clearSignOutReason = () => {
    try { localStorage.removeItem(REASON_KEY); } catch { /* ignore */ }
};

const MESSAGES = {
    TOKEN_EXPIRED: 'You were signed out because your session expired.',
    USER_NOT_FOUND: 'You were signed out because this account no longer exists.',
    INVALID_TOKEN: 'You were signed out because your sign-in was no longer valid.',
    NO_TOKEN: 'You were signed out because this browser no longer had your sign-in.',
};

// null for a deliberate sign-out ("manual"), an unknown code, or no reason.
export const signOutMessage = (code) => MESSAGES[code] || null;
