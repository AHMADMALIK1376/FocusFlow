# How FocusFlow runs

How execution moves through the code: entry points, order, and which part calls which.
Update this file with every change.

---

## Staying signed in, 401s and sign-out reasons (Package 2)

Talking to the backend (`services/api.js`, `authFetch`):
1. A 401 on a signed-in browser is read for its `code`.
2. `USER_NOT_FOUND` or `TOKEN_EXPIRED`: `signOutForReason(code)` at once.
3. `NO_TOKEN` or `INVALID_TOKEN`: `confirmSessionOver()` sends one raw `GET /api/auth/me` (shared by parallel requests while it is in flight). Only a 401 with a known code
   from it signs out; 200, 5xx, 408, 429, 403 and network errors do nothing. If the failing request was `/auth/me`, no second call is made.
4. `signOutForReason` runs once (it stops when the marker is already gone): `clearAllUserData()`, then `saveSignOutReason(code)` into `localStorage`, then
   `window.location.assign('/login')` unless already on an auth page. The caller still gets the error.
5. `setToken('session')` forgets the saved reason; `authAPI.logout()` saves the reason `manual`.

On the server (`middleware/auth.js`): every 401 first writes one `auth 401 ...` line through `describe401` (see decision.md), then answers as before.

The sign-in page (`LoginForm`): reads the saved reason once and shows its calm line (`signOutMessage`); then, unless the reason is `manual`, one `restoreSession()`
(`/auth/me`) runs: on success the marker and name are restored and it navigates to `/dashboard`.

---

## Sending email (Package 1)

How an email leaves the server, for sign-up codes, password resets, reminders and the test button:
1. The caller (`authController`, `notifyChannels.sendEmail`, `notifyController.sendTest`) builds the message and asks `services/emailQueueService.js` to send it.
2. `EmailQueue.addEmail` first asks the provider if it is configured. If not, nothing is queued and the answer is `failed` at once ("Email is not set up on the server yet.").
3. Otherwise the item joins the queue (high priority first) and `processQueue` sends it within the rate limits. `provider.send` comes from `services/emailProviders/index.js`: `EMAIL_PROVIDER=gmail_api` (token, then `messages/send` over HTTPS) or `smtp` (default).
4. Each attempt sets the health state. A failure retries while the item's own `maxRetries` allows; the final result resolves the item's `outcome` promise (`sent` or `failed` with a plain reason).
5. The caller waits for that outcome:
   - Sign-up, resend, forgot-password: up to 20 s, one quick retry. Failure answers 500 `EMAIL_SEND_FAILED` (sign-up also deletes the new account).
   - Reminder email: up to 15 s, no queue retries. A wait that runs out counts as delivered (`pending`).
   - Test email button: the same wait as a reminder; failure answers 500 with the provider's reason.
6. At boot `server.js` prints a warning (variable names only) when the chosen provider is not configured.

---

## Reminders that survive sleep (Package 3)

Who starts a check, and what one check does:
1. Three callers, one lock (`runExclusive` in `services/notificationScheduler.js`): the minute cron, one check at boot (`startNotificationScheduler()`), and `GET|POST /api/cron/tick`.
   A caller that finds the lock taken gets `{ busy: true }` (the endpoint answers 200 `busy`).
2. The endpoint (`routes/cronRoutes.js`): `cronLimiter` (mounted in `server.js`) → `requireCronSecret` (`middleware/cronAuth.js`: Bearer, else `X-Cron-Secret`, else `?key=`; 503 if unset, 401 if wrong)
   → `controllers/cronController.js` races the check against 25 s (200 with counts, or 202 still running).
3. `runTick(now)`: for each verified student, `localParts` in their timezone → `loadUserData` → `computeDue` (`utils/reminders.js`, windows `[from, until)`, wording from the minutes left).
4. For each due reminder: `claim` (atomic insert; a conflict counts `skipped`) → `withAnswerLink` → `deliver` (push, email, WhatsApp) → verdict:
   `isDelivered` keeps the claim; `wasAttempted` but not delivered runs `release` (the next check tries again while the window lasts); nothing attempted keeps it.
   One log line per reminder says which.
5. Before closing the connection `services/heartbeat.js` writes `tick` (and `email`, once its state is known). A missing table is logged once and ignored.
6. `GET /api/notify/status` (signed in) reads the heartbeat and this student's push devices; `RemindersSettings.js` shows the lines and the stale warning.
7. Operator endpoints `/api/health/detailed` and `/api/email/queue/stats` (`routes/adminRoutes.js`) go through the same `requireCronSecret`.

---

