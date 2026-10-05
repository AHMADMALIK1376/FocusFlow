# Decision log

Every meaningful code or design choice made while building FocusFlow with Claude, newest first.
Each entry: what was decided, the reason, and what was rejected.
Update this file with every change.

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
