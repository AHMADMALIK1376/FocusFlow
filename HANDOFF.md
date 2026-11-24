# FocusFlow handoff: where we are

Written for a new Claude that has not seen the earlier conversation. Read this, then `CLAUDE.md` (the owner's
standing rules), then `decision.md` (every choice, with why) and `flow.md` (how code runs). Nothing here is a secret.

## 1. The project and the owner
- FocusFlow is a study companion PWA for students: subjects, timetable, attendance, grades/GPA, exams, assignments,
  flashcards, notes, goals, habits, budget, reminders.
- Owner: one BSCS student, builds and tests it daily on Android, about to let a few friends try it.
  Explain things in plain English, not jargon. Short direct answers when they ask for short ("just tell me this").
- Repo: `AHMADMALIK1376/FocusFlow`. Frontend `frontend/` (React 19, CRA, Tailwind, React Router 7), backend
  `backend/` (Node, Express, Postgres on Supabase, node-cron, web-push, nodemailer).
- Production: frontend on Vercel (it passes `/api/*` to the backend, so the sign-in cookie stays first-party),
  backend on Render free (sleeps when idle), database on Supabase free. Never set `REACT_APP_API_URL`.

## 1b. What we are building, and why
- **What it is:** a study companion for students (school, college, university). Everything is organised around the
  student's **subjects**: each subject ties together its class times, attendance, grades, exams, assignments, notes and
  flashcards. The app tells the student when the next class is, which exam is coming, what the GPA looks like, and
  whether an assignment was handed in. Students can scan a timetable, date sheet or marks screenshot instead of typing
  (free, rule-based: Tesseract.js in the browser plus regex; no AI service).
- **Why students only:** it started as a general productivity app and was deliberately narrowed to one audience
  (spec: `docs/superpowers/specs/2026-06-29-student-focused-pivot-design.md`). Shopping, contacts, mood and events were
  deleted; Kanban became the assignment board, time tracking became study hours, habits became study streaks.
- **Why it is built this way (cloud and hosting):** the owner is a student with no budget, so everything is free tier:
  Vercel (frontend), Render (backend, sleeps when idle), Supabase (Postgres). It is a **PWA**, so friends install it
  from the browser without the Play Store, and it can send reminder pop-ups when closed. No paid AI or paid services,
  by rule. Data is saved per account in the database, so it is the same on phone and laptop.
- **Why Vercel passes `/api` to Render:** so the app and API share one address and the sign-in cookie is first-party
  (no domain purchase needed).
- **Design:** a soft "clay" look (cream, coral, sage, sunshine), line icons only (lucide), no emoji. All colours are
  design tokens in `frontend/src/design/tokens.css`; since PR 10 the student can change them at runtime
  (theme engine + Design Studio, 24 ready-made palettes, contrast guarded). The original visual direction is in
  `docs/superpowers/specs/2026-06-18-frontend-aurora-redesign-design.md`.
- **Why we work with Claude agents:** the owner asked for a repeatable pipeline, so each task goes
  planner -> coder -> tester -> reviewer (`.claude/agents/`), with a written plan first and a reviewer who attacks the
  result. That is a working method, not part of the app.
- **Where the reasons for every choice are:** `decision.md` (what, why, what was rejected) and `flow.md` (how execution
  moves through the code). Read those for any "why did we do X" question.

## 2. How the owner wants work done (from CLAUDE.md, the short version)
- Branch from `main` as `feat/<name>` (or `fix/<name>`), never push to `main`, open a draft PR, several small commits.
- Plan first in `docs/superpowers/specs/` for anything bigger than a small fix. Use the subagents in
  `.claude/agents/` (planner, coder, tester, reviewer) and have the reviewer attack the result.
- No emoji. Colours only from design tokens. No paid services. Smallest change that solves the problem.
- Tests for every behaviour changed; run backend `npm test`, frontend `CI=true npm test -- --watchAll=false` and
  `CI=true npm run build` (CI=true makes lint warnings fail, like Vercel). Say plainly what was and was not verified.
- Database changes are additive and idempotent only; Claude cannot run migrations, so the PR must tell the owner to run
  the script BEFORE merging. Update `decision.md`, `flow.md`, `README.md` with every code change.
- Claude cannot reach Vercel, Render, Supabase, env vars or a phone. Anything needing the owner goes in the PR as a
  numbered Owner checklist. Never invent secrets.
- The owner usually ends a task with "merge it": mark the PR ready, merge with a merge commit, then give the VS Code
  update commands (`git checkout main && git pull origin main`, restart backend and frontend, `npm install` in
  `backend` if packages changed).

## 3. What is finished and merged into `main`
| PR | What |
|---|---|
| 6, 7, 8 | Mascots: picker, header mascots, mascots that follow the cursor (MIT library nilbuild/page-mascot) |
| 9 | Dashboard profile card (full-bleed mascot) and Settings as cards that open pop-ups |
| 10 | Runtime theme engine (`frontend/src/design/theme/`): theme model, `deriveTokens`, contrast guard, cache, preferences v3 |
| 11 | Design Studio (Settings > Appearance > Design your dashboard): 24 ready-made palettes, custom colours, live preview |
| 12 | Theme everywhere: sign-in pages, error and offline pages, themed emails, themed charts, colour-guard test |
| 13 | Theme audit: contrast table (in `decision.md`), badge and status text tokens, `--ring` focus colour, themed answer pages, accessibility fixes, theme cache version 5 |
| 14 | Android app Version 1 screen-flow plan (not part of this conversation; also LMS, responsive and Subject page work landed on `main` from another session) |

