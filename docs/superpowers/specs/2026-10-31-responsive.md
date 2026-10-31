# Responsive pass (2026-10-31)

Goal: every page works from a 320 px phone to a large monitor. Laptop (1280+) looks exactly as today. Signed-out pages may get a different phone layout.

## Shared rules (everyone follows these)
- Breakpoints are Tailwind's: sm 640, md 768, lg 1024, xl 1280. Additions are mobile-first, so widths at and above today's layout do not change.
- **Navigation:** the sidebar is shown from `lg` (1024) up. Below `lg` the existing bottom tab bar (with a "More" sheet) is the navigation. The top bar stays on every width. (Before: sidebar from 768, which crowded tablets and small laptop windows.)
- Page gutter: `px-4` on phones, `sm:px-6`, then whatever the page already uses.
- No horizontal page scroll at 320 px. Wide things (tables, boards, scenes) scroll sideways **inside their own card** (`overflow-x-auto`), never the page.
- Text that may be long uses `truncate` (with `title`) or wraps (`break-words`); flex children that must shrink get `min-w-0`; button rows get `flex-wrap`.
- Tap targets are at least 44 px on touch widths; inputs use 16 px text on phones so Android/iOS do not zoom.
- Card grids: 1 column on a phone, 2 on `sm`/`md`, today's count from `lg`. Avoid fixed pixel widths above 300 px; use `w-full max-w-[...]`.
- Modals/sheets fit a 320 x 568 screen: `max-h-[90dvh]` with the body scrolling and the close button always visible.
- Phone-only layouts are a separate block (`md:hidden` / `hidden md:block`), never a rewrite of the desktop one.
- Colours from design tokens only, no emoji, lucide icons only. Keep file line endings. Tests for each behaviour or layout switch added.

## Audit (filled in during the work)
See the table at the bottom of this file.

| Area | Width | Problem | Fix |
|------|-------|---------|-----|
