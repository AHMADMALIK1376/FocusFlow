# FocusFlow — "Aurora" Frontend Redesign + Personalization Platform

- **Date:** 2026-06-18
- **Workstream:** 1 of 6 (Frontend UI/UX redesign). Later workstreams: new features, DB migration, security hardening, PWA/installable, deployment.
- **Status:** Approved design, ready for implementation planning.

## 1. Goal

Redesign the entire FocusFlow frontend into a distinctive, premium, fully responsive, Gen Z–oriented experience with **light + dark** modes, **without** changing existing business logic, API calls, or routes (except additive ones). Layer on a **personalization platform**: a multi-step onboarding wizard, a user-customizable dashboard, in-app theming/color schemes, and multi-language (i18n) support.

### Hard constraints
- **Keep the brand color identity** (`#6c5ce7` / `#7C3AED`); extend with harmonized accents from the same Flat UI Colors 2 family.
- **Keep every Lottie animation** in `frontend/src/assets/animation/`; integrate them purposefully.
- **Keep Poppins** typography.
- **Do not touch** backend, database, or `src/services/api.js` data contracts in this phase.
- Build tooling stays CRA + Tailwind (no migration this phase).

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Visual direction | "Aurora" — Soft neumorphism base + glassmorphism/gradient energy, Gen Z–tuned |
| Color modes | Light + dark, both first-class |
| Persistence | Frontend-first via a swappable `storageAdapter` (localStorage now → backend API later) |
| i18n | Full framework + English shipped 100%; other languages added incrementally via locale files |
| New deps | `i18next`, `react-i18next`, `@dnd-kit/core`, `@dnd-kit/sortable`, `framer-motion` |

## 3. Aurora design system

Single source of truth = **CSS custom properties** (design tokens) consumed by Tailwind and components. Changing the active theme rewrites the variables, re-skinning the whole app instantly.

- **Color tokens** (light + dark sets):
  - Brand: `#6C5CE7`, deep `#7C3AED`, soft `#A29BFE` (dark mode brand `#8B7CF0`).
  - Accents: success/streak `#00B894` (dark `#00CEC9`), info `#0984E3` (dark `#74B9FF`), energy/warn `#FDCB6E` (dark `#FFEAA7`), focus/alert `#FF7675`.
  - Neutrals light: canvas `#F0F2F5`, surface `#FFFFFF`, ink `#2D3436`, muted `#636E72`.
  - Neutrals dark: canvas `#1A1A2E`, surface `#1F1F2E`, ink `#F0F0F5`, muted `#A0A0B0`.
- **Typography:** Poppins; scale display/h1/h2/h3/body/caption with fluid `clamp()` sizing.
- **Shadows:** two systems — neumorphic (light + dark variants) and glass (translucent + backdrop-blur).
- **Radii / spacing / motion:** consistent scales; motion durations + easings as tokens; `prefers-reduced-motion` disables non-essential motion.
- **Tailwind config:** `darkMode: 'class'`; extend `colors`, `boxShadow`, `backgroundImage` (gradients), `keyframes`, `animation` to reference the CSS variables.

### Theming engine
- Active theme = `mode (light|dark)` × `colorScheme (preset|custom)`.
- Presets: Purple (default), Sunset, Ocean, Forest, Mono. Plus a **custom accent picker**.
- `ThemeProvider` applies `class="dark"` + a `data-scheme` attribute on the root and writes accent variables; persisted via `storageAdapter`. Respects system preference on first load.

## 4. Architecture (additive)

New providers wrap `<App/>` (outermost → in), none altering existing logic:
- `ThemeProvider` — mode + colorScheme + persistence.
- `I18nProvider` — wraps `react-i18next`; `t()` everywhere; English locale complete, others scaffolded.
- `PreferencesProvider` — profile (display name, username, university/college, DOB, role, age, gender, derived segment), dashboard layout config, onboarding-complete flag.
- `storageAdapter` interface: `get(key)`, `set(key, value)`, `remove(key)`. `localStorageAdapter` now; `apiStorageAdapter` later (same interface).

