/**
 * onTaskCompleted — called after every successful task completion (or un-complete).
 * Evaluates celebrations in priority order: achievement > all_done > streak > default.
 * Coalesces rapid completions (at most 2 small default bursts concurrently).
 * Respects celebrations_enabled and reduced-motion settings.
 */
import { startOfDay } from 'date-fns';
import { Task } from '@/types';
import { isOverdue } from '@/utils/date';
import { showToast } from '@/components/ui/Toast';
import { haptic } from '@/utils/feedback';
import { logError } from '@/utils/logger';

const CONTEXTUAL_MESSAGES = [
  'Nice work!',
  'Task crushed!',
  'One down!',
  'Keep it rolling!',
  'Done and dusted!',
  'Smooth move!',
];
let lastContextualIdx = -1;

function nextContextual(): string {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * CONTEXTUAL_MESSAGES.length);
  } while (idx === lastContextualIdx && CONTEXTUAL_MESSAGES.length > 1);
  lastContextualIdx = idx;
  return CONTEXTUAL_MESSAGES[idx];
}

// Track small burst count to coalesce rapid completions (max 2 concurrent)
let activeBursts = 0;
const MAX_BURSTS = 2;

// Track all-done celebration per day
function todayKey(): string {
  return String(startOfDay(new Date()).getTime());
}

async function getLastAllDoneDay(): Promise<string> {
  try {
    const { getSetting } = await import('@/db/settingsRepo');
    return (await getSetting('last_all_done_day')) ?? '';
  } catch {
    return '';
  }
}

async function setLastAllDoneDay(key: string): Promise<void> {
  try {
    const { setSetting } = await import('@/db/settingsRepo');
    await setSetting('last_all_done_day', key);
  } catch {}
}

// Track streak milestones celebrated to avoid repeating
const celebratedStreakLengths = new Set<number>();

export async function onTaskCompleted(
  task: Task,
  allTasks: Task[],
  originX?: number,
  originY?: number,
): Promise<void> {
  try {
    const { useSettingsStore } = await import('@/store/useSettingsStore');
    const { useCelebrationStore } = await import('@/store/useCelebrationStore');
    const { evaluateAchievements, ACHIEVEMENTS } = await import('@/services/achievements');
    const { selectStreak } = await import('@/store/selectors');

    const settings = useSettingsStore.getState();
    const skipCelebrations = !settings.celebrationsEnabled;
    const now = Date.now();

    // 1. Evaluate achievements
    const newlyUnlocked = evaluateAchievements(allTasks, now, settings.achievements);
    if (newlyUnlocked.length > 0) {
      const id = newlyUnlocked[0];
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        // Persist unlock
        await settings.unlockAchievement(id);
        haptic.success();
        if (!skipCelebrations) {
          useCelebrationStore.getState().celebrate({
            type: 'achievement',
            badgeId: id,
            title: def.title,
            description: def.description,
            icon: def.icon,
            color: def.color,
          });
        } else {
          showToast(`Achievement: ${def.title}`, { type: 'success' });
        }
        return;
      }
    }

    // 2. All done for today?
    const todayStart = startOfDay(new Date(now)).getTime();
    const todayEnd = todayStart + 86400000;
    const dueTodayTasks = allTasks.filter(
      (t) => t.dueAt !== null && t.dueAt >= todayStart && t.dueAt < todayEnd
    );
    const incompleteTodayOrOverdue = allTasks.filter(
      (t) =>
        !t.completed &&
        (
          (t.dueAt !== null && t.dueAt >= todayStart && t.dueAt < todayEnd) ||
          isOverdue(t)
        )
    );
    const lastAllDoneDay = await getLastAllDoneDay();
    const dayKey = todayKey();

    if (
      incompleteTodayOrOverdue.length === 0 &&
      dueTodayTasks.length >= 2 &&
      lastAllDoneDay !== dayKey
    ) {
      await setLastAllDoneDay(dayKey);
      haptic.success();
      if (!skipCelebrations) {
        useCelebrationStore.getState().celebrate({ type: 'all_done' });
      } else {
        showToast('All caught up! Everything done for today.', { type: 'success' });
      }
      return;
    }

    // 3. Streak milestone
    const streak = selectStreak(allTasks, now);
    const MILESTONE_LENGTHS = [3, 7, 14, 30];
    const milestone = MILESTONE_LENGTHS.find(
      (n) => streak.current === n && !celebratedStreakLengths.has(n)
    );
    if (milestone !== undefined) {
      celebratedStreakLengths.add(milestone);
      haptic.success();
      if (!skipCelebrations) {
        useCelebrationStore.getState().celebrate({ type: 'streak', days: milestone });
      } else {
        showToast(`${milestone}-day streak!`, { type: 'success' });
      }
      return;
    }

    // 4. Default: small burst + contextual toast
    haptic.light();

    if (!skipCelebrations && activeBursts < MAX_BURSTS) {
      activeBursts++;
      useCelebrationStore.getState().celebrate({
        type: 'default',
        originX,
        originY,
      });
      setTimeout(() => { activeBursts = Math.max(0, activeBursts - 1); }, 800);
    }

    // Contextual success toast with Undo
    let message: string;
    if (task.dueAt !== null && isOverdue({ ...task, completed: false })) {
      message = 'Back on track!';
    } else if (task.completedAt !== null && task.dueAt !== null && task.completedAt < task.dueAt) {
      message = 'Ahead of schedule!';
    } else if (task.priority === 2) {
      message = 'High priority cleared!';
    } else {
      message = nextContextual();
    }

    showToast(message, { type: 'success' });
  } catch (err) {
    logError('onTaskCompleted', err);
  }
}

export function onTaskUncompleted(): void {
  haptic.light();
  showToast('Back on your list', { type: 'info' });
}
