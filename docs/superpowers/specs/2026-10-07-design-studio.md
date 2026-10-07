# Design Studio (pick your own colours)

**Date:** 2026-10-07
**Branch:** `feat/design-studio`

Goal: a student can design their dashboard colours. Settings > Appearance gets a "Design your dashboard" button that
opens a large pop-up, the Design Studio. It uses the theme engine from the previous task (`useAppTheme`,
`deriveTokens`, the readability guard). Nothing in the engine is copied or rewritten.

## What the student sees

- **Ready-made palettes:** 24 hand-picked palettes in three groups, Soft, Bold and Dark (8 each). One tap applies all
  colours. The original FocusFlow colours are the "Reset to FocusFlow colours" button, not a palette tile.
- **Your colours:** four buttons, Background, Brand, Accent and Text, switch between four pickers. Each picker says
  what it changes, and has rows of named swatches (Soft, Bold and Dark; for Text: Dark text and Light text), a hex box
  and the phone's own colour picker. Text also has **Auto**.
- **Advanced** (closed at first): Logo colour and Icon colour, both **Auto** by default.
- **Live preview:** the real app behind the pop-up changes as you pick, and a small preview card in the pop-up shows a
  navbar, a card, a pill and a button.
- **Readability check:** if the guard had to change something, it says so in plain words, for example "We made your
  text a little darker so it stays readable." If a mix can never be readable, Save is switched off and says why.
- **Buttons:** Undo (steps back one change at a time, up to 20), Reset to FocusFlow colours, Cancel (throws the
  changes away), Save (keeps them on this device and on the account).
- **Unsaved changes:** Escape, the X, a tap outside the pop-up, or the phone's Back button with unsaved changes shows
  a small question inside the pop-up: Save and close / Discard changes / Keep editing. It is not a browser `confirm`.
  Closing the tab with unsaved changes gets the browser's own "Leave site?" prompt.

## How it works

- The Studio is a Settings pop-up of its own (`?open=studio`). The Appearance button swaps the Appearance pop-up for the
  Studio in the address, so there are never two pop-ups on top of each other, and Back still works.
- The Studio keeps a draft. Each change calls `previewTheme(draft)`. Save calls `setTheme(draft)`. Cancel, Discard and
  leaving the page call `previewTheme(null)`, so a preview can never get stuck.
- Colour-picker drags fire many times a second, so they are limited to one update per screen frame.
- The Studio calls `deriveTokens(draft)` itself to read the guard's notes. That reuses the engine rather than copying it.

## Fixes the last review asked for

1. **Charts and the dashboard clock** now follow theme changes straight away (a small `useChartColors()` hook reads the
   current theme instead of reading `<html>` once).
2. **Logo colour:** the navbar and sign-in logo stay the real PNG unless a logo colour is set. Then the same shape is
   painted in that colour (a CSS mask). The default stays pixel-identical.
3. **Loading logo:** stays the coral PNG while the brand is the default coral. With another brand it is painted in the
   brand colour.
4. The mascot backdrop already uses the Accent colour, so it follows Accent with no change.

## Not changing

No database change and no migration (the theme already lives in the synced preferences). No new library. Theme
version stays 1.
