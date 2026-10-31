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
    id: a.id, courseId: c.id, name: a.name || 'Assignment', duedate: a.duedate || 0, intro: a.intro || '',
    files: (a.introattachments || []).map((f) => ({ name: f.filename, size: f.filesize, mime: f.mimetype, url: f.fileurl })),
  })));
}

// One file of the teacher's, streamed to the student's own browser through our server. Only a file path on the LMS itself is ever asked for,
// and a redirect is never followed (so it cannot be sent somewhere else).
async function fetchFile(token, path) {
  if (!/^\/(webservice\/)?pluginfile\.php\/[^?#]+$/.test(String(path))) throw new LmsError('badpath', 'Not a file address.');
  const url = new URL(baseUrl() + String(path).replace(/^\/pluginfile\.php\//, '/webservice/pluginfile.php/'));
  url.searchParams.set('token', token);
  url.searchParams.set('forcedownload', '1');
  try {
    return await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  } catch (e) {
    throw new LmsError('unreachable', 'The LMS did not answer.');
  }
}

async function isSubmitted(token, assignId) {
  const d = await call(token, 'mod_assign_get_submission_status', { assignid: assignId });
  const status = d && d.lastattempt && d.lastattempt.submission && d.lastattempt.submission.status;
  return status === 'submitted';
}

// Class sessions (the attendance activity) and quizzes show up as calendar events.
async function calendarEvents(token, year, month) {
  const d = await call(token, 'core_calendar_get_calendar_monthly_view', { year, month });
  const events = (d.weeks || []).flatMap((w) => w.days || []).flatMap((day) => day.events || []);
  return events
    .filter((e) => e.modulename === 'attendance' || e.modulename === 'quiz')
    .map((e) => ({ id: e.id, modulename: e.modulename, name: e.name || '', courseId: (e.course && e.course.id) || e.courseid, timestart: e.timestart }));
}

// The student's marks in one course: one row per graded item (and the course total). Read-only.
async function grades(token, userId, courseId) {
  const d = await call(token, 'gradereport_user_get_grade_items', { courseid: courseId, userid: userId });
  const items = ((d.usergrades || [])[0] || {}).gradeitems || [];
  return items
    .filter((i) => i.itemtype !== 'category' && (i.itemname || i.itemtype === 'course'))
    .map((i) => ({
      id: i.id,
      name: i.itemname || 'Course total',
      isTotal: i.itemtype === 'course',
      score: i.graderaw == null ? null : Number(i.graderaw),
      max: i.grademax == null ? null : Number(i.grademax),
      date: i.gradedategraded ? new Date(Number(i.gradedategraded) * 1000).toISOString().slice(0, 10) : null,
    }));
}

module.exports = { LmsError, keyRejected, baseUrl, call, siteInfo, courses, assignments, isSubmitted, calendarEvents, grades, fetchFile };
