# Aurora Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the FocusFlow frontend into the responsive, light/dark "Aurora" design system and add a personalization platform (onboarding, customizable dashboard, theming, i18n) — all frontend-first, without changing backend/API contracts.

**Architecture:** CSS-variable design tokens drive Tailwind + a shared UI kit. React Context providers (`ThemeProvider`, `I18nProvider`, `PreferencesProvider`) layer on top of the existing app, backed by a swappable `storageAdapter` (localStorage now → API later). Existing pages are refactored to use the UI kit; new onboarding/dashboard-customization/settings flows are added.

**Tech Stack:** React 19, CRA, Tailwind 3, lottie-react, i18next + react-i18next, @dnd-kit, framer-motion.

**Verification standard:** Logic units (segment derivation, storage adapter, theme/i18n helpers, widget registry) get Jest tests via react-scripts. UI work is verified by `npm run build` passing and rendering correctly in the running app.

---

## File structure

```
frontend/src/
  design/
    tokens.css            # CSS variables: light + dark + scheme accents
    themes.js             # preset color schemes + helpers
  theme/
    ThemeProvider.js      # mode + colorScheme context, applies root class/attrs
    useTheme.js
  i18n/
    index.js              # i18next init
    locales/en.json       # English (complete)
    locales/_template.json# scaffold for new languages
  storage/
    storageAdapter.js     # interface + localStorageAdapter (+ future apiStorageAdapter)
  preferences/
    PreferencesProvider.js# profile + dashboard layout + onboarding flag
    segment.js            # age -> generation segment (pure, tested)
  components/ui/          # shared UI kit (Button, Card, GlassCard, Input, ...)
  components/layout/      # restyled Sidebar/Navbar/Layout + MobileTabBar
  Pages/onboarding/       # wizard + steps
  Pages/Settings.js       # settings page
  dashboard/registry.js   # widget registry (tested)
```

---

## Phase 1a — Foundation

### Task 1: Install dependencies
- [ ] **Step 1:** From `frontend/`, run:
```
npm install i18next react-i18next @dnd-kit/core @dnd-kit/sortable framer-motion
```
(If React 19 peer warnings block install, re-run with `--legacy-peer-deps`.)
- [ ] **Step 2:** Verify `npm run build` still succeeds. Expected: compiled successfully.
- [ ] **Step 3:** Commit `package.json` + `package-lock.json` ("chore: add i18n, dnd-kit, framer-motion").

### Task 2: Design tokens + Tailwind config
**Files:** Create `src/design/tokens.css`; Modify `tailwind.config.js`, `src/index.css`.
- [ ] **Step 1:** Create `tokens.css` with `:root` (light) variables and `.dark` overrides, plus `[data-scheme="..."]` accent overrides for presets (purple/sunset/ocean/forest/mono). Variables: `--brand`, `--brand-deep`, `--brand-soft`, `--accent-success/info/warn/focus`, `--canvas`, `--surface`, `--ink`, `--muted`, neumorphic + glass shadow vars, radii, motion.
- [ ] **Step 2:** Set `darkMode: 'class'` in `tailwind.config.js`; extend `colors`/`boxShadow`/`backgroundImage`/`keyframes`/`animation` to reference the CSS vars (e.g. `brand: 'var(--brand)'`). Keep existing `focusPurple` etc. for back-compat.
- [ ] **Step 3:** `@import './design/tokens.css';` at top of `index.css`.
- [ ] **Step 4:** `npm run build` passes. Commit.

### Task 3: Segment derivation (TDD)
**Files:** Create `src/preferences/segment.js`, `src/preferences/segment.test.js`.
- [ ] **Step 1 (failing test):**
```js
import { segmentFromAge } from './segment';
test('derives generation from age (2026 baseline)', () => {
  expect(segmentFromAge(10)).toBe('Gen Alpha');
  expect(segmentFromAge(20)).toBe('Gen Z');
  expect(segmentFromAge(35)).toBe('Millennial');
  expect(segmentFromAge(50)).toBe('Gen X');
  expect(segmentFromAge(70)).toBe('Boomer');
});
test('handles invalid input', () => {
  expect(segmentFromAge(null)).toBe('Unknown');
  expect(segmentFromAge(-1)).toBe('Unknown');
});
```
- [ ] **Step 2:** Run `npm test -- segment` → FAIL.
- [ ] **Step 3:** Implement `segmentFromAge(age)`: ≤13 Gen Alpha, 14–29 Gen Z, 30–45 Millennial, 46–61 Gen X, ≥62 Boomer, else Unknown. Also export `segmentFromDOB(dob)`.
- [ ] **Step 4:** Run tests → PASS. Commit.

### Task 4: Storage adapter (TDD)
**Files:** Create `src/storage/storageAdapter.js`, `src/storage/storageAdapter.test.js`.
- [ ] **Step 1 (failing test):** test that `localStorageAdapter.set/get/remove` round-trips JSON and `get` returns a default when missing.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement interface `{ get(key, fallback), set(key, value), remove(key) }` using `localStorage` + JSON, try/catch safe. Export `localStorageAdapter` and a `storage` default binding.
- [ ] **Step 4:** Run → PASS. Commit.

