/**
 * Achievement definitions and unlock evaluation.
 * All achievement logic lives here — evaluated after every completion.
 */
import { Task } from '@/types';
import { selectStreak } from '@/store/selectors';
import { Colors } from '@/theme/tokens';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  // Returns { unlocked: boolean; progress?: number; max?: number }
  evaluate: (tasks: Task[], now: number) => { unlocked: boolean; progress?: number; max?: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Complete your first task',
    icon: 'flag',
    color: Colors.lime,
    evaluate: (tasks) => ({
      unlocked: tasks.some((t) => t.completed),
    }),
  },
  {
    id: 'ten_down',
    title: 'Ten Down',
    description: '10 tasks completed in total',
    icon: 'check-circle',
    color: Colors.cyan,
    evaluate: (tasks) => {
      const count = tasks.filter((t) => t.completed).length;
      return { unlocked: count >= 10, progress: count, max: 10 };
    },
  },
  {
    id: 'on_a_roll',
    title: 'On a Roll',
    description: '3-day streak',
    icon: 'zap',
    color: Colors.orange,
    evaluate: (tasks, now) => {
      const { current } = selectStreak(tasks, now);
      return { unlocked: current >= 3, progress: current, max: 3 };
    },
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: '7-day streak',
    icon: 'award',
    color: Colors.purple,
    evaluate: (tasks, now) => {
      const { current } = selectStreak(tasks, now);
      return { unlocked: current >= 7, progress: current, max: 7 };
    },
  },
  {
    id: 'clean_slate',
    title: 'Clean Slate',
    description: 'Finish everything due on a day with 2+ tasks',
    icon: 'sun',
    color: Colors.pink,
    evaluate: (tasks, now) => {
      // Check if any day (by dueAt) had ≥2 tasks and all are completed
      const dayMap: Record<number, { total: number; done: number }> = {};
      for (const t of tasks) {
        if (t.dueAt === null) continue;
        const dayStart = new Date(t.dueAt);
        dayStart.setHours(0, 0, 0, 0);
        const key = dayStart.getTime();
        if (!dayMap[key]) dayMap[key] = { total: 0, done: 0 };
        dayMap[key].total++;
        if (t.completed) dayMap[key].done++;
      }
      const unlocked = Object.values(dayMap).some(
        (d) => d.total >= 2 && d.done >= d.total
      );
      return { unlocked };
    },
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete a task before its due time',
    icon: 'clock',
    color: Colors.lime,
    evaluate: (tasks, now) => {
      const unlocked = tasks.some(
        (t) =>
          t.completed &&
          t.completedAt !== null &&
          t.dueAt !== null &&
          t.completedAt < t.dueAt
      );
      return { unlocked };
    },
  },
];

/** Returns the list of newly unlocked achievement IDs */
export function evaluateAchievements(
  tasks: Task[],
  now: number,
  alreadyUnlocked: Record<string, number>,
): string[] {
  const newlyUnlocked: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (alreadyUnlocked[def.id] !== undefined) continue;
    const { unlocked } = def.evaluate(tasks, now);
    if (unlocked) newlyUnlocked.push(def.id);
  }
  return newlyUnlocked;
}
