# Phase 2b — Grades Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface grades in the UI — a live **Grades** panel on the Subject hub (add/edit/delete grade items with the subject's %/letter) and a **Grades** overview page (CGPA ring + per-subject breakdown), wired to the `/api/grades` API from Plan 2a, with a sidebar nav entry.

**Architecture:** Add `gradeAPI` to `services/api.js`. A `useGrades(subjectId)` hook loads/mutates a subject's grade items. A small pure client helper `features/grades/gpa.js` mirrors the backend's `subjectPercent`/`letterFor`/`subjectGrade` so a subject's grade can be shown instantly from its items (jest-tested). A `GradesPanel` component renders on the Subject hub (replacing the "Grades — coming soon" placeholder). A `GradesPage` shows CGPA + a per-subject table from `GET /api/grades/gpa`. Follows the existing DashKit + ui-kit + GoalsPage patterns.

**Tech Stack:** React 19 (CRA), react-router, lucide-react, recharts (already used), the UI kit + DashKit + ProgressRing.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: API + hook + client GPA helper (+ jest test)

**Files:**
- Modify: `frontend/src/services/api.js` (add `gradeAPI`)
- Create: `frontend/src/features/grades/gpa.js`
- Create: `frontend/src/features/grades/gpa.test.js`
- Create: `frontend/src/features/grades/useGrades.js`

- [ ] **Step 1: Add `gradeAPI` to `services/api.js`** (after `subjectAPI`):
```js
export const gradeAPI = {
    getForSubject: async (subjectId) => authFetch(`/grades?subjectId=${subjectId}`),
    getGpa: async () => authFetch('/grades/gpa'),
    create: async (data) => authFetch('/grades', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => authFetch(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: async (id) => authFetch(`/grades/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 2: Create `features/grades/gpa.js`** — mirror the backend scale/formulas, ESM exports:
```js
export const SCALE = [
  { min: 85, letter: 'A', points: 4.0 }, { min: 80, letter: 'A-', points: 3.7 },
  { min: 75, letter: 'B+', points: 3.3 }, { min: 70, letter: 'B', points: 3.0 },
  { min: 67, letter: 'B-', points: 2.7 }, { min: 63, letter: 'C+', points: 2.3 },
  { min: 60, letter: 'C', points: 2.0 }, { min: 55, letter: 'C-', points: 1.7 },
  { min: 50, letter: 'D', points: 1.0 }, { min: 0, letter: 'F', points: 0.0 },
];
export function letterFor(pct) { return SCALE.find((r) => pct >= r.min) || SCALE[SCALE.length - 1]; }
export function subjectPercent(grades) {
  const valid = (grades || []).filter((g) => Number(g.maxScore) > 0);
  if (!valid.length) return null;
  const totalWeight = valid.reduce((s, g) => s + (Number(g.weight) || 0), 0);
  if (totalWeight > 0) {
    const weighted = valid.reduce((s, g) => s + (Number(g.score) / Number(g.maxScore)) * (Number(g.weight) || 0), 0);
    return (weighted / totalWeight) * 100;
  }
  const score = valid.reduce((s, g) => s + Number(g.score), 0);
  const max = valid.reduce((s, g) => s + Number(g.maxScore), 0);
  return max > 0 ? (score / max) * 100 : null;
}
export function subjectGrade(grades) {
  const pct = subjectPercent(grades);
  if (pct == null) return null;
  const { letter, points } = letterFor(pct);
  return { percent: Math.round(pct * 10) / 10, letter, points };
}
```

- [ ] **Step 3: Create `features/grades/gpa.test.js`** (jest, matches CRA test runner):
```js
import { subjectPercent, subjectGrade } from './gpa';
test('points-based percent', () => {
  expect(Math.round(subjectPercent([{ score: 45, maxScore: 50, weight: 0 }, { score: 8, maxScore: 10, weight: 0 }]) * 100) / 100).toBe(88.33);
});
test('weighted percent', () => {
  expect(subjectPercent([{ score: 90, maxScore: 100, weight: 40 }, { score: 80, maxScore: 100, weight: 60 }])).toBe(84);
});
test('grade letter/points', () => {
  expect(subjectGrade([{ score: 90, maxScore: 100, weight: 40 }, { score: 80, maxScore: 100, weight: 60 }])).toEqual({ percent: 84, letter: 'A-', points: 3.7 });
});
test('empty', () => { expect(subjectPercent([])).toBeNull(); expect(subjectGrade([])).toBeNull(); });
```

- [ ] **Step 4: Create `features/grades/useGrades.js`** — loads a subject's grades:
```js
import { useState, useEffect, useCallback } from 'react';
import { gradeAPI } from '../../services/api';
export function useGrades(subjectId) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!subjectId) { setGrades([]); setLoading(false); return; }
    setLoading(true);
    try { setGrades(await gradeAPI.getForSubject(subjectId)); } catch { setGrades([]); } finally { setLoading(false); }
  }, [subjectId]);
  useEffect(() => { refresh(); }, [refresh]);
  const create = useCallback(async (d) => { await gradeAPI.create(d); await refresh(); }, [refresh]);
  const update = useCallback(async (id, d) => { await gradeAPI.update(id, d); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await gradeAPI.remove(id); await refresh(); }, [refresh]);
  return { grades, loading, refresh, create, update, remove };
}
```

- [ ] **Step 5:** `cd frontend && CI=true npx react-scripts test --watchAll=false src/features/grades 2>&1 | grep -E "Tests:|FAIL"` → grades tests pass. Then `git add -A && git commit -m "feat(fe): gradeAPI + useGrades + client GPA helper"`.

