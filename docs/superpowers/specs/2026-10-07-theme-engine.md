# Theme engine (foundation)

**Date:** 2026-10-07
**Branch:** `feat/theme-engine`

Goal: the fixed palette becomes a theme the student will later pick. This task builds the engine only (the editing
screen is next). **By default the app must look exactly as it does today.**

## The theme

```
{ v: 1, background: '#F5EFE6', brand: '#EC706D', accent: '#B8DCC4', text: 'auto', presetId: 'default' }
```
`logo` and `icon` are optional `#RRGGBB` overrides. Only 6-digit hex is accepted, in the app and on the server.

## How colours are made

`deriveTokens(theme)` returns every colour variable in `tokens.css` (triplets, shadows, gradients).

- Each derived colour is a fixed step away from the colour it comes from (background, brand, accent or text). The steps
  are measured **from today's values** when the app starts, in OKLCH (a colour space where "lighter" looks lighter).
  So the default theme gives back today's exact numbers. A test reads `tokens.css` and checks every value.
- Dark backgrounds: raised things (cards, highlights, borders, tinted cards) get lighter than the background, shadows get
  darker, and text turns light. Highlights are only a little lighter than the background, so nothing glows white.
- Sunshine yellow and the status colours (success, info, warn, danger) stay fixed: they mean something (streaks,
  warnings), so they look the same on every theme. Only their lightness moves if one would become hard to read.

## The readability guard

After deriving, every text/background pair is checked with the WCAG contrast formula. If one fails, the text colour is
moved towards black or white until it passes (and, only if that is not enough, the card behind it is moved).
The result lists what was changed (`flags`), so the editor can tell the student.

| Pair | Needs |
|---|---|
| text on page background, text on cards | 4.5 : 1 |
| grey text (`muted`) on cards | 4.5 : 1 |
| text on brand (buttons, navbar) | 4.5 : 1 (buttons use small bold text) |
| text on accent (pills) | 4.5 : 1 |
| other colours used as text or icons | at least as readable as today |

**Problem found:** today's own colours fail two of these: white on coral is **2.96 : 1**, grey text on cards is
**4.46 : 1**. Fixing them would change the default look. Plan: the shipped default is left exactly as it is, and the
guard applies to every colour the student chooses. (Open question for the owner, see the PR.)

## Applying it

- A headless `ThemeApplier` (already mounted in `App.js`) sets the variables on `<html>` and the phone's status-bar colour.
- No flash: a tiny script in `public/index.html` paints the last theme from `localStorage` (`focusflow:theme.colors`)
  before React starts. There is no Content-Security-Policy on the app's pages, so an inline script is allowed.
- `useAppTheme()` gives `theme`, `setTheme`, `resetTheme`, and `previewTheme(theme)` for live previews that are never
  saved (`previewTheme(null)` ends the preview).

## Saving

| Where | What |
|---|---|
| Preferences (`schemaVersion` 2 -> 3) | `theme`, synced to the account by the existing `useServerSync` |
| Server (`utils/preferences.js`) | refuses a theme that is not exactly the shape above |
| `focusflow:theme.colors` | the last derived colours, only for the no-flash script |

Sign-out already resets the preferences to default, so the theme cache is removed too: the next person on a shared
computer sees the normal colours. Your colours come back from your account when you sign in.
No database change (the theme lives inside the existing preferences JSON).

## Hard-coded colours

Every hex and `rgb()` in `frontend/src` was reviewed (table in `decision.md`). Interface colours become tokens with
the same default value, so nothing moves. Data colours (subjects, routines, chart series, success/warn/danger, the
Google logo, Lottie artwork) stay. New tokens: `highlight`, `shadow-color`, `shade`, `sage-mid`, `icon`, `warn-ink`,
`chart-label`, `chart-axis`, `note-1..4`, `shadow-heading`, `grad-sage-deep`. Unused legacy Tailwind colours and the
unused `Style/App.css` are removed.
