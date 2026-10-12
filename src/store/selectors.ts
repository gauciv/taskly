import { Task, Category } from '@/types';
import { startOfDayMs } from '@/utils/date';
import { getDueStatus } from '@/utils/dueStatus';
import { startOfDay, addDays, format } from 'date-fns';

function defaultSort(tasks: Task[], now = Date.now()): Task[] {
  return [...tasks].sort((a, b) => {
    // Incomplete before complete
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const dueOrder: Record<string, number> = { overdue: 0, today: 1, upcoming: 2, none: 3, completed: 4 };
    const statusDelta = dueOrder[getDueStatus(a, now).kind] - dueOrder[getDueStatus(b, now).kind];
    if (statusDelta !== 0) return statusDelta;
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

export function selectSortedTasks(
  tasks: Task[],
  now = Date.now(),
  recentlyToggledIds: Record<number, { expiresAt: number; previousCompleted: boolean }> = {},
): Task[] {
  const held = tasks.map((task) => {
    const recent = recentlyToggledIds[task.id];
    return recent && recent.expiresAt > now ? { ...task, completed: recent.previousCompleted } : task;
  });
  return defaultSort(held, now);
}

export function selectTodayAndOverdue(
  tasks: Task[],
  now = Date.now(),
  recentlyToggledIds: Record<number, { expiresAt: number; previousCompleted: boolean }> = {},
): Task[] {
  return defaultSort(tasks.filter((task) => {
    const recent = recentlyToggledIds[task.id];
    const statusTask = recent && recent.expiresAt > now && !recent.previousCompleted
      ? { ...task, completed: false }
      : task;
    const kind = getDueStatus(statusTask, now).kind;
    return kind === 'today' || kind === 'overdue';
  }), now);
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

export function selectOverdueCount(tasks: Task[], now = Date.now()): number {
  return tasks.filter((task) => getDueStatus(task, now).kind === 'overdue').length;
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

// ── Streak selector ───────────────────────────────────────────────────────────
export interface StreakResult {
  current: number;
  best: number;
}

/**
 * Consecutive local days with ≥1 completed task (by completedAt), ending today.
 * If nothing is completed today, we also check if yesterday has completions
 * (so the streak doesn't break at midnight before the first task of the day).
 * Note: deleting completed tasks can lower derived stats.
 */
export function selectStreak(tasks: Task[], now: number): StreakResult {
  const todayStart = startOfDay(new Date(now)).getTime();

  // Build a Set of day-starts that have at least one completed task
  const completedDays = new Set<number>();
  for (const t of tasks) {
    if (t.completedAt !== null) {
      completedDays.add(startOfDay(new Date(t.completedAt)).getTime());
    }
  }

  // Current streak: start from today, walk backwards
  let anchor = todayStart;
  // If nothing completed today, start from yesterday (grace period)
  if (!completedDays.has(todayStart)) {
    const yesterdayStart = todayStart - 86400000;
    if (!completedDays.has(yesterdayStart)) {
      return { current: 0, best: calcBestStreak(completedDays) };
    }
    anchor = yesterdayStart;
  }

  let current = 0;
  let cursor = anchor;
  while (completedDays.has(cursor)) {
    current++;
    cursor -= 86400000;
  }

  return { current, best: Math.max(current, calcBestStreak(completedDays)) };
}

function calcBestStreak(completedDays: Set<number>): number {
  if (completedDays.size === 0) return 0;
  const sorted = Array.from(completedDays).sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === 86400000) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}
