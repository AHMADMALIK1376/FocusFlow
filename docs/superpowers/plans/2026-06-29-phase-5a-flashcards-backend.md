# Phase 5a — Flashcards Backend (SRS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add flashcard decks + cards with **Leitner spaced-repetition**, at `/api/flashcards`. Decks optionally belong to a subject; reviewing a card moves it up/down a box and reschedules its due date.

**Architecture:** `FLASHCARD_DECKS` + `FLASHCARDS` tables. A pure `backend/utils/srs.js` (`INTERVALS`, `nextBox`, `dueDate`) holds the SRS math, unit-tested with `node:test`. `flashcardController` = decks CRUD (+ card/due counts), cards CRUD (ownership via deck→user), and a `reviewCard` endpoint that applies `srs`. Follows the pg-shim controller pattern.

**SRS:** boxes 1–5, `INTERVALS` (days) = {1:0, 2:1, 3:3, 4:7, 5:14}. `nextBox(box, correct)` = correct → min(5, box+1), wrong → 1. `dueDate(box, from)` = from + INTERVALS[box]. New cards start box 1, due today. "Due" = `due_date IS NULL OR due_date <= CURRENT_DATE`.

**Tech Stack:** Node/Express + pg shim, `node:test`.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: Tables

**Files:** Create `backend/scripts/migrate-flashcards.js`.
```sql
CREATE TABLE IF NOT EXISTS FLASHCARD_DECKS (
  deck_id     VARCHAR(50) PRIMARY KEY,
  user_id     VARCHAR(50) NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
  subject_id  VARCHAR(50) REFERENCES SUBJECTS(subject_id) ON DELETE SET NULL,
  name        VARCHAR(200) NOT NULL,
  description VARCHAR(500),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS FLASHCARDS (
  card_id       VARCHAR(50) PRIMARY KEY,
  deck_id       VARCHAR(50) NOT NULL REFERENCES FLASHCARD_DECKS(deck_id) ON DELETE CASCADE,
  front         TEXT NOT NULL,
  back          TEXT NOT NULL,
  box           SMALLINT DEFAULT 1,
  due_date      DATE,
  last_reviewed TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_decks_user ON FLASHCARD_DECKS(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON FLASHCARDS(deck_id);
```
- [ ] run `node backend/scripts/migrate-flashcards.js`; commit `feat(db): flashcards tables`.

---

### Task 2: SRS util + tests

**Files:** Create `backend/utils/srs.js`, `backend/utils/srs.test.js`.
- `srs.js` exports `INTERVALS`, `nextBox(box, correct)`, `dueDate(box, from=new Date())` (returns `YYYY-MM-DD`).
- `srs.test.js` (node:test), fixed `from = new Date('2026-07-01T12:00:00')`:
  - `nextBox(1,true)===2`, `nextBox(5,true)===5`, `nextBox(3,false)===1`.
  - `dueDate(1,from)==='2026-07-01'`, `dueDate(3,from)==='2026-07-04'`, `dueDate(5,from)==='2026-07-15'`.
- [ ] `node --test backend/utils/srs.test.js` → all pass; commit `feat: Leitner SRS helpers + tests`.

---

### Task 3: Controller + routes + mount

**Files:** Create `backend/controllers/flashcardController.js`, `backend/routes/flashcardRoutes.js`; Modify `backend/server.js`.

Methods:
- `getDecks` (optional `?subjectId=`) → `[{id,subjectId,subjectName,subjectColor,name,description,createdAt,cardCount,dueCount}]` via LEFT JOIN SUBJECTS + correlated counts (`dueCount` = cards with `due_date IS NULL OR due_date <= CURRENT_DATE`).
- `createDeck` `{name,subjectId,description}` → 201 `{success,id}` (if subjectId, verify ownership).
- `deleteDeck` `:id` scoped (cascade cards).
- `getDeck` `:id` scoped → `{...deck, cards:[{id,front,back,box,dueDate,lastReviewed}]}` ordered by created_at.
- `addCard` `POST /decks/:id/cards {front,back}` — verify deck ownership; insert box 1, `due_date = CURRENT_DATE`; 201 `{success,id}`.
- `updateCard` `PUT /cards/:cardId {front,back}` — ownership via deck join.
- `deleteCard` `DELETE /cards/:cardId` — ownership via deck join.
- `reviewCard` `POST /cards/:cardId/review {correct}` — ownership via join; `newBox = nextBox(card.box, correct)`, `due = dueDate(newBox)`, `UPDATE box, due_date, last_reviewed = CURRENT_TIMESTAMP`; return `{success, box:newBox, dueDate:due}`.

Routes (all auth):
```js
router.get('/decks', authMiddleware, flashcardController.getDecks);
router.post('/decks', authMiddleware, flashcardController.createDeck);
router.get('/decks/:id', authMiddleware, flashcardController.getDeck);
router.delete('/decks/:id', authMiddleware, flashcardController.deleteDeck);
router.post('/decks/:id/cards', authMiddleware, flashcardController.addCard);
router.put('/cards/:cardId', authMiddleware, flashcardController.updateCard);
router.delete('/cards/:cardId', authMiddleware, flashcardController.deleteCard);
router.post('/cards/:cardId/review', authMiddleware, flashcardController.reviewCard);
```
Mount `app.use('/api/flashcards', flashcardRoutes)` next to budget.

- [ ] `node --check` the three files → OK; commit `feat(api): flashcards decks/cards + SRS review at /api/flashcards`.

---

### Task 4: Smoke test

- [ ] login → create deck → add 2 cards → GET /decks (cardCount 2, dueCount 2) → GET /decks/:id (2 cards, box 1) → review card 1 correct → GET shows box 2 + due_date +1 day → review card 1 wrong → box back to 1 → delete a card → delete deck → gone. Self-cleaning.

---

## Self-Review

**Spec coverage:** Implements `FLASHCARD_DECKS`+`FLASHCARDS` (§4) and the Flashcards SRS behavior (§5) as an additive backend, subject-linkable. Study UI is Plan 5b. No 5a requirement unimplemented.

**Placeholder scan:** Migration SQL, SRS formulas + test cases, controller contracts, route order are concrete; full code written in the build. No plan placeholders.

**Type/identifier consistency:** Card shape `{id,front,back,box,dueDate,lastReviewed}` + deck shape `{id,subjectId,subjectName,subjectColor,name,description,cardCount,dueCount}` used by controller + (future) 5b. `srs` contracts (`nextBox`→1..5, `dueDate`→YYYY-MM-DD) match tests + `reviewCard`. Card routes (`/cards/:cardId...`) and deck routes (`/decks/:id...`) share no ambiguous prefix. Column names (`deck_id,card_id,due_date,last_reviewed,box`) consistent across migration/SQL/mappers. `/api/flashcards` mount matches routes.
