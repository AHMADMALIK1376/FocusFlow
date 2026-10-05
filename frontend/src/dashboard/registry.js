import { lazy } from 'react';
import {
  CalendarDays, CalendarRange, CircleDot, ClipboardList, Clock, Grid3x3, Repeat, SquareKanban, StickyNote, Target, Timer, TrendingUp, Wallet, Zap,
} from 'lucide-react';

// Widget icons are lucide line icons, like the nav bar.

export const WIDGETS = [
  // Existing widgets
  {
    id: 'goals',
    titleKey: 'widgets.goals',
    icon: Target,
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/GoalCard')),
  },
  {
    id: 'uniCalendar',
    titleKey: 'widgets.uniCalendar',
    icon: CalendarRange,
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/UniCalendar')),
  },
  {
    id: 'dailyTimetable',
    titleKey: 'widgets.dailyTimetable',
    icon: Clock,
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/DailyTimetableCard')),
  },
  {
    id: 'academic',
    titleKey: 'widgets.academic',
    icon: CalendarDays,
    defaultOn: true,
    component: lazy(() => import('../components/calendar/AcademicCalendar')),
  },
  {
    id: 'focus',
    titleKey: 'widgets.focus',
    icon: Zap,
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/FocusTimer')),
  },
  // New widget cards (Req 5)
  {
    id: 'metrics',
    titleKey: 'widgets.metrics',
    icon: TrendingUp,
    defaultOn: true,
    component: lazy(() => import('../components/dashboard/widgets/MetricsCard')),
  },
  {
    id: 'taskSchedule',
    titleKey: 'widgets.taskSchedule',
    icon: ClipboardList,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/TaskScheduleCard')),
  },
  {
    id: 'progressRing',
    titleKey: 'widgets.progressRing',
    icon: CircleDot,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ProgressRingCard')),
  },
  {
    id: 'activityGrid',
    titleKey: 'widgets.activityGrid',
    icon: Grid3x3,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/ActivityGridCard')),
  },
  // 10 new feature widgets
  {
    id: 'notes',
    titleKey: 'widgets.notes',
    icon: StickyNote,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/NotesCard')),
  },
  {
    id: 'goalsx',
    titleKey: 'widgets.goalsx',
    icon: Target,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/GoalsCard')),
  },
  {
    id: 'habits',
    titleKey: 'widgets.habits',
    icon: Repeat,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/HabitsCard')),
  },
  {
    id: 'kanban',
    titleKey: 'widgets.kanban',
    icon: SquareKanban,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/KanbanCard')),
  },
  {
    id: 'timetrack',
    titleKey: 'widgets.timetrack',
    icon: Timer,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/TimeTrackCard')),
  },
  {
    id: 'finance',
    titleKey: 'widgets.finance',
    icon: Wallet,
    defaultOn: false,
    component: lazy(() => import('../components/dashboard/widgets/FinanceCard')),
  },
];

export const WIDGET_BY_ID = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));
export const ALL_WIDGET_IDS = WIDGETS.map((w) => w.id);
