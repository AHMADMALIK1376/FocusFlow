# Theme everywhere (your colours on every screen and email)

**Date:** 2026-10-08
**Branch:** `feat/theme-everywhere`

Goal: the colours a student picks in the Design Studio show on every surface, not only inside the app: the sign-in
pages, the error and offline pages, the loader, charts, the sign-in illustrations, and reminder emails. **With the
normal FocusFlow colours, everything must look exactly as it does today** (web pages and emails).

## Pages you see before signing in

Most of these already use the colour tokens, so they follow the theme as soon as it is on the page. What changes:

- **The sign-in page after signing out keeps your colours.** Today signing out wipes the colours, so the sign-in page
  is always coral. Now the browser remembers the theme of the last person who signed in on it
  (`focusflow:theme.device`, colour codes only). When someone else signs in, their own account colours replace it.
  - Trade-off (shared lab computers): the next person sees the previous student's colours on the sign-in page. It
    holds no personal data. To clear it: "Reset to FocusFlow colours" in the Design Studio before signing out, or
    clear the site's data in the browser. The privacy page says this.
- **Google button glow** on the sign-in page was a fixed green; it becomes a token that follows your Accent.
- **Error pages (404, 500, 503, offline):** the small app icon at the top is coral. With another brand colour it
  becomes a tile in your brand colour with the FocusFlow mark (same rule as the loading logo).
- **Splash screen and loading logo** before the app has fully started now read the remembered theme too.
- **`offline.html`** (the page the phone shows when the site cannot load at all) gets the same tiny colour script
  as the main page, so it opens in your colours.

## Things that stay in FocusFlow colours, and why

- **The installed app icon and `manifest.json`:** the phone reads them once when the app is installed. They are the
  same for everyone and cannot change per student.
- **Notification pictures** (`public/notify`): the phone draws them, outside the app. The background worker that
  shows them cannot read your theme, and colouring them per student would mean making pictures on the server for
  every reminder. They stay as they are, like the app icon.
- **Data colours** (subject colours, routine colours, income/expense, the Google logo): they are your data or
  someone else's logo, not app colours.

## Charts and illustrations

- **Category charts** (budget pucks, home cubes): the first colour follows your Brand and the second your Accent.
  The others are picked from a fixed list so no two categories look alike (a test checks every ready-made palette).
- **Sign-in illustrations:** kept, and recoloured when they load. Only their blue and purple decoration turns with
  your brand colour; skin, hair, white and yellow stay. Replacing the art would be much more work for little gain.

## Emails

- Reminder emails use your saved theme (looked up by your account when the email is sent). Sign-up and password
  codes keep the normal look: they are security emails and should always look the same.
- The colours come from the same code as the app (a copy of the theme engine, kept in step by a test), so an email
  matches what you see in the app. Every text colour is checked for readability, also on dark and bold themes.
- Icons are recoloured to match any colour (a small free image library, `pngjs`, pure JavaScript, works on Render's
  free plan). If anything goes wrong the nearest ready-made icon colour is used.
- **Theming can never stop an email.** Any problem (no saved theme, a broken one, a database hiccup, an icon
  error) sends the normal-looking email instead.
- `scripts/preview-emails.js` now writes every email in three themes: normal, a bold one and a dark one.

## A guard so it does not come back

A test scans the app's code for hard-coded colour codes. A new one fails the tests and says how to fix it (use a
token) or how to allow it (add it to the allowlist with a reason). A second test does the same for the email
templates.

## Not changing

No database change, no migration. The theme already lives in the saved preferences. One new library: `pngjs`
(backend only, free, no build step).
