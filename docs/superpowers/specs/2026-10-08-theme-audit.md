# Theme audit (final quality gate)

Branch `feat/theme-audit`. No new features: find and fix problems in the colour-theme feature
(theme engine, Design Studio, theme everywhere). At least two rounds: audit, fix, re-audit.

## Scope (from the owner)
1. Contrast matrix for the default and every library palette, in `decision.md`. Fix anything under WCAG AA.
2. Hard-coded colour sweep across frontend and backend; check the allowlist is tight.
3. Edge cases with tests: corrupted or partly missing stored theme, theme from an older version, two devices
   (the account copy wins), offline, quick palette switching, sign out and in, reset, long sessions (no memory growth).
4. Performance: applying a theme re-renders the app at most once, feels instant, no flash of default colours on load
   or reload; confirm the inline script.
5. Light/dark toggle with custom palettes: decide, document, test.
6. Accessibility of the Studio and Settings: keyboard order, labels, focus return, reduced motion.
7. Both test suites, `CI=true` build, email previews; screenshots of main screens under three themes.
8. README, `decision.md`, `flow.md`.

## Method
- Round 1: I audit (matrix, sweep, browser screenshots); the tester agent writes the edge, performance and mode tests
  and stops on real defects; an accessibility audit agent checks the Studio and Settings in a real browser.
  I fix every real defect with a test.
- Round 2: the reviewer agent re-audits the fixes and the areas the first round did not reach; fix, then re-run everything.

## Decisions needing the owner
- The default palette is still exempt from the contrast rules (white on coral 2.96:1, muted on cards 4.46:1), as
  chosen in the theme-engine task. Changing it changes how the default looks, so it stays unless the owner says so.

## Out of scope
New features, new palettes, anything needing a database change.
