import { Task, Category } from '@/types';
import { startOfDayMs, isToday, isOverdue } from '@/utils/date';

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
