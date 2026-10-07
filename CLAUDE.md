# FocusFlow: instructions for Claude

Read this first, every session. It is the owner's standing rules for this repository.

## What this is
FocusFlow is a study companion for students (subjects, timetable, attendance, grades/GPA, exams, assignments,
flashcards, notes, goals, habits, budget, reminders). It is a PWA, built and owned by one BSCS student who tests
it daily on Android and is about to let a handful of friends try it. Explain things in plain English, not jargon.

## Layout and commands
- `frontend/`: React 19 (Create React App), Tailwind 3, React Router 7, framer-motion, recharts, i18next, lucide-react.
- `backend/`: Node + Express, PostgreSQL (Supabase) through `pg`, node-cron reminders, web-push, nodemailer (Gmail).
- `decision.md` (every choice, with why and what was rejected) and `flow.md` (how execution moves through the code).
- Backend tests: `cd backend && npm test` (Node's built-in runner; needs Node 21+).
- Frontend tests: `cd frontend && CI=true npm test -- --watchAll=false`.
- Frontend build: `cd frontend && CI=true npm run build`. **`CI=true` turns lint warnings into failures, exactly like Vercel.** An unused variable breaks the deploy.
- Local dev: backend `npm run dev` (port 5555), frontend `npm start`. The frontend calls `/api` on its own address; the dev server proxies it to 5555.

## Hard rules (do not break these)
1. **No emoji, anywhere** (app, emails, notifications, docs the user sees). Use lucide line icons only.
2. **Colours come from design tokens**, never hard-coded: CSS variables in `frontend/src/design/tokens.css` (RGB triplets,
   used as `rgb(var(--brand) / <alpha>)`) mapped in `frontend/tailwind.config.js`. Look before adding a colour.
3. **No paid AI or paid third-party services.** Everything must stay free and rule-based (the scanners use Tesseract.js + regex).
4. **Do not over-engineer.** Smallest change that fully solves the problem; match the surrounding code's style, comment density and naming.
5. **Be sure, then prove it.** Add tests for every pure function and every behaviour you change. Run all suites and the strict build, fix, and run again. Do several rounds. Say plainly what you verified and what you could not.
6. **Security:** the sign-in is an HttpOnly cookie (`ff_session`); never put a token in `localStorage` or in a response body.
   Changes need the `X-Requested-With: FocusFlow` header (the app adds it in `services/api.js`). Every SQL statement uses bound
   parameters and is scoped to `req.user.userId`. Never log or commit secrets. Never commit `.env` files or passwords.
7. **Database changes are additive and idempotent only** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`):
   put them in `backend/config/postgres-init.sql` and a `backend/scripts/migrate-*.js` script. You cannot run migrations
   (no database access). Say clearly in your report that the owner must run the script **before** merging, and make the code
   fail gracefully if it hasn't been run.
8. **Update `decision.md` and `flow.md` with every code change** (what was decided, why, what was rejected; how it flows now).
   Update `README.md` if setup, env vars or features change.
9. **Never touch** `.claude/agents/reviewer.md` or `frontend/public/animations/` unless the task is about them (they are the owner's own edits).
10. Keep each file's existing line endings. Do not reformat unrelated code.

## What you cannot do, and must not try
You have no access to Vercel, Render, Supabase, environment variables, or a phone. So: never invent secrets, never
edit deployment settings, never claim something works "in production". For anything that needs the owner (a migration,
an env var, a dashboard setting, an on-device check) write it in the PR as a numbered **Owner checklist**.
If you can run a headless browser, use it to look at your UI changes; if you cannot, say so and give the owner a short
visual checklist to follow on the Vercel preview link.

## How production works (so you do not break it)
- Frontend on **Vercel**. `frontend/vercel.json` passes `/api/*` to the backend on **Render**, so the app and API share one
  address and the cookie stays first-party. **Never set `REACT_APP_API_URL`.** Database on **Supabase** (free tier).
- Render (free) sleeps when idle; the per-minute reminder job needs it awake. First requests can be slow, and the app already has 503/offline pages for that.
- Pushing to `main` deploys the app. **GitHub Actions** (`.github/workflows/ci.yml`) runs backend tests, frontend tests and the strict build; it must be green.

## Workflow for cloud sessions
1. Branch from `main` as `feat/<short-name>`. **Never push to `main`.** Open a pull request when done.
2. For anything bigger than a small fix, first write a short plan in `docs/superpowers/specs/` (see the existing ones), then implement.
3. Use the subagents in `.claude/agents/` (planner, coder, tester, reviewer) where they help, and have the reviewer check your work before you finish. You may create more.
4. Make several small commits with clear messages rather than one huge one.
5. Finish with a report: what changed; what you verified and how; what you could not verify; the Owner checklist; any risks.
   The PR description should contain the same.

## Gotchas worth knowing
- API calls go through `authFetch` in `frontend/src/services/api.js`. Do not call `fetch` for the API directly.
- Preferences (dashboard layout, workspace name, profile, mascot) live in `frontend/src/preferences/` (versioned in `migrate.js`)
  and sync to the account through `USER_PREFERENCES` (`useServerSync.js`). Anything new that belongs to the user's look and feel should go there.
- Reminders: `backend/services/notificationScheduler.js` runs every minute; `NOTIFICATION_LOG` guarantees one send. Default timezone Asia/Karachi.
- Emails are built in `backend/services/emailTemplates.js` with icon PNGs from `backend/assets/icons` in five tints.
- Mascots: sprite sheets in `frontend/public/mascots`, shown by `components/common/Mascot.js`.
- Light/dark: `ThemeProvider` exists, but dark currently mirrors light (see the comment in `tokens.css`).
- Logout still uses `window.confirm` (known, on the roadmap).
- Jest cannot load `react-router-dom` 7: mock it as `jest.mock("react-router-dom", () => ({...}), { virtual: true })` (see existing tests). CRA resets mocks between tests.
