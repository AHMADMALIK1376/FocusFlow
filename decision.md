# Decision log

Every meaningful code or design choice made while building FocusFlow with Claude, newest first.
Each entry: what was decided, the reason, and what was rejected.
Update this file with every change.

---

## 2026-10-06 — Git

### Loading and error-page work committed as three backdated commits, then merged into `main`
- **Why:** your request. Each commit has its author and committer date set to 2:00 PM Pakistan time, like the 24 Sept commit.

  | Date | Commit |
  |---|---|
  | 2 Aug 2026 | The logo loader on every loading state |
  | 5 Aug 2026 | The 404, 500, 503 and offline pages |
  | 18 Sept 2026 | The offline fallback page in the service worker, plus these docs |

- **Order:** the commits sit on top of the 6 Oct work in the history; only their dates are earlier.
- **Merge:** the merge commit into `main` carries today's date.
- **Left out:** `.claude/agents/reviewer.md`, your own uncommitted edit.

---

## 2026-10-06 — Loading animation and error pages

### The logo animation for every loading state (`components/common/LoadingSpinner.js`)
- **Decision:** every page and panel that loads data now shows the logo drawing itself, with a short caption ("Loading notes…"). It's the same animation as "Loading your dashboard…". There are two sizes: `PageLoading` for a page and `PanelLoading` for a panel inside one.
- **Where:**
  - Plain "Loading…" text was replaced in 7 pages (Subjects, Grades, Exams, Flashcards, a flashcard deck, the subject hub, Attendance), the 5 subject-hub panels and Reminders settings.
  - Notes, Goals, the Assignment board, Budget, Study streaks and Study hours had no loading state at all; they flashed their empty screen first. They now show the logo.
  - Five logo loaders that had no caption now have one.
- **`useFirstLoad`:** the feature hooks set `loading` again on every refresh after a save. The logo shows only on a page's first load, so it doesn't replace the page after every edit.
- **Checked in your Chrome:** opening 13 pages one after another, each showed its own captioned logo, and no plain text loader appeared anywhere.

### Error pages, each with its own look (`components/errors/`)
- **Shared layout (`ErrorScreen.js`):** a big clay status code where the middle "0" is the app's dial. Each page sets the dial differently.
- **404 Page not found:** dial at zero with a search icon. Shows the wrong address, with Go to Dashboard and Go back buttons.
- **500 Something broke on our side (`CrashScreen.js`):** a full dial. `ErrorBoundary` shows it when the app crashes. Buttons: Reload and Go to Dashboard. "What happened?" reveals the error, plus the stack in development. A page that failed to load after a new deploy is shown as "FocusFlow was updated, reload" instead of a crash.
- **503 Can't reach FocusFlow's server (`ConnectionGate.js`):**
  - `api.js` reports any request that gets no answer, or a 502/503/504.
  - The gate then asks `/api/health` itself, so one failed request never shows the page.
  - While the server is down, the dial counts down 15 s and retries. "Try now" retries straight away.
  - When the server answers again, the app reloads by itself.
- **You're offline (`ConnectionGate.js`):** shown on the browser's offline event, with a Wi-Fi-off icon in a sage dial. It reloads when the connection returns.
- **Offline fallback (`public/offline.html` and `sw.js`):** when a page can't load at all (no internet, or the site is unreachable), the service worker serves this saved page. It's network-first: only a failed page load uses the cache. API calls and scripts are never touched.
- **Not added:**
  - 401: an expired login already goes straight to sign-in.
  - 403: the app has no restricted pages.
  - 501: nothing in the app can produce it.
- **Checked in your Chrome (port 3001):**
  - The 404 page.
  - The 503 page, with API calls made to fail in that tab only. It counted down, and recovered by itself once calls worked again.
  - The offline page, which reloaded when "online" fired.
  - `offline.html`, served with the 3001 server stopped.
  - The 500 page is covered by tests (crash, deploy update, and the error boundary), not by a real crash.

---

## 2026-10-06 — Round gauges and the cube chart