Key places: palettes `frontend/src/design/theme/palettes.js`; mascots `frontend/public/mascots/` and
`frontend/src/components/ui/MascotPicker.js`; emails `backend/services/emailTemplates.js`.

## 4. Work in progress: branch `fix/reminders-email-and-session` (URGENT, production reliability)
Pushed to GitHub, 17 commits on top of the old `main` (it does NOT yet include the newer commits on `main`: merge
`origin/main` into it first). **No pull request has been opened yet.** Plan:
`docs/superpowers/specs/2026-10-08-reminders-email-and-session.md`.

The owner reported: (1) no class reminder emails ever arrive, (2) they were signed out although the cookie should last
20 days. Findings from reading the code (the live server could not be reached): Render free sleeps (the reminder cron
only runs while awake), Render free blocks outbound SMTP ports (so no email of any kind leaves production, including
sign-up and reset codes), the reminder was recorded before sending (never retried on failure), catch-up window was only
5 minutes, "email sent" was really "email queued", and three admin endpoints had no login.

What the branch does (all coded and tested by the coders):
- Email providers behind `EMAIL_PROVIDER` (`gmail_api` over HTTPS for production, `smtp` for local); queue returns real
  outcomes; sign-up, resend and forgot-password answer honestly; "Send test email" button in Settings > Reminders.
- Reminders: claim released if nothing delivered; catch-up until the class starts with truthful "starts in N minutes"
  wording; one tick at boot; `GET|POST /api/cron/tick` protected by `CRON_SECRET` for a free external pinger;
  `SYSTEM_HEARTBEAT` table + `backend/scripts/migrate-heartbeat.js`; `GET /api/notify/status` and status lines in Settings.
- Admin endpoints closed (`CRON_SECRET`), queue-clear endpoint removed.
- Sign-out: one detailed log line for every 401, confirm with `/api/auth/me` before signing out, a calm reason line on
  the login page, silent session recovery. Root cause NOT proven; ranked suspects are in `decision.md`.

Test counts when last run: backend 349 pass, frontend 1562 pass, build compiles.

**Still to do on that branch**
1. The tester and reviewer subagents for this work failed with a usage-limit error and never finished: run them again
   (the reviewer must attack it: secrets in logs, header injection, double sends, crashes, sign-out loops).
2. Fix what they find. One known small wording issue: "in 1 minutes" (should be "in 1 minute").
3. Merge `origin/main` into the branch, re-run all suites and the `CI=true` build.
4. Open the draft PR with the Owner checklist (below), then wait for the owner to say "merge it".

**Owner checklist (needs the owner, Claude cannot do it)**
1. Gmail API credentials: Google Cloud project, enable Gmail API, OAuth consent screen set to **In production**
   (a refresh token from a consent screen left in "Testing" dies after 7 days), create the refresh token AFTER
   publishing, scope `gmail.send`.
2. Render env vars (names only): `EMAIL_PROVIDER=gmail_api`, `EMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
   `GMAIL_REFRESH_TOKEN`, `CRON_SECRET`.
3. Run `node backend/scripts/migrate-heartbeat.js` BEFORE merging.
4. Set up a free pinger (cron-job.org with an Authorization header, or UptimeRobot with `?key=`) calling
   `/api/cron/tick` every 5 minutes with a 60 s timeout (details in `README.md`).
5. Press "Send test email" in Settings > Reminders; then add a class starting in about 70 minutes and expect a push
   and an email; check the cookie in Chrome on the phone; if signed out again, copy the `auth 401` line from the Render logs.

## 5. Open decisions waiting for the owner
- The default palette is exempt from the contrast rules (white on coral 2.96:1, grey text on cards 4.46:1) so it looks
  as it always did. Fix it (the default look changes) or keep it?
- Clock digits (gold, accent, cream on the brand gradient) are hard to read on dark palettes (1.2 to 2.4:1). Proposed
  fix: `text-on-brand` digits. Left alone until the owner decides.
- Preview-check list from the theme audit (12 screens in Default, Midnight and Electric Blue) was given to the owner;
  they never reported problems.

## 6. Known limits and risks
- `server.js` exits the process on any unhandled rejection or uncaught exception: every new promise must resolve or be caught.
- A 5-minute pinger keeps Render awake about 744 of its 750 free hours a month.
- Gmail API sending is capped at about 500 messages a day on a personal account.
- `.pipeline/` (planner/coder/tester/reviewer reports) is git-ignored and lives only in the old session's container,
  so those report files are gone; the decisions are all in `decision.md` and `flow.md`.

## 7. First message to give the new Claude
"Read HANDOFF.md, then CLAUDE.md. Check `git log origin/main` and the branch `fix/reminders-email-and-session`.
Tell me in plain English where we stand, then continue with section 4 'Still to do'."
