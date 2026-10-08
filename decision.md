# Decision log

Every meaningful code or design choice made while building FocusFlow with Claude, newest first.
Each entry: what was decided, the reason, and what was rejected.
Update this file with every change.

---

## 2026-10-08 — Theme audit (final quality gate)

A no-new-features pass over the whole colour-theme feature. Plan: `docs/superpowers/specs/2026-10-08-theme-audit.md`. Two rounds of audit, fix and re-audit, with a tester, an accessibility auditor, a coder and the reviewer.

### Contrast matrix (library palettes and the default)
Ratios are WCAG contrast, measured on the colours the engine produces. The first five columns are the required pairs; "warn badge" is the badge text on its own tint. Every library palette is at least 4.5:1 on all six. The default keeps its two known exceptions (white on coral 2.96:1, muted text on cards 4.46:1): it is exempt so it looks exactly as it always has (decision OQ1, option A, from the theme-engine task; changing it changes how the default looks, so it needs the owner's word). A test (`palettes.test.js`, "palette library contrast matrix") now fails if a library palette drops under 4.5:1 on any of these.

| Palette | ink/canvas | ink/surface | muted/surface | on-brand/brand | on-sage/sage | warn badge | tightest extra pair | fixed by guard |
|---|---|---|---|---|---|---|---|---|
| Default | 11.44 | 12.87 | 4.46 | 2.96 | 6.98 | 5.76 | --on-brand on --brand 2.96/4.5 | 0 |
| Matcha Latte | 12.69 | 14.23 | 4.83 | 4.61 | 7.11 | 5.80 | --sage-deep on --surface 2.41/2.4 | 4 |
| Peach Fuzz | 12.28 | 13.67 | 4.60 | 4.51 | 7.28 | 5.85 | --on-brand on --brand 4.51/4.5 | 2 |
| Lavender Haze | 12.90 | 14.40 | 4.78 | 4.66 | 7.28 | 5.85 | --warn on --surface 2.03/2 | 2 |
| Sky Notes | 13.14 | 14.56 | 4.81 | 4.60 | 7.20 | 5.85 | --warn on --surface 2.03/2 | 4 |
| Butter Toast | 13.19 | 14.26 | 4.72 | 4.56 | 7.11 | 5.85 | --sage-deep on --surface 2.42/2.4 | 4 |
| Rose Water | 12.88 | 14.35 | 4.75 | 4.53 | 7.27 | 5.85 | --on-brand on --brand 4.53/4.5 | 2 |
| Mint Chip | 12.71 | 13.85 | 4.61 | 4.60 | 6.80 | 5.85 | --sage-deep on --surface 2.41/2.4 | 3 |
| Cloud Grey | 13.30 | 14.87 | 4.95 | 4.51 | 7.22 | 5.85 | --on-brand on --brand 4.51/4.5 | 2 |
| Electric Blue | 15.74 | 17.14 | 5.49 | 4.54 | 6.82 | 5.85 | --on-sage on habitDoneB 4.41/4.4 | 3 |
| Hot Pink | 15.88 | 17.16 | 5.47 | 4.56 | 7.26 | 5.85 | --warn on --surface 2.03/2 | 2 |
| Tangerine | 15.42 | 16.59 | 5.30 | 4.50 | 7.13 | 5.85 | --on-brand on --brand 4.50/4.5 | 4 |
| Lime Pop | 14.92 | 15.71 | 5.03 | 4.60 | 6.94 | 5.85 | --warn on --surface 2.03/2 | 4 |
| Grape Soda | 15.24 | 17.00 | 5.46 | 4.60 | 7.37 | 5.85 | --warn on --surface 2.03/2 | 2 |
| Cherry Cola | 16.17 | 17.80 | 5.75 | 4.63 | 7.20 | 5.85 | --warn on --surface 2.03/2 | 2 |
| Teal Wave | 13.94 | 15.19 | 4.98 | 4.53 | 6.85 | 5.85 | --on-brand on --brand 4.53/4.5 | 3 |
| Sunset Drive | 15.19 | 16.48 | 5.29 | 4.58 | 7.14 | 5.85 | --warn on --surface 2.03/2 | 2 |
| Midnight | 15.57 | 12.95 | 4.70 | 4.71 | 7.24 | 4.63 | --chart-axis on --surface 3.00/3 | 2 |
| Charcoal Coral | 15.49 | 12.74 | 4.67 | 4.51 | 7.20 | 4.60 | --on-brand on --brand 4.51/4.5 | 2 |
| Deep Forest | 15.49 | 12.84 | 4.71 | 4.56 | 6.89 | 4.64 | --on-brand on --brand 4.56/4.5 | 3 |
| Night Lavender | 15.75 | 13.08 | 4.74 | 4.51 | 7.48 | 4.59 | --on-brand on --brand 4.51/4.5 | 3 |
| Ocean Night | 15.27 | 12.48 | 4.66 | 4.62 | 6.97 | 4.55 | --muted on --highlight 4.55/4.5 | 3 |
| Espresso | 15.57 | 12.82 | 4.66 | 4.53 | 7.40 | 4.65 | --muted on --highlight 4.51/4.5 | 3 |
| Neon Arcade | 17.24 | 14.73 | 5.06 | 4.65 | 7.14 | 4.64 | --warn-ink on warnWash 4.64/4.5 | 2 |
| Slate Gold | 15.26 | 12.21 | 4.65 | 4.56 | 7.43 | 4.53 | --muted on --highlight 4.50/4.5 | 3 |

"Tightest extra pair" is the closest-to-its-limit of the other guarded pairs (extras use "never worse than today" or a lower target such as 3:1 for chart axes; they are listed in `GUARD` in `deriveTokens.js`).

### Problems found and fixed
- **Tooltips, year drop-downs and the routine day tooltip were fixed white with black text** (BudgetGauge, AttendanceHeatmap, AttendanceSkylinePage, SpendingPuckStack, DailyRoutine). Now surface and ink, so they follow the theme. In the default the card colour is the warm white, not pure white (a barely visible change).
- **Focus mode used green-500 and red-500** for done / not done. Now the `success` and `focus` tokens (readable on every theme; the default is a slightly different green and red).
- **`text-on-brand` sat on the fixed status red and gold in the routine pop-ups** (1.1:1 to 2:1 on some palettes). Now white on the red (same 3.6:1 as the default) and the dark `on-sun` ink on the gold.
- **The warn badge on dark palettes was under 4.5:1**, and in dark mode (the `t` key, or a phone set to dark) its text swapped to a colour that was under 4.5:1 on most themes. The guard now checks the badge text against the badge's own tint (warn at 20% over the card), moving the text first and the warn colour second; and the `dark:` variant is gone (it was the only one in the code). On a mid-tone, saturated card colour the two goals (badge text and warn staying visible on the card) cannot both hold; there the badge text keeps at least 3.9:1 (`WASH_FLOOR`). No library palette is affected.
- **Answer pages opened from reminder links were still the default coral** (the earlier task themed the emails but missed them). They now use the student's email palette; see the section below.
- **The hard-coded colour guard** now also sees Tailwind palette classes (`bg-white`, `text-gray-500`, `border-red-500/10`), and every allowlist entry pins how many times the colour is used, so one more use of an allowed code in the same file fails until the count is raised on purpose. Allowed Tailwind uses left: white text on the fixed status red and green, white on a student-picked routine colour, and a scrim and icon over the avatar photo.
- **Not scanned, by design:** `fill="white"` and `stroke="black"` in SVG geometry and CSS masks (CardDeleteButton, the sprite masks): they define a shape and are never painted.

### Light/dark mode with custom palettes (decided)
- **The colour theme is the only source of colour.** The mode toggle (the `t` key, or a phone set to dark) only adds or removes the `.dark` class on `<html>` and stores `theme.mode`. Nothing in the code changes a colour for `.dark` any more, and `applyTheme` sets `color-scheme` from the palette inline, which beats the class. So toggling the mode never changes a palette, and a dark palette in mode "light" is still fully dark.
- **Rejected:** deriving a second "dark version" of each palette (a new feature, and it would fight a student who picked a light palette on purpose), or removing the toggle (it is harmless now; removing it is a separate cleanup).
- **How a student gets a dark app:** pick a dark palette in the Design Studio.

### Known risks kept on purpose
- **Signing out and in again while the server is asleep:** the colours show the default and the remembered colours are removed until the account loads (about 20 s on a cold Render). The screen cannot tell the same student from a different one, so it does not keep the previous student's colours. The account copy is never lost.
- **A theme from a newer app version** (theme `v` above 1) is read as the default and replaced on the next unrelated save. This only matters if an old copy of the app runs after a newer release; the server already refuses saves from older app versions (409).
- **The default palette's two contrast exceptions** (above).

---

## 2026-10-08 — Theme everywhere

The colours a student picks now show on the pages before sign-in, the error and offline pages, the charts, the sign-in illustrations and reminder emails. With the normal FocusFlow colours nothing changes: web pages look the same, and every email is byte-for-byte the same (`services/emailDefaultSnapshot.test.js`, with a fixture captured before the refactor).

### Colours remembered for the sign-in page (OQ1)
- **Decision:** `focusflow:theme.device` holds the last signed-in student's theme (colour codes only; `design/theme/deviceTheme.js`). `PreferencesProvider` computes `shownTheme` and the colours painted come from it: the account theme once the account has loaded, otherwise the device theme, otherwise the saved one. The Design Studio still edits `theme` (the account theme).
- The memory is written while signed in and loaded (removed when the theme is the default). It is **not** cleared on sign-out or on a 401. It is cleared by saving "Reset to FocusFlow colours", by another student's account loading, or by clearing site data. It is essential display storage like `theme.colors`, so `CONSENT_VERSION` is not bumped; the Privacy page lists it and says how to clear it.
- `useServerSync` now returns `loaded` (true after the first load for this sign-in succeeds, finds nothing, or fails; false when signed out), so a student who has just signed in sees the remembered colours until their own arrive (no flash of the normal colours).

| Situation | Painted | `theme.device` | `theme.colors` |
|---|---|---|---|
| Signed in, account loaded, theme X | X | X | X tokens |
| Saves "Reset to FocusFlow colours" | default | removed | removed |
| Signs out (X saved) | X (login page) | kept | X tokens kept |
| Signs in, account not loaded yet | device theme | unchanged | unchanged |
| Another student loads with theme Y / default | Y / default | Y / removed | Y / removed |
| Account load fails | the browser's saved copy | written from it | as painted |
| Session ends by 401 | like sign-out | kept | kept |
| Never signed in | default | none | none |

- **Trade-off (shared computers):** the next person sees the previous student's colours on the sign-in page. They hold no personal data. The owner's acceptance test (sign out, see the sign-in page in my colours) requires it.
- **Rejected:** clearing the memory on sign-out (the sign-in page would always be coral); reusing `theme.colors` as the memory (it holds derived tokens, not the theme the engine needs for logo, charts and Lottie); keeping the whole theme in the preferences across sign-out (the next account would upload one student's colours as its own).
- **Superseded:** the old theme-engine bullet "Sign-out: ... cache is removed" (below) no longer holds. The cache now follows `shownTheme`.

### Pages before sign-in
- Most were already tokenised (see the earlier audit), so they follow the theme as soon as it is on `<html>`. The Google sign-in button's green glow was fixed literals; it is now `--shadow-clay-sage` (`shadow-clay-sage`), derived from the Accent with its own recipes (`sageGlow`, `sageGlowTint`), default value unchanged.
- `ErrorScreen` shows the coral app icon on the normal brand; on another brand it shows a brand-coloured tile with the FocusFlow mark (same rule as the loading logo). It uses `useActiveTheme()`, which now works outside the provider (splash, `ConnectionGate`, `CrashScreen`) by reading the remembered theme (`initialShownTheme()`: device theme, else the saved preferences' theme, else none).
- **App icon (OQ4):** the installed icon, `manifest.json`, and the icon in emails stay coral. The phone reads the installed icon once; the email logo is the app icon, like the installed one.

### Static files
- `offline.html` carries a copy of the `ff-theme-boot` script (a test keeps it identical to `index.html`), plus a second tiny script that adds `ff-themed` when the brand is not the default coral. Its colours are now token triplets named as in `tokens.css`; with the defaults it renders the same. The icon swaps for a brand tile when themed. Its only hex is the theme-color meta (the boot script updates it).
- `sw.js`: `ff-offline-v2` (the page changed, so the old cached copy is replaced); the mark image is cached and served offline too.
- Notification pictures (`public/notify`) stay in FocusFlow's colours on purpose: the phone draws them outside the app, the worker cannot read the theme, and per-student pictures would need image generation on the server for every push.

### Theme cache version 2
- Tokens changed (`--shadow-clay-sage`), so `THEME_CACHE_VERSION` and the inline scripts' `c.v` are 2. After deploy a student's cached colours are ignored once: the app opens in the normal colours for a moment, then repaints and rewrites the cache. Tests now use the constant instead of a literal 1.

### Reminder emails
- **Same colour maths as the app, one copy:** the backend deploys on its own (Render, root `backend`), and the frontend files are ES modules with extensionless imports. `backend/scripts/sync-theme-engine.js` writes a generated CommonJS copy of `color.js`, `theme.js`, `deriveTokens.js` and `palettes.js` to `backend/services/theme/`, changing only the import and export lines and refusing any other form. `themeEngineSync.test.js` fails, saying how to fix it, when a copy is out of date. **Rejected:** a hand port (drifts silently); `require()` of the frontend files (not deployed with the backend).
- `deriveTokens` returns an extra `extras` (internal recipe colours for the email: shadow tint, hero start, brand highlight, brand tint, sage light, blush light, sage card). Nothing in the app reads it and the cache does not store it.
- `services/emailTheme.js` builds one palette `P` of hex colours (`DEFAULT_PALETTE` is exactly today's values). `emailPalette(theme)` returns that same object for no, default or invalid themes. Otherwise it derives from the theme and runs a readability pass over `EMAIL_PAIRS`: ink and muted on surface/well/canvas 4.5; coral text 3; text on coral 4.5 (2.3 on the gradient top); text on sage 4.5; chip inks 4.5; success and danger 3. The walk is the app guard's (OKLCH lightness in 0.01 steps, keeping chroma and hue).
  - **Found when run:** on dark themes dark sage text cannot sit on both the light sage and the dark raised sage card. So when the text reaches white or black and a secondary backdrop still fails, that backdrop moves away from the text (as the app's own guard does). The first backdrop never moves. All 24 ready-made palettes and 200 random themes pass.
  - The default palette is exempt (OQ6): white on coral is 2.96:1 today and default emails must stay identical. A test documents it.
  - `edge` and `track` are mixes of tokens; for the default they come within 3 per channel of the old literals, which is why the default is the literal palette, not the derived one.
- `emailTemplates.js` has no colour literals (`emailColorGuard.test.js` enforces it, and that hex in `emailTheme.js` is only inside the `palette:start`/`palette:end` markers). Text uses of coral use `coralText` (contrast-fixed), fills use `coral`.
- **Dark themes:** the email says `color-scheme: dark only` and sets `bgcolor` on body, outer table and card, so dark-mode email apps do not invert it. Light themes keep `light only`.
- **Icons:** the email icons are one flat colour with soft edges in the alpha channel, so a recolour is "keep the white file's alpha, set the RGB" (`services/emailIcons.js`, using `pngjs`, pure JavaScript, MIT, no dependencies; installs on Render's free plan). Tinted icons are cached (200 entries) and attached as in-memory buffers with the usual `cid`; a manifest colour still uses the file, so default attachments are unchanged. **Measured:** tinting coral reproduces the shipped `-coral.png` files with an alpha difference of 0 on all 22 icons (RGB within 1 where alpha is at least 200). **Rejected:** an SVG renderer (resvg and sharp have native or large WASM builds); keeping only the five ready-made tints (cannot match a colour).
- **Theming never stops an email.** `loadUserTheme` returns null for no row, a missing table (migration not run), bad JSON, oversize data, an invalid theme or a database error, and never logs the data or the user. `paletteOf` falls back to the default palette if the palette code throws; `buildReminderEmail` falls back to the default email if the template throws; a failing tint falls back to the nearest ready-made icon. Each is tested, including a Proxy that throws when read.
- **OQ2:** sign-up and password-reset code emails stay in the default look (security emails should always look the same; their call sites only have an address; sign-up has no theme yet). `codeEmail` accepts a theme only so the preview can show it.
- **OQ3 (closed by the answer-pages entry below):** the reminder answer pages used to stay in the default look; they now wear the theme.
- `scripts/preview-emails.js` writes every email in three themes (`email-previews/default`, `bold`, `dark`); `scripts/test-email.js [to] --theme dark` sends the normal test plus a sample reminder in that theme. Emoji removed from both scripts' email subjects and sample text.

### Charts (`components/charts/categoryColors.js`)
- On a custom theme the first category colour is the Brand and the second the Accent; the rest come from a fixed list (sun, peach, powder, mocha, then six more), taking each one only if it is far enough (OKLab `deltaE`) from the ones already chosen, with a fallback that takes the furthest unused one. Normal colours: today's six, untouched.
- **Found when run:** today's own six are only 0.056 apart at the closest (sun and peach), so a minimum of 0.08 was stricter than the original. `MIN_SERIES_DE` is 0.05, and a test checks every ready-made palette and 300 random themes.

### Sign-in illustrations (OQ5)
- Recolour at load, do not replace the art (`design/theme/lottieTint.js`, `useThemedLottie`): fills and strokes with OKLCH hue between 180 and 300 degrees and chroma of at least 0.08 turn by the same hue shift as the brand moved from coral; L and C are kept; skin, hair, white, greys and yellow stay. A grey brand desaturates the decoration. Gradients are untouched. Results are cached per illustration and brand. Used on the auth pages and onboarding. The dashboard Lotties (`FocusTimer`, `AcademicCalendar`) are unchanged (follow-up).
- **Rejected:** replacing the art with new vector pictures (a lot of work for little gain).

### Guards
- `design/colorGuard.test.js` scans the app's code for hex and numeric `rgb()/hsl()` colours; a new one fails with how to fix it. Data colours (subjects, routines, categories, status, third-party logos, neutral black/white effects, fallbacks) are listed with a reason in `design/colorAllowlist.js`; an entry whose colour is gone fails too. The engine (`design/theme/`) and `tokens.css` are the token source and are not scanned. The backend email guard is described above. The allowlist is per file and colour code, not per line, so a new interface use of an already-allowed code in the same file passes unnoticed; Tailwind default-palette classes (text-gray-500) are not scanned.

---

## 2026-10-08 — Answer pages wear the student's theme

The pages that open from reminder emails, notifications and WhatsApp links (`backend/controllers/notifyController.js`) were always coral, so a student with a dark or bold theme got a themed email and then a coral page. They now use the same palette as the emails.

- **Decision:** the page stylesheet and the tile/chip colours are built from the email palette (`emailPalette`, `DEFAULT_PALETTE` in `services/emailTheme.js`), the same fields `tones()` uses in the emails. The palette already passes the readability pass, so no new colours were added.
- **Default is byte-identical:** `controllers/notifyPages.snapshot.test.js` compares every page type (question pages with and without a picked answer, expired, saved, "still open", skipped, error pages) to a fixture captured from the code before this change (committed first). It caught one slip while writing (the input focus shadow).
- **Where the theme is read:**
  - The GET page opens a connection only to read the theme (`loadUserTheme`, bound query, user id from the signed link's `u` claim), in `try/finally`.
  - The POST path saves the answer exactly as before and only then reads the theme on the connection it already has.
  - Expired or invalid links have no user, so they use the default look and never touch the database.
  - Any failure (no database, query error, bad or huge data, missing claim, a palette that cannot be built) gives the default look. After a database error the 500 page does not try the database again.
- **Icons:** the answer pages already use inline SVG line icons (`iconSet('web')`), whose colour is a plain `stroke`. So the themed palette's icon colours are used directly; no PNG tinting, data URIs or new route are needed (and `emailIcons.js` is untouched). The nearest-tint fallback only matters for email PNGs.
- **Dark themes:** `:root{color-scheme:dark}` is added only for dark palettes, so form controls and scrollbars match. The picked outline and the focus ring use the contrast-fixed `coralText`. The default keeps its soft translucent coral focus halo (unchanged); a themed page gets a solid ring so it shows on a dark card.
- **Checked on all 24 ready-made palettes** (`notifyPages.themed.test.js`): input text, button labels, chips, hint, labels, footer and links at 4.5 or more; picked outline, focus ring, wordmark (large bold text) and the "Missed" icon at 3 or more.
- **Rejected:** a per-theme stylesheet route (extra request, cache and cookie-less access to the theme); CSS variables set from the query string (a link would carry the theme, and it could go stale); making the GET page require a login (email scanners and WhatsApp must still open it).
- `scripts/preview-emails.js` now also writes `page-<theme>-attendance|submit|quiz|saved|expired.html` for default, bold and dark.

---

## 2026-10-07 — Design Studio

### Where it lives
- **Decision:** the Studio is a Settings pop-up of its own at `?open=studio`. The "Design your dashboard" button in Appearance swaps the Appearance entry for the Studio in the address (`setParams(..., { replace: true })`), so there is one pushed history entry and closing goes back over it. A link to `?open=studio` opens it; closing then clears the address (the existing `close` logic).
- **Rejected:** a pop-up on top of a pop-up (two focus traps, two Escape handlers, and Back would be unclear).

### Draft, undo, Save, Cancel
- **Decision:** the Studio keeps a draft in a reducer (`studioReducer`, `design/theme/studio.js`). Each change calls `previewTheme(draft)`; Save calls `setTheme(draft)`; Cancel, Discard, closing and unmounting call `previewTheme(null)`, so a preview cannot get stuck. Undo keeps up to 20 steps (`UNDO_LIMIT`). One colour-picker drag is one step (merged until the picker loses focus).
- **Reset** ("Reset to FocusFlow colours") changes the draft, like every other change: it can be undone and needs Save (OQ4).
- **Rejected:** a single undo step (a student who tries five palettes cannot get back to the second); Reset that saves at once (surprising, and not undoable).
- If the saved theme changes while the Studio is open (a server sync, for example): a draft with changes is kept, `dirty` compares against the new saved theme, and the preview effect depends on `theme` so the draft is shown again (a save or sync ends a preview). A draft nobody has touched becomes the new saved theme instead, so Save cannot overwrite the update.

### Unsaved changes
- **Decision:** Escape, the X and the backdrop with changes show a question inside the dialog (Save and close / Discard changes / Keep editing). Escape while it shows hides it. Cancel is an explicit discard and asks nothing. `beforeunload` is blocked only while there are unsaved changes.
- **The Back button:** `BrowserRouter` has no blocker, so Back cannot be stopped. When the address closes the Studio and it was not us (no `closingByUs`) and the draft is dirty, the Studio calls `onReopen()` (Settings pushes `?open=studio` again), keeps the preview and shows the question.
- **Rejected:** `window.confirm` (an unstyled browser box, and the logout one is already on the roadmap to be removed); a data router with `useBlocker` (a big routing change for one dialog).

### Hex input rules
- Accepts `RRGGBB`, `#RRGGBB`, `RGB` and `#RGB`, any case, with spaces around. Anything else is refused: an error under the box, `aria-invalid`, and nothing changes (not the draft, not the preview, not `<html>`). Empty does nothing. Typing clears the error. A code equal to the current value is not applied again (no pointless undo step).

### Speed
- **Decision:** colour-input drags are limited to one change per animation frame (`requestAnimationFrame`, with a 16 ms timeout fallback; a pending frame is cancelled on unmount). The readability notes use `useDeferredValue`, so a drag never waits for the extra `deriveTokens` call (about 18 ms). Save re-checks the live (not deferred) draft synchronously.
- **Rejected:** debouncing (the preview would lag behind the finger); calling `deriveTokens` on every input event.

### Readability notes (reviewer note O4)
- **Decision:** the Studio calls `deriveTokens(draft)` itself and turns the guard's flags into plain sentences through the pure `readabilityNotes` (`studio.js`). Flags are grouped by what the student sees (text, buttons, pills, cards, icons, status); every flag the guard can raise is in a group (a test runs 200 seeded random palettes).
- **Rejected:** widening `useAppTheme` to expose flags (every caller would re-derive, and the hook's job is only to read and save).
- An unreadable mix (a contrast rule that no nudge can fix) switches Save and "Save and close" off and says why. The default palette is exempt from the guard.

### Charts and the clock (reviewer note O1)
- **Decision:** `useChartColors()` (`components/charts/chartColors.js`) reads the active theme from context through `useActiveTheme()` (the preview if open, else the saved theme), so charts and the clock re-render on every preview and save. Its values are the theme's own brand and accent (the guard never moves them). Without a provider it falls back to `chartColors()`. The seven callers (Kanban, Notes, Habits, Time track, Finance, Goals, and the Clock) now use it.
- **Rejected:** re-reading `<html>` during render. The theme is applied in a layout effect, so at render time `<html>` still holds the old colours.

### Logo and loader marks
- **Decision:** `ThemedMark` shows the PNG as it is, or (only when told a colour) the same shape painted with a CSS mask. Auto logo colour (no `logo` key) always shows the real PNG on every palette (OQ2); only an explicit logo colour paints the mask. The logo is not text, so the guard does not move it. If the chosen logo colour is below 3:1 against the brand, the Readability check warns, but Save stays on.
- The loader keeps its coral PNGs while the brand is the default coral, and paints both lines in `--brand` on any other brand. The wipe mask lives on the `.ff-loader-line` wrapper, because an inline mask on the image would replace it.
- **Rejected:** the mask always. `focusflow-mark.png` has shading, not one flat colour, so a mask would not be pixel-identical, and the default must not change.

### The palette library (OQ1) and swatches
- **Rule (checked by `palettes.test.js` for every palette):** (a) no contrast failures; (b) `--canvas`, `--brand`, `--sage` equal the palette's background, brand and accent, and `--ink` equals its text; (c) neither `--ink` nor `--surface` is flagged. So the four chosen colours and the cards are exactly as designed. Other flags (such as the label shade on the brand colour) are allowed and are reported in the Readability check. Requiring no flags at all is not possible: the `--on-brand` recipe gives about 3.4 to 3.9:1 for almost any brand, so the guard nudges it nearly every time.
- **Tuned values:** a throwaway script ran every palette through the real `deriveTokens`. All 24 starting palettes passed the rule as written. Five dark palettes had `--muted` nudged by the guard, which would print "We tuned the text shades" on a ready-made palette, so their `text` was lightened by a hair: Midnight `#E8ECF5` to `#E9ECF5`, Charcoal Coral `#F3ECE6` to `#F4EEE9`, Night Lavender `#EEE8F8` to `#F1ECF9`, Espresso `#F5EBE0` to `#F6EDE3`, Slate Gold `#E9EDF2` to `#F3F6F8`.
- **Text swatches (OQ3):** Soft/Bold/Dark does not fit text colours, so only the Text picker has two rows, "Dark text" and "Light text".
- Palette and swatch hex values are data, shown with inline styles, the same as subject colours. They are not app colours, so they do not go through tokens.

### Other
- Choosing a palette clears the logo and icon overrides. Choosing the palette that is already selected is a no-op (no undo step).
- The mascot backdrops (`ProfileCard.js`, `SettingsPage.js`) already use `--sage`, which is the Accent, so they follow Accent with no code change.
- No database change and no migration. Theme version stays 1, schema stays 3. New `presetId` values (`custom`, the library ids) already match `PRESET_RE` and the server's check.
- jsdom drops inline `rgb(var(--x))` colours and `mask-image`, so tests of those styles read the markup from `renderToStaticMarkup`.

### Found in review and testing, and fixed
- **Signing out with the Studio open** brought the old preview back. The saved colours reset to the defaults, which re-ran the preview effect. The Studio now restarts from the default colours on sign-out.
- **The action bar** used `sticky bottom-0` inside a padded dialog, so page content showed in a strip under it. It now sticks at `-bottom-6`, flush with the dialog edge. (Seen in a real browser, not in tests.)
- **Enter in the hex box** replaced the box (it was keyed on the value), so a keyboard user's focus dropped out of the dialog. The box is no longer remounted; it reseeds from the current value instead.
- **Focus when the "Unsaved changes" question closes** now goes to Save on purpose. The reviewer feared focus was lost. In practice React reuses the same button element, so it was not, but that was luck and is now explicit.
- **A server update arriving while the draft is untouched** becomes the new starting point. Before, Escape asked about changes nobody made, and Save would have overwritten the synced theme.
- **Smaller:** the error text uses the guarded `warn-ink` colour (about 4.5:1 instead of about 3.4:1); a selected swatch or palette still shows a focus outline; `save()` stops if `setTheme` refuses.
- **Known limit, left as is:** pressing the browser's Back button on a `?open=studio` link while there are unsaved changes leaves Settings and drops the edits. The app uses `BrowserRouter`, which cannot block Back. The preview ends correctly. When the Studio was opened from the Appearance card, Back is caught and asks first.
- **Known limit, rare:** two Back presses in very quick succession can race the "put the Studio back" step.

---

## 2026-10-07 — Theme engine (foundation)

### The model: three colours in, every token out
- **Decision:** a theme is `{ v, background, brand, accent, text ('auto' or hex), optional logo and icon, presetId }`. `design/theme/deriveTokens.js` turns it into every colour token in `tokens.css`, `applyTheme.js` writes them inline on `<html>`, and the theme is saved with the account (`USER_PREFERENCES`, schema v3). This task is the foundation only: there is no editor yet.
- **Why OKLCH, calibrated from today's values:** each token is a "recipe" measured once at load from today's colours (for example "surface is a touch lighter than the page, with the page's tint"). The default theme therefore comes out as exactly the shipped values, with no special case in the maths. A test parses `tokens.css` and checks every derived value is identical.
- **Rejected:** hand-tuned palettes per theme (does not work for a free colour picker); HSL (lightness is uneven between hues, so contrast would be unpredictable); a colour library (rule: no new dependencies).

### Dark backgrounds
- A background counts as dark when white reads better on it than black.
- Tokens that are lighter than the page (`--blush`, notes, `--border`, sage-card gradient) stay lighter on dark themes ("raise"), so cards still lift off the page.
- The lighter-than-page steps are scaled up on backgrounds darker than the default ("lift"), because a tiny step is invisible on near-black.
- Auto text on a dark page is as light as today's page background. Shadows get darker than the page; the white highlight becomes a soft light tone, not a white glow.

### Fixed colours
- Sunshine (`--sun`, `--brand-soft`, `--on-sun`) and the status colours (`--success`, `--info`, `--warn`, `--focus`, `--warn-ink`) are the same on every theme. Sunshine is the streak/reward signal and the status colours are signals, so they keep their meaning. Sunshine is never used as text (`on-sun` on `sun` is 8.85:1).
- The guard may still move a status colour if it is unreadable on a theme's surface.
- `--dur*`, `--ease-spring`, radii and `--glass-blur` are not themed. Setting `--dur*` inline would also defeat the `prefers-reduced-motion` override in `tokens.css`.

### Readability guard (WCAG 2)
After deriving, `GUARD` checks text colours against their backdrops and nudges the text lightness in 0.01 steps (keeping tint) until it passes. If text hits pure white or black and still fails a secondary backdrop, that backdrop is nudged instead. Flags list what was moved.
- **Text keeps to one side.** Everything read on the page or on cards (entries whose first backdrop is `--canvas` or `--surface`) moves in the same direction as the final `--ink`. The guard then repeats until a full pass finds nothing to fix.
  - The tester's 200 random palettes found mid-tone backgrounds where `--ink` went white and `--muted` black. No `--highlight` could suit both, which left 4.48 < 4.5.
  - Muted text that is the opposite of the main text would also look wrong.
  - With the fix, 5000 random palettes pass. A 200-palette test stays in the suite.
- **Rejected:** only adding the repeat loop. It cannot settle when two text colours pull a shared backdrop in opposite directions.

| Pair | Needed | Today's ratio |
|---|---|---|
| ink on canvas, surface, surface-2, highlight, blush, notes, sage cards | 4.5 | above 4.5 (11.4 on canvas) |
| muted on surface, highlight | 4.5 | 4.46 on surface |
| ink-strong on surface | 4.5 | above 4.5 |
| on-brand on brand | 4.5 | 2.96 |
| on-brand on hero gradient start | 2.3 | 2.33 |
| on-sage on sage, sage light, habit done A | 4.5 | above 4.5 (6.98 on sage) |
| on-sage on habit done B | 4.4 | 4.47 |
| sage-deep, icon on surface | 2.4 | 2.47 |
| chart-label on surface | 4.5 | above 4.5 |
| chart-axis, success, info, focus on surface | 3 | 3.06, 3.20, 3.04, 3.52 |
| warn on surface | 2 | 2.00 |
| warn-ink on surface | 4.5 | above 4.5 |

- The owner's five pairs (ink/canvas, ink/surface, muted/surface, on-brand/brand, on-sage/sage) use 4.5. Every extra pair uses "the WCAG target or today's ratio rounded down to 0.1, whichever is lower", so no theme is ever worse than today.
- **Open question for the owner (OQ1):** today's default fails two of the five pairs: white on coral is 2.96:1 (needs 4.5) and muted on surface is 4.46:1 (needs 4.5). "Look exactly the same" and "every pair passes" cannot both hold. **Chosen (A):** the shipped default palette is exempt from the guard and stays byte-identical; every other palette must pass. A test documents the two failures. Alternatives: (B) required pairs only need "AA or today's ratio, whichever is lower"; (C) full AA for everyone, so the default changes (muted a level darker; text on coral becomes dark).
- **Logo and icon overrides (OQ2):** both are optional `#RRGGBB`. `logo` overrides `--logo` (no component uses it yet). `icon` overrides the new `--icon`, used by the two sage icon tiles (`WidgetShell.js`, `EmptyState.js`).
- **Ghost bin (OQ3, resolved):** the hover-only bin on cards used a literal `rgb(20, 20, 20)`. It now uses a new `--ink-strong` token with default `20 20 20` (recipe: a step beyond ink, away from the page). So the default look is unchanged anywhere, and on dark themes the icon turns light instead of vanishing.

### No flash on load: an inline script
- `public/index.html` has a small inline script that reads `focusflow:theme.colors` and sets the tokens before anything paints. The splash renders before `PreferencesProvider` mounts, so only an inline script can theme it.
- There is no Content-Security-Policy on the app's pages (`vercel.json` sets none; the helmet CSP only covers API responses), so inline is allowed. **Rejected:** a separate script file (one more blocking request before first paint).
- **All or nothing:** one bad entry (wrong version, a name that is not `--lowercase`, a character outside `0-9 a-z . , % ( ) / # -`, or any CSS function other than `rgb(`, `linear-gradient(` and `var(` in any letter case) and nothing is applied.
  - `readThemeCache` applies the same checks in code. Tests run both on about 45 bad caches, and keep the script's key and version in step with `applyTheme.js`.
  - The first version only refused a lowercase `url(`. The tester showed `URL(`, `image-set(` and `expression(` got through. An allow-list of the three functions a theme uses closes the whole class.
  - **Rejected:** adding blocked words one at a time.
- **Cache shape:** `{ v, tokens, scheme, meta }` (`v` is 2 since Theme everywhere). Bump `THEME_CACHE_VERSION` (and the `c.v` in the script) whenever recipes or tokens change. The default palette stores no cache (the stylesheet already has it).
- **Sign-out (superseded 2026-10-08, see Theme everywhere):** `useServerSync` resets preferences to default, so the default is applied and the cache is removed. Same rule as the preferences themselves (shared lab computers: the next student sees the normal colours); the theme returns from the account on sign-in. Cost: the login page after sign-out uses the default colours.
- **Preview:** `previewTheme` shows colours without saving, syncing or caching. `setTheme`, `resetTheme`, `resetPreferences` and signing out end it. The editor (next task) must call `previewTheme(null)` when it closes without saving.
  - Signing out used to leave a preview on screen, because `useServerSync` resets only the saved preferences.
  - `PreferencesProvider` now listens for the signed-out event and drops the preview too.

### Other choices
- Schema v3 migration: v2 and v3 documents are kept, an invalid or missing `theme` becomes the default; any other schema version still takes the v1 path.
- **Deploy window (found by the reviewer).**
  - The app before this change treats any version other than 2 as the old v1 format.
  - So a tab or a backgrounded phone app that is still running the old code, and loads a v3 document after signing in, turns every workspace into one default dashboard. Its next save would upload that copy over the account.
  - Old code cannot be fixed. So the server now refuses a save whose `schemaVersion` is lower than the stored one: 409, "This copy of FocusFlow is out of date" (`isDowngrade` in `backend/utils/preferences.js`, used by `savePreferences`).
  - The old app ignores failed saves, so it just stops syncing until it is reloaded. The account copy is never overwritten, and an unreadable stored copy never blocks a save.
  - Rolling the frontend back past this change would stop preference saves to the account, though nothing is lost, until it is deployed again.
  - **Rejected:** only telling the owner to reload every tab; a phone left in the background is easy to forget.
  - Still worth doing after deploying: reload open tabs and fully close and reopen the installed app.
- Server: `backend/utils/preferences.js` checks the theme's shape (only `#RRGGBB`, `auto`, a short preset id, known keys) because the theme becomes CSS on every page. No database change, no migration.
- Charts need hex (`${hex}66` trick, SVG fills), so `chartColors()` reads the live `--brand` and `--sage` from `<html>`. Charts pick up a new theme on their next render, which is fine while the editor lives on the Settings page.
- `focusflow:theme.colors` is essential storage, so `CONSENT_VERSION` is not bumped; the Privacy page lists it.
- Removed unused legacy Tailwind entries (`focusPurple`, `focusDark`, `neuBg`, `shadow-neu-flat`, `shadow-neu-pressed`, `orbPulse`) and the dead `Style/App.css`; they held the only off-palette literals.

### New tokens
`--sage-mid`, `--icon`, `--note-1` to `--note-4`, `--warn-ink`, `--ink-strong`, `--highlight`, `--shadow-color`, `--shade`, `--chart-label`, `--chart-axis`, `--shadow-heading`, `--grad-sage-deep`. Tailwind: `highlight`, `icon`, `warn-ink`, `bg-grad-sage-deep`. The default values equal the literals they replaced.

### Hard-coded colour audit
Kinds: **UI** = interface, converted to a token with the identical default value; **Keep-data** = data or meaning colour; **Keep-neutral** = black/white alpha effects or self-contained white tooltips with black text (readable on any theme); **Keep-fill** = white sheen or icon on a coloured data/status/sun fill. `bg-white/16` on the profile card was already a no-op in Tailwind (16 is not in the opacity scale); `bg-on-brand/16` behaves the same.

| File:line | Literal | Kind | Change |
|---|---|---|---|
| `index.css:30` | h1 text-shadow white .85 + 190 160 122 .28 | UI | `text-shadow: var(--shadow-heading);` |
| `index.css:85-86` | mask SVG `stroke='black'` | Keep (mask alpha) | none |
| `Style/App.css:4,5,26,30,35` | #f0f2f5 #6c5ce7 #d1d9e6 | dead file | delete file |
| `tailwind.config.js:38-40` | focusPurple #6c5ce7, focusDark #2d3436, neuBg #f0f2f5 | unused legacy | remove |
| `tailwind.config.js:107-118,127,141-142` | orbPulse keyframe+animation, neu-flat, neu-pressed (#d1d9e6, #c1c9d6, #ffffff, rgba(108,92,231)) | unused legacy | remove |
| `Pages/DailyRoutine.js:54-65` | routine palette | Keep-data | none |
| `Pages/DailyRoutine.js:348,360,598,610` | `bg-white` (behind `text-muted`) | UI | `bg-highlight` |
| same lines | `rgba(0,0,0,0.1/0.16)` shadows | Keep-neutral | none |
| `Pages/DailyRoutine.js:411-417` | white tooltip, `text-black`, `text-gray-500` | Keep-neutral | none |
| `Pages/DailyRoutine.js:631` | `text-white` check on a routine colour swatch | Keep-fill | none |
| `Pages/GoalsPage.js:67,70`, `Pages/TimeTrackPage.js:111,114`, `Pages/KanbanPage.js:171` | `"rgb(54 54 54)"` | UI | `"rgb(var(--chart-label))"` |
| `Pages/KanbanPage.js:166,167`, `Pages/FinancePage.js:118,119`, `Pages/HabitsPage.js:77,78`, `Pages/NotesPage.js:115,116` | `"#8A93A0"` | UI | `"rgb(var(--chart-axis))"` |
| `Pages/FinancePage.js:15,16` | income #22A06B, expense #E0606B | Keep-data | none |
| `Pages/SubjectsPage.js:14,50,127`, `components/subjects/SubjectTable.js:16` | default subject #E86562 | Keep-data | none |
| `components/subjects/SubjectTable.js:103` | `rgb(255 253 249 / 0.7)` | UI | `rgb(var(--surface) / 0.7)` |
| `components/subjects/SubjectTable.js:139` | `hover:bg-black/10` | Keep-neutral | none |
| `components/subjects/WeekBeads.js:63` | white inset on subject bead | Keep-fill | none |
| `features/subjects/parseTimetable.js:27-29` | subject palette | Keep-data | none |
| `Pages/Authpage.js:124` | `rgb(236_112_109/0.38)`, `rgb(255_255_255/0.9)` | UI | `rgb(var(--brand)/0.38)`, `rgb(var(--highlight)/0.9)` |
| `Pages/Authpage.js:171` | `rgb(255_255_255/0.95)` | UI | `rgb(var(--highlight)/0.95)` |
| `Pages/Authpage.js:171` | `rgb(120_190_150/..)`, `rgb(205_232_214/..)` (Google button green glow) | UI (changed 2026-10-08: it should follow the Accent) | `shadow-clay-sage` (`--shadow-clay-sage`, default value identical) |
| `Pages/Authpage.js:183-186` | Google logo #FFC107 #FF3D00 #4CAF50 #1976D2 | Keep-data (third-party mark) | none |
| `Pages/Authpage.js:227` | `border-white`, `hover:bg-white` on the coral panel | UI | `border-on-brand`, `hover:bg-on-brand` |
| `components/auth/LoginForm.js:33`, `RegisterForm.js:102`, `ForgotPasswordForm.js:36`, `ResetPassword.js:53`, `VerifyForm.js:123`, `ResetPasswordVerify.js:119` | `rgb(184_220_196/0.55)`, `rgb(255_255_255/0.9)` | UI | `rgb(var(--sage)/0.55)`, `rgb(var(--highlight)/0.9)` |
| `components/calendar/AttendanceGraphPopup.js:146`, `components/routine/EditRoutinePopup.js:86` | `bg-[rgb(190_160_122/0.3)]` | UI | `bg-[rgb(var(--shadow-color)/0.3)]` |
| `components/calendar/AttendanceGraphPopup.js:190,201,216` | black alpha | Keep-neutral | none |
| `components/routine/EditRoutinePopup.js:9-20,44,59,81` | routine palette / default #6366f1 | Keep-data | none |
| `components/ui/Modal.js:74,130` | `bg-[rgb(190_160_122/0.35)]` | UI | `bg-[rgb(var(--shadow-color)/0.35)]` |
| `components/ui/Switch.js:24` | `bg-white`, `rgb(190_160_122/0.4)` | UI | `bg-highlight`, `rgb(var(--shadow-color)/0.4)` |
| `components/ui/Button.js:24` | sun glow `rgb(230_180_0/0.5)`, white inset | Keep-fill (sun is fixed) | none |
| `components/ui/Button.js:26` | danger `text-white`, white inset on `bg-focus` | Keep-fill (status) | none |
| `components/ui/Badge.js:8` | `text-[rgb(133_79_11)]` | UI | `text-warn-ink` (keep `dark:text-warn`) |
| `components/ui/DeleteButton.js:11,13,17,19`, `components/ui/CardDeleteButton.js:17,21,28,32` | path `#000` (overridden by CSS), clipPath rect white | Keep (geometry) | none |
| `components/ui/RepeatButton.js:10` | white stroke on danger red | Keep-fill | none |
| `components/ui/fancyControls.css:17` | `rgb(45 71 89 / 0.12)` faint dark shadow | Keep-neutral | none |
| `fancyControls.css:37` | `#fff` bin on danger hover | Keep-fill | none |
| `fancyControls.css:78,85` | logout `#fff` icon/text on `--grad-hero` | UI | `rgb(var(--on-brand))` |
| `fancyControls.css:117,123,162,208,241` | danger reds | Keep-data (status) | none |
| `fancyControls.css:138,144,156,174,190,196` | black buttons with white icon/text, black shadows | Keep-neutral (self-contained) | none |
| `fancyControls.css:237` | ghost bin `rgb(20, 20, 20)` on cards | UI | `rgb(var(--ink-strong))`: a new token whose default is exactly `20 20 20`, so nothing changes by default and it still follows the text colour on dark themes |
| `components/common/LoadingSpinner.js:26,27` | mask `#000` | Keep (mask alpha) | none |
| `components/common/LoadingSpinner.js:97-118` | `rgb(214_192_162/0.3)` and `/0.18` | UI | `rgb(var(--shade)/0.3)` / `/0.18` |
| `components/routine/DonutChart.js:11` | DONE_COLOR #B8DCC4 | UI (done state = accent) | `'rgb(var(--sage))'` |
| `components/routine/DonutChart.js:12` | TICK_DONE #8FCDA6 | UI | `'rgb(var(--sage-mid))'` |
| `components/routine/DonutChart.js:23-25,54,56` | task palette, locked #cbd5e1, missed #ff3b3b | Keep-data | none |
| `components/charts/chartColors.js:5` | BRAND_HEX #EC706D | UI | live `tokenHex('--brand', '#EC706D')` |
| `components/charts/chartColors.js:6` | ACCENT_HEX #FFD700 (sun) | Keep (sun fixed) | none |
| `components/charts/chartColors.js:21,24` | black alpha tooltip | Keep-neutral | none |
| `components/charts/SpendingPuckStack.js:20`, `ProgressCubeStack.js:20` | category series | Keep-data | none |
| `components/charts/SpendingPuckStack.js:122,125`, `ProgressCubeStack.js:151,154` | `floodColor="#BEA07A"` | UI | remove the attribute, add `style={{ floodColor: "rgb(var(--shadow-color))" }}` (keep `floodOpacity`) |
| `components/charts/ProgressCubeStack.js:131,135` | white sheen on cubes | Keep-fill | none |
| `SpendingPuckStack.js:184,188`, `dashboard/BudgetGauge.js:68,72`, `dashboard/AttendanceHeatmap.js:166,175,244,248`, `Pages/AttendanceSkylinePage.js:497,506,623,627` | white tooltips/menus, black text | Keep-neutral | none |
| `components/dashboard/widgets/WidgetShell.js:50`, `TimeTrackCard.js:79` | white inset on coloured bars | Keep-fill | none |
| `components/dashboard/widgets/WidgetShell.js:37`, `components/ui/EmptyState.js:10` | `text-sage-deep` icon tiles | UI (OQ2) | `text-icon` |
| `components/dashboard/widgets/HabitsCard.js:56` | `linear-gradient(160deg,rgb(150_206_170),rgb(118_184_142))` | UI | `bg-grad-sage-deep` |
| `components/dashboard/widgets/NotesCard.js:11` | four pastel tints | UI | `bg-[rgb(var(--note-1))]` ... `--note-4` |
| `components/dashboard/Clock.js:50` | `${color}66` glow, white inset | Keep-fill | none |
| `components/dashboard/Clock.js:101` | M `#B8DCC4` | UI | `sage` from `chartColors()` |
| `components/dashboard/Clock.js:101` | H fallback `#FFD700`, S `#FFF3D6` cream tile on brand card | Keep (sun fixed / decorative) | none |
| `components/dashboard/DialTimer.js:207` | `text-white` on `bg-grad-hero` | UI | `text-on-brand` |
| `components/dashboard/ProfileCard.js:28` | `filled ? "text-white" : "text-on-brand"` | UI | `"text-on-brand"` (keep the cx call; `filled` is still used at lines 61-72) |
| `components/dashboard/ProfileCard.js:73,78` | `bg-white/16`, `border-white/20` | UI | `bg-on-brand/16`, `border-on-brand/20` (same modifiers, so Tailwind treats them exactly as before) |
| `components/subjects/AssignmentsPanel.js:48` | `text-white` on `bg-success` | Keep-fill | none |
| `components/layout/Navbar.js:112-113` | `bg-black/50` scrim, white camera icon | Keep-neutral | none |
| `Pages/FocusModePage.js:221,231` | green/red-500/600 | Keep-data (status) | none |
| `components/errors/ErrorScreen.js:13` | `rgb(236 112 109 / 0.25)` | UI | `rgb(var(--brand) / 0.25)` |
| tests and `features/scanner/__fixtures__` | subject colours | Keep (test data) | none |
| `src/logo.svg` | CRA asset, unused | Keep (out of scope) | none |
| `src/assets/animation/*.json` (10 Lottie files) | illustration colours | Keep-data (artwork, no text) | none |
| `public/index.html:7` | meta theme-color #E86562 | UI | updated at runtime (`metaColor`, same default) |
| `public/manifest.json` theme_color/background_color | static install colours | Keep (cannot change at runtime) | none |

---

## 2026-10-07 — Profile card mascot and Settings as cards

### The mascot fills the dashboard profile card, like a photo
- **Decision:** a chosen mascot now uses the photo's footprint, edge to edge. The card moved to `components/dashboard/ProfileCard.js` so it can be tested.
- **Layers, bottom to top:**
  1. The coral card itself (`bg-grad-hero`), as before.
  2. The mascot backdrop. It covers the whole card (`absolute inset-0`), like the photo: `bg-surface` with a `--sage` wash at 30% on top. That is the token mix you asked for, with no hex code.
  3. The mascot, standing on the card's bottom edge.
  4. The coral fade from the bottom. It is shorter than the photo's (gone by 40% of the height), so the face is not tinted. It ignores the pointer, and so do the text rows except their own buttons, so poking the mascot works everywhere, even at the top of its head.
  5. The label, the stats and "Change mascot".
- **Size:** the backdrop is a CSS size container. The mascot is a square of `min(125% of the card's width, the card's height)`.
  - A character fills about 62% of its sprite cell, more when it turns its head, and its face ends about 60% down.
  - So it comes out about 80% of the card's width. A turned head stays inside the card, and the face stays above the fade.
  - It scales on its own at every width, with no JavaScript measuring.
- **Readability:** on the light sage, white text would vanish. So in the mascot case, "Change mascot" and the "Gen Z" label sit on coral pills. The stats are always on the coral fade.
- **Unchanged:** the photo case and the empty case (the initial and "Pick a mascot").
- **Rejected:**
  - A 145%-wide mascot hanging off the bottom. The cap's brim was cut off when it turned, and the fade covered the face.
  - Measuring the card with a ResizeObserver. That is more code than the CSS size container needs.

### Settings is a grid of cards, each opening a pop-up
- **Decision:** the long Settings page is now:
  - a mascot header card, where "Choose mascot" opens the existing picker;
  - six clay cards, each with a lucide icon, a title and a one-line subtitle.
  
  Each card is a button that opens its existing controls in `Modal`. Nothing inside the controls changed.
- **Grouping:**

  | Card | Holds |
  |---|---|
  | Profile | the profile form |
  | Reminders | `RemindersSettings` |
  | Appearance | `FontSelector`, with a marked slot for the colour studio |
  | Dashboard and workspaces | `DashboardSwitcher`, then `WidgetManager` (workspaces first, because their menu opens downwards and the features list is long) |
  | Language | `LanguageSelect` |
  | Privacy and cookies | a link to `/privacy` and the cookie choice |

- **Changed from your suggestion:**
  - The mascot got its own header card instead of sharing "Profile and mascot". It is the thing a student changes most, and it shows the live mascot without opening anything.
  - "Language and theme mode" is just "Language". Dark mode currently mirrors light (see `tokens.css`), so a switch would do nothing visible. It belongs with the colour studio task.
- **Address:**
  - The open card is kept in the address as `?open=<id>`. Clicking a card adds a history entry, and closing goes back over it.
  - So the phone's back button closes a pop-up, and opening and closing never leaves a dead Back step.
  - `/settings?open=reminders` opens Reminders. Closing a pop-up opened by a link like that just clears the address.
  - Ids: `profile`, `reminders`, `appearance`, `dashboard`, `language`, `privacy`.
- **`Modal` (`components/ui/Modal.js`):** two opt-in props, used only by Settings, so no other pop-up changes.
  - `trapFocus`: focus moves into the pop-up, Tab and Shift+Tab stay inside it, and focus goes back to the card on close.
  - `fullHeightOnMobile`: a full-height sheet below the `sm` width.
    - It sits at `z-[1500]`, so it covers the phone tab bar. The tab bar and modals were both `z-[1000]`.
    - It stays below toasts and menus (`z-[2000]`), so "Profile saved" and the reminder messages still show on top.
  - Its animations now honour `prefers-reduced-motion` for every modal (framer-motion `MotionConfig reducedMotion="user"`). The cards skip their hover lift for those users too.
- **Cookie choice:** moved out of `PrivacyPage.js` into `components/consent/CookieChoice.js`, so the privacy page and Settings share one control. The privacy page looks and works the same.
- **Escape:** inside a pop-up, Escape closes it. In the workspace name boxes (rename and new), Escape still only cancels the typing (`stopPropagation` in `DashboardSwitcher.js`), as before.
- **Trade-off:** the profile form is rebuilt each time its pop-up opens. Half-typed changes are dropped if you close without saving, which the long page kept. In return, the form always shows the latest saved profile.
- **Rejected:** a separate settings route per group. A pop-up keeps the student on one page, and the address already makes each one linkable.

### Checked
- **Review:** the repository's reviewer agent read the diff. Its findings are fixed:
  - toasts hidden under the sheet;
  - the dead Back step;
  - the top row blocking pokes;
  - Escape in the workspace boxes;
  - an out-of-date spec.
- **Tests:** new tests for the cards, every pop-up and its controls, Escape and the close button, the focus trap, history (push, back, link), the deep link, the mascot and the picker, saving the profile, the cookie choice in Settings, and Escape in the workspace boxes. Also the profile card's three cases and the `Modal` options. All frontend and backend tests pass, and so does the `CI=true` build.
- **Headless Chromium, fake API:**
  - The profile card with four mascots at 1400 px and 375 px.
  - Settings at 1280 px and 360 px.
  - `?open=reminders` and `?open=privacy`, Escape, the back button, the language list inside its pop-up, and the sheet covering the tab bar.
- **Not checked:** a real phone, and real reminder saving against the server.

---

## 2026-10-06 — Mascots

### The mascots now follow the cursor (page-mascot library)
- **Decision:** the ten mascots are now live characters from [nilbuild/page-mascot](https://github.com/nilbuild/page-mascot) (MIT). The head turns toward the mouse, and a click makes it blink and react (a heart, a sparkle, a grin; dizzy after four quick pokes). This works in the page headers and in the big one on the dashboard profile card.
- **Same ten characters:** your ten picks were all in the library. Their library names are cap, kamran (Chill Dev), sloth, radio, rocket, scout (Goggle Bot), toaster, tv (Antenna Bot), cube (Box Bot) and drone (Violet Bot). The saved ids didn't change, so anyone who already picked one keeps it.
- **Not the whole library:** only the ten are copied in, as WebP and scaled to 810 px. The whole set is 1.8 MB. A page loads only the user's own mascot, about 185 KB for its two sheets. The picker and navbar use a 5 KB preview per mascot.
- **Code:** the library's component is copied into `components/common/Mascot.js`, not installed from npm. It's one small file and needs no build step for TypeScript. Its MIT licence sits next to the images in `public/mascots/LICENSE-page-mascot.txt`.
- **Phones:** there's no mouse, so the head stays facing forward; tapping still makes it react.
- **Checked in a browser:** the head follows the mouse on Subjects and the dashboard card, and a click shows the heart reaction.

### The mascot sits in the top-right corner of the pages
- **Decision:** your mascot (no card behind it, about 64 px tall, 48 px on phones) now sits at the right end of the page header on Subjects, Grades, Exams, Flashcards, Notes, Goals, Habits, Time, Budget, Assignments, Daily Routine, Deep Flow, Attendance and Settings. It lives in `components/common/PageMascot.js`.
- **Placement:** it is part of each header row, not floating over the page, so it never covers a button or scrolls over content. `PageHeader` carries it for the pages that use it; the five pages with their own headers carry it by hand. On Subjects the subtitle now wraps to two lines so the buttons and the mascot fit on the title row.
- **Default:** until you pick one, the sloth shows. It follows whatever you pick in the profile card.
- **Not added:** the dashboard (its profile card already shows the mascot) and detail pages (a subject, a flashcard deck, the routine viewer).
- **Checked in a browser:** Subjects, Deep Flow, Daily Routine, Attendance, Assignments and Settings at 1280 px wide. Not checked on a phone.

### Ten mascots you can pick as your profile picture
- **Decision:** the ten characters you liked are now mascots: Cap, Chill Dev (the bearded one), Sloth, and seven robots (Radio, Rocket, Goggle, Toaster, Antenna, Box, Violet). Pick one from the profile card on the dashboard ("Mascot" on hover, or "Pick a mascot" before you've set anything) or from the account menu in the navbar ("Choose mascot").
- **How it's stored:** `profile.mascot` holds the id. Picking a mascot clears an uploaded photo, and uploading a photo clears the mascot, so only one is ever active. `Avatar` also takes a `mascot` prop.
- **Images:** first cut out of your screenshots as PNGs; since replaced by the library's own sheets (see "The mascots now follow the cursor").
- **Profile card:** hovering the card now shows one button, "Change mascot", which opens the picker popup. It replaces the old "Change photo" / "Add photo" buttons, so the card no longer uploads photos. It is always visible on touch screens, which can't hover. The navbar menu still lets you upload a photo.
- **Not done:** the mascot doesn't react to anything yet (no animation, no tips). It is a picker only.

---

## 2026-10-07 — CI (`.github/workflows/ci.yml`)

- **Decision:** a small GitHub Actions workflow runs on every push to `main` and `feat/**` branches, and on pull requests to `main`. Two jobs run side by side: **Backend tests** (`npm ci`, `npm test`) and **Frontend tests and build** (`npm ci`, tests, then `CI=true npm run build`). About 3 minutes, free.
- **Why:** Vercel and Render already deploy from GitHub (the CD half), but nothing checked a change first, so a broken push to `main` would go live. The build step uses `CI=true` because Vercel does, and that turns lint warnings into failures.
- **Node 22 on the robot:** the backend test script uses `node --test` with file patterns, which needs Node 21 or newer.
- **Checked before pushing:** a clean checkout of the repo (no `.env`, none of my local files) was installed and tested the way the robot does: 82 backend tests, 418 frontend tests, and a strict build, all passing.
- **Not done, on purpose:** Docker, staging environments, automatic database migrations and browser end-to-end tests. They cost more upkeep than they save for a project this size.
- **Still to switch on by hand (GitHub and Render settings, not code):**
  - Render: Auto-Deploy set to "After CI checks pass", so a red build is never deployed.
  - GitHub: require the two checks on `main`. That also means changes go through pull requests, so it's best turned on once your friends start contributing.

---

## 2026-10-07 — Cookies: a secure sign-in, a cookie notice, and preferences on the account

### The sign-in is an HttpOnly cookie, not a token the page can read (`utils/sessionCookie.js`, `middleware/auth.js`, `services/api.js`)
- **Decision:** the server sets `ff_session` (HttpOnly, Secure in production, SameSite=Lax, 20 days, no Domain). The login reply no longer contains a token. The page keeps only a "signed in" marker (`focus_signedin`).
- **Why:** a token in `localStorage` can be read by any script that ever runs on the page. An HttpOnly cookie cannot.
- **No domain needed:** the app and API were on different addresses (Vercel and Render), and browsers block that kind of cookie. `frontend/vercel.json` now passes `/api` on to Render, so the browser sees one address. In development the same is done by the `proxy` setting in `package.json`, so `REACT_APP_API_URL` must stay unset.
- **CSRF guard:** a cookie-signed request that changes data must carry `X-Requested-With: FocusFlow`. Other websites cannot add that header without the CORS lock refusing them.
- **Upgrade path:** browsers still holding the old saved login send it once more. The server accepts it, sets the cookie, and the page then deletes the old token. Checked on your real session: the old token was gone afterwards and the dashboard kept working.
- **Cleaned up:** logout now clears the cookie on the server; an expired, invalid or deleted-account cookie is cleared; a cookie that has vanished while the page thinks it's signed in (`NO_TOKEN`) signs out cleanly. The renewal header `X-Refreshed-Token` was removed, because renewal now happens in the cookie.
- **Rate limits behind two proxies:** with Vercel in front, `trust proxy` is now 2 hops (`TRUST_PROXY_HOPS` to change it), otherwise every student would share Vercel's address. Someone calling Render directly could fake the address, so wrong passwords are also counted **per account** (`loginEmailLimiter`, 10 per 15 min).
- **Google sign-in bug found and fixed:** the button called `http://localhost:5555` directly, so it could never work on the deployed site. It now uses `/api`.
- **Trade-off:** Vercel stops waiting for a proxied call after about 30 s, so a request made while Render is waking up can fail once. The 503 page handles it and retries.

### Cookie notice, privacy page, and Google only on request (`features/consent/`, `components/consent/CookieBanner.js`, `Pages/PrivacyPage.js`)
- **Decision:** a notice on the first visit (sign-up and sign-in pages included) with **Accept all** and **Essential only**. `/privacy` lists every cookie and browser key, what the servers keep, who handles the data (Vercel, Render, Supabase, Gmail, Google), and lets the choice be changed. It is also in the account menu.
- **Why the choice is real:** the only optional third party is Google sign-in. Its script used to load on every page. It is now removed from `index.html` and loaded only after "Accept all", or when the student clicks Sign in with Google and agrees in a small prompt. With Essential only, no request goes to Google.
- **Honest limits:** Google Fonts is still loaded on every page (it is how the typefaces arrive), and the privacy page says so. FocusFlow has no ads or analytics. Bump `CONSENT_VERSION` if anything optional is ever added, so everyone is asked again.
- **Checked in Chrome:** banner on first visit; nothing requested from Google before a choice; Essential only then Google button shows the prompt, with no Google request.
- **Not done:** the privacy page points to the GitHub issues page for deletion requests; there is no "delete my account" button yet.

### Preferences follow the account (`preferences/useServerSync.js`, `USER_PREFERENCES`, `/api/preferences`)
- **Decision:** dashboard layout, workspace name, profile and mascot are saved on the account (one JSON document). On sign-in the account's copy wins. If the account has none yet, this browser's layout is uploaded. Changes are saved 1.5 s after the last edit, or straight away when the tab is hidden. If the server is asleep at start-up it tries again 3 times, 20 s apart.
- **Isolation:** signing out wipes this browser's copy, so the next person on the computer neither sees nor uploads it. Nothing is sent before the first load finishes, so a fresh browser can't overwrite a saved layout with defaults.
- **Not synced:** light or dark mode, language, sidebar folding and the cookie choice stay per browser. Very large pasted-in photos (over about 60 KB) are not uploaded; the mascot is.
- **Migration:** `backend/scripts/migrate-preferences.js` (also in `postgres-init.sql`). It was run on the live database; it only adds a table.
- **Checked end to end with two throwaway accounts (deleted afterwards):**
  - the first sign-in uploaded this browser's layout;
  - a mascot change reached the account within seconds;
  - signing out reset the browser, and signing back in brought the layout back;
  - a second account got defaults, not the first account's layout.

### Testing note
- The logout button uses the browser's own "Are you sure?" popup, which blocks automated clicks and looks out of place in the app. It is on the list in the README roadmap.

---

## 2026-10-07 — Staying signed in, and onboarding only for new accounts

### A sliding 20-day session (`backend/utils/session.js`, `middleware/auth.js`, `services/api.js`)
- **Decision:** a sign-in lasts 20 days. Whenever the app is used and the saved login is more than a day old, the server sends back a fresh one (`X-Refreshed-Token`) and the app saves it. A student is asked to sign in again only after 20 days of not opening the app.
- **Why:** you didn't want to sign in each visit, like other apps. The old login was a fixed 7 days and never renewed, so everyone was signed out after a week even if they used the app daily.
- **Rejected:** a plain 30-day login with no renewal. It signs out a daily user after 30 days, and it leaves a stolen login valid for 30 days.
- **Also:** CORS now exposes that header, so the browser can read it.

### Opening the site no longer asks you to sign in (`components/auth/GuestOnly.js`)
- **Cause:** the saved login was already kept, but "/" went to the login page and the login page never checked for it.
- **Fix:** "/", "/login" and "/signup" send a signed-in student straight to the dashboard.

### The welcome set-up appears only after a new account's verification code (`features/onboarding/needsOnboarding.js`)
- **Cause:** "has finished onboarding" was kept only in each browser's own storage, so any new browser, device or website address showed the set-up after sign-in.
- **Decision:** a flag is switched on when a new account's email code is accepted (or a Google account signs in for the very first time, `isNewUser` from the server) and switched off when the set-up is finished. Signing in never brings it back.
- **Trade-off:** the flag is also stored in the browser, so closing the tab half way resumes the set-up on that device. Profile choices (workspace name, pronouns) still live in one browser; syncing them across devices is a separate piece of work.
- **Checked in your Chrome:**
  - Signed in, "/", "/login" and "/signup" all land on the dashboard.
  - With this browser's preferences wiped (the old trigger), it opens straight to the page asked for.
  - With the flag on, the dashboard sends you to onboarding.
  - Without the flag, "/onboarding" sends you to the dashboard.
  - Your preferences were backed up first and restored afterwards.

---

## 2026-10-07 — Before deploying

### CORS locked to the app's own address (`backend/middleware/cors.js`)
- **Decision:** in production only `APP_URL` and the comma-separated `ALLOWED_ORIGINS` may call the API from a browser. In development any origin works, so localhost on any port is fine. Requests with no Origin header (email answer links, health pings) always pass.
- **Why:** the old code copied back whatever origin asked, so any website could use a logged-in student's browser to call the API.
- **Also:** it replaces both old CORS blocks in `server.js` (they did the same job twice), and the `cors` package is no longer used there.
- **Checked:** unit tests, plus a real HTTP call: the allowed origin gets 200 and 204 on preflight, and an unknown origin gets no CORS header and 403 on preflight.

### Seed script no longer holds a password (`backend/scripts/seed-user.js`)
- **Decision:** the password comes from `SEED_PASSWORD`, and the default account is `demo@example.com`, not your real address. The script deletes the account it seeds, so the old default could have wiped your real account.
- **Also:** the password and email were removed from two old plan docs. The old password still exists in git history, so change it anywhere you've used it.

### Vercel setup (`frontend/vercel.json`) and `backend/.env.example`
- **`vercel.json`:** unknown paths go to `index.html`, so reloading `/goals` doesn't give a Vercel 404. Real files (service worker, manifest, icons, mascots, `/static`) are served as files. `sw.js` is never cached, so updates reach phones.
- **`.env.example`:** lists every backend variable. It had been hidden by a line in `backend/.gitignore`, which I removed.
- **Checked:** `CI=true react-scripts build` passes. Vercel builds with `CI=true`, which turns lint warnings into errors.
- **Correction:** VAPID keys were not missing. They were already in `backend/.env`, so none were generated. New keys would have cancelled any phone that had already allowed notifications.

---

## 2026-10-06 — Git

### Loading and error-page work committed as three backdated commits, then merged into `main`
- **Why:** your request. Each commit has its author and committer date set to 2:00 PM Pakistan time, like the 24 Sept commit.

  | Date | Commit |
  |---|---|
  | 2 Aug 2026 | The logo loader on every loading state |
  | 5 Aug 2026 | The 404, 500, 503 and offline pages |
  | 18 Sept 2026 | The offline fallback page in the service worker, plus these docs |

- **Order:** the commits sit on top of the 6 Oct work in the history; only their dates are earlier.
- **Merge:** the merge commit into `main` carries today's date.
- **Left out:** `.claude/agents/reviewer.md`, your own uncommitted edit.

---

## 2026-10-06 — Loading animation and error pages

### The logo animation for every loading state (`components/common/LoadingSpinner.js`)
- **Decision:** every page and panel that loads data now shows the logo drawing itself, with a short caption ("Loading notes…"). It's the same animation as "Loading your dashboard…". There are two sizes: `PageLoading` for a page and `PanelLoading` for a panel inside one.
- **Where:**
  - Plain "Loading…" text was replaced in 7 pages (Subjects, Grades, Exams, Flashcards, a flashcard deck, the subject hub, Attendance), the 5 subject-hub panels and Reminders settings.
  - Notes, Goals, the Assignment board, Budget, Study streaks and Study hours had no loading state at all; they flashed their empty screen first. They now show the logo.
  - Five logo loaders that had no caption now have one.
- **`useFirstLoad`:** the feature hooks set `loading` again on every refresh after a save. The logo shows only on a page's first load, so it doesn't replace the page after every edit.
- **Checked in your Chrome:** opening 13 pages one after another, each showed its own captioned logo, and no plain text loader appeared anywhere.

### Error pages, each with its own look (`components/errors/`)
- **Shared layout (`ErrorScreen.js`):** a big clay status code where the middle "0" is the app's dial. Each page sets the dial differently.
- **404 Page not found:** dial at zero with a search icon. Shows the wrong address, with Go to Dashboard and Go back buttons.
- **500 Something broke on our side (`CrashScreen.js`):** a full dial. `ErrorBoundary` shows it when the app crashes. Buttons: Reload and Go to Dashboard. "What happened?" reveals the error, plus the stack in development. A page that failed to load after a new deploy is shown as "FocusFlow was updated, reload" instead of a crash.
- **503 Can't reach FocusFlow's server (`ConnectionGate.js`):**
  - `api.js` reports any request that gets no answer, or a 502/503/504.
  - The gate then asks `/api/health` itself, so one failed request never shows the page.
  - While the server is down, the dial counts down 15 s and retries. "Try now" retries straight away.
  - When the server answers again, the app reloads by itself.
- **You're offline (`ConnectionGate.js`):** shown on the browser's offline event, with a Wi-Fi-off icon in a sage dial. It reloads when the connection returns.
- **Offline fallback (`public/offline.html` and `sw.js`):** when a page can't load at all (no internet, or the site is unreachable), the service worker serves this saved page. It's network-first: only a failed page load uses the cache. API calls and scripts are never touched.
- **Not added:**
  - 401: an expired login already goes straight to sign-in.
  - 403: the app has no restricted pages.
  - 501: nothing in the app can produce it.
- **Checked in your Chrome (port 3001):**
  - The 404 page.
  - The 503 page, with API calls made to fail in that tab only. It counted down, and recovered by itself once calls worked again.
  - The offline page, which reloaded when "online" fired.
  - `offline.html`, served with the 3001 server stopped.
  - The 500 page is covered by tests (crash, deploy update, and the error boundary), not by a real crash.

---

## 2026-10-06 — Round gauges and the cube chart

### Every round progress graph now looks like the focus timer dial (`components/ui/ProgressRing.js`)
- **Decision:** the shared ring has four layers:
  - an outer ring of tick marks that light up in coral up to the value
  - a sunken clay groove, using the same pressed-in shadow (`--shadow-neu-inset`) as the sign-in fields
  - a thin arc inside the groove, ending in a sage knob
  - a raised disc in the middle for the number
- Large gauges also get dial numbers at the top, right, bottom and left, like the timer's 0/15/30/45: `0 25 50 75` for percentages and `0 1 2 3` for CGPA.
- **Where:** CGPA (dashboard snapshot and Grades page), Focus today, Goals page, Assignment board, the Goals widget and the Goal-progress widget. The "Task Progress" double ring (`GoalCard.js`) now uses the same gauge, with done and left in the middle.
- **Why:** you asked for the timer dial's style, with the sunken look of the email field, on all round graphs. The plain flat ring looked empty at 0.
- **How:** one shared component was changed, so every page updates together. The arc is about 60% of the old thickness, like the timer's. The larger gauges were made bigger to leave room for the numbers.
- **Daily Routine donut (`components/routine/DonutChart.js`):** given the same engraved look at your request, with no change to how it works. The slices sit in a sunken groove, a raised disc holds the count, and a ring of ticks lights up in sage over the slices that are done. Done slices are now light sage (`#B8DCC4`) instead of the dark emerald.

### Routine ticks are saved and read by date (`features/routine/routineDays.js`, `routineController.js`)
- **Bugs found:**
  1. The server stores the date a routine was ticked, but the app checked for a weekday name ("Wed"). A tick showed only until you reloaded the page.
  2. Tapping a slice on a day that hadn't come yet (e.g. Wednesday on a Tuesday) saved the tick to *today*.
  3. The server used the UTC date, so before 5 AM in Pakistan a tick was saved to yesterday.
  4. Dates sent back to the app were shifted a day early on a Pakistan-time machine (`toISOString` on a local-midnight date). Checked against the real database: 7 Oct came back as 6 Oct.
  5. The full-week view (`RoutineView.js`) sent the navbar the old list, so its counter never changed.
- **Fix:**
  - One set of date helpers decides "done": ticked on that weekday's date in the current Monday-to-Sunday week, in the phone's local time.
  - The app sends the slice's date, and the server checks it (`completionDate()` in `utils/helpers.js`) and saves exactly that date.
  - Dates go back as text (`TO_CHAR`).
  - Days that haven't come yet can't be ticked.
- **Navbar:** the Daily Routine pill now shows today's **done/total** (e.g. `1/1`), the same count as the donut, and opens the routine page. Before, it showed the number left, so a finished day read `00`. The dashboard's Routine cube uses the same count.
- **Rejected:** storing weekday names. A Monday tick would then count for every Monday.
- **Today's items can be ticked at any time (`canTick()` in `DonutChart.js`):** before, a slice turned red "missed" the minute its time arrived and could no longer be clicked. But you tick a routine *after* doing it. It still shows red until ticked. Missed past days stay locked (a done past day can still be unticked), and days that haven't come yet can't be ticked.
- **Checked end to end in your Chrome (port 3001):**
  - A temporary routine for today was added. The navbar showed `0/1`.
  - Clicking its slice changed the navbar and donut to `1/1`, with a light-sage slice. It stayed `1/1` after a reload.
  - The server saved 2026-10-06, today's local date. The dashboard's Routine cube showed 100%.
  - Wednesday's slice was locked.
  - The test routine was then unticked and deleted, leaving only your own routine.

### "Page Not Found" no longer crashes (`components/common/ErrorBoundaryRoute.js`)
- **Bug:** the catch-all `*` route used `useRouteError()`, which only works with a data router. The app uses `<BrowserRouter>`, so every unknown or old link crashed into the general "Something went wrong" screen.
- **Fix:** it's now a plain 404 page that uses `useLocation()`. It shows the address that wasn't found, plus Go to Dashboard and Go back buttons, in the same card design. The Refresh button was dropped because reloading a missing page doesn't help.
- **Checked:** in the real app, `/some-old-link` shows the page with no console errors, and Go to Dashboard works.

### Focus button uses a line icon
- The "▶" text character on Focus today is now the lucide `Play` icon, following the no-emoji rule.

### Cubes spread out to fill their card (`components/charts/ProgressCubeStack.js`)
- **Decision:** the chart takes the card's spare height and puts it between the cubes, up to 46 px per gap, then centres the stack.
- **Why:** at 0% the four cubes sat in a tight stack at the top, leaving a large empty area in the card.
- **How:** the SVG is absolutely positioned, so its own height never feeds back into the measured space.

---

## 2026-10-06 — Docs

### Root `README.md` added
- **Decision:** a full README at the repo root. It covers the features, tech stack, an architecture diagram, local setup, every environment variable, backend scripts, tests, the API routes, the scanner, reminders, security, deployment and the design system.
- **Why:** the GitHub page had no README. The only one was the Create React App boilerplate in `frontend/`.
- **Rule followed:** every claim was checked against the code. Example: routine reminders come 60 minutes early, not at the routine's time. The README uses no emoji, only shields.io badges and the app logo.
- **Left as is:** `frontend/README.md` (CRA boilerplate).
- **Git:** committed on `feat/student-pivot`, merged into `main` with a merge commit, and both branches pushed. `.claude/agents/reviewer.md` was again left out.

---

## 2026-10-06 — Subjects page

### Week chart redesigned as a small clay abacus (`components/subjects/WeekBeads.js`)
- **Decision:** a compact card in the page header, top right. It has one rod per day and one soft pastel bead per class, in the subject's own tint. Today's rod is sage and the busiest day's letter is coral. Pointing at a bead shows the class, time and room.
- **Why:** you found the heat grid too big and placed too low, and wanted something small, soft and unique that matches the clay design. No line, radar or circle chart.
- **Replaced:** `WeekHeat.js` and its test, which were deleted.

### Subjects shown as a periodic table (`components/subjects/SubjectTable.js`)
- **Decision:** each subject is a square "element" (course code as the symbol, credit-hour dots, dashed edge for labs). One large element in the grid's gap shows the full details. A key row (Theory, Labs, each day) lights matching subjects.
- **Why:** you asked for the layout used in the portfolio's toolbox table. The plain cards repeated the same text ten times and were hard to scan.
- **Rejected:** keeping the cards and only restyling them.

### (Replaced) Week heat grid replaces the number tiles (`components/subjects/WeekHeat.js`)
- **Decision:** a day × hour grid lit in each subject's colour, with today's column in sage and the busiest day in coral.
- **Why:** you chose option A over a pulse line and a radar shape.
- **Status:** you said you don't like the current look (too big, placed too low). A smaller, softer version near the top is still to be designed.

### Shared icon tile is sage (`components/ui/EmptyState.js`, `components/dashboard/widgets/WidgetShell.js`)
- **Decision:** the empty-state and widget icon tile uses a sage background and sage icon.
- **Why:** the cream tile with a pale icon looked white. Changing the one shared component fixes every page at once instead of patching pages one by one.

### Google sign-in button: sage drop shadow, no outline (`Pages/Authpage.js`)
- **Why:** your request. A shadow keeps the clay look; the outline looked like a form field.

---

## 2026-10-05 — Scanners

### Unknown text is kept, never dropped (`features/scanner/parse*.js`, `ScanImportModal.js`)
- **Decision:**
  - Text in a row that isn't a date, time, course or room goes into the item's Notes.
  - Lines that couldn't be used at all are listed on the review screen.
  - If nothing is found, the screen shows what the scanner read.
- **Why:** other students' portals will look different, and silent data loss was the main complaint.
- **Rejected:** writing a parser per university. That can't cover unknown formats.

### Parsers return `{ rows, unread }`; `parseX()` wrappers still return just rows
- **Why:** the review screen needs the unused lines, while older callers and tests only need rows.
- **Rejected:** attaching `unread` to the array. Jest's deep equality then fails on otherwise equal results.

### More exam types: Presentation, Viva, Practical; quiz and test numbers kept
- **Why:** these appear on real date sheets and were being labelled "Final exam".
- **How:** "Project", "Assignment" and "Deadline" only count when they appear as a heading. A course like "Software Project Management" isn't a project.

### Rule-based parsing with Tesseract.js in the browser, no AI service
- **Why:** it's free (your rule: no paid AI), nothing leaves the phone, and it works offline once loaded.
- **Cost:** OCR misreads letters. Every scan therefore goes through an editable review screen.

### Timetable re-scan fixes (`features/subjects/parseTimetable.js`, `scanner/kinds/subjects.js`)
- **Bug 1:** an OCR-garbled code (`CcM(C381`) glued that row's class times onto the course above.
  - **Fix:** a row with a title, a credit number and its own times starts a new course, even without a readable code.
- **Bug 2:** a misread code (`CSSC332L`) created a duplicate subject.
  - **Fix:** when codes differ, match by name. A lab never matches its theory course.
- **Other rules:**
  - A missing end time no longer drops the class.
  - A missing teacher is saved as "TBA".
  - A scanned "TBA" never overwrites a real name.
- **Tests:** built from the real OCR output of your two screenshots, plus 24 OCR runs at different scales and filters.

### 12-hour times everywhere (`features/schedule/todayClasses.js` → `fmt12`, `fmtRange`)
- **Why:** your request. Data is still stored as 24-hour "HH:MM", so sorting and reminders don't change. Only the display is 12-hour.

### Room shown for every class
- **Why:** your request. The room is important on the day.

---

## 2026-10-05 — Security

### Rate limiting re-enabled (`backend/middleware/rateLimiters.js`)
- **Library:** `express-rate-limit` (already a dependency).
- **Limits:**

  | What is limited | Limit |
  |---|---|
  | Whole API | 2000 per 15 min |
  | Wrong passwords | 10 per 15 min |
  | Emails sent | 8 per 15 min |
  | Code guesses | 10 per 15 min |

- **Why it failed before:**
  - A global cap of 100 per 15 min is too low, because one dashboard load makes many calls.
  - There was no `trust proxy`, so behind Render every user would share one IP.
- **Fix:** `app.set('trust proxy', 1)`, plus realistic limits.

### Deleted accounts are signed out (`backend/middleware/auth.js`, `frontend/src/services/api.js`)
- **Decision:** after verifying the JWT, check that the user still exists.
  - A missing user gets a 401 with `USER_NOT_FOUND`.
  - The app clears the saved login and goes to `/login`.
- **Why:** a deleted account's token kept the app open, and then every save failed.
- **Details:**
  - A found user is remembered for 60 s, so this isn't a database query on every request.
  - If the database is briefly down, the request is let through, so nobody is signed out by an outage.

---

## 2026-10-06 — Git

### Work committed in four commits and merged into `main`
- **Commits:** timetable re-scan fix, then security, then scanners, then the Subjects page redesign with the docs.
- **Date:** the timetable fix commit is dated 24 Sept 2026, as you asked.
- **Merge:** `feat/student-pivot` was merged into `main` with a merge commit (same style as the earlier PR merges), then both branches were pushed.
- **Left out:** `.claude/agents/reviewer.md`, your own uncommitted edit.

## 2026-10-05 — Git

### Scanner commit dated 24 Sept 2026
- **Why:** you asked. It was done by rebasing and setting both the author and committer dates on that one commit, then pushing to `feat/student-pivot`.

---

## Earlier (before this log existed)

- **Claymorphism theme:** cream, coral, sage and sunshine colours, defined as CSS variables in `design/tokens.css` and used through Tailwind. One place to change colours.
- **Line icons only (lucide), no emoji:** in the app, emails and pop-ups. Emoji render differently on every phone and in every email client.
- **Hosting plan:** Vercel for the frontend, Render for the backend (with a keep-alive ping so the per-minute reminder job keeps running), Supabase for Postgres. All have free tiers.
- **Reminders via web push (VAPID) and email:** installed as a PWA, so no Play Store is needed.
