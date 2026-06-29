# Phase 0 — Delete Cut Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely remove the four non-student features — **Shopping, Mood, Events, Contacts** — from the FocusFlow frontend.

**Architecture:** These four features are **localStorage-only** (no backend/DB), so removal touches only the frontend. Delete their Pages, feature modules, and dashboard widgets, then remove every reference from the widget registry, the router (`App.js`), the nav config (`navItems.js`, `navIcons.js`), the dashboard feature list (`Home.js`), and the i18n locale files. After removal the app must build and the remaining test suite must pass. This is a deletion/refactor, so the "test" at each step is: **build compiles + tests pass + grep finds no leftover references.**

**Tech Stack:** React 19 (CRA / react-scripts 5), react-router-dom, react-i18next, Jest via react-scripts test.

**Branch:** `feat/student-pivot` (already created).

**Commands note:** Run all commands from the repo root `D:\Reactcourses\FocusFlow` using the **Bash tool (Git Bash)** so `CI=true VAR=...` syntax works.

---

### Task 1: Baseline — isolate pending work and confirm a green start

**Files:**
- Modify: none (git + verification only)

- [ ] **Step 1: Inspect the working tree**

Run: `git status`
Expected: shows modified widget files (Notes/Goals/Finance/TimeTrack/Shopping/Mood/Events/Contacts Card.js) and untracked `backend/scripts/seed-user.js`.

- [ ] **Step 2: Commit the pending work as a baseline** (so the deletion commits are clean)

```bash
git add -A
git commit -m "chore: baseline before student-pivot phase 0"
```

- [ ] **Step 3: Confirm the build is green**

Run: `cd frontend && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 4: Confirm the test suite is green and record the baseline counts**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:"`
Expected: `Test Suites: 20 passed, 20 total` and `Tests: 243 passed, 243 total` (record whatever it prints — after Task 2 the suite count drops by 4 because four `*Logic.test.js` files are deleted).

---

### Task 2: Remove the four features (files + all references)

Delete the files and remove their references together so the app never enters a broken state.

**Files:**
- Delete: `frontend/src/Pages/ShoppingPage.js`, `frontend/src/Pages/MoodPage.js`, `frontend/src/Pages/EventsPage.js`, `frontend/src/Pages/ContactsPage.js`
- Delete: `frontend/src/components/dashboard/widgets/ShoppingCard.js`, `.../MoodCard.js`, `.../EventsCard.js`, `.../ContactsCard.js`
- Delete: `frontend/src/features/shopping/`, `frontend/src/features/mood/`, `frontend/src/features/eventsx/`, `frontend/src/features/contacts/` (each contains `*Logic.js`, `*Logic.test.js`, and a `use*.js` hook)
- Modify: `frontend/src/dashboard/registry.js`
- Modify: `frontend/src/App.js`
- Modify: `frontend/src/components/layout/navItems.js`
- Modify: `frontend/src/components/layout/navIcons.js`
- Modify: `frontend/src/Pages/Home.js`

- [ ] **Step 1: Delete the page, widget, and feature-module files**

```bash
cd frontend/src
rm Pages/ShoppingPage.js Pages/MoodPage.js Pages/EventsPage.js Pages/ContactsPage.js
rm components/dashboard/widgets/ShoppingCard.js components/dashboard/widgets/MoodCard.js components/dashboard/widgets/EventsCard.js components/dashboard/widgets/ContactsCard.js
rm -r features/shopping features/mood features/eventsx features/contacts
cd ../..
```

- [ ] **Step 2: Remove the four widget objects from `frontend/src/dashboard/registry.js`**

Delete exactly this block (the `shopping`, `mood`, `eventsx`, `contacts` objects — they sit between the `finance` object and the closing `];`):

