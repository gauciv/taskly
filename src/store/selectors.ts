import { Task, Category } from '@/types';
import { startOfDayMs, isToday, isOverdue } from '@/utils/date';
import { startOfDay, addDays, format } from 'date-fns';

function defaultSort(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Incomplete before complete
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // Due date ascending (no due date last)
    if (a.dueAt !== b.dueAt) {
      if (a.dueAt === null) return 1;
      if (b.dueAt === null) return -1;
      return a.dueAt - b.dueAt;
    }
    // Priority descending (high first)
    if (a.priority !== b.priority) return b.priority - a.priority;
    // created_at descending
    return b.createdAt - a.createdAt;
  });
}

export function selectSortedTasks(tasks: Task[]): Task[] {
  return defaultSort(tasks);
}

export function selectTodayAndOverdue(tasks: Task[]): Task[] {
  return defaultSort(
    tasks.filter((t) => {
      if (t.dueAt === null) return false;
      return isToday(t.dueAt) || isOverdue(t);
    })
  );
}

export function selectTasksForDay(tasks: Task[], day: Date): Task[] {
  const dayStart = startOfDayMs(day.getTime());
  const dayEnd = dayStart + 86400000;
  return defaultSort(
    tasks.filter((t) => {
      if (t.dueAt === null) return false;
      const ts = startOfDayMs(t.dueAt);
      return ts >= dayStart && ts < dayEnd;
    })
  );
}

export function selectOpenCountByCategory(
  tasks: Task[],
  categories: Category[]
): { category: Category; count: number }[] {
  const countMap: Record<number, number> = {};
  for (const t of tasks) {
    if (!t.completed && t.categoryId !== null) {
      countMap[t.categoryId] = (countMap[t.categoryId] ?? 0) + 1;
    }
  }
  return categories
    .map((cat) => ({ category: cat, count: countMap[cat.id] ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function selectOverdueCount(tasks: Task[]): number {
  return tasks.filter((t) => isOverdue(t)).length;
}

export function selectDayHasTasks(tasks: Task[], day: Date): boolean {
  return selectTasksForDay(tasks, day).length > 0;
}

export interface WeeklyActivityDay {
  dayMs: number;
  label: string; // single char weekday initial e.g. 'M'
  count: number;
}

export interface WeeklyActivity {
  days: WeeklyActivityDay[];
  total: number;
  previousTotal: number;
  todayDone: number;
  todayTotal: number;
}

export function selectWeeklyActivity(tasks: Task[], now: number): WeeklyActivity {
  const days: WeeklyActivityDay[] = [];
  const todayStart = startOfDay(new Date(now)).getTime();

  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(todayStart), -i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;
    const count = tasks.filter(
      (t) => t.completedAt !== null && t.completedAt >= dayStart && t.completedAt < dayEnd
    ).length;
    days.push({ dayMs: dayStart, label: format(d, 'EEEEE'), count });
  }

  const total = days.reduce((s, d) => s + d.count, 0);

  // Previous 7 days
  const prevStart = addDays(new Date(todayStart), -13).getTime();
  const prevEnd = addDays(new Date(todayStart), -6).getTime();
  const previousTotal = tasks.filter(
    (t) => t.completedAt !== null && t.completedAt >= prevStart && t.completedAt < prevEnd
  ).length;

  // Today stats: tasks that were due today or completed today
  const todayEnd = todayStart + 86400000;
  const todayDone = tasks.filter(
    (t) => t.completedAt !== null && t.completedAt >= todayStart && t.completedAt < todayEnd
  ).length;
  const todayTotal = tasks.filter(
    (t) =>
      (t.dueAt !== null && t.dueAt >= todayStart && t.dueAt < todayEnd) ||
      (t.completedAt !== null && t.completedAt >= todayStart && t.completedAt < todayEnd)
  ).length;

  return { days, total, previousTotal, todayDone, todayTotal };
}