---

### Task 2: Grades panel on the Subject hub

**Files:**
- Create: `frontend/src/components/subjects/GradesPanel.js`
- Modify: `frontend/src/Pages/SubjectHubPage.js` (render `<GradesPanel subjectId={id} />`; drop the `grades` placeholder from `COMING`)

**GradesPanel spec:** uses `useGrades(subjectId)`. Header "Grades" with a right-side badge showing `subjectGrade(grades)` → `percent% · letter` (or "—" if none) and an **Add grade** button. Lists items (title, category, `score/maxScore`, `weight%`) each with edit (pencil) + `DeleteButton`. EmptyState when none. Add/Edit `Modal`: title (required), category `Select` (Quiz/Assignment/Midterm/Final/Project/Other), score (number), maxScore (number), weight % (number), graded date (`type=date`). Save → `create({subjectId,...})` or `update(id,{...})`.

- [ ] **Step 1: Create `GradesPanel.js`** per spec (DashKit `Panel`, ui `Button/Input/Select/Modal/EmptyState/DeleteButton/Badge`, `subjectGrade` from `../../features/grades/gpa`, `useGrades` from `../../features/grades/useGrades`).
- [ ] **Step 2: Edit `SubjectHubPage.js`** — remove the `{ key: "grades", ... }` entry from `COMING`, import `GradesPanel`, and render `<GradesPanel subjectId={id} />` above the remaining placeholder grid (only when `subject` is loaded).
- [ ] **Step 3:** `cd frontend && CI=true npm run build 2>&1 | grep -E "Compiled|Failed|Error"` → `Compiled successfully.`
- [ ] **Step 4:** Browser: open a subject hub, add a grade, see it listed and the header %/letter update; screenshot.
- [ ] **Step 5:** `git add -A && git commit -m "feat(fe): live Grades panel on the subject hub"`.

---

### Task 3: Grades overview page + route + nav

**Files:**
- Create: `frontend/src/Pages/GradesPage.js`
- Modify: `frontend/src/App.js` (lazy import + `/grades` route)
- Modify: `frontend/src/components/layout/navItems.js` (entry after `subjects`)
- Modify: `frontend/src/components/layout/navIcons.js` (icon)
- Modify: `frontend/src/i18n/locales/en.json` (`nav.grades`)

**GradesPage spec:** fetch `gradeAPI.getGpa()` on mount. Header "Grades". Left `Panel` with a `ProgressRing` where value = `cgpa/4*100`, center shows CGPA (e.g. "3.30") + "CGPA". Stat row: CGPA · Graded credits (`totalCredits`) · Subjects graded (`subjects.filter(s=>s.letter).length`). A `Panel` "By subject" with a table/list: color dot, name+code, itemCount, percent, letter Badge, points; rows link to `/subjects/:subjectId`. EmptyState if no graded subjects. Loading/error handling like SubjectsPage.

- [ ] **Step 1: Create `GradesPage.js`** per spec.
- [ ] **Step 2: Edit `App.js`** — `const GradesPage = lazy(() => import("./Pages/GradesPage"));` and `<Route path="/grades" element={<GradesPage />} />`.
- [ ] **Step 3: Edit `navItems.js`** — add `{ id: 'grades', path: '/grades', labelKey: 'nav.grades', icon: '📊' }` after the `subjects` entry.
- [ ] **Step 4: Edit `navIcons.js`** — add `Award` (or `BarChart3`, already imported) to lucide import if needed and `grades: Award` to `ICON_BY_ID`.
- [ ] **Step 5: Edit `en.json`** — add `"grades": "Grades"` in the `nav` object.
- [ ] **Step 6:** build → `Compiled successfully.`
- [ ] **Step 7:** Browser: `/grades` shows the CGPA ring + per-subject rows; screenshot.
- [ ] **Step 8:** `git add -A && git commit -m "feat(fe): Grades overview page (CGPA + per-subject) + nav"`.

---

### Task 4: Final verification

- [ ] **Step 1:** `cd frontend && CI=true npm run build` → `Compiled successfully.`
- [ ] **Step 2:** `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"` → all pass (previous 195 + the new grades helper tests; no failures).
- [ ] **Step 3:** Browser sanity: add a grade on a subject hub → it appears there AND the `/grades` CGPA updates. Final screenshot.

---

## Self-Review

**Spec coverage:** Completes the spec's Grades/GPA feature (§5) on the frontend: per-subject grade management on the hub + a cross-subject CGPA overview, on the Plan 2a API. Grading scale is the shared default. No 2b requirement unimplemented.

**Placeholder scan:** `gradeAPI`, `useGrades`, and the client `gpa.js` are full code; the panel and pages are specified by structure + exact component list + payload shapes + exact route/nav/i18n edits (full JSX written in the build, following GoalsPage/SubjectsPage). The remaining hub "coming soon" panels (attendance/assignments/notes/flashcards) are intentional product placeholders for later phases.

**Type/identifier consistency:** Grade shape `{id,subjectId,title,category,score,maxScore,weight,gradedDate}` matches the Plan 2a API. The client `gpa.js` uses the same field names (`score`,`maxScore`,`weight`) and mirrors the backend formulas/scale exactly, so hub display matches the server's `/grades/gpa`. `useGrades` returns `{grades,loading,refresh,create,update,remove}` used by `GradesPanel`. Nav id `grades` is consistent across `navItems`, `navIcons` (`ICON_BY_ID.grades`), and `nav.grades`. Route `/grades` (overview) does not collide with `/grades/gpa` (that's a backend API path, not a frontend route).
