import {
  startOfDay,
  isToday as dfnsIsToday,
  isTomorrow,
  format,
  addDays,
  startOfWeek,
} from 'date-fns';
import { Task } from '@/types';

export function startOfDayMs(ts: number): number {
  return startOfDay(new Date(ts)).getTime();
}

export function isToday(ts: number): boolean {
  return dfnsIsToday(new Date(ts));
}

export function isOverdue(task: Pick<Task, 'dueAt' | 'dueHasTime' | 'completed'>): boolean {
  if (task.completed || task.dueAt === null) return false;
  const now = Date.now();
  if (task.dueHasTime) return task.dueAt < now;
  return startOfDayMs(task.dueAt) < startOfDayMs(now);
}

export function formatDueLabel(task: Pick<Task, 'dueAt' | 'dueHasTime'>): string {
  if (task.dueAt === null) return '';
  const d = new Date(task.dueAt);
  const timeStr = task.dueHasTime ? ` ${format(d, 'hh:mm a')}` : '';
  if (dfnsIsToday(d)) return `Today${timeStr}`;
  if (isTomorrow(d)) return `Tomorrow${timeStr}`;
  return `${format(d, 'EEE, MMM d')}${timeStr}`;
}

export function formatTime(ts: number): string {
  return format(new Date(ts), 'hh:mm a');
}

export function combineDateAndTime(dateTs: number, timeTs: number): number {
  const d = new Date(dateTs);
  const t = new Date(timeTs);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.getTime();
}

export function weekDays(anchor: number): Date[] {
  const start = startOfWeek(new Date(anchor), { weekStartsOn: 1 }); // Monday start
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
