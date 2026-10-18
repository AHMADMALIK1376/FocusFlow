# Subjects page: full periodic table and a 3D atom chart

## What the owner asked for
- Redesign the Subjects page as a **full periodic table** (every subject an element), with the graph on the **right** of the table.
- The graph is an **atom chart**, in 3D, in the clay style of the rest of the app: the **overall %** is the **nucleus**, every subject is an **orbit ring** in its element colour.
- A switch with three views: **One** (zoom into one subject), **All** (every orbit), **Overall** (the nucleus grows, orbits shrink back).
- A small second switch for the metric: **Attendance** or **Grade**. Both exist for every view.
- Overall attendance = total classes attended / total classes across all subjects (pooled, not an average of averages; the backend already does this). Overall grade = weighted by credit hours.
- The table is also the selector: pointing at or tapping an element selects that subject in the chart.
- Must work on a phone first (the owner uses the app as an Android PWA): on a narrow screen the graph goes under the table and its switches stay easy to reach.

## Data contract (shared by all parts)
`features/subjects/subjectStats.js` (pure) and `useSubjectStats()` produce:

```
stats = {
  subjects: [{ id, code, name, color, creditHours, isLab,
               attendance: { attended, total, pct },      // pct is null when total is 0
               grade: { pct, letter, hasGrades } }],       // pct null when no grades yet
  overall: { attendance: { attended, total, pct },
             grade: { pct, letter, credits } },            // credit-weighted; subjects without grades are left out of the weighting
}
```

`<AtomChart>` (`components/subjects/AtomChart.js`) props:
`{ stats, mode: "one"|"all"|"overall", metric: "attendance"|"grade", selectedId, onSelect(id), onModeChange(mode), onMetricChange(metric) }`.
It renders the switches (top of its own panel), the chart, and a plain text/table alternative for screen readers.

## Parts
1. **Data** (`subjectStats.js`, `useSubjectStats.js`, tests; backend only if truly needed and additive): per-subject attendance and grade, pooled overall attendance, credit-weighted overall grade. Reuse `gpa.js` (`subjectPercent`, `letterFor`) and `subjectAttendanceAPI.getOverview`. A way to load every subject's grades at once if the existing API needs one request per subject.
2. **Chart** (`AtomChart.js` + test): CSS 3D (perspective and tilted orbit planes, framer-motion for the morph between views), no new library, colours from design tokens plus each subject's own colour, respects `prefers-reduced-motion`, large touch targets, accessible text alternative.
3. **Page and table** (`SubjectsPage.js`, `SubjectTable.js`, tests), after 1 and 2 exist: the full periodic table look (atomic number, symbol, name, credit hours as the "mass", attendance chip, labs as their own detached row like the lanthanides), the graph panel on the right on wide screens and under the table on phones, selection shared between table and chart.

## Rejected
- three.js or any 3D library (heavy, not needed for tilted rings).
- Averaging percentages for the overall figure (a subject with 2 classes would weigh as much as one with 40).
- Hiding a metric behind a menu (the owner asked for a small visible switch).