### Every round progress graph now looks like the focus timer dial (`components/ui/ProgressRing.js`)
- **Decision:** the shared ring has four layers:
  - an outer ring of tick marks that light up in coral up to the value
  - a sunken clay groove, using the same pressed-in shadow (`--shadow-neu-inset`) as the sign-in fields
  - a thin arc inside the groove, ending in a sage knob
  - a raised disc in the middle for the number
- Large gauges also get dial numbers at the top, right, bottom and left, like the timer's 0/15/30/45: `0 25 50 75` for percentages and `0 1 2 3` for CGPA.
- **Where:** CGPA (dashboard snapshot and Grades page), Focus today, Goals page, Assignment board, the Goals widget and the Goal-progress widget. The "Task Progress" double ring (`GoalCard.js`) now uses the same gauge, with done and left in the middle.
- **Why:** you asked for the timer dial's style, with the sunken look of the email field, on all round graphs. The plain flat ring looked empty at 0.
- **How:** one shared component was changed, so every page updates together. The arc is about 60% of the old thickness, like the timer's. The larger gauges were made bigger to leave room for the numbers.
- **Daily Routine donut (`components/routine/DonutChart.js`):** given the same engraved look at your request, with no change to how it works. The slices sit in a sunken groove, a raised disc holds the count, and a ring of ticks lights up in sage over the slices that are done. Done slices are now light sage (`#B8DCC4`) instead of the dark emerald.

### Routine ticks are saved and read by date (`features/routine/routineDays.js`, `routineController.js`)
- **Bugs found:**
  1. The server stores the date a routine was ticked, but the app checked for a weekday name ("Wed"). A tick showed only until you reloaded the page.
  2. Tapping a slice on a day that hadn't come yet (e.g. Wednesday on a Tuesday) saved the tick to *today*.
  3. The server used the UTC date, so before 5 AM in Pakistan a tick was saved to yesterday.
  4. Dates sent back to the app were shifted a day early on a Pakistan-time machine (`toISOString` on a local-midnight date). Checked against the real database: 7 Oct came back as 6 Oct.
  5. The full-week view (`RoutineView.js`) sent the navbar the old list, so its counter never changed.
- **Fix:**
  - One set of date helpers decides "done": ticked on that weekday's date in the current Monday-to-Sunday week, in the phone's local time.
  - The app sends the slice's date, and the server checks it (`completionDate()` in `utils/helpers.js`) and saves exactly that date.
  - Dates go back as text (`TO_CHAR`).
  - Days that haven't come yet can't be ticked.
- **Navbar:** the Daily Routine pill now shows today's **done/total** (e.g. `1/1`), the same count as the donut, and opens the routine page. Before, it showed the number left, so a finished day read `00`. The dashboard's Routine cube uses the same count.
- **Rejected:** storing weekday names. A Monday tick would then count for every Monday.
- **Today's items can be ticked at any time (`canTick()` in `DonutChart.js`):** before, a slice turned red "missed" the minute its time arrived and could no longer be clicked. But you tick a routine *after* doing it. It still shows red until ticked. Missed past days stay locked (a done past day can still be unticked), and days that haven't come yet can't be ticked.
- **Checked end to end in your Chrome (port 3001):**
  - A temporary routine for today was added. The navbar showed `0/1`.
  - Clicking its slice changed the navbar and donut to `1/1`, with a light-sage slice. It stayed `1/1` after a reload.
  - The server saved 2026-10-06, today's local date. The dashboard's Routine cube showed 100%.
  - Wednesday's slice was locked.
  - The test routine was then unticked and deleted, leaving only your own routine.

### "Page Not Found" no longer crashes (`components/common/ErrorBoundaryRoute.js`)
- **Bug:** the catch-all `*` route used `useRouteError()`, which only works with a data router. The app uses `<BrowserRouter>`, so every unknown or old link crashed into the general "Something went wrong" screen.
- **Fix:** it's now a plain 404 page that uses `useLocation()`. It shows the address that wasn't found, plus Go to Dashboard and Go back buttons, in the same card design. The Refresh button was dropped because reloading a missing page doesn't help.
- **Checked:** in the real app, `/some-old-link` shows the page with no console errors, and Go to Dashboard works.

