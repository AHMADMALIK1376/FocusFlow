# Phase 4a — Migrate Notes to the Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Notes from browser localStorage to a DB-backed `/api/notes` (per-account, cross-device), keeping the existing Notes page UX (title + markdown-lite body + preview + activity chart).

**Architecture:** New `NOTES` table (subject_id nullable for future hub tagging). `noteController` follows `subjectController`. The frontend swaps the localStorage reducer hook for an API-backed `useNotes` returning `{notes,loading,refresh,create,update,remove}`; `NotesPage` handlers call those. The pure `notesLogic.renderInline` (markdown-lite) is kept and reused. Old localStorage notes are not migrated (fresh DB start) — acceptable since only demo data existed.

**Tech Stack:** Node/Express + pg shim; React 19 CRA.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: NOTES table + backend

**Files:** Create `backend/scripts/migrate-notes.js`, `backend/controllers/noteController.js`, `backend/routes/noteRoutes.js`; Modify `backend/server.js`.

Migration SQL (mirror `migrate-exams.js`):
```sql
CREATE TABLE IF NOT EXISTS NOTES (
  note_id    VARCHAR(50) PRIMARY KEY,
  user_id    VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title      VARCHAR(300),
  body       TEXT,
  is_pinned  SMALLINT DEFAULT 0,
  color      VARCHAR(20),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON NOTES(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON NOTES(subject_id);
```

Controller methods (map row → `{id,subjectId,title,body,isPinned,color,updatedAt,createdAt}`):
- `getNotes` — optional `?subjectId=`; order `is_pinned DESC, updated_at DESC`.
- `createNote` — body `{subjectId,title,body,color}`; defaults title 'Untitled', body ''; 201 `{success,id}`.
- `updateNote` — `:id` scoped; COALESCE title/body/is_pinned; `updated_at = CURRENT_TIMESTAMP`; set subject_id/color.
- `deleteNote` — `:id` scoped.

Routes (all auth): `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`. Mount `app.use('/api/notes', noteRoutes)` in server.js (next to exams).

- [ ] **Step 1:** write migration; run `node backend/scripts/migrate-notes.js` → `notes table: notes` + ready.
- [ ] **Step 2:** write controller + routes + mount; `node --check` the three files → OK.
- [ ] **Step 3:** commit `feat(db+api): NOTES table + /api/notes CRUD`.
- [ ] **Step 4:** smoke test: login → POST a note → GET list (contains it) → PUT (change title/body) → GET shows update + newer updatedAt → DELETE → gone. Self-cleaning.

---

### Task 2: Frontend migration (API hook + page)

**Files:** Modify `services/api.js` (add `noteAPI`); Rewrite `features/notes/useNotes.js`; Modify `Pages/NotesPage.js` (handlers + data source). Keep `features/notes/notesLogic.js` (renderInline still used; reducer retained for its existing test).

- [ ] **Step 1: `noteAPI`** in api.js (after examAPI): `getAll`, `getForSubject`, `create`, `update`, `remove` (same shape as `gradeAPI`, path `/notes`).

- [ ] **Step 2: Rewrite `useNotes.js`** → API-backed:
```js
import { useState, useEffect, useCallback } from 'react';
import { noteAPI } from '../../services/api';
export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setNotes(await noteAPI.getAll()); } catch { setNotes([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const create = useCallback(async (d) => { const r = await noteAPI.create(d); await refresh(); return r.id; }, [refresh]);
  const update = useCallback(async (id, d) => { await noteAPI.update(id, d); await refresh(); }, [refresh]);
  const remove = useCallback(async (id) => { await noteAPI.remove(id); await refresh(); }, [refresh]);
  return { notes, loading, refresh, create, update, remove };
}
```

- [ ] **Step 3: Update `NotesPage.js`**:
  - Change import to `const { notes, loading, create, update, remove } = useNotes();` and `import { renderInline } from "../features/notes/notesLogic";` (drop `selectSorted`; API returns sorted). Use `notes` directly (drop the `selectSorted(state)` call).
  - `startNew`: open a blank editor — `setEditing(true); setSelectedId(null); setEditTitle(""); setEditBody(""); setPreview(false);`
  - `saveEdit`: `if (selectedId) { await update(selectedId, { title: editTitle, body: editBody }); setEditing(false); } else { const id = await create({ title: editTitle || "Untitled", body: editBody }); setSelectedId(id); setEditing(false); }`
  - `deleteNote`: `await remove(id); if (selectedId === id) { setSelectedId(null); setEditing(false); }`
  - Keep stats/activity/chart/list/editor markup unchanged (all read from `notes`, note shape unchanged: `{id,title,body,updatedAt}`).

- [ ] **Step 4:** `cd frontend && CI=true npm run build` → `Compiled successfully.`
- [ ] **Step 5:** Browser: `/notes` — create a note (Save), edit it, delete it; confirm persistence via a reload (data comes from DB). DOM-verify title/body.
- [ ] **Step 6:** `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"` → all pass (notesLogic test still green).
- [ ] **Step 7:** commit `feat(fe): Notes backed by /api/notes (DB migration)`.

---

## Self-Review

**Spec coverage:** Implements the spec's `NOTES` table (§4) + Notes → DB migration (§5, "Migrated to DB"). Subject tagging column exists for the future hub Notes panel; the page keeps its current general-notes UX. No 4a requirement unimplemented.

**Placeholder scan:** Migration SQL, controller contracts, `noteAPI`, `useNotes` are concrete/full; the NotesPage edits are exact handler replacements. No plan placeholders.

**Type/identifier consistency:** Note API shape `{id,subjectId,title,body,isPinned,color,updatedAt,createdAt}` matches controller + hook + page (page uses `id,title,body,updatedAt`). `useNotes` now returns `{notes,loading,refresh,create,update,remove}` — every consumer in NotesPage is updated to match (no leftover `state`/`dispatch`). Column names (`note_id,is_pinned,updated_at`) consistent across migration, SQL, mapper. `noteAPI` path `/notes` matches the server mount.
