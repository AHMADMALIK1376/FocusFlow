// Reads a student's own data from the university Moodle with their key. Read-only: only "get" functions
// are ever called. The site address is fixed here (or in LMS_BASE_URL on the server), never taken from a user.

class LmsError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}
// Moodle's way of saying "this key is no good (any more)".
const KEY_REJECTED = new Set(['invalidtoken', 'accessexception', 'invalidlogin', 'forbidden', 'servicenotavailable', 'nopermissions', 'requireloginerror']);
const keyRejected = (err) => Boolean(err && KEY_REJECTED.has(err.code));

const baseUrl = () => (process.env.LMS_BASE_URL || 'https://lms.iqra.edu.pk').replace(/\/+$/, '');

async function call(token, fn, params = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x, i) => body.append(`${k}[${i}]`, String(x)));
    else if (v !== undefined && v !== null) body.append(k, String(v));
  }
  body.set('wstoken', token);
  body.set('wsfunction', fn);
  body.set('moodlewsrestformat', 'json');
  let res;
  try {
    res = await fetch(`${baseUrl()}/webservice/rest/server.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    throw new LmsError('unreachable', 'The LMS did not answer.');
  }
  if (!res.ok) throw new LmsError(`http_${res.status}`, 'The LMS answered with an error.');
  let data;
  try { data = await res.json(); } catch (e) { throw new LmsError('badreply', 'The LMS sent an unreadable answer.'); }
  if (data && data.exception) throw new LmsError(data.errorcode || data.exception, data.message);
  return data;
}

// ---- The few questions FocusFlow asks ---------------------------------------------------------
async function siteInfo(token) {
  const d = await call(token, 'core_webservice_get_site_info');
  return { userId: d.userid, siteName: d.sitename || '' };
}

async function courses(token, userId) {
  const list = await call(token, 'core_enrol_get_users_courses', { userid: userId });
  return (Array.isArray(list) ? list : []).map((c) => ({ id: c.id, fullname: c.fullname || '', startdate: c.startdate || 0, enddate: c.enddate || 0 }));
}

async function assignments(token, courseIds) {
  if (!courseIds.length) return [];
  const d = await call(token, 'mod_assign_get_assignments', { courseids: courseIds });
  return (d.courses || []).flatMap((c) => (c.assignments || []).map((a) => ({
    id: a.id, courseId: c.id, name: a.name || 'Assignment', duedate: a.duedate || 0,
  })));
}

async function isSubmitted(token, assignId) {
  const d = await call(token, 'mod_assign_get_submission_status', { assignid: assignId });
  const status = d && d.lastattempt && d.lastattempt.submission && d.lastattempt.submission.status;
  return status === 'submitted';
}

// Class sessions the teacher created in the attendance activity show up as calendar events.
async function attendanceEvents(token, year, month) {
  const d = await call(token, 'core_calendar_get_calendar_monthly_view', { year, month });
  const events = (d.weeks || []).flatMap((w) => w.days || []).flatMap((day) => day.events || []);
  return events
    .filter((e) => e.modulename === 'attendance')
    .map((e) => ({ id: e.id, courseId: (e.course && e.course.id) || e.courseid, timestart: e.timestart }));
}

module.exports = { LmsError, keyRejected, baseUrl, call, siteInfo, courses, assignments, isSubmitted, attendanceEvents };
