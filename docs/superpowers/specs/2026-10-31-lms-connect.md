# Connect FocusFlow to the university LMS (read-only sync)

Status: PHASE 1 BUILT on branch `feat/lms-connect` (not pushed). Waiting on the owner's local check, the migration, `LMS_TOKEN_KEY`, and the dean's written permission before it is merged.

## What the owner asked for
Students should not copy things from the LMS by hand. When a teacher posts an assignment, marks attendance or the
semester calendar changes, FocusFlow should know. Each student connects their own account.

## What a read-only test showed (owner's account, Iqra University LMS)
- The LMS is **Moodle 5.0.2**. Sign-in is Microsoft 365, so FocusFlow can never ask for, or hold, a student's password.
- The official mobile API is on. A token from the same flow the Moodle phone app uses can read, for the student only:
  - 11 courses; course names carry the **section code, day, time and room** (for example `... IUIC_COURSE_FALL26_576 (FRI 01:15 03:20 LR26)`),
    so the timetable can be filled in without the scanner;
  - 10 assignments with open and due dates, and the student's own submission status (`submitted`);
  - the whole-semester calendar: 47 attendance sessions plus assignments in one month;
  - 33 grade rows. Quizzes: none existed yet, so they are untested.
- **Not readable through the API:** Present or Absent per class (no attendance functions are allowed for this token).
- Auto-login to the student's attendance page is allowed by the site, but the token had **no private key**, which that
  function needs. Whether a private key can be obtained is an open experiment (below).

## Design
1. **Connect screen** (Settings > LMS): the student opens a "Get my key" link that runs Moodle's own launch address, signs in
   with Microsoft, and pastes back the text the browser shows. FocusFlow decodes it, checks it with `core_webservice_get_site_info`,
   and stores it. The site address is fixed to the university's, never typed in by the user (so a student cannot point the server at
   another address).
2. **Storage:** new table `LMS_CONNECTIONS` (user_id, site, token_encrypted, last_synced, last_error, created_at), encrypted with AES-256-GCM
   using a key from the environment (`LMS_TOKEN_KEY`, set by the owner; never in the repo). The token is never returned in a response,
   never logged, never put in `localStorage`. "Disconnect" deletes the row. Resetting the key in Moodle also cuts access.
3. **Sync** (server side, so it works when the phone is closed; same free monitor that hits `/api/cron/tick`):
   one student at most every 30 minutes, plus once right after connecting and when the app opens.
   - Courses -> `SUBJECTS` (matched by an LMS course id kept in a new `LMS_ITEM_MAP` table; never duplicate; names the student edited are kept).
   - Course name -> `SUBJECT_SCHEDULE` (day, start, end, room) for new subjects only.
   - Assignments -> `ASSIGNMENTS` (title, due date, subject). Moodle `submitted` moves the card to Done; the student can still move cards.
     A new assignment never overwrites something the student changed.
   - Grades -> read-only display first; `GRADES` is not changed until the owner decides how the LMS grade maps to GPA.
   - Calendar attendance sessions -> a new `LMS_SESSIONS` table (subject, date), so the attendance percentage can use the **real number of
     classes in the semester** (known last class date, how many more can be missed).
4. **Attendance status (Present / Absent):** stays with the student's own "Did you attend?" answer until the experiment below succeeds.
5. **Failure rules:** an expired or reset token marks the connection "needs reconnect", shows a plain message, and never signs the student out of
   FocusFlow. A Moodle outage skips that run. Nothing is ever written back to the LMS.

## Experiment before attendance status (10 minutes, owner's account)
Ask for a token the way the phone app does (so Moodle includes the private key), then call `tool_mobile_get_autologin_key` and read the
attendance page's Present/Absent table. If that works, add a "status" sync. If not, status stays manual.

## Rules that apply
No paid services (this uses only Moodle's free API). Bound SQL parameters, scoped to `req.user.userId`. Additive, idempotent migration
(`backend/config/postgres-init.sql` + `backend/scripts/migrate-lms.js`); code must work if the migration has not been run.
Update `decision.md`, `flow.md`, `README.md` (new env var).

## Owner checklist (before and after building)
1. Get the dean's **written** permission that students may connect their own accounts (an email is enough).
2. Reset the test key in Moodle (Preferences > Security keys > "Moodle mobile web service" > Reset).
3. Set `LMS_TOKEN_KEY` (32 random bytes, base64) on Render, never in git.
4. Run `backend/scripts/migrate-lms.js` on Supabase **before** merging.
5. Tell friends in plain words what is stored (their key, encrypted; their courses, assignments, dates) and how to disconnect.

## Not doing
Storing passwords; scraping with a student's login; writing to the LMS (submitting, marking attendance); any paid service;
a browser extension.

## Phases
- **1:** connect, courses, schedule, assignments and submission status, semester sessions for the attendance percentage.
- **2:** grades display, quizzes once they exist, attendance status if the experiment works.
