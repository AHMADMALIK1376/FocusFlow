# Phase 3b — Exams & Deadlines Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An **Exams & Deadlines** agenda page (items grouped Overdue / Today / This week / Later + Done, with live countdowns), a sidebar nav entry, and a compact **Upcoming** panel on the Subject hub — wired to `/api/exams` from Plan 3a.

**Architecture:** Add `examAPI` to `services/api.js`. `useExams(subjectId?)` loads/mutates exam items. A pure `features/exams/examsLogic.js` provides `daysUntil`, `countdownLabel`, `groupExams` (jest-tested). `ExamsPage` renders the grouped agenda; `ExamsPanel` (subject hub) shows that subject's upcoming items. Follows the DashKit + ui-kit + GoalsPage/GradesPanel patterns.

**Tech Stack:** React 19 (CRA), react-router, lucide-react, UI kit + DashKit.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: API + hook + logic (+ jest test)

**Files:** Modify `services/api.js` (add `examAPI`); Create `features/exams/examsLogic.js`, `features/exams/examsLogic.test.js`, `features/exams/useExams.js`.

- [ ] **Step 1: `examAPI`** (after `gradeAPI`):
```js
export const examAPI = {
    getAll: async () => authFetch('/exams'),
    getForSubject: async (subjectId) => authFetch(`/exams?subjectId=${subjectId}`),
    create: async (data) => authFetch('/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggle: async (id) => authFetch(`/exams/${id}/toggle`, { method: 'PUT' }),
    remove: async (id) => authFetch(`/exams/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 2: `features/exams/examsLogic.js`**:
```js
export function daysUntil(dateStr, today = new Date()) {
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d - t) / 86400000);
}
export function countdownLabel(dateStr, today = new Date()) {
  const n = daysUntil(dateStr, today);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `in ${n} days` : `${Math.abs(n)} days ago`;
}
export function groupExams(exams, today = new Date()) {
  const g = { overdue: [], today: [], week: [], later: [], done: [] };
  for (const e of exams || []) {
    if (e.isDone) { g.done.push(e); continue; }
    const n = daysUntil(e.date, today);
    if (n < 0) g.overdue.push(e);
    else if (n === 0) g.today.push(e);
    else if (n <= 7) g.week.push(e);
    else g.later.push(e);
  }
  return g;
}
```

- [ ] **Step 3: `features/exams/examsLogic.test.js`** (jest), fixed `today = new Date('2026-07-01T12:00:00')`:
```js
import { daysUntil, countdownLabel, groupExams } from './examsLogic';
const T = new Date('2026-07-01T12:00:00');
test('daysUntil', () => { expect(daysUntil('2026-07-04', T)).toBe(3); expect(daysUntil('2026-06-29', T)).toBe(-2); });
test('countdownLabel', () => {
  expect(countdownLabel('2026-07-01', T)).toBe('Today');
  expect(countdownLabel('2026-07-02', T)).toBe('Tomorrow');
  expect(countdownLabel('2026-07-08', T)).toBe('in 7 days');
  expect(countdownLabel('2026-06-30', T)).toBe('Yesterday');
});
test('groupExams', () => {
  const g = groupExams([
    { date: '2026-06-28', isDone: false }, { date: '2026-07-01', isDone: false },
    { date: '2026-07-05', isDone: false }, { date: '2026-07-20', isDone: false },
    { date: '2026-07-03', isDone: true },
  ], T);
  expect(g.overdue.length).toBe(1); expect(g.today.length).toBe(1);
  expect(g.week.length).toBe(1); expect(g.later.length).toBe(1); expect(g.done.length).toBe(1);
});
```

- [ ] **Step 4: `features/exams/useExams.js`** — `{exams,loading,refresh,create,update,toggle,remove}`; loads `examAPI.getForSubject(subjectId)` when `subjectId` given else `examAPI.getAll()`; each mutation calls the API then `refresh()`.

- [ ] **Step 5:** `cd frontend && CI=true npx react-scripts test --watchAll=false src/features/exams 2>&1 | grep -E "Tests:|FAIL"` → pass. Commit `feat(fe): examAPI + useExams + exams logic`.

---

### Task 2: Exams & Deadlines page + route + nav

**Files:** Create `Pages/ExamsPage.js`; Modify `App.js`, `navItems.js`, `navIcons.js`, `i18n/locales/en.json`.

