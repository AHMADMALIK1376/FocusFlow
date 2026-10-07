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
3. The mascot: a square standing on the card's bottom edge, centred. Side = `min(125cqw, 100cqh)`.
   The character fills about 62% of a sprite cell's width (more when it turns its head) and its face ends about 60%
   down, so this makes it about 80% of the card's width, keeps a turned head inside the card, and keeps the face above
   the fade. On a phone the card is only about 260 px tall, so there the height limits it.
4. The coral fade from the bottom, shorter than the photo's (gone by 40%), so the label and stats read on top. It
   ignores the pointer, so poking the mascot still works; so do the text rows, except their own buttons.
5. Text: the stats (`z-10`), and the label and "Change mascot" on coral pills (readable on the light sage).

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
| Dashboard and workspaces | `DashboardSwitcher`, then `WidgetManager` |
| Language | `LanguageSelect` |
| Privacy and cookies | link to `/privacy`, the cookie choice (moved out of `PrivacyPage` into a shared `CookieChoice`) |

- The open card lives in the address: `?open=<id>`. Clicking a card adds a history entry and closing goes back over
  it, so the phone's back button closes a pop-up without leaving dead steps. `/settings?open=reminders` opens
  Reminders; closing that one just clears the address.
- `Modal` gets two opt-in props, used only here: `trapFocus` (focus moves in, Tab stays in, focus goes back on close)
  and `fullHeightOnMobile` (a full-height sheet below the `sm` breakpoint, at `z-[1500]`: above the phone tab bar,
  below toasts and menus). Its animations honour
  `prefers-reduced-motion` for every modal (framer-motion `MotionConfig reducedMotion="user"`).
- Not added: a light/dark switch. Dark mode currently mirrors light (`tokens.css`), so a switch would do nothing visible.
