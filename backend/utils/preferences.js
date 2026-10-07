// Checks what the app sends as a student's saved preferences (dashboard layout,
// workspace name, profile, mascot, colour theme). It is stored as one JSON document, so
// the only things guarded are: it is an object, it is not huge, it has a schema
// version, and the colour theme (if any) has the right shape. The app decides what
// the rest means.
const MAX_BYTES = 200 * 1024;
const HEX = /^#[0-9a-fA-F]{6}$/;
const PRESET = /^[a-z0-9-]{1,32}$/;
const THEME_KEYS = ['v', 'background', 'brand', 'accent', 'text', 'logo', 'icon', 'presetId'];

// The theme becomes CSS on every page, so only plain #RRGGBB colours get through.
function themeOk(t) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) return false;
    if (!Object.keys(t).every((k) => THEME_KEYS.includes(k))) return false;
    if (!Number.isInteger(t.v) || t.v < 1) return false;
    for (const k of ['background', 'brand', 'accent']) {
        if (typeof t[k] !== 'string' || !HEX.test(t[k])) return false;
    }
    if (t.text !== 'auto' && !(typeof t.text === 'string' && HEX.test(t.text))) return false;
    for (const k of ['logo', 'icon']) {
        if (k in t && !(typeof t[k] === 'string' && HEX.test(t[k]))) return false;
    }
    return typeof t.presetId === 'string' && PRESET.test(t.presetId);
}

function validatePreferences(body) {
    const data = body && body.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'Preferences must be an object.' };
    }
    if (typeof data.schemaVersion !== 'number') {
        return { ok: false, error: 'Preferences need a schemaVersion.' };
    }
    if (data.theme !== undefined && !themeOk(data.theme)) {
        return { ok: false, error: 'Theme colours must be #RRGGBB hex values.' };
    }
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
        return { ok: false, tooLarge: true, error: 'Preferences are too large.' };
    }
    return { ok: true, json };
}

// An app from before a schema change reads a newer document as an old one and would
// upload a mangled copy (the pre-v3 app turns a v3 document into one default dashboard).
// So a save whose schemaVersion is lower than the stored one is refused. A stored copy
// that cannot be read never blocks a save.
function isDowngrade(storedJson, incomingVersion) {
    let stored;
    try { stored = JSON.parse(storedJson); } catch { return false; }
    const current = stored && stored.schemaVersion;
    return typeof current === 'number' && current > incomingVersion;
}

module.exports = { MAX_BYTES, validatePreferences, themeOk, isDowngrade };
