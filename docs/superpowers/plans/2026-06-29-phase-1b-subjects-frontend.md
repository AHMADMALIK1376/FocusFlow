# Phase 1b — Subjects Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Subjects spine visible and usable — a Subjects list/grid page (create/edit/delete subjects with their weekly schedule) and a Subject hub page (one subject's details), wired to the `/api/subjects` API from Plan 1a, with a sidebar nav entry.

**Architecture:** Add a `subjectAPI` to the existing `services/api.js` client (token from `localStorage.focus_token`, base `REACT_APP_API_URL || http://localhost:5555`). A `useSubjects()` hook loads/creates/updates/deletes via that client and exposes `{subjects, loading, error, refresh, create, update, remove}`. Two pages follow the existing `GoalsPage` pattern (`PageShell`/`PageHeader`/`StatTile`/`Panel` from `DashKit`, UI kit from `components/ui`). Routing + nav follow the existing lazy-route + `navItems`/`navIcons` pattern. Indigo Night theme via existing tokens.

**Tech Stack:** React 19 (CRA), react-router-dom, lucide-react icons, the project UI kit + DashKit.

**Branch:** `feat/student-pivot`. Backend running on :5555.

**Commands note:** Bash tool (Git Bash) from repo root. Frontend verification uses the preview workflow (dev server) against the live backend.

---

### Task 1: API client + `useSubjects` hook

**Files:**
- Modify: `frontend/src/services/api.js` (add `subjectAPI`)
- Create: `frontend/src/features/subjects/useSubjects.js`

- [ ] **Step 1: Add `subjectAPI` to `frontend/src/services/api.js`** (insert after the `calendarAPI` export block)

```js
// ==============================================
// SUBJECT APIs
// ==============================================
export const subjectAPI = {
    getAll: async () => authFetch('/subjects'),
    get: async (id) => authFetch(`/subjects/${id}`),
    create: async (data) => authFetch('/subjects', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/subjects/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 2: Create `frontend/src/features/subjects/useSubjects.js`**

```js
import { useState, useEffect, useCallback } from 'react';
import { subjectAPI } from '../../services/api';

// Loads + mutates the user's subjects through the API.
export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subjectAPI.getAll();
      setSubjects(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data) => { await subjectAPI.create(data); await refresh(); }, [refresh]);
  const update = useCallback(async (id, data) => { await subjectAPI.update(id, data); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await subjectAPI.remove(id); await refresh(); }, [refresh]);

  return { subjects, loading, error, refresh, create, update, remove };
}
```

- [ ] **Step 3: Build to confirm no import/compile errors**

Run: `cd frontend && CI=true npm run build 2>&1 | grep -E "Compiled|Failed|Error"`
Expected: `Compiled successfully.`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api.js frontend/src/features/subjects/useSubjects.js
git commit -m "feat(fe): subjectAPI client + useSubjects hook"
```

---

### Task 2: Subjects list page + route + nav

**Files:**
- Create: `frontend/src/Pages/SubjectsPage.js`
- Modify: `frontend/src/App.js` (lazy import + `/subjects` route)
- Modify: `frontend/src/components/layout/navItems.js` (add entry)
- Modify: `frontend/src/components/layout/navIcons.js` (add icon)
- Modify: `frontend/src/i18n/locales/en.json` (add `nav.subjects`)

**SubjectsPage spec** (mirror `GoalsPage` structure):
- `PageShell` + `PageHeader title="Subjects" subtitle="Your courses this term — schedule, grades, attendance and more in one place."` with a primary **Add subject** button (opens modal).
- Stat row (`StatTile`): Total subjects · Total credit hours (sum `creditHours`) · Classes/week (sum of `schedule.length`) · Active term (most common `term`).
- Loading: show a short "Loading subjects…" line while `loading`. Error: red `error` text with a Retry button calling `refresh`.
- Empty: `EmptyState icon="📚" title="No subjects yet" description="Add your first course to get started"`.
- Grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) of subject cards. Each card: left color stripe using `subject.color || 'var(--brand)'`; `code` (Pill) + `name` (bold); `instructor`; a one-line schedule summary (e.g., "Mon 09:00, Wed 11:00"); credits + term footer; clicking the card body navigates `/subjects/:id`; an Edit (pencil) button (opens modal prefilled) and a `DeleteButton` (calls `remove(id)` after a window.confirm).
- **Add/Edit modal** (`Modal` from ui kit): fields — name (required), code, color (an `<input type="color">` or a small swatch row), instructor, creditHours (number), term, targetGrade; plus a **schedule editor**: list of rows each with day (`Select` Mon–Sun), start (`<input type="time">`), end (time), room (text), and a remove-row button; an "Add time slot" button appends an empty row. Save calls `create(payload)` or `update(id, payload)` then closes; payload shape `{ name, code, color, instructor, creditHours: Number, term, targetGrade, schedule: [{day,start,end,room}] }`.

- [ ] **Step 1: Create `frontend/src/Pages/SubjectsPage.js`** implementing the spec above using `useSubjects`, `PageShell/PageHeader/StatTile/Panel`, and `Button/Input/Select/Modal/EmptyState/DeleteButton/Pill` from `../components/ui`. Use `useNavigate` for card → `/subjects/:id`.

