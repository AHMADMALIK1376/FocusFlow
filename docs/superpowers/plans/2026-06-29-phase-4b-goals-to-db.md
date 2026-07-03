# Phase 4b — Migrate Goals to the Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Goals (goals + milestones) from localStorage to a DB-backed `/api/goals`, keeping the existing GoalsPage UX (list, progress ring/chart, per-goal milestones).

**Architecture:** `GOALS` + `GOAL_MILESTONES` tables. `goalController` = goals CRUD + milestone ops (add/toggle/remove) with ownership checks (milestone → goal → user). Frontend swaps the localStorage reducer `useGoals` for an API-backed hook exposing `{goals,loading,refresh,createGoal,removeGoal,createMilestone,toggleMilestone,removeMilestone}`; `GoalsPage` handlers call those. The pure `goalsLogic.goalProgress/overallProgress` are kept (they read `goal.milestones[].done`, unchanged shape). Old localStorage goals are not migrated (fresh DB start).

**Tech Stack:** Node/Express + pg shim; React 19 CRA.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: Tables + backend

**Files:** Create `backend/scripts/migrate-goals.js`, `backend/controllers/goalController.js`, `backend/routes/goalRoutes.js`; Modify `backend/server.js`.

Migration SQL:
```sql
CREATE TABLE IF NOT EXISTS GOALS (
  goal_id      VARCHAR(50) PRIMARY KEY,
  user_id      VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  description  VARCHAR(1000),
  target_date  DATE,
  is_completed SMALLINT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS GOAL_MILESTONES (
  milestone_id VARCHAR(50) PRIMARY KEY,
  goal_id      VARCHAR(50) NOT NULL REFERENCES GOALS(goal_id) ON DELETE CASCADE,
  title        VARCHAR(300) NOT NULL,
  is_done      SMALLINT DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON GOALS(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal ON GOAL_MILESTONES(goal_id);
```

Controller methods (goal → `{id,title,description,targetDate,isCompleted,createdAt,milestones:[{id,title,done,sortOrder}]}`):
- `getGoals` — goals for user ordered by created_at ASC + milestones (join, ordered sort_order/created_at), grouped.
- `createGoal` `{title,description,targetDate}` → 201 `{success,id}`.
- `updateGoal` `:id` — COALESCE title; set description/target_date/is_completed.
- `deleteGoal` `:id` — cascade milestones.
- `addMilestone` `POST /:id/milestones {title}` — verify goal ownership; sort_order = current count; 201 `{success,id}`.
- `toggleMilestone` `PUT /milestones/:milestoneId/toggle` — ownership via join; `is_done = 1 - is_done`.
- `removeMilestone` `DELETE /milestones/:milestoneId` — ownership via join.

Routes (all auth) — **milestone routes before `/:id`**:
```js
router.get('/', authMiddleware, goalController.getGoals);
router.post('/', authMiddleware, goalController.createGoal);
router.post('/:id/milestones', authMiddleware, goalController.addMilestone);
router.put('/milestones/:milestoneId/toggle', authMiddleware, goalController.toggleMilestone);
router.delete('/milestones/:milestoneId', authMiddleware, goalController.removeMilestone);
router.put('/:id', authMiddleware, goalController.updateGoal);
router.delete('/:id', authMiddleware, goalController.deleteGoal);
```
Mount `app.use('/api/goals', goalRoutes)` next to notes.

- [ ] **Step 1:** migration → `node backend/scripts/migrate-goals.js` → `goals table: goals` etc.
- [ ] **Step 2:** controller + routes + mount; `node --check` all three → OK.
- [ ] **Step 3:** commit `feat(db+api): GOALS + GOAL_MILESTONES + /api/goals`.
- [ ] **Step 4:** smoke: login → create goal → add 2 milestones → GET goals (goal has 2 milestones) → toggle one → GET shows done:true → delete a milestone → delete goal → gone. Self-cleaning.

---

### Task 2: Frontend migration

**Files:** Modify `services/api.js` (add `goalAPI`); Rewrite `features/goalsx/useGoals.js`; Modify `Pages/GoalsPage.js`. Keep `features/goalsx/goalsLogic.js` (progress helpers + existing test).

- [ ] **Step 1: `goalAPI`** (after noteAPI): `getAll`, `createGoal`, `updateGoal`, `deleteGoal`, `addMilestone(goalId,data)`, `toggleMilestone(milestoneId)`, `removeMilestone(milestoneId)` (paths under `/goals`).

- [ ] **Step 2: Rewrite `useGoals.js`** → API-backed returning `{goals,loading,refresh,createGoal,removeGoal,createMilestone,toggleMilestone,removeMilestone}` (each mutation awaits API then `refresh()`; `createGoal(title)` posts `{title}`, `createMilestone(goalId,title)` posts `{title}`).

- [ ] **Step 3: Edit `GoalsPage.js`**:
  - Line 13 → `const { goals, createGoal, removeGoal, createMilestone, toggleMilestone, removeMilestone } = useGoals();`
  - Remove `const { goals } = state;` (line 21); change `overallProgress(state)` → `overallProgress({ goals })` (line 23).
  - `addGoal` → `async`, body: `if (!newGoalTitle.trim()) return; await createGoal(newGoalTitle.trim()); setNewGoalTitle("");`
  - `addMilestone` → `async`, body: `if (!newMilestone.trim() || !selectedId) return; await createMilestone(selectedId, newMilestone.trim()); setNewMilestone("");`
  - Delete-goal onClick (line 132): `dispatch({type:"REMOVE_GOAL",...})` → `removeGoal(selected.id)`.
  - Toggle onChange (line 146): `dispatch({type:"TOGGLE_MILESTONE",...})` → `toggleMilestone(m.id)`.
  - Remove-milestone onClick (line 148): `dispatch({type:"REMOVE_MILESTONE",...})` → `removeMilestone(m.id)`.

- [ ] **Step 4:** `cd frontend && CI=true npm run build` → `Compiled successfully.`
- [ ] **Step 5:** Browser `/goals`: add a goal, add milestones, toggle one (progress ring updates), delete; DOM/API-verify persistence.
- [ ] **Step 6:** `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"` → all pass (goalsLogic test green).
- [ ] **Step 7:** commit `feat(fe): Goals backed by /api/goals (DB migration)`.

---

## Self-Review

**Spec coverage:** Implements the spec's `GOALS`+`GOAL_MILESTONES` tables (§4) and Goals → DB migration (§5). No 4b requirement unimplemented.

**Placeholder scan:** Migration SQL, controller contracts, route order, `goalAPI` are concrete; GoalsPage edits are exact handler replacements. No plan placeholders.

**Type/identifier consistency:** Goal shape `{id,title,description,targetDate,isCompleted,createdAt,milestones:[{id,title,done,sortOrder}]}` matches controller + hook + `goalProgress` (reads `milestones[].done`). Hook returns `{goals,loading,refresh,createGoal,removeGoal,createMilestone,toggleMilestone,removeMilestone}` — every GoalsPage consumer updated (no leftover `state`/`dispatch`). Milestone routes precede `/:id`; ownership enforced via `GOAL_MILESTONES→GOALS.user_id`. Column names (`goal_id,milestone_id,is_done,sort_order`) consistent across migration/SQL/mappers. `goalAPI` paths under `/goals` match the mount.
