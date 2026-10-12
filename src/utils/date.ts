import {
  startOfDay,
  isToday as dfnsIsToday,
  format,
  addDays,
  startOfWeek,
} from 'date-fns';
import { Task } from '@/types';
import { formatDueDateLabel, getDueStatus } from '@/utils/dueStatus';

export function startOfDayMs(ts: number): number {
  return startOfDay(new Date(ts)).getTime();
}

export function isToday(ts: number): boolean {
  return dfnsIsToday(new Date(ts));
}

export function isOverdue(task: Pick<Task, 'dueAt' | 'dueHasTime' | 'completed'>, now = Date.now()): boolean {
  return getDueStatus(task, now).kind === 'overdue';
}

export function formatDueLabel(task: Pick<Task, 'dueAt' | 'dueHasTime'>, now = Date.now()): string {
  return formatDueDateLabel(task, now);
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
