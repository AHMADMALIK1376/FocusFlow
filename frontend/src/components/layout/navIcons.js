import React from 'react';
import {
  LayoutGrid, Zap, Clock, Flame, CalendarDays, BarChart3,
  StickyNote, Target, Repeat, KanbanSquare, Timer, Wallet,
  GraduationCap, Award,
} from 'lucide-react';

// Maps a nav item id -> a Lucide line icon (no emojis).
export const ICON_BY_ID = {
  dashboard: LayoutGrid,
  subjects: GraduationCap,
  grades: Award,
  deepwork: Zap,
  routine: Clock,
  tasks: Flame,
  timetable: CalendarDays,
  attendance: BarChart3,
  notes: StickyNote,
  goalsx: Target,
  habits: Repeat,
  kanban: KanbanSquare,
  timetrack: Timer,
  finance: Wallet,
};

export function NavIcon({ id, size = 19, className = '' }) {
  const Cmp = ICON_BY_ID[id] || LayoutGrid;
  return <Cmp size={size} strokeWidth={1.75} className={className} />;
}
