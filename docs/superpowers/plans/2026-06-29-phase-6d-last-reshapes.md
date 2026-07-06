# Phase 6d — Last Reshapes (Study-streaks + Study-hours → DB) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the last two localStorage tools to the DB: **Habits → Study-streaks** and **Time-tracking → Study-hours**. Same additive/compat-hook pattern used for Notes/Goals/Budget: new tables + controllers + `<x>API` + rewritten hooks that return a **compat `state`** so the dashboard widgets keep working.

**Tech Stack:** Node/Express + pg shim; React 19 CRA. **Branch:** `feat/student-pivot`. Backend :5555.

---

### Part A — Study-streaks (Habits → DB)

**Backend** — `HABITS` (id,user_id,name,color) + `HABIT_LOG` (id,habit_id,log_date, UNIQUE(habit_id,log_date)). `habitController`: `getHabits` (→ `[{id,name,color,log:{date:true}}]`), `createHabit{name,color}`, `renameHabit :id {name}`, `deleteHabit :id`, `toggleDay :id/toggle {day}` (delete the log row if present else insert; ownership via habit→user). Routes `GET/POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/toggle`. Mount `/api/habits`.

**Frontend** — `habitAPI`; rewrite `features/habits/useHabits.js` → `{ state:{habits}, loading, addHabit(name,color), renameHabit(id,name), removeHabit(id), toggleDay(id,day), refresh }`. `HabitsPage.js`: swap `dispatch` → methods (ADD→addHabit, RENAME→renameHabit, REMOVE→removeHabit, TOGGLE_DAY→toggleDay); retitle "Study streaks". `HabitsCard.js`: `dispatch(TOGGLE_DAY)`→`toggleDay`. Keep `habitsLogic` (streakFor/weekGrid + test). `en.json` `nav.habits` → "Study streaks".

- [ ] migration → run; controller+routes+mount → `node --check`; commit `feat(db+api): HABITS + HABIT_LOG + /api/habits`.
- [ ] smoke: create habit → toggle today (log has today) → toggle again (removed) → rename → delete. Self-cleaning.
- [ ] frontend: build → OK; commit `feat(fe): Study streaks backed by /api/habits`.

---

### Part B — Study-hours (Time-tracking → DB)

**Key point:** the running stopwatch stays **client-side** (ephemeral); only completed sessions persist.

**Backend** — `STUDY_HOURS` (entry_id,user_id,subject_id NULL,label,seconds,start_time,end_time,entry_date,created_at). `studyHoursController`: `getEntries` (→ `[{id,label,seconds,start,end,date}]` newest first), `createEntry{label,seconds,start,end}`, `removeEntry :id`. Routes `GET/POST /`, `DELETE /:id`. Mount `/api/study-hours`.

**Frontend** — `studyHoursAPI`; rewrite `features/timetrack/useTimetrack.js` → keeps `running` in `useState` (client), loads `entries` from API; returns `{ state:{running,entries}, loading, start(label), stop(nowIso), removeEntry(id), refresh }` (`stop` computes seconds, POSTs the entry, clears running, refreshes). `TimeTrackPage.js`: `dispatch(START)`→`start(label)`, `dispatch(STOP)`→`stop(nowIso)`, `dispatch(REMOVE_ENTRY)`→`removeEntry(id)`; retitle "Study hours". `TimeTrackCard.js` reads compat `state` (no logic change). Keep `timetrackLogic` (totalSeconds/totalsByLabel/formatHMS + test). `en.json` `nav.timetrack` → "Study hours".

- [ ] migration → run; controller+routes+mount → `node --check`; commit `feat(db+api): STUDY_HOURS + /api/study-hours`.
- [ ] smoke: create entry (label,seconds) → GET (present) → delete → gone. Self-cleaning.
- [ ] frontend: build → OK; commit `feat(fe): Study hours backed by /api/study-hours`.

---

### Final
- [ ] `cd frontend && CI=true npm run build` → Compiled; `npx react-scripts test --watchAll=false` → all pass. Browser sanity on `/habits` + `/time`.

## Self-Review
**Spec coverage:** Completes the reshape of the 3 legacy tools (Assignment board already done): Study-streaks + Study-hours now DB-backed. Finishes Phase 6 / the pivot.
**Placeholder scan:** Tables, controller contracts, routes, hook shapes, and page swap points concrete. No placeholders.
**Type/identifier consistency:** Habit `{id,name,color,log:{date:true}}` + streak helpers unchanged → `HabitsCard`/`HabitsPage` keep working via compat `state:{habits}`. Timetrack `{running,entries:[{id,label,seconds,start,end}]}` unchanged shape → `TimeTrackCard` keeps working via compat `state`. Routes match each `<x>API` + mounts `/api/habits`, `/api/study-hours`.
