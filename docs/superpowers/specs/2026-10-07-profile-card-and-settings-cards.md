# Profile card mascot full-bleed, and Settings as cards

**Date:** 2026-10-07
**Branch:** `feat/profile-card-and-settings-cards`

## A. Dashboard profile card

Today a chosen mascot is drawn at 240 px in the middle of the coral card. A photo fills the card edge to edge.
Goal: the mascot uses the photo's footprint.

Layers, bottom to top, all clipped by the card's rounded `overflow-hidden`:
1. The card itself: coral `bg-grad-hero`, as today.
2. Mascot backdrop (`absolute inset-0`, same footprint as the photo): `bg-surface` with a `--sage` wash at 30% on top
   (a token mix, no hex). It is a size container (`container-type: size`), so the mascot can size itself from the card.
3. The mascot: a square, bottom-anchored and centred. Side = `min(145cqw, (100cqh - 3rem) * 1.43)`.
   The character fills about 62% of a sprite cell's width with its head about 10% from the top, so this makes it about
   90% of the card's width, keeps the head below the top row, and never clips the face. The sheet's empty bottom margin
   (the last 20%) hangs off the card.
4. The coral fade from the bottom (as with the photo), so the label and stats read on top. It ignores the pointer,
   so poking the mascot still works.
5. Text: the label and the stats (`z-10`), and a "Change mascot" pill (coral, readable on the light sage).

No photo and no mascot, and the photo case: unchanged.
The card moves out of `Home.js` into `components/dashboard/ProfileCard.js` so it can be tested.

## B. Settings as cards

A mascot header card (the student's mascot, "Choose mascot" opens the existing picker), then a grid of clay cards.
Each card is a button; it opens `Modal` with exactly the existing controls.

| Card | Holds |
|---|---|
| Profile | the existing profile form |
| Reminders | `RemindersSettings` |
| Appearance | `FontSelector` (a marked slot for the later colour studio) |
| Dashboard and workspaces | `WidgetManager`, `DashboardSwitcher` |
| Language | `LanguageSelect` |
| Privacy and cookies | link to `/privacy`, the cookie choice (moved out of `PrivacyPage` into a shared `CookieChoice`) |

- The open card lives in the address: `?open=<id>`. Clicking a card adds it, closing removes it, so
  `/settings?open=reminders` opens Reminders and the phone's back button closes a pop-up.
- `Modal` gets two opt-in props, used only here: `trapFocus` (focus moves in, Tab stays in, focus goes back on close)
  and `fullHeightOnMobile` (a full-height sheet below the `sm` breakpoint). Its animations honour
  `prefers-reduced-motion` for every modal (framer-motion `MotionConfig reducedMotion="user"`).
- Not added: a light/dark switch. Dark mode currently mirrors light (`tokens.css`), so a switch would do nothing visible.