```js
  {
    id: 'shopping',
    titleKey: 'widgets.shopping',
    icon: '🛒',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ShoppingCard')),
  },
  {
    id: 'mood',
    titleKey: 'widgets.mood',
    icon: '🌤️',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/MoodCard')),
  },
  {
    id: 'eventsx',
    titleKey: 'widgets.eventsx',
    icon: '📆',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/EventsCard')),
  },
  {
    id: 'contacts',
    titleKey: 'widgets.contacts',
    icon: '👤',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ContactsCard')),
  },
```

The `finance` object (ending `...import('.../FinanceCard')),` then `  },`) becomes the last entry before `];`.

- [ ] **Step 3: Remove the lazy imports and routes from `frontend/src/App.js`**

Delete these four lazy-import lines:

```js
const ShoppingPage = lazy(() => import("./Pages/ShoppingPage"));
const MoodPage = lazy(() => import("./Pages/MoodPage"));
const EventsPage = lazy(() => import("./Pages/EventsPage"));
const ContactsPage = lazy(() => import("./Pages/ContactsPage"));
```

And delete these four route lines:

```jsx
                        <Route path="/shopping" element={<ShoppingPage />} />
                        <Route path="/mood" element={<MoodPage />} />
                        <Route path="/events" element={<EventsPage />} />
                        <Route path="/contacts" element={<ContactsPage />} />
```

- [ ] **Step 4: Remove the four nav items from `frontend/src/components/layout/navItems.js`**

Delete these lines:

```js
  { id: 'shopping', path: '/shopping', labelKey: 'nav.shopping', icon: '🛒' },
  { id: 'mood', path: '/mood', labelKey: 'nav.mood', icon: '🌤️' },
  { id: 'eventsx', path: '/events', labelKey: 'nav.eventsx', icon: '📆' },
  { id: 'contacts', path: '/contacts', labelKey: 'nav.contacts', icon: '👤' },
```

- [ ] **Step 5: Remove the icon imports and mappings from `frontend/src/components/layout/navIcons.js`**

Change the import block from:

```js
import {
  LayoutGrid, Zap, Clock, Flame, CalendarDays, BarChart3,
  StickyNote, Target, Repeat, KanbanSquare, Timer, Wallet,
  ShoppingCart, Smile, CalendarRange, Users,
} from 'lucide-react';
```

to:

```js
import {
  LayoutGrid, Zap, Clock, Flame, CalendarDays, BarChart3,
  StickyNote, Target, Repeat, KanbanSquare, Timer, Wallet,
} from 'lucide-react';
```

And delete these four entries from `ICON_BY_ID`:

```js
  shopping: ShoppingCart,
  mood: Smile,
  eventsx: CalendarRange,
  contacts: Users,
```

- [ ] **Step 6: Remove the four ids from `FEATURE_IDS` in `frontend/src/Pages/Home.js`**

Change:

```js
const FEATURE_IDS = ["notes", "goalsx", "habits", "kanban", "timetrack", "finance", "shopping", "mood", "eventsx", "contacts"];
```

to:

```js
const FEATURE_IDS = ["notes", "goalsx", "habits", "kanban", "timetrack", "finance"];
```

- [ ] **Step 7: Build and verify it compiles**

Run: `cd frontend && rm -rf node_modules/.cache && CI=true npm run build`
Expected: `Compiled successfully.` (no "Module not found" for any deleted file, no unused-import errors).