### Focus button uses a line icon
- The "▶" text character on Focus today is now the lucide `Play` icon, following the no-emoji rule.

### Cubes spread out to fill their card (`components/charts/ProgressCubeStack.js`)
- **Decision:** the chart takes the card's spare height and puts it between the cubes, up to 46 px per gap, then centres the stack.
- **Why:** at 0% the four cubes sat in a tight stack at the top, leaving a large empty area in the card.
- **How:** the SVG is absolutely positioned, so its own height never feeds back into the measured space.

---

## 2026-10-06 — Docs

### Root `README.md` added
- **Decision:** a full README at the repo root. It covers the features, tech stack, an architecture diagram, local setup, every environment variable, backend scripts, tests, the API routes, the scanner, reminders, security, deployment and the design system.
- **Why:** the GitHub page had no README. The only one was the Create React App boilerplate in `frontend/`.
- **Rule followed:** every claim was checked against the code. Example: routine reminders come 60 minutes early, not at the routine's time. The README uses no emoji, only shields.io badges and the app logo.
- **Left as is:** `frontend/README.md` (CRA boilerplate).
- **Git:** committed on `feat/student-pivot`, merged into `main` with a merge commit, and both branches pushed. `.claude/agents/reviewer.md` was again left out.

---

## 2026-10-06 — Subjects page

### Week chart redesigned as a small clay abacus (`components/subjects/WeekBeads.js`)
- **Decision:** a compact card in the page header, top right. It has one rod per day and one soft pastel bead per class, in the subject's own tint. Today's rod is sage and the busiest day's letter is coral. Pointing at a bead shows the class, time and room.
- **Why:** you found the heat grid too big and placed too low, and wanted something small, soft and unique that matches the clay design. No line, radar or circle chart.
- **Replaced:** `WeekHeat.js` and its test, which were deleted.

### Subjects shown as a periodic table (`components/subjects/SubjectTable.js`)
- **Decision:** each subject is a square "element" (course code as the symbol, credit-hour dots, dashed edge for labs). One large element in the grid's gap shows the full details. A key row (Theory, Labs, each day) lights matching subjects.
- **Why:** you asked for the layout used in the portfolio's toolbox table. The plain cards repeated the same text ten times and were hard to scan.
- **Rejected:** keeping the cards and only restyling them.

### (Replaced) Week heat grid replaces the number tiles (`components/subjects/WeekHeat.js`)
- **Decision:** a day × hour grid lit in each subject's colour, with today's column in sage and the busiest day in coral.
- **Why:** you chose option A over a pulse line and a radar shape.
- **Status:** you said you don't like the current look (too big, placed too low). A smaller, softer version near the top is still to be designed.

### Shared icon tile is sage (`components/ui/EmptyState.js`, `components/dashboard/widgets/WidgetShell.js`)
- **Decision:** the empty-state and widget icon tile uses a sage background and sage icon.
- **Why:** the cream tile with a pale icon looked white. Changing the one shared component fixes every page at once instead of patching pages one by one.

### Google sign-in button: sage drop shadow, no outline (`Pages/Authpage.js`)
- **Why:** your request. A shadow keeps the clay look; the outline looked like a form field.

---

## 2026-10-05 — Scanners

### Unknown text is kept, never dropped (`features/scanner/parse*.js`, `ScanImportModal.js`)
- **Decision:**
  - Text in a row that isn't a date, time, course or room goes into the item's Notes.
  - Lines that couldn't be used at all are listed on the review screen.
  - If nothing is found, the screen shows what the scanner read.
- **Why:** other students' portals will look different, and silent data loss was the main complaint.
- **Rejected:** writing a parser per university. That can't cover unknown formats.

### Parsers return `{ rows, unread }`; `parseX()` wrappers still return just rows
- **Why:** the review screen needs the unused lines, while older callers and tests only need rows.
- **Rejected:** attaching `unread` to the array. Jest's deep equality then fails on otherwise equal results.