- [ ] **Step 2: Add lazy import + route in `frontend/src/App.js`**

Add near the other page lazy imports:
```js
const SubjectsPage = lazy(() => import("./Pages/SubjectsPage"));
```
Add inside the protected `<Route>` group (next to `/notes` etc.):
```jsx
                        <Route path="/subjects" element={<SubjectsPage />} />
```

- [ ] **Step 3: Add the nav entry in `frontend/src/components/layout/navItems.js`** (insert right after the `dashboard` item)

```js
  { id: 'subjects', path: '/subjects', labelKey: 'nav.subjects', icon: '📚' },
```

- [ ] **Step 4: Add the nav icon in `frontend/src/components/layout/navIcons.js`** — add `GraduationCap` to the lucide import list and add to `ICON_BY_ID`:

```js
  subjects: GraduationCap,
```

- [ ] **Step 5: Add the label to `frontend/src/i18n/locales/en.json`** — add `"subjects": "Subjects"` inside the `nav` object.

- [ ] **Step 6: Build**

Run: `cd frontend && CI=true npm run build 2>&1 | grep -E "Compiled|Failed|Error"`
Expected: `Compiled successfully.`

- [ ] **Step 7: Verify in the browser (preview workflow)** — start the frontend dev server, log in as the seeded user (`ahmadmalik1376@gmail.com` / `411711376`) against the live backend on :5555, navigate to `/subjects`, add a subject with one schedule slot, confirm the card appears, then screenshot.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(fe): Subjects list page with create/edit/delete + nav"
```

---

### Task 3: Subject hub page + route

**Files:**
- Create: `frontend/src/Pages/SubjectHubPage.js`
- Modify: `frontend/src/App.js` (lazy import + `/subjects/:id` route)

**SubjectHubPage spec:**
- Reads `:id` via `useParams`; loads the one subject with `subjectAPI.get(id)` in local state (loading/error handling). Back link to `/subjects`.
- Header: subject `name`, `code` Pill, `instructor`, `term`, credits; Edit + Delete actions (Delete → `subjectAPI.remove` then navigate `/subjects`).
- A "Class schedule" `Panel`: table/list of the subject's schedule slots (day, start–end, room) or an EmptyState if none.
- Placeholder `Panel`s for the cross-feature sections to be filled by later phases: **Grades**, **Attendance**, **Notes**, **Assignments**, **Flashcards** — each a titled Panel with a muted "Coming soon" line. (These become live in Phases 2–5.)

- [ ] **Step 1: Create `frontend/src/Pages/SubjectHubPage.js`** per the spec, using `useParams`/`useNavigate`, `subjectAPI`, and DashKit/ui components.

- [ ] **Step 2: Add lazy import + route in `frontend/src/App.js`**

```js
const SubjectHubPage = lazy(() => import("./Pages/SubjectHubPage"));
```
```jsx
                        <Route path="/subjects/:id" element={<SubjectHubPage />} />
```

- [ ] **Step 3: Build**

Run: `cd frontend && CI=true npm run build 2>&1 | grep -E "Compiled|Failed|Error"`
Expected: `Compiled successfully.`

- [ ] **Step 4: Verify in the browser** — from `/subjects`, click a subject card → lands on `/subjects/:id` showing details + schedule + the "coming soon" sections. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(fe): Subject hub page (details + schedule + section placeholders)"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full build** — `cd frontend && CI=true npm run build` → `Compiled successfully.`
- [ ] **Step 2: Test suite** — `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"` → all pass (still 16 suites; no tests reference subjects yet).
- [ ] **Step 3: Browser sanity** — `/subjects` lists subjects; add/edit/delete works; card → hub works. Final screenshot for the user.

---

## Self-Review

**Spec coverage:** Implements the frontend half of the spec's "Subjects hub" (§3 nav entry, §5 Subjects hub behavior) on top of Plan 1a's API. Per-subject cross-feature data (grades/attendance/notes/assignments/flashcards) is represented as labeled placeholders to be filled by Phases 2–5 — consistent with the additive strategy. No Plan 1b requirement is left unimplemented.

**Placeholder scan:** `subjectAPI` and `useSubjects` are given as complete code. The two pages are specified by structure + exact component list + payload shape + exact route/nav/i18n edits (full JSX is written during the build, following the in-repo `GoalsPage` pattern to avoid duplicating ~200 lines here). The "Coming soon" panels are intentional product placeholders (future phases), not plan placeholders.

**Type/identifier consistency:** The hook returns `{subjects, loading, error, refresh, create, update, remove}` consumed by both pages. The subject object shape (`id, name, code, color, instructor, creditHours, term, targetGrade, isArchived, schedule[{id,day,start,end,room}]`) matches the Plan 1a API exactly. The create/update payload (`{name, code, color, instructor, creditHours, term, targetGrade, schedule}`) matches the controller's expected body. Route path `/subjects/:id` matches the hub's `useParams` and the list page's navigate target. Nav id `subjects` is consistent across `navItems`, `navIcons` (`ICON_BY_ID.subjects`), and the `nav.subjects` i18n key.
