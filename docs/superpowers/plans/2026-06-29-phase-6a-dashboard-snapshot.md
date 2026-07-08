# Phase 6a — Dashboard Student Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard student-focused by surfacing the new DB features at the top: a **snapshot strip** with CGPA, next-exam countdown, flashcards due, and budget remaining — each linking to its page. Additive and low-risk (the existing dashboard cards stay).

**Architecture:** A self-contained `components/dashboard/StudentSnapshot.js` fetches the new APIs (`gradeAPI.getGpa`, `examAPI.getAll`, `flashcardAPI.getDecks`, `budgetAPI.get`) in parallel (`Promise.allSettled`, resilient to any one failing) and renders 4 clickable stat cards. `Home.js` renders `<StudentSnapshot />` right after the hero header, before the bento grid. Reuses `countdownLabel` from `features/exams/examsLogic`.

**Tech Stack:** React 19 CRA, react-router, lucide, existing UI tokens.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: StudentSnapshot component + wire into Home

**Files:** Create `frontend/src/components/dashboard/StudentSnapshot.js`; Modify `frontend/src/Pages/Home.js` (import + render after `</header>`).

**Component spec:** on mount, `Promise.allSettled([gradeAPI.getGpa(), examAPI.getAll(), flashcardAPI.getDecks(), budgetAPI.get()])`. Derive: `cgpa` (gpa.cgpa), nearest upcoming not-done exam (`date >= today`, soonest) → `countdownLabel`, `due` = Σ deck.dueCount, budget `remaining` = monthlyAllowance − this-month expenses (with currency symbol). Render a `grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8` of 4 cards (icon, big value, label, sub) that `navigate` to `/grades`, `/exams`, `/flashcards`, `/budget`. Values fall back to "—"/"None"/0 when data is missing.

- [ ] **Step 1:** Create `StudentSnapshot.js` per spec.
- [ ] **Step 2:** In `Home.js`, `import StudentSnapshot from "../components/dashboard/StudentSnapshot";` and render `<StudentSnapshot />` immediately after the hero `</header>` (before the bento `<div className="grid ... lg:grid-cols-12 ...">`).
- [ ] **Step 3:** `cd frontend && CI=true npm run build` → `Compiled successfully.`
- [ ] **Step 4:** Browser `/dashboard` (logged in, with seeded data): the strip shows CGPA (e.g. 3.70), a next-exam countdown, cards-due count, and budget remaining; each card navigates. Screenshot/DOM-verify.
- [ ] **Step 5:** `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|FAIL"` → all pass.
- [ ] **Step 6:** commit `feat(fe): student snapshot strip on dashboard (CGPA, exams, flashcards, budget)`.

---

## Self-Review

**Spec coverage:** Advances the spec's student-focused dashboard (§6) by surfacing CGPA, exam countdown, flashcards due, and budget — the new features — at the top of the dashboard. A fuller bento rework (next-class/attendance-warning cards, removing legacy widgets) can follow; this is the safe first increment. No new backend.

**Placeholder scan:** Component behavior, data derivations, and the Home insertion point are concrete. No plan placeholders.

**Type/identifier consistency:** Uses existing exports `gradeAPI.getGpa()` (`{cgpa}`), `examAPI.getAll()` (`[{date,isDone,title}]`), `flashcardAPI.getDecks()` (`[{dueCount}]`), `budgetAPI.get()` (`{entries,settings:{monthlyAllowance,currency}}`) and `countdownLabel(date)` — all already implemented and verified in Phases 2–5. Routes `/grades`, `/exams`, `/flashcards`, `/budget` all exist.
