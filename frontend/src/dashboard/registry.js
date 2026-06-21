import { lazy } from 'react';

export const WIDGETS = [
  // Existing widgets
  {
    id: 'goals',
    titleKey: 'widgets.goals',
    icon: '🎯',
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/GoalCard')),
  },
  {
    id: 'uniCalendar',
    titleKey: 'widgets.uniCalendar',
    icon: '🗓️',
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/UniCalendar')),
  },
  {
    id: 'dailyTimetable',
    titleKey: 'widgets.dailyTimetable',
    icon: '⏱️',
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/DailyTimetableCard')),
  },
  {
    id: 'academic',
    titleKey: 'widgets.academic',
    icon: '📅',
    defaultOn: true,
    component: lazy(() => import('../components/calendar/AcademicCalendar')),
  },
  {
    id: 'focus',
    titleKey: 'widgets.focus',
    icon: '⚡',
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/FocusTimer')),
  },
  // New widget cards (Req 5)
  {
    id: 'metrics',
    titleKey: 'widgets.metrics',
    icon: '📈',
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/widgets/MetricsCard')),
  },
  {
    id: 'taskSchedule',
    titleKey: 'widgets.taskSchedule',
    icon: '🗒️',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/TaskScheduleCard')),
  },
  {
    id: 'progressRing',
    titleKey: 'widgets.progressRing',
    icon: '🟣',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ProgressRingCard')),
  },
  {
    id: 'activityGrid',
    titleKey: 'widgets.activityGrid',
    icon: '🟩',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ActivityGridCard')),
  },
  // 10 new feature widgets
  {
    id: 'notes',
    titleKey: 'widgets.notes',
    icon: '📝',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/NotesCard')),
  },
  {
    id: 'goalsx',
    titleKey: 'widgets.goalsx',
    icon: '🎯',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/GoalsCard')),
  },
  {
    id: 'habits',
    titleKey: 'widgets.habits',
    icon: '🔁',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/HabitsCard')),
  },
  {
    id: 'kanban',
    titleKey: 'widgets.kanban',
    icon: '🗂️',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/KanbanCard')),
  },
  {
    id: 'timetrack',
    titleKey: 'widgets.timetrack',
    icon: '⏲️',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/TimeTrackCard')),
  },
  {
    id: 'finance',
    titleKey: 'widgets.finance',
    icon: '💰',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/FinanceCard')),
  },
  {
    id: 'shopping',
    titleKey: 'widgets.shopping',
    icon: '🛒',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ShoppingCard')),
  },
  {
    id: 'mood',
    titleKey: 'widgets.mood',
    icon: '🌤️',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/MoodCard')),
  },
  {
    id: 'eventsx',
    titleKey: 'widgets.eventsx',
    icon: '📆',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/EventsCard')),
  },
  {
    id: 'contacts',
    titleKey: 'widgets.contacts',
    icon: '👤',
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ContactsCard')),
  },
];

export const WIDGET_BY_ID = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));
export const ALL_WIDGET_IDS = WIDGETS.map((w) => w.id);