### Task 5: ThemeProvider
**Files:** Create `src/theme/ThemeProvider.js`, `src/theme/useTheme.js`, `src/design/themes.js`.
- [ ] **Step 1:** `themes.js` exports preset list `[{id,name,scheme}]`.
- [ ] **Step 2:** `ThemeProvider` holds `{mode, colorScheme, setMode, toggleMode, setColorScheme, customAccent, setCustomAccent}`; on change writes `document.documentElement` class `dark` + `data-scheme` + custom accent vars; persists via `storageAdapter`; initial mode from stored value or `prefers-color-scheme`.
- [ ] **Step 3:** Wrap `<App/>` content in `ThemeProvider` in `App.js` (outermost provider). Build passes. Commit.

### Task 6: i18n setup
**Files:** Create `src/i18n/index.js`, `src/i18n/locales/en.json`, `src/i18n/locales/_template.json`; Modify `src/index.js`.
- [ ] **Step 1:** Init `react-i18next` with `en` resources, fallback `en`, language persisted via `storageAdapter`.
- [ ] **Step 2:** Seed `en.json` with namespaces for common UI + onboarding strings used so far.
- [ ] **Step 3:** Import `./i18n` in `index.js`. Build passes. Commit.

### Task 7: PreferencesProvider
**Files:** Create `src/preferences/PreferencesProvider.js`, `usePreferences.js`.
- [ ] **Step 1:** Context holds `profile` (displayName, username, university, dob, role, age, gender, segment), `dashboard` (layout: ordered widget ids + enabled map), `onboardingComplete`; load from `storageAdapter` on mount; `updateProfile`, `updateDashboard`, `completeOnboarding`, `resetPreferences`. `segment` recomputed from age via `segment.js`.
- [ ] **Step 2:** Wrap app (inside ThemeProvider/I18n). Build passes. Commit.

### Task 8: UI kit
**Files:** Create files under `src/components/ui/` (one component per file) + `index.js` barrel.
- [ ] **Step 1:** Build core: `Button`, `IconButton`, `Card`, `GlassCard`, `Input`, `Select`, `Textarea`, `Badge`, `Pill`, `Switch`, `SegmentedControl`, `Avatar`, `Skeleton`, `EmptyState`, `ProgressRing`, `StatCard`, `Modal`, `Sheet`, `ThemeToggle`, `LanguageSelect`, `Stepper`, `ToastProvider/useToast`. All token-driven, dark-mode-correct, responsive, accessible (focus rings, ARIA).
- [ ] **Step 2:** Build passes; spot-render a few on a scratch route. Commit.

### Task 9: Responsive layout shell
**Files:** Modify `src/components/layout/Layout.js`, `Sidebar.js`, `Navbar.js`; Create `MobileTabBar.js`.
- [ ] **Step 1:** Restyle Sidebar/Navbar in Aurora; add `MobileTabBar` shown on small screens; Layout switches nav by breakpoint; add `ThemeToggle` + `LanguageSelect` to the top bar.
- [ ] **Step 2:** Build passes; verify responsive at mobile/tablet/desktop widths in the running app. Commit.

**Checkpoint:** Foundation complete — themes switch (light/dark + schemes), language switcher present, providers persist, UI kit + responsive shell ready.

---

## Phase 1b — Redesign existing screens (milestone tasks)
Refactor each to use the UI kit + tokens, responsive, dark-mode-correct, Lottie retained, logic/API untouched. Build passes after each; commit per screen.
- [ ] Splash
- [ ] Auth: AuthPage shell, LoginForm, RegisterForm, VerifyForm, ForgotPasswordForm, ResetPasswordVerify, ResetPassword
- [ ] Dashboard (Home) + dashboard cards (GoalCard, UniCalendar, DailyTimetableCard, FocusTimer, AcademicCalendar)
- [ ] Focus Mode / Deep Work
- [ ] Daily Routine + RoutineView + routine popups
- [ ] Tasks / Streak (TaskManager)
- [ ] Academic Calendar Page + View + popups
- [ ] Attendance Tracker + popups

## Phase 1c — Onboarding wizard (milestone tasks)
- [ ] `/onboarding` route + guard (redirect first-time users; block if `onboardingComplete`)
- [ ] Wizard shell with `Stepper` + framer-motion transitions + per-step Lottie
- [ ] Steps: Welcome, Demographics (age/gender→segment), Role, Profile, Personalize (language/theme/mode), Build dashboard
- [ ] Persist via PreferencesProvider; finish → `completeOnboarding` → dashboard

## Phase 1d — Customizable dashboard + Settings (milestone tasks)
- [ ] `src/dashboard/registry.js` (widget registry) + test
- [ ] Dashboard renders enabled widgets in saved order; personalized Hero (name/university/role/segment)
- [ ] Edit mode: show/hide toggles + drag-reorder via `@dnd-kit/sortable`; persist layout
- [ ] `/settings` page: profile, theme/colors (presets + custom accent), language, dashboard, account — tabbed, responsive

---

## Self-review notes
- **Spec coverage:** tokens/theming (Task 2,5), i18n (Task 6), persistence adapter (Task 4), profile+segment (Task 3,7), UI kit (Task 8), responsive shell (Task 9), screens (1b), onboarding (1c), customizable dashboard + settings (1d). All spec sections mapped.
- **No placeholders** in foundation tasks; 1b–1d are intentionally milestone-level and will be expanded to step detail when reached.
- **Type consistency:** `storageAdapter.get(key, fallback)`, `segmentFromAge`, `PreferencesProvider` field names are referenced consistently across tasks.