**ExamsPage spec:** `useExams()` + `useSubjects()` (for the subject dropdown). Header "Exams & Deadlines" + Add button. Stat row: Upcoming (overdue+today+week+later count) · This week · Overdue · Done. Render sections in order **Overdue** (focus/red heading), **Today**, **This week**, **Later**, **Done** (only non-empty). Each row: a checkbox (`toggle`), a colored dot + subject name (or "General"), title, type `Badge`, right side shows `countdownLabel(date)` + the date/time; edit + `DeleteButton`; done items are struck through. Add/Edit `Modal`: title (required), type `Select` (Exam/Quiz/Deadline/Submission/Assignment), subject `Select` (optional → "General"), date (`type=date`, required), time (`type=time`), location, notes (`Textarea`). EmptyState when no items.

- [ ] **Step 1: Create `ExamsPage.js`** per spec.
- [ ] **Step 2: `App.js`** — `const ExamsPage = lazy(() => import("./Pages/ExamsPage"));` + `<Route path="/exams" element={<ExamsPage />} />`.
- [ ] **Step 3: `navItems.js`** — add `{ id: 'exams', path: '/exams', labelKey: 'nav.exams', icon: '⏰' }` after `grades`.
- [ ] **Step 4: `navIcons.js`** — add `CalendarClock` to lucide import + `exams: CalendarClock` to `ICON_BY_ID`.
- [ ] **Step 5: `en.json`** — add `"exams": "Exams & Deadlines"` in `nav`.
- [ ] **Step 6:** build → `Compiled successfully.`
- [ ] **Step 7:** Browser: `/exams` — add an exam + a deadline; confirm they group correctly with countdowns; toggle one done; screenshot.
- [ ] **Step 8:** commit `feat(fe): Exams & Deadlines agenda page + nav`.

---

### Task 3: Upcoming panel on the Subject hub

**Files:** Create `components/subjects/ExamsPanel.js`; Modify `Pages/SubjectHubPage.js` (render `<ExamsPanel subjectId={id} />`; drop the `assignments` placeholder? No — keep placeholders; add exams panel below GradesPanel).

**ExamsPanel spec:** `useExams(subjectId)`. Panel title "Exams & Deadlines" + Add (pre-fills this subject). Shows this subject's **not-done** items sorted by date with `countdownLabel`; toggle done + delete; EmptyState when none. Reuses the same add modal fields minus the subject select (subject fixed).

- [ ] **Step 1: Create `ExamsPanel.js`**.
- [ ] **Step 2: Edit `SubjectHubPage.js`** — import + render `<ExamsPanel subjectId={id} />` right after `<GradesPanel subjectId={id} />`.
- [ ] **Step 3:** build → `Compiled successfully.`
- [ ] **Step 4:** Browser: subject hub shows the Upcoming panel with the subject's items; screenshot.
- [ ] **Step 5:** commit `feat(fe): exams panel on subject hub`.

---

### Task 4: Final verification

- [ ] Build → `Compiled successfully.`
- [ ] `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"` → all pass (previous + new exams-logic tests).
- [ ] Browser sanity: add exam on `/exams` with a subject → appears both on `/exams` (grouped) and on that Subject hub's Upcoming panel. Final screenshot.

---

## Self-Review

**Spec coverage:** Completes Exams & Deadlines (§5, replaces Events) on the frontend: a countdown agenda + per-subject hub panel, on the Plan 3a API. No 3b requirement unimplemented.

**Placeholder scan:** `examAPI`, `useExams`, `examsLogic` are full code; pages/panels are specified by structure + component list + payload + exact route/nav/i18n edits (full JSX in the build, following GradesPage/GradesPanel). Remaining hub placeholders (attendance/assignments/notes/flashcards) are intentional future-phase product placeholders.

**Type/identifier consistency:** Exam shape `{id,subjectId,subjectName,subjectColor,title,type,date,time,location,notes,isDone}` matches the Plan 3a API. `useExams` returns `{exams,loading,refresh,create,update,toggle,remove}` used by page + panel. `groupExams` buckets (`overdue,today,week,later,done`) are consistent between logic, test, and page. Nav id `exams` consistent across `navItems`, `navIcons` (`ICON_BY_ID.exams`), `nav.exams`. Payload `{subjectId,title,type,date,time,location,notes}` matches the controller body.
