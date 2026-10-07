// Colour codes that are allowed in the app's code (checked by colorGuard.test.js). Everything else must
// be a design token, so the student's theme reaches it: rgb(var(--token)) or a token class (see tokens.css).
// Allowed: data colours (subject, routine, category, status, third-party logos), neutral black/white
// effects that are readable on any theme, fallbacks and help text. One entry per file, with the reason.
// Never add something that is part of the interface's own look: make it a token instead.
export const COLOR_ALLOWLIST = [
  { file: 'src/Pages/Authpage.js', literals: ['#FFC107', '#FF3D00', '#4CAF50', '#1976D2'], reason: "Google's logo colours (a third-party mark)" },
  { file: 'src/Pages/DailyRoutine.js', literals: ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#a855f7', '#22c55e', '#e11d48', '#7c3aed'], reason: 'Routine colours the student picks (data)' },
  { file: 'src/Pages/FinancePage.js', literals: ['#22A06B', '#E0606B'], reason: 'Income and expense colours (meaning)' },
  { file: 'src/Pages/SubjectsPage.js', literals: ['#E86562'], reason: 'Default colour for a new subject (data)' },
  { file: 'src/components/calendar/AttendanceGraphPopup.js', literals: ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.3)'], reason: 'Black shadows and rings, readable on any theme (neutral)' },
  { file: 'src/components/charts/ProgressCubeStack.js', literals: ['#fff'], reason: 'White sheen on a data-coloured cube (fill)' },
  { file: 'src/components/charts/categoryColors.js', literals: ['#EC706D', '#F5C842', '#8FCDA6', '#F4A98A', '#9EC3EA', '#D7B98E', '#B3A4E6', '#7CC7C0', '#E9A3C9', '#B9C97E', '#8FB3F0', '#E8B66A'], reason: 'Category chart colours (data); the first follows the brand on a custom theme' },
  { file: 'src/components/charts/chartColors.js', literals: ['#EC706D', '#FFD700', '#B8DCC4', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.12)'], reason: 'Fallbacks when a token cannot be read, the fixed sun colour, and a neutral black tooltip shadow' },
  { file: 'src/components/common/LoadingSpinner.js', literals: ['#000'], reason: 'Mask alpha (only the shape matters, never painted)' },
  { file: 'src/components/dashboard/Clock.js', literals: ['rgba(255,255,255,0.45)', '#FFD700', '#FFF3D6'], reason: 'White sheen, the fixed sun colour and the cream seconds tile on the clock card (fill)' },
  { file: 'src/components/routine/DonutChart.js', literals: ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#a855f7', '#22c55e', '#e11d48', '#7c3aed', '#cbd5e1', '#ff3b3b'], reason: 'Task palette, locked and missed colours (data)' },
  { file: 'src/components/routine/EditRoutinePopup.js', literals: ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#a855f7', '#22c55e', '#e11d48', '#7c3aed'], reason: 'Routine colours the student picks (data)' },
  { file: 'src/components/studio/RolePicker.js', literals: ['#EC706D', '#000000'], reason: 'Placeholder and help text showing what a colour code looks like, and the neutral starting value for the colour box (not painted)' },
  { file: 'src/components/subjects/SubjectTable.js', literals: ['#E86562'], reason: 'Default colour for a subject (data)' },
  { file: 'src/components/subjects/WeekBeads.js', literals: ['rgb(255 255 255 / 0.85)'], reason: 'White inset on a subject-coloured bead (fill)' },
  { file: 'src/components/ui/DeleteButton.js', literals: ['#000', '#fff'], reason: 'Icon geometry: a path overridden by CSS and a clip rectangle' },
  { file: 'src/components/ui/RepeatButton.js', literals: ['#fff'], reason: 'White stroke on the danger red (fill)' },
  { file: 'src/components/ui/fancyControls.css', literals: ['rgb(45 71 89 / 0.12)', '#fff', '#ff342b', '#e0271f', 'rgb(20, 20, 20)', 'rgba(0, 0, 0, 0.164)', 'rgb(255, 69, 69)'], reason: 'Danger reds (status), self-contained black buttons with white icons, white bin on danger and a faint neutral shadow' },
  { file: 'src/features/subjects/parseTimetable.js', literals: ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#4F46E5', '#0D9488', '#B45309'], reason: 'Subject colour palette (data)' },
];