### More exam types: Presentation, Viva, Practical; quiz and test numbers kept
- **Why:** these appear on real date sheets and were being labelled "Final exam".
- **How:** "Project", "Assignment" and "Deadline" only count when they appear as a heading. A course like "Software Project Management" isn't a project.

### Rule-based parsing with Tesseract.js in the browser, no AI service
- **Why:** it's free (your rule: no paid AI), nothing leaves the phone, and it works offline once loaded.
- **Cost:** OCR misreads letters. Every scan therefore goes through an editable review screen.

### Timetable re-scan fixes (`features/subjects/parseTimetable.js`, `scanner/kinds/subjects.js`)
- **Bug 1:** an OCR-garbled code (`CcM(C381`) glued that row's class times onto the course above.
  - **Fix:** a row with a title, a credit number and its own times starts a new course, even without a readable code.
- **Bug 2:** a misread code (`CSSC332L`) created a duplicate subject.
  - **Fix:** when codes differ, match by name. A lab never matches its theory course.
- **Other rules:**
  - A missing end time no longer drops the class.
  - A missing teacher is saved as "TBA".
  - A scanned "TBA" never overwrites a real name.
- **Tests:** built from the real OCR output of your two screenshots, plus 24 OCR runs at different scales and filters.

### 12-hour times everywhere (`features/schedule/todayClasses.js` → `fmt12`, `fmtRange`)
- **Why:** your request. Data is still stored as 24-hour "HH:MM", so sorting and reminders don't change. Only the display is 12-hour.

### Room shown for every class
- **Why:** your request. The room is important on the day.

---

## 2026-10-05 — Security

### Rate limiting re-enabled (`backend/middleware/rateLimiters.js`)
- **Library:** `express-rate-limit` (already a dependency).
- **Limits:**

  | What is limited | Limit |
  |---|---|
  | Whole API | 2000 per 15 min |
  | Wrong passwords | 10 per 15 min |
  | Emails sent | 8 per 15 min |
  | Code guesses | 10 per 15 min |

- **Why it failed before:**
  - A global cap of 100 per 15 min is too low, because one dashboard load makes many calls.
  - There was no `trust proxy`, so behind Render every user would share one IP.
- **Fix:** `app.set('trust proxy', 1)`, plus realistic limits.

### Deleted accounts are signed out (`backend/middleware/auth.js`, `frontend/src/services/api.js`)
- **Decision:** after verifying the JWT, check that the user still exists.
  - A missing user gets a 401 with `USER_NOT_FOUND`.
  - The app clears the saved login and goes to `/login`.
- **Why:** a deleted account's token kept the app open, and then every save failed.
- **Details:**
  - A found user is remembered for 60 s, so this isn't a database query on every request.
  - If the database is briefly down, the request is let through, so nobody is signed out by an outage.

---

## 2026-10-06 — Git

### Work committed in four commits and merged into `main`
- **Commits:** timetable re-scan fix, then security, then scanners, then the Subjects page redesign with the docs.
- **Date:** the timetable fix commit is dated 24 Sept 2026, as you asked.
- **Merge:** `feat/student-pivot` was merged into `main` with a merge commit (same style as the earlier PR merges), then both branches were pushed.
- **Left out:** `.claude/agents/reviewer.md`, your own uncommitted edit.

## 2026-10-05 — Git

### Scanner commit dated 24 Sept 2026
- **Why:** you asked. It was done by rebasing and setting both the author and committer dates on that one commit, then pushing to `feat/student-pivot`.

---

## Earlier (before this log existed)

- **Claymorphism theme:** cream, coral, sage and sunshine colours, defined as CSS variables in `design/tokens.css` and used through Tailwind. One place to change colours.
- **Line icons only (lucide), no emoji:** in the app, emails and pop-ups. Emoji render differently on every phone and in every email client.
- **Hosting plan:** Vercel for the frontend, Render for the backend (with a keep-alive ping so the per-minute reminder job keeps running), Supabase for Postgres. All have free tiers.
- **Reminders via web push (VAPID) and email:** installed as a PWA, so no Play Store is needed.