## 1. Frontend (React, Create React App) — `frontend/`

### Entry point
`frontend/src/index.js`
1. Loads `index.css` and `i18n` (translations).
2. Renders `<App />`.
3. Calls `registerServiceWorker()` (`features/notifications/push.js`). This enables reminder pop-ups and installing the app on a phone.

### `App.js` — providers, outer to inner
Before React starts, the inline script in `public/index.html` paints the cached colour theme (see "Colour theme").
`ThemeProvider` → splash → `PreferencesProvider` (with `ThemeApplier` inside: font + colours, preview first) → `UserProvider` (login state) → `AppProvider` (shared data) → `ToastProvider` → `Routes`

### Routes
- **Sign-in screens:** `/login`, `/signup`, `/verify`, `/forgot-password`, `/reset-password-verify`, `/reset-password`.
  - `Pages/Authpage.js` is the layout. It renders the form from `components/auth/*` through `<Outlet />`.
- **App screens (need login):** `/dashboard` (`Pages/Home.js`), `/subjects`, `/subjects/:id`, `/grades`, `/exams`, `/projects` (assignments board), `/routine`, `/attendance`, `/flashcards`, `/notes`, `/goals`, `/habits`, `/time`, `/budget`, `/settings`.
- Pages are loaded on demand with `React.lazy`.
- **Any other address** (`*`) shows `components/common/ErrorBoundaryRoute.js`, the 404 page, built on `components/errors/ErrorScreen.js`. It uses only `useLocation`/`useNavigate`, because `useRouteError` needs a data router and the app uses `<BrowserRouter>`.

### Loading
- Switching pages: `Suspense` → `PageLoader` (the logo, "Loading page…").
- Inside a page: `PageLoading` / `PanelLoading` (`components/common/LoadingSpinner.js`). Pages wrap the hook's `loading` in `useFirstLoad()`, so the logo shows only on the first load.
- The loader's two lines are the coral PNGs while the brand is the default coral. On any other brand each line is a `ThemedMark` painted in `rgb(var(--brand))`, inside a `.ff-loader-line` wrapper that carries the wipe mask.

### Errors and lost connection
- **App crash:** `ErrorBoundary` → `components/errors/CrashScreen.js` (500, or "FocusFlow was updated" for a failed page chunk).
- **No answer from the API:** `authFetch` in `services/api.js` dispatches `SERVER_TROUBLE_EVENT`. `components/errors/ConnectionGate.js` (mounted last in `App.js`, above everything) calls `pingServer()`, which checks `/api/health`:
  - If the check fails, it shows the 503 page and retries every 15 s.
  - When the server answers again, it reloads.
- **Device offline:** the browser's `offline` event → the gate's offline page. The `online` event → check → reload.
- **App can't load at all:** `public/sw.js` handles failed page loads (`navigate` requests) by serving the cached `public/offline.html` (cache `ff-offline-v4`, named after `THEME_CACHE_VERSION`, with the app icon and the FocusFlow mark). The page carries its own copy of the `ff-theme-boot` script, so it opens in the colours in `focusflow:theme.colors`; with a non-default brand a second small script adds `ff-themed`, which swaps the icon for a brand tile.
- `ErrorScreen` (404, 500, 503, offline) reads `useActiveTheme()`; outside the provider that is the colours this browser remembers (see Colour theme).

### Colour theme
1. A component calls `useAppTheme()` (`preferences/useAppTheme.js`): `theme`, `setTheme`, `resetTheme`, `previewTheme`.
2. `PreferencesProvider` holds `state.theme` (saved, part of the v3 preferences) and `themePreview` (not saved).
   - `setTheme(next)` cleans it with `sanitizeTheme`, ends any preview and saves; it returns `false` for an invalid theme.
   - `previewTheme(next)` shows colours without saving; `previewTheme(null)` ends the preview. **The editor must call `previewTheme(null)` when it closes without saving.**
