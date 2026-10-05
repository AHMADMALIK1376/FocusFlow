# How FocusFlow runs

How execution moves through the code: entry points, order, and which part calls which.
Update this file with every change.

---

## 1. Frontend (React, Create React App) — `frontend/`

### Entry point
`frontend/src/index.js`
1. Loads `index.css` and `i18n` (translations).
2. Renders `<App />`.
3. Calls `registerServiceWorker()` (`features/notifications/push.js`). This enables reminder pop-ups and installing the app on a phone.

### `App.js` — providers, outer to inner
`ThemeProvider` → `PreferencesProvider` → `UserProvider` (login state) → `AppProvider` (shared data) → `ToastProvider` → `Routes`

### Routes
- **Sign-in screens:** `/login`, `/signup`, `/verify`, `/forgot-password`, `/reset-password-verify`, `/reset-password`.
  - `Pages/Authpage.js` is the layout. It renders the form from `components/auth/*` through `<Outlet />`.
- **App screens (need login):** `/dashboard` (`Pages/Home.js`), `/subjects`, `/subjects/:id`, `/grades`, `/exams`, `/projects` (assignments board), `/routine`, `/attendance`, `/flashcards`, `/notes`, `/goals`, `/habits`, `/time`, `/budget`, `/settings`.
- Pages are loaded on demand with `React.lazy`.

### Talking to the backend — `services/api.js`
1. Every page calls a helper such as `subjectAPI.getAll()` or `examAPI.create()`.
2. The helper calls `authFetch()`.
3. `authFetch()` adds `Authorization: Bearer <token from localStorage>` and calls `fetch(REACT_APP_API_URL + /api/...)`.
4. `handleResponse()` checks the reply:
   - Not OK: it throws the server's `error` message.
   - **401 with `USER_NOT_FOUND`, `TOKEN_EXPIRED` or `INVALID_TOKEN`:** it clears the saved login (`clearAllUserData`) and goes to `/login`.

---

## 2. Backend (Node + Express) — `backend/`

### Entry point
`backend/server.js`

### Order on start-up
1. `dotenv` loads `.env`.
2. Required environment variables are checked. The server exits if any are missing.
3. Middleware runs in this order:
   1. CORS
   2. `helmet` (security headers)
   3. `compression`
   4. `trust proxy`
   5. Rate limiters (`middleware/rateLimiters.js`)
   6. JSON body parser
   7. Request timeout
   8. Request log
4. Routes are mounted: `/api/auth`, `/api/subjects`, `/api/exams`, `/api/grades`, `/api/assignments`, `/api/notify`, and the rest.
5. `startServer()`:
   - `config/database.js` → `initialize()` creates the Postgres (Supabase) pool.
   - `startNotificationScheduler()` (`services/notificationScheduler.js`) starts the per-minute reminder job.
   - `app.listen(PORT)`.

### One request, start to finish
1. Browser request.
2. Rate limiter.
3. `routes/<x>Routes.js`.
4. `middleware/auth.js`:
   - Verifies the JWT.
   - Checks the user still exists (remembered for 60 s).
   - Sets `req.user`.
5. `controllers/<x>Controller.js`.
6. `getConnection()` → SQL `execute()` → `connection.close()`.
7. JSON reply.

### Reminders
1. `notificationScheduler.js`, every minute.
2. `utils/reminders.js` decides what is due (class, exam, attendance question, morning digest).
3. `services/notifyChannels.js` sends it:
   - web push
   - email through `emailService.js` → `emailQueueService.js`, using the templates in `emailTemplates.js`

---

## 3. Scanner flow (screenshot → saved data)

Used by Subjects, Daily Routine, Exams, Grades and Assignments.

1. The page opens `features/scanner/ScanImportModal.js` with a **kind**:
   - `kinds/subjects.js`
   - `kinds/exams.js`
   - `kinds/grades.js`
   - `kinds/assignments.js`
2. **Input:** a screenshot goes through `ocr.js` → `ocrImage()`:
   - Tesseract.js runs in the browser.
   - The image is scaled up about 2x and turned greyscale.
   - It returns the page text.
   - Pasted text skips OCR.
3. **Parse:** `kind.parse(text)` calls one parser:
   - `subjects/parseTimetable.js` → `parseTimetable()` (course rows, slots, TBA)
   - `scanner/parseDateSheet.js` → `scanDateSheet()` → `{ rows, unread }`
   - `scanner/parseMarks.js` → `scanMarks()` → `{ rows, unread }`
   - `scanner/parseAssignments.js` → `scanAssignments()` → `{ rows, unread }`
   - Shared helpers live in `scanner/textParse.js`: dates, time ranges, course codes, fuzzy text match.
4. **Compare:** `scanner/reconcile.js` → `reconcile(scanned, existing, { match, fields })`. Each row is marked `new`, `changed` (with its field differences) or `same`. Saved items the scan didn't mention are listed as unmatched.
   - If fewer than half of the scanned rows match, the modal asks whether to replace the old data.
5. **Review:** each row is editable, and the lines that couldn't be used are listed.
6. **Save:** the modal applies the changes in this order:
   1. `kind.create()` for new rows.
   2. `kind.update()` for changed rows (only the fields that changed).
   3. `kind.remove()` for removed items, only if everything else saved.
   - Each of these calls `services/api.js`.

---

## 4. Subjects page

`Pages/SubjectsPage.js`
1. `useSubjects()` loads the subjects.
2. `<WeekBeads>` (`components/subjects/WeekBeads.js`) sits in the header, top right:
   - `weekBeads(subjects)` → one bead per class per day, sorted by time.
   - It uses `fmtRange` from `features/schedule/todayClasses.js` and `subjectPalette` from `SubjectTable.js`.
3. `<SubjectTable>` (`components/subjects/SubjectTable.js`) shows the periodic table.
   - Clicking a subject opens `/subjects/:id` (`Pages/SubjectHubPage.js`).
   - Edit opens the subject form modal.

---

## 5. Files changed in this work (5–6 Oct 2026)

| Area | Files |
|---|---|
| Timetable scan fix | `frontend/src/features/subjects/parseTimetable.js`, `features/scanner/kinds/subjects.js` |
| Scanners keep all data | `features/scanner/parseDateSheet.js`, `parseAssignments.js`, `parseMarks.js`, `textParse.js`, `kinds/exams.js`, `kinds/assignments.js`, `kinds/grades.js`, `ScanImportModal.js` |
| 12-hour times | `features/schedule/todayClasses.js` (`fmtRange`), `Pages/SubjectHubPage.js`, `Pages/ExamsPage.js` |
| Subjects page redesign | `components/subjects/SubjectTable.js` (new), `components/subjects/WeekBeads.js` (new), `Pages/SubjectsPage.js` |
| Sage touches | `Pages/Authpage.js`, `components/auth/*.js`, `components/ui/EmptyState.js`, `components/dashboard/widgets/WidgetShell.js` |
| Rate limiting | `backend/middleware/rateLimiters.js` (new), `backend/server.js` |
| Deleted-account sign-out | `backend/middleware/auth.js`, `frontend/src/services/api.js` |
| Tests | `*.test.js` beside each file above, plus fixtures in `features/scanner/__fixtures__/` and `features/subjects/__fixtures__/` |
