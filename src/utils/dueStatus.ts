import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay } from 'date-fns';
import { Colors } from '@/theme/tokens';
import { Task } from '@/types';

export type DueKind = 'none' | 'upcoming' | 'today' | 'overdue' | 'completed';
export interface DueStatus {
  kind: DueKind;
  label: string;
  detail: string;
  tone: string;
}

type DueTask = Pick<Task, 'dueAt' | 'dueHasTime' | 'completed'>;

export function formatSpan(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return unit(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return unit(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 14) return unit(days, 'day');
  return unit(Math.floor(days / 7), 'week');
}

function unit(value: number, name: string): string {
  return `${value} ${name}${value === 1 ? '' : 's'}`;
}

function daysUntil(dueAt: number, now: number): number {
  return differenceInCalendarDays(new Date(dueAt), new Date(now));
}

export function getDueStatus(task: DueTask, now = Date.now()): DueStatus {
  if (task.completed) return { kind: 'completed', label: 'Completed', detail: 'Completed', tone: Colors.success };
  if (task.dueAt === null) return { kind: 'none', label: 'No due date', detail: 'No due date', tone: Colors.textMuted };

  const due = task.dueAt;
  const dueDate = new Date(due);
  const today = isSameDay(dueDate, new Date(now));
  if (task.dueHasTime) {
    if (now > due) return { kind: 'overdue', label: 'Overdue', detail: `Overdue by ${formatSpan(now - due)}`, tone: Colors.danger };
    if (today) return { kind: 'today', label: 'Due today', detail: `Due in ${formatSpan(due - now)}`, tone: Colors.lime };
  } else {
    if (startOfDay(new Date(now)).getTime() > startOfDay(dueDate).getTime()) {
      return { kind: 'overdue', label: 'Overdue', detail: `Overdue by ${formatSpan(startOfDay(new Date(now)).getTime() - startOfDay(dueDate).getTime())}`, tone: Colors.danger };
    }
    if (today) return { kind: 'today', label: 'Due today', detail: 'Due today', tone: Colors.lime };
  }

  const deltaDays = daysUntil(due, now);
  const detail = deltaDays === 1
    ? (task.dueHasTime ? `Due tomorrow · ${format(dueDate, 'h:mm a')}` : 'Due tomorrow')
    : (deltaDays > 1 ? `In ${deltaDays} days` : `Due in ${formatSpan(due - now)}`);
  return { kind: 'upcoming', label: 'Upcoming', detail, tone: Colors.purple };
}

export function formatDueTime(task: Pick<Task, 'dueAt' | 'dueHasTime'>): string {
  if (task.dueAt === null) return '';
  return task.dueHasTime ? format(new Date(task.dueAt), 'h:mm a') : 'All day';
}

export function formatDueDateLabel(task: Pick<Task, 'dueAt' | 'dueHasTime'>, now = Date.now()): string {
  if (task.dueAt === null) return '';
  const status = getDueStatus({ ...task, completed: false }, now);
  if (status.kind === 'today' || status.kind === 'overdue') return status.label;
  const due = new Date(task.dueAt);
  return isSameDay(due, addDays(new Date(now), 1)) ? 'Tomorrow' : format(due, 'EEE, MMM d');
}