3. `ThemeApplier` runs `useApplyColorTheme()`. In a layout effect it calls `deriveTokens(themePreview || shownTheme)` (`design/theme/deriveTokens.js`), then `applyTheme` (every token inline on `<html>`, `color-scheme`, the `theme-color` meta).
4. The theme on screen (not a preview) is also written to `focusflow:theme.colors` by `writeThemeCache(shownTheme, ...)`. The default palette removes that key. `shownTheme` comes from `pickShownTheme` (`design/theme/deviceTheme.js`): the account theme once `own` (signed in and `useServerSync` has loaded), otherwise the device theme, otherwise the saved one. While `own`, an effect writes the account theme to `focusflow:theme.device` (removed when it is the default).
5. Next page load: the inline script in `public/index.html` (and the same one in `public/offline.html`) reads the cache and sets the same tokens before the first paint (the splash included). Only caches of the current version (5) are used; older ones are ignored.
6. Sync: the theme is a field of the preferences document, so `useServerSync` sends it to `USER_PREFERENCES` with everything else. `backend/utils/preferences.js` checks its shape (only `#RRGGBB` colours). `savePreferences` refuses (409) a save with a lower `schemaVersion` than the stored one, so an out-of-date tab cannot overwrite a newer document.
7. Sign-out (or a 401): `useServerSync` resets preferences to default (`loaded` goes false), and `PreferencesProvider` drops any preview and sets `signedIn` false on the same event. `own` is false, so `shownTheme` is the device theme: the sign-in page keeps the last student's colours, and `theme.device` and the cache are kept. Another account loading replaces the device theme; saving Reset removes it.
8. Charts and the dashboard clock call `useChartColors()` (`components/charts/chartColors.js`). It reads the active theme from context through `useActiveTheme()` (`preferences/useActiveTheme.js`: the preview if one is open, else `shownTheme`, cleaned), so they re-render on every preview and save. Outside a provider `useActiveTheme()` returns `initialShownTheme()` (device theme, else the saved preferences' theme, else none), and `chartColors()` reads `<html>` (`tokenHex`). The budget pucks and home cubes call `useCategoryColors()` (`components/charts/categoryColors.js`: the normal six colours, or brand, accent and a spread-out list on a custom theme).
9. The logo marks: `components/layout/Logo.js` and the navbar read `useActiveTheme()`. With no logo colour they render the PNG as it is. With one, `ThemedMark` paints the same shape in `rgb(var(--logo))` with a CSS mask. The loader paints in `rgb(var(--brand))` only when the brand is not the default coral (see Loading).
10. The sign-in and onboarding illustrations call `useThemedLottie()` (`design/theme/lottieTint.js`), which turns only their blue, purple and cyan decoration by the brand's hue shift.

### Settings page — `Pages/SettingsPage.js`
1. The header card shows the student's mascot (`components/common/Mascot.js`). "Choose mascot" opens `MascotPicker`, which saves through `updateProfile`.
2. Six cards follow: Profile, Reminders, Appearance, Dashboard and workspaces, Language, and Privacy and cookies.
3. A card click sets `?open=<id>` in the address (`useSearchParams`).
4. The page reads `?open=`. If it names a card, one `Modal` opens with that card's controls.
   - The modal uses `trapFocus` and `fullHeightOnMobile`.
   - The controls are `RemindersSettings`, `FontSelector`, `WidgetManager` with `DashboardSwitcher`, `LanguageSelect`, `components/consent/CookieChoice.js`, or the profile form.
5. Escape, the close button or the back button removes `?open=`, and the pop-up closes.

### Keyboard in pop-ups
- `Modal` with `trapFocus` moves focus in, wraps Tab, and gives focus back to the opener on close (Settings cards, Design Studio, `MascotPicker`).
- A menu or list inside a pop-up (`DashboardSwitcher`, `LanguageSelect`) handles Escape itself and calls `stopPropagation()`, so Escape closes the menu first and only a second Escape closes the pop-up.

### Focus ring colour
`deriveTokens()` puts `--ring` in the token set (the brand colour on the default; for other themes the brand colour walked lighter or darker until it is 3:1 on the card and the page). Components use `focus-visible:ring-focus-ring` (or `outline-focus-ring`). `design/focusRing.test.js` fails if a file goes back to a brand-coloured focus ring.

### Text on tinted badges
`Badge` and `StatCard` put `text-<tone>-ink` on `bg-<tone>/NN`. `deriveTokens()` outputs `--success-ink`, `--info-ink`, `--focus-ink`, `--brand-ink`, `--muted-ink` (and `--warn-ink`): equal to today's colours on the default; on other themes the guard walks each until it is 4.5:1 on the card and on its own tint (`WASHES`). `design/statusText.test.js` fails if a badge goes back to plain tone text.
Solid status fills (delete pop-up, danger `Button`, the done tick) take `text-on-focus` / `text-on-warn` / `text-on-success`: today's white or dark ink on the default, white or near-black (whichever reaches 4.5:1; 3:1 for the tick) on other themes.

### Design Studio — `components/studio/DesignStudio.js`
1. Appearance has a "Design your dashboard" button. It sets `?open=studio` with `replace`, so the Appearance entry becomes the Studio entry. A link to `?open=studio` opens it too. `SettingsPage` always renders `<DesignStudio open={...} />`, so it can see the Back button.
2. On open the Studio copies the saved theme into a draft (`studioReducer`: `draft` and an undo list of up to 20).
3. Every change (a palette, a swatch, a hex code, the colour input, Auto, Undo, Reset) goes through `withPalette` / `withRole` into the draft. Colour-input drags are limited to one change per animation frame and merge into one undo step until blur.
4. `previewTheme(draft)` runs after each change, so the whole app (and the small preview card) shows the draft. `useDeferredValue` feeds `deriveTokens` and `readabilityNotes`, which write the Readability check and decide if Save is on.
5. Save: re-checks the live draft, calls `setTheme(draft)` (which saves, caches, syncs and ends the preview), shows the toast and closes.
6. Cancel and Discard: `previewTheme(null)` and close. Escape, the X or the backdrop with unsaved changes show the question inside the dialog (Save and close / Discard changes / Keep editing); with none, they close.
7. Back with unsaved changes: the address no longer says `studio`, the Studio sees it did not close itself, calls `onReopen()` (Settings pushes `?open=studio` again) and shows the question. Closing the tab with unsaved changes gets the browser's own prompt (`beforeunload`).
8. Whenever it closes or unmounts, `previewTheme(null)` runs, so a preview cannot get stuck.

### Dashboard profile card — `components/dashboard/ProfileCard.js`
- `Home.js` renders it with the name, streak, done count and focus count. It reads `profile` from preferences itself.
- **Photo:** if `profile.avatarUrl` is set, the photo fills the card.
- **Mascot:** if `profile.mascot` is set instead, a sage backdrop fills the card, and the mascot is sized from it with CSS container units.
- **Neither:** the initial and "Pick a mascot".
- "Change mascot" opens `MascotPicker`. A pick saves `{ mascot, avatarUrl: null }`.

### Talking to the backend — `services/api.js`
1. Every page calls a helper such as `subjectAPI.getAll()` or `examAPI.create()`.
2. The helper calls `authFetch()`.
3. `authFetch()` adds the `X-Requested-With: FocusFlow` header and calls `fetch('/api/...')` on the app's own address (Vercel passes `/api` on to the server; the dev server does the same). The sign-in is the HttpOnly cookie `ff_session`, which the browser attaches by itself, so no script reads it and nothing is kept in `localStorage` but a "signed in" marker. `REACT_APP_API_URL` must stay unset.
4. `handleResponse()` checks the reply:
   - Not OK: it throws the server's `error` message.
   - **401 with `USER_NOT_FOUND` or `TOKEN_EXPIRED`:** it clears the saved login (`clearAllUserData`), saves the reason and goes to `/login`. `NO_TOKEN` / `INVALID_TOKEN` do the same only after `/auth/me` confirms (see the Package 2 section at the top).

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

### Staying signed in
1. Signing in (or verifying a new account's email, or Google) makes the server set the `ff_session` cookie (HttpOnly, Secure, SameSite=Lax, 20 days). The page keeps only the marker `focus_signedin` (`setToken('session')` in `services/api.js`).
2. Every call goes to `/api` on the app's own address: `vercel.json` passes it to Render in production, and `package.json` "proxy" passes it to port 5555 in development. `authFetch` sends the cookie (`credentials: 'include'`) and `X-Requested-With: FocusFlow`.
3. `middleware/auth.js` reads the cookie (or the old Authorization header and upgrades it to a cookie), refuses changes that lack the header (`CSRF`), and re-sets the cookie when the login is more than a day old.
4. Signing out: `authAPI.logout()` asks the server to clear the cookie and clears the marker. A dead cookie is cleared by the server.
5. `GuestOnly` (`components/auth/GuestOnly.js`) wraps "/", "/login" and "/signup": if you're signed in it goes to `/dashboard`.

### Cookie choice
- `CookieBanner` (mounted in `App.js`) asks on the first visit and stores the choice in `features/consent/consent.js`.
- Google's sign-in script is added by `features/consent/googleSignIn.js` only after "Accept all", or when the Google button is pressed and the student agrees. `/privacy` (`Pages/PrivacyPage.js`) explains everything. The choice can be changed there and in Settings → Privacy and cookies, both through `components/consent/CookieChoice.js`.

### Preferences on the account
- `PreferencesProvider` calls `useServerSync` (`preferences/useServerSync.js`). On sign-in (the `ff:auth` event from `setToken`) it loads `GET /api/preferences`; the account's copy wins, and if there is none this browser's copy is uploaded.
- Edits are saved with `PUT /api/preferences` after 1.5 s (or when the tab is hidden). Signing out wipes the browser's copy.
- Backend: `routes/preferencesRoutes.js` → `controllers/preferencesController.js` → table `USER_PREFERENCES` (`utils/preferences.js` checks the document).

### Welcome set-up (onboarding)
- Sign-up → email code → `VerifyForm` calls `markNeedsOnboarding()` → `/onboarding`.
- First-ever Google sign-in: the server replies `isNewUser`, and the app does the same.
- `RequireOnboarding` sends you to `/onboarding` only while that flag is on. `OnboardingPage` clears it when you finish. Signing in never sets it.

### One request, start to finish
1. Browser request.
2. CORS (`middleware/cors.js`): in production only `APP_URL` and `ALLOWED_ORIGINS` are let through.
3. Rate limiter.
4. `routes/<x>Routes.js`.
5. `middleware/auth.js`:
   - Verifies the JWT.
   - Checks the user still exists (remembered for 60 s).
   - Sets `req.user`.
6. `controllers/<x>Controller.js`.
7. `getConnection()` → SQL `execute()` → `connection.close()`.
8. JSON reply.

### Reminders
1. `notificationScheduler.js`, every minute.
2. `utils/reminders.js` decides what is due (class, exam, attendance question, morning digest), each inside its own window (see "Reminders that survive sleep" above).
3. `services/notifyChannels.js` sends it:
   - web push
   - email through `emailService.js` → `emailQueueService.js`, using the templates in `emailTemplates.js`

#### Reminder emails
`deliver` → `loadUserTheme(connection, user.userId)` (`emailTheme.js`: reads `USER_PREFERENCES`, null on any problem) → `buildReminderEmail(n, appUrl, theme)` (`notifyChannels.js`; falls back to the default look if the template throws) → `reminderEmail` → `emailPalette(theme)` (`emailTheme.js`, using the generated engine copy in `services/theme/`; the default or an invalid theme gives `DEFAULT_PALETTE`; others are derived and made readable) → templates in `emailTemplates.js` (colours only from the palette) → `iconAttachment` (`emailIcons.js`: the existing file for a ready-made colour, a tinted buffer for another, the nearest ready-made file if tinting fails). Sign-up and reset code emails stay in the default look.

#### Answer pages (opened from a reminder)
`GET /api/notify/answer` → `readToken` (bad or expired: default look, no database) → `lookOf(p.u)` (opens a connection with one try (`getConnection(1, 0)`) only to read the theme via `loadUserTheme`, waits at most 1.5 s for it, closes it in `finally` even if it arrives late, default look on any problem or delay) → `page()` with CSS from `pageCss(palette)` and icons from `iconSet('web', palette)`. `POST` saves the answer first, then `lookOn(connection, p.u)` reads the theme for the confirmation or error page (not after a database error). Both use the default look when anything fails.

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
| Dial-style round gauges | `components/ui/ProgressRing.js` (`ringLayout()` works out the radii; it's used by `StudentSnapshot.js`, `GoalCard.js`, `widgets/GoalsCard.js`, `widgets/ProgressRingCard.js`, `Pages/Home.js`, `GradesPage.js`, `GoalsPage.js`, `KanbanPage.js`) |
| Cube chart fills its card | `components/charts/ProgressCubeStack.js` (measures the card's spare height and turns it into gaps), `Pages/Home.js` (the card is a flex column) |
| Routine ticks by date | `features/routine/routineDays.js` (new), `components/routine/DonutChart.js`, `RoutineView.js`, `Pages/DailyRoutine.js`, `context/AppContext.js`, `layout/Navbar.js`, `dashboard/DailyTimetableCard.js`, `services/api.js`, `backend/controllers/routineController.js`, `backend/utils/helpers.js` |

### Ticking a routine slice
1. `DonutChart` → `onToggle(id, day)`. Days that haven't come yet are blocked.
2. `toggleComplete()` (in `DailyRoutine.js` or `RoutineView.js`) → `dateOfWeekday(day)` gives the local date in this week.
3. `routineAPI.complete(id, date)` → `POST /api/routines/:id/complete { date }`.
4. `completeRoutine` checks the date with `completionDate()`, then adds or removes that date's row in `ROUTINE_COMPLETIONS` and replies `{ completed }`.
5. The page applies `setDoneOn()` to its list and to `AppContext`. `routineToday()` then updates the navbar's done/total and the dashboard's Routine cube.
| Tests | `*.test.js` beside each file above, plus fixtures in `features/scanner/__fixtures__/` and `features/subjects/__fixtures__/` |
