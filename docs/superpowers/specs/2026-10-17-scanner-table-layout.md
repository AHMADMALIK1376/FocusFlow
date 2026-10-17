# Timetable scanner: read the table by position, not by text line

## Problem (reported by the owner, with screenshots)
1. A portal row whose title wraps onto 2 or 3 lines comes out garbled. "ADVANCE DATABASE MANAGEMENT SYSTEMS LAB / MS. ZILL E HUMA MINHAS / TUE 08:00 11:05 COMP LAB4" became the course name "Systems Lab Minhas Ue 08 00 11 05 Comp Lab4 M ," with teacher TBA. "ADVANCE DATABASE MANAGEMENT SYSTEMS" became "Fa Database Nagemen".
2. After a re-scan that adds a new subject, the subject is saved but a graph (the one that lists all subjects) does not show it.
3. Some class times are shown wrongly in the app, although the reminder notification uses the right time.
4. A re-scan must compare every existing subject with the new table and update anything that changed (time, teacher, code, name, credits), and add only genuinely new subjects. The compare logic exists (`scanner/reconcile.js`, `kinds/subjects.js`); the damage comes from the garbled reading in 1.

## Cause of 1
Tesseract reads the page line by line (`ocr.js`, page-segmentation mode 6). In a wrapped row the cells are vertically centred, so one table row becomes several text lines that mix cells of neighbouring rows (title fragment above, code and times in the middle, teacher fragment below). `parseTimetable.js` then glues lines by text patterns, which cannot recover the row.

## Plan
- **A. Layout-aware reading (free, on the device).** Ask Tesseract for word boxes (`data.words`, each with a bounding box). Rebuild the table from geometry: find the header row (Section, Course Code, Title, Credit Hr, Instructor, Schedule) to get the column x-ranges; use the section number / course code of each row as its anchor; assign every other word to the nearest row by its vertical centre and to a column by its x position. Join each cell's words top to bottom. Feed the rebuilt tab-separated rows to the existing `parseTimetable`, which already handles tab-separated cells. If no header or anchors are found, fall back to today's line-based reading, so nothing gets worse.
- **B. The graph.** Find which graph lists the subjects and why a subject added by the importer does not appear (stale context / not refetched / filtered), and fix it at the source.
- **C. Time display.** Find where class times are formatted for display and why some are wrong (12-hour guess, end before start, stored vs shown, timezone), fix it, and make sure what is stored and what is shown agree.
- Re-scan behaviour (4) is verified by tests with a wrapped-row fixture: unchanged rows stay "same", a changed time or teacher shows as "changed", a missing row is not touched, a new row is added.

## Rejected
- Any paid or cloud OCR or AI service (rule: free only, and the owner does not want data leaving the device).
- More text-pattern rules on the current line output: it is the wrong input, and each rule would fix one table and break another.
