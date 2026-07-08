# Phase 6c — Assignment Board (Kanban → DB) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the localStorage Kanban into a DB-backed, subject-linked **Assignment board** (To-do / In progress / Done), plus a subject-hub Assignments panel (last hub placeholder). Cards gain a subject + due date.

**Architecture:** New `ASSIGNMENTS` table storing `column_id` ('col-todo'|'col-doing'|'col-done') + `board_order` + subject + due. `assignmentController` = list (optional `?subjectId=`), create, update, move (column+order), delete. Frontend `assignmentAPI` + rewrite `useKanban` → API hook exposing a **compat** `state:{columns,cards}` (fixed columns from `kanbanLogic.EMPTY_STATE`) so the dashboard `KanbanCard` and the page's `cardsByColumn` keep working, plus `addCard/updateCard/removeCard/moveCard`. `KanbanPage` swaps `dispatch` → those methods (keeps the dnd-kit board; drag-end calls `moveCard`), retitled "Assignments", with a subject picker on create and subject/due on cards. A hub `AssignmentsPanel` shows the subject's assignments. Nav label "Assignments".

**Tech Stack:** Node/Express + pg shim; React 19 CRA, @dnd-kit (already installed).
**Branch:** `feat/student-pivot`. Backend on :5555 (restart if down).

---

### Task 1: Table + backend

**Files:** Create `backend/scripts/migrate-assignments.js`, `backend/controllers/assignmentController.js`, `backend/routes/assignmentRoutes.js`; Modify `backend/server.js`.

Migration:
```sql
CREATE TABLE IF NOT EXISTS ASSIGNMENTS (
  assignment_id VARCHAR(50) PRIMARY KEY,
  user_id       VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id    VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  title         VARCHAR(300) NOT NULL,
  note          VARCHAR(1000),
  due_date      DATE,
  column_id     VARCHAR(20) DEFAULT 'col-todo',
  board_order   INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON ASSIGNMENTS(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON ASSIGNMENTS(subject_id);
```

Controller (card → `{id,subjectId,subjectName,subjectColor,title,note,dueDate,columnId,order}`):
- `getAssignments` — LEFT JOIN SUBJECTS; optional `?subjectId=`; order `board_order ASC, created_at ASC`.
- `createAssignment` `{title,note,columnId,subjectId,dueDate}` — verify subject if given; `board_order` = count in that column; default columnId 'col-todo'; 201 `{id}`.
- `updateAssignment` `:id {title,note,subjectId,dueDate}` — COALESCE title; set others.
- `moveAssignment` `PUT /:id/move {columnId,order}` — set column_id + board_order.
- `deleteAssignment` `:id`.

Routes (auth; `/:id/move` before `/:id`): `GET /`, `POST /`, `PUT /:id/move`, `PUT /:id`, `DELETE /:id`. Mount `app.use('/api/assignments', ...)` next to subject-attendance.

- [ ] migration → run; controller+routes+mount → `node --check` OK; commit `feat(db+api): ASSIGNMENTS + /api/assignments`.
- [ ] smoke: create 2 in col-todo (order 0,1) → GET → move #1 to col-doing → GET shows columnId col-doing → update title → delete. Self-cleaning.

---

### Task 2: Frontend — API + hook + page + hub + nav

**Files:** Modify `services/api.js` (`assignmentAPI`); Rewrite `features/kanban/useKanban.js`; Modify `Pages/KanbanPage.js`; Create `components/subjects/AssignmentsPanel.js`; Modify `Pages/SubjectHubPage.js`, `i18n/locales/en.json`. Keep `kanbanLogic.js` (EMPTY_STATE/cardsByColumn + test).

- [ ] **assignmentAPI**: `getAll`, `getForSubject(subjectId)`, `create`, `update`, `move(id,data)`, `remove`.
- [ ] **useKanban rewrite** → `{ state:{columns:EMPTY_STATE.columns, cards}, loading, addCard(columnId,data), updateCard(id,patch), removeCard(id), moveCard(id,toColumnId,toIndex), refresh }` (API-backed; `moveCard` → `assignmentAPI.move`).
- [ ] **KanbanPage**: `const { state, addCard, updateCard, removeCard, moveCard } = useKanban();` Replace each `dispatch({type:...})` with the matching method: ADD_CARD→`addCard(colId,{title})`, MOVE_CARD→`moveCard(active.id,col.id,toIndex)`, REMOVE_CARD→`removeCard(id)`, UPDATE_CARD→`updateCard(editCard.id,{title,note})`. Retitle header "Assignments"/"Plan assignments across your subjects." Add a subject `<select>` (via `useSubjects`) to the create modal (payload `subjectId`) + optional due date; show a subject badge + due on `SortableCard`. (Keep dnd-kit, stat tiles, charts.)
- [ ] **AssignmentsPanel.js** (hub): `useKanban(subjectId)` (subject-scoped). Compact: quick-add (title → `addCard('col-todo',{title,subjectId})`), and list the subject's cards grouped or with a "done" toggle (move to col-done); DeleteButton. EmptyState.
- [ ] **SubjectHubPage**: drop `assignments` from `COMING`; import + render `<AssignmentsPanel subjectId={id} />` after `<AttendancePanel subjectId={id} />`.
- [ ] **en.json**: change `nav.kanban` value to `"Assignments"`.
- [ ] build → `Compiled successfully.`; browser: board loads from DB, add/move a card, subject hub shows its assignments; DOM/API-verify. tests pass. Commit `feat(fe): DB-backed Assignment board + subject-hub panel`.

---

## Self-Review

**Spec coverage:** Implements `ASSIGNMENTS` (§4) + the Assignment-board reshape (§5), subject-linked, filling the last hub placeholder (Phase 6). No unimplemented requirement for this slice.

**Placeholder scan:** Migration SQL, controller contracts, route order, hook shape, and KanbanPage swap points are concrete. No plan placeholders.

**Type/identifier consistency:** Card shape `{id,subjectId,subjectName,subjectColor,title,note,dueDate,columnId,order}` — `columnId` uses the fixed 'col-todo/col-doing/col-done' so `cardsByColumn`/`KanbanCard` (compat `state`) keep working. Hook returns `{state,loading,addCard,updateCard,removeCard,moveCard,refresh}`; every KanbanPage `dispatch` is replaced. Routes `/`, `/:id/move`, `/:id` match `assignmentAPI` + mount `/api/assignments`. Move route precedes `/:id`.
