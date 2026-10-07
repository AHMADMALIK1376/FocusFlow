// Which websites may call the API from a browser.
//
// Development (NODE_ENV not "production"): any origin, so localhost on any port
// works. Production: only the origins in ALLOWED_ORIGINS (comma separated), plus
// APP_URL. Requests with no Origin header (the "answer" links opened from an
// email, health pings, curl) aren't browser cross-site calls and always pass.

const clean = (u) => String(u || '').trim().replace(/\/+$/, '').toLowerCase();

function allowedOrigins(env = process.env) {
    return [...(env.ALLOWED_ORIGINS || '').split(','), env.APP_URL].map(clean).filter(Boolean);
}

function isAllowedOrigin(origin, env = process.env) {
    if (!origin) return true;
    if (env.NODE_ENV !== 'production') return true;
    return allowedOrigins(env).includes(clean(origin));
}

// Express middleware: sets the CORS headers for allowed origins, answers
// preflights, and refuses other origins' preflights.
function corsMiddleware(env = process.env) {
    return (req, res, next) => {
        const origin = req.headers.origin;
        const ok = isAllowedOrigin(origin, env);
        if (ok && origin) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Vary', 'Origin');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin');
            // The browser may read the renewed login the API sends back.
            res.header('Access-Control-Expose-Headers', 'X-Refreshed-Token');
            res.header('Access-Control-Max-Age', '86400');
        }
        if (req.method === 'OPTIONS') {
            return ok ? res.sendStatus(204) : res.status(403).json({ error: 'Origin not allowed' });
        }
        next();
    };
}

module.exports = { allowedOrigins, isAllowedOrigin, corsMiddleware };