- [ ] **Step 8: Run the test suite and verify it passes**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"`
Expected: `Test Suites: 16 passed, 16 total` (4 fewer than baseline — the deleted `shopping/mood/contacts/eventsx` logic tests are gone), all tests pass, no `FAIL` lines.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: remove non-student features (shopping, mood, events, contacts)"
```

---

### Task 3: Remove orphaned i18n keys from all locale files

The locale JSONs in `frontend/src/i18n/locales/` still contain `nav.*`, `widgets.*`, and feature namespaces for the deleted features. They are harmless but should be cleaned. Use a one-off script that handles both nested objects and flat dotted keys, then delete the script.

**Files:**
- Modify: `frontend/src/i18n/locales/*.json` (9 files)
- Create then delete: `frontend/scripts/clean-i18n-cut-features.js`

- [ ] **Step 1: Create the cleanup script `frontend/scripts/clean-i18n-cut-features.js`**

```js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const FEATURES = ['shopping', 'mood', 'eventsx', 'contacts'];

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.json')) continue;
  const p = path.join(dir, file);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));

  for (const f of FEATURES) {
    delete json[f];                          // nested feature namespace, e.g. json.shopping
    if (json.nav) delete json.nav[f];        // nested nav.<f>
    if (json.widgets) delete json.widgets[f]; // nested widgets.<f>
    for (const k of Object.keys(json)) {     // flat-key fallback
      if (k === f || k === `nav.${f}` || k === `widgets.${f}` || k.startsWith(`${f}.`)) {
        delete json[k];
      }
    }
  }

  fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
  console.log('cleaned', file);
}
```

- [ ] **Step 2: Run the script**

Run: `node frontend/scripts/clean-i18n-cut-features.js`
Expected: prints `cleaned <file>.json` for all 9 locales (ar, de, en, es, fr, hi, pt, ur, zh).

- [ ] **Step 3: Delete the one-off script**

```bash
rm frontend/scripts/clean-i18n-cut-features.js
```

- [ ] **Step 4: Build to confirm nothing broke**

Run: `cd frontend && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove i18n keys for deleted features"
```

---

### Task 4: Final verification sweep

**Files:**
- Modify: none (verification only; fix + recommit only if a straggler is found)

- [ ] **Step 1: Grep for any leftover references**

Run:
```bash
grep -rEn "ShoppingPage|MoodPage|EventsPage|ContactsPage|ShoppingCard|MoodCard|EventsCard|ContactsCard|useShopping|useMood|useEvents|useContacts|features/(shopping|mood|eventsx|contacts)" frontend/src
```
Expected: **no output** (exit 1). If anything prints, remove that reference, rebuild, and amend/commit before continuing.

- [ ] **Step 2: Full production build**

Run: `cd frontend && rm -rf node_modules/.cache && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Full test suite**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false 2>&1 | grep -E "Tests:|Test Suites:|FAIL"`
Expected: 16 suites passed, all tests passed, no `FAIL`.

- [ ] **Step 4: Confirm the nav and dashboard no longer list the removed features**

Run: `grep -rEn "shopping|/mood|/events|contacts" frontend/src/components/layout/navItems.js frontend/src/components/layout/navIcons.js frontend/src/dashboard/registry.js frontend/src/Pages/Home.js`
Expected: **no output**.

Phase 0 is complete when Steps 1–4 all pass. Next: Phase 1 (schema rebuild + Subjects spine) gets its own plan.

---

## Self-Review

**Spec coverage (spec §7 "Deletions"):** Pages ✔ (Task 2 Step 1), feature modules ✔ (Task 2 Step 1), dashboard widgets ✔ (Task 2 Step 1), registry entries ✔ (Step 2), routes ✔ (Step 3), sidebar/nav entries ✔ (Steps 4–5, covers Sidebar + MobileTabBar via `navItems.js`), dashboard feature list ✔ (Step 6), i18n keys ✔ (Task 3), tests referencing them ✔ (deleted with the feature folders), no DB changes ✔ (stated). All §7 items covered.

**Placeholder scan:** No TBD/TODO; every edit shows exact before/after code; every command has expected output. Clean.

**Type/identifier consistency:** Feature ids (`shopping`, `mood`, `eventsx`, `contacts`) and the route path `/events` (id `eventsx`) are used consistently across registry, navItems, navIcons, App.js, and Home.js `FEATURE_IDS`. The `finance` feature is deliberately **kept** (it becomes Budget in a later phase) and never appears in a deletion step.
