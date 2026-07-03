# Phase 5b — Flashcards Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Flashcards UI on `/api/flashcards` — a decks page (grid + create), a deck view (card CRUD) with a **Study mode** (flip → Got it / Missed → SRS review), sidebar nav, and the deck panel on the Subject hub (last hub placeholder).

**Architecture:** `flashcardAPI` in `services/api.js`. `features/flashcards/useFlashcards.js` exports `useDecks(subjectId?)` (list + create/delete) and `useDeck(deckId)` (deck+cards + addCard/updateCard/deleteCard/reviewCard). `FlashcardsPage` (decks grid) → `FlashcardDeckPage` (`/flashcards/:deckId`, cards + study). Study mode is page-local state: capture a queue of due cards (fallback all), flip each, `reviewCard(id, correct)`. Follows the DashKit + ui-kit patterns.

**Tech Stack:** React 19 CRA, react-router, lucide, UI kit + DashKit.
**Branch:** `feat/student-pivot`. Backend on :5555.

---

### Task 1: API + hooks
**Files:** Modify `services/api.js` (`flashcardAPI`: getDecks, getDecksForSubject, createDeck, getDeck, deleteDeck, addCard, updateCard, deleteCard, reviewCard). Create `features/flashcards/useFlashcards.js` (`useDecks`, `useDeck` per architecture).
- [ ] build check → `Compiled successfully.`; commit `feat(fe): flashcardAPI + useDecks/useDeck`.

### Task 2: Flashcards page + route + nav
**Files:** Create `Pages/FlashcardsPage.js`; Modify `App.js`, `navItems.js`, `navIcons.js`, `en.json`.
- Page: `useDecks()` + `useSubjects()`. Stat tiles: Decks · Total cards (Σ cardCount) · Due today (Σ dueCount). Grid of deck cards (name, subject Badge, `cardCount` cards, `dueCount` "due" Badge) → click → `/flashcards/:id`; DeleteButton per card. **Create deck** button → Modal (name, subject `Select` optional, description). EmptyState when none.
- `App.js`: `const FlashcardsPage = lazy(() => import("./Pages/FlashcardsPage"));` + `<Route path="/flashcards" element={<FlashcardsPage />} />`.
- `navItems.js`: `{ id: 'flashcards', path: '/flashcards', labelKey: 'nav.flashcards', icon: '🃏' }` after exams.
- `navIcons.js`: import `Layers`, add `flashcards: Layers`.
- `en.json`: `"flashcards": "Flashcards"`.
- [ ] build → OK; browser: create a deck, see it in the grid; commit `feat(fe): Flashcards decks page + nav`.

### Task 3: Deck view + Study mode + route
**Files:** Create `Pages/FlashcardDeckPage.js`; Modify `App.js` (`/flashcards/:deckId`).
- `useDeck(deckId)`. Header: back link, deck name, subject, `cardCount`/`dueCount`, **Study** button (disabled if 0 cards). Add-card form (front `Input`, back `Input`, Add). Cards list: front, back, box Badge (`B{box}`), due date; edit (Modal) + DeleteButton.
- **Study mode** (page-local): on Study, `setQueue(cards.filter(due) || all)`, `idx=0`, `flipped=false`, `studying=true`. Overlay (`fixed inset-0`) shows `queue[idx].front`; "Show answer" flips to back; then **Got it** (`reviewCard(id,true)`) / **Missed** (`reviewCard(id,false)`) → next; progress "idx+1 / len"; done screen when finished → close + `refresh`. `due` = `!dueDate || dueDate <= today`.
- `App.js`: `const FlashcardDeckPage = lazy(() => import("./Pages/FlashcardDeckPage"));` + `<Route path="/flashcards/:deckId" element={<FlashcardDeckPage />} />`.
- [ ] build → OK; browser: add cards, run Study (flip + rate), verify box/due update via API; commit `feat(fe): flashcard deck view + SRS study mode`.

### Task 4: Subject-hub Flashcards panel
**Files:** Create `components/subjects/FlashcardsPanel.js`; Modify `Pages/SubjectHubPage.js` (drop `flashcards` from `COMING`; render `<FlashcardsPanel subjectId={id} />`).
- Panel: `useDecks(subjectId)`; list the subject's decks (name, `dueCount` due) linking to `/flashcards/:id`; "New deck" quick-create (name, subject fixed); EmptyState.
- [ ] build → OK; browser: subject hub shows its decks; commit `feat(fe): flashcards panel on subject hub`.

### Task 5: Final verify
- [ ] build → `Compiled successfully.`; `npx react-scripts test --watchAll=false` → all pass; browser sanity: create deck → add cards → study → subject hub shows the deck. Screenshot/DOM.

---

## Self-Review
**Spec coverage:** Completes Flashcards (§5) UI on the 5a API — decks, card CRUD, SRS study, subject-hub integration (last placeholder). Finishes Phase 5.
**Placeholder scan:** `flashcardAPI`/hooks are full; pages/panel specified by structure + components + exact route/nav edits (full JSX in build, following existing pages). Remaining hub placeholders after this: Attendance/Assignments/Study-hours (Phase 6). No plan placeholders.
**Type/identifier consistency:** Deck `{id,subjectId,subjectName,subjectColor,name,description,cardCount,dueCount}` + card `{id,front,back,box,dueDate}` match the 5a API. `useDeck` returns `{deck,loading,error,refresh,addCard,updateCard,deleteCard,reviewCard}`; `useDecks` returns `{decks,loading,refresh,createDeck,deleteDeck}`. Routes `/flashcards`, `/flashcards/:deckId` match App.js + navigate targets. Nav id `flashcards` consistent across navItems/navIcons/`nav.flashcards`.
