// Checks what the app sends as a student's saved preferences (dashboard layout,
// workspace name, profile, mascot). It is stored as one JSON document, so the
// only things guarded are: it is an object, it is not huge, and it has a schema
// version. The app decides what the contents mean.
const MAX_BYTES = 200 * 1024;

function validatePreferences(body) {
    const data = body && body.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, error: 'Preferences must be an object.' };
    }
    if (typeof data.schemaVersion !== 'number') {
        return { ok: false, error: 'Preferences need a schemaVersion.' };
    }
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
        return { ok: false, tooLarge: true, error: 'Preferences are too large.' };
    }
    return { ok: true, json };
}

module.exports = { MAX_BYTES, validatePreferences };