### Shared UI kit (`src/components/ui/`)
`Button`, `IconButton`, `Card`, `GlassCard`, `Input`, `Select`, `Textarea`, `Modal`, `Sheet` (mobile bottom-sheet), `Badge`, `Pill`, `StatCard`, `ProgressRing`, `Toast`/`ToastProvider`, `Skeleton`, `EmptyState`, `Switch`, `SegmentedControl`, `Avatar`, `ThemeToggle`, `LanguageSelect`, `Stepper`. All themeable, accessible, responsive.

### Responsive layout shell
- Desktop: evolved collapsible sidebar (current pattern, restyled).
- Tablet: adaptive.
- Mobile: **bottom tab bar** + top app bar; cards stack; touch targets ≥44px; fluid type.

## 5. Onboarding wizard (`/onboarding`, new)

Animated multi-step flow (Lottie per step), entered automatically for first-time users after sign-up; skippable with sensible defaults.

1. **Welcome** — branded intro.
2. **Demographics** — age + gender → derive `segment` from age (using year 2026): Gen Alpha (≤13), Gen Z (14–29), Millennial (30–45), Gen X (46–61), Boomer (62+).
3. **Role** — student / professional / homemaker / athlete / developer / other.
4. **Profile** — display name, username, university/college, DOB.
5. **Personalize** — language + color scheme + light/dark.
6. **Build dashboard** — choose which feature widgets to show and arrange them.

State saved through `PreferencesProvider`; `onboardingComplete` gates redirect.

## 6. Customizable dashboard + Settings

- **Widget registry:** each feature is a self-describing widget (id, title, icon, default-on, component): Hero/Greeting, Goals, Focus Timer, Tasks/Streak, Daily Routine, Academic Calendar, Attendance, Uni Calendar. Extensible for future widgets.
- **Dashboard** renders enabled widgets in saved order. **Edit mode**: toggle show/hide + drag-reorder (`@dnd-kit/sortable`); layout persisted per user.
- **Hero** shows personalized greeting with display name, university, role, and segment.
- **Settings page** (`/settings`, new): edit profile, theme/colors, language, dashboard layout, account; tabbed/sectioned, responsive.

## 7. Screens redesigned (Aurora + responsive + dark mode; logic untouched)

Splash · Auth (Login, Register→onboarding, Verify, ForgotPassword, ResetPasswordVerify, ResetPassword — Lottie kept) · Dashboard (Home) · Focus Mode/Deep Work · Daily Routine + RoutineView · Tasks/Streak (TaskManager) · Academic Calendar Page + View · Attendance Tracker · Sidebar/Navbar/Layout.

## 8. Accessibility & responsiveness
- WCAG AA contrast in both modes; visible focus rings; semantic HTML + ARIA; full keyboard nav; `prefers-reduced-motion`; fluid type; ≥44px touch targets; reduced-motion-safe Lottie.

## 9. Build order (within this phase)
- **1a — Foundation:** tokens + Tailwind config + ThemeProvider + I18nProvider + PreferencesProvider + storageAdapter + UI kit + responsive shell.
- **1b — Redesign existing screens** against the system.
- **1c — Onboarding wizard.**
- **1d — Customizable dashboard + Settings.**

## 10. Out of scope (this phase → later workstreams)
Backend/DB persistence of new data; security hardening; PWA/installable; deployment/CI/CD; real translations beyond English. The data layer and i18n framework are built so these slot in with no UI rework.

## 11. Success criteria
- App fully responsive (mobile/tablet/desktop) with working light/dark + at least the preset color schemes.
- Language switcher works; English complete.
- New users complete onboarding capturing demographics, role, profile, preferences; segment derived and stored.
- Dashboard is user-customizable (show/hide + reorder) and personalized; choices persist across reloads (localStorage).
- All existing features still work; no API/contract changes.
- All existing Lottie animations retained and used.
