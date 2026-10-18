# Subjects page: a 3D Rubik's cube instead of the periodic table

## What the owner asked for
- Replace the periodic-table boxes with a **3D Rubik's cube** in the centre of the Subjects page, like the
  owner's reference (a portfolio hero: a floating Rubik's cube with letters on its stickers and small cards around it).
- The cube is **big**, fits the screen, **floats**, and **spins by itself in a loop, showing the subjects one by one**.
- Subjects are shown on the cube's stickers. **Clicking a subject sticker makes the cube solve itself** and then show
  that subject's **detail card**: name, code, teacher, room (LR), class timing, **attendance percentage** and how many
  classes were attended.
- **Mascot on the left**, a little bigger. **Your Week graph on the right** (the week timeline).
- **Import timetable, Add subject and Progress graph buttons move under the cube.**

## Design decisions (lead's reading of the request)
- **Stickers.** The cube is 3 x 3 x 3. Subjects fill sticker slots in order: front face (9), right face (9), top face (9),
  then left, back, bottom (54 slots). Theory subjects first, then labs. A subject sticker is a soft clay tile in the
  subject's colour with its course code; the other stickers are plain cream clay tiles, so the cube still reads as a
  Rubik's cube. The cube body (gaps between stickers) is a dark ink tone.
- **Idle loop.** The cube floats (gentle bob) and turns slowly; every few seconds it does one layer twist (a real
  Rubik's move, stickers travel with their pieces) and a small caption under the cube names the subject currently
  "featured" (its sticker glows), cycling through every subject. Twists are remembered so the cube can be solved.
- **Click a subject.** The idle loop stops, the cube **solves itself** by playing the remembered twists backwards
  quickly, turns so the clicked subject's face is in front, the sticker lifts, and the **detail card** floats in next to
  the cube. Closing the card resumes the loop.
- **Detail card.** Code and name, Theory or Lab, teacher (TBA when none), credit hours, an attendance ring with the
  percentage and "6 of 8 classes attended" (warning tone under 75%, "No attendance yet" when none), every class slot
  with day, 12-hour time and room (today first, Today pill), and Open, Edit, Delete.
- **Reduced motion.** No float, no twists, no spin: the cube stands still and a click shows the card at once.
- **Accessibility.** Subject stickers are buttons with labels ("CSC312, Web Engineering"); a visually hidden list of
  all subjects (buttons) gives the same choice without the 3D cube; the card is a labelled dialog-like region with a
  close button; Escape closes it.
- **Layout.** Desktop: mascot left, cube centre, week timeline right, buttons under the cube. Phones: mascot and its
  speech bubble small at the top, then the cube (fits the width), the buttons, the detail card when open, then the
  week timeline. The filter chips (Theory, Labs, days) are removed: the cube has no boxes to light up.
- **Kept:** the header (without the header mascot), add/edit modal, import modal, delete confirm, past-terms (archived)
  section with restore, empty state, freshness after add/edit/delete/import, the dashboard refresh.
- **Removed:** the periodic-table boxes (`SubjectTable` mosaic) and the rotating prism (`SubjectCube`).

## How the twist works (no library)
Each of the 26 visible pieces keeps a position (x, y, z in -1..1) and an orientation matrix. A twist of one layer
animates only that layer's pieces from `rotateX(0deg) matrix3d(M)` to `rotateX(90deg) matrix3d(M)` (same function
list, so the browser animates only the rotation), then bakes the result into `M` and resets the rotation without a
transition. Pure helpers (`applyMove`, `inverse`, `solveSequence`, `assignStickers`) are unit tested.

## Rejected
- three.js or any 3D library (heavy; CSS 3D is enough for 26 small pieces).
- A cube that only spins as one block (the owner wants it to solve itself, which needs real layer twists).
