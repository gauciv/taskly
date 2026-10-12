import { create } from 'zustand';
import { format, startOfDay, addDays } from 'date-fns';
import { Task } from '@/types';
import { getDueStatus } from '@/utils/dueStatus';
import {
  NotificationRow,
  getAllNotifications,
  insertNotification,
  markNotificationRead,
  markAllNotificationsRead,
  markReadForTask as dbMarkReadForTask,
  deleteNotification,
  clearAllNotifications,
} from '@/db/notificationsRepo';
import { getSetting } from '@/db/settingsRepo';
import { showToast } from '@/components/ui/Toast';

export type { NotificationRow };

// ── Upcoming reminder selector (computed, not stored) ─────────────────────────
export interface UpcomingReminder {
  task: Task;
  fireTime: number;
}

export function selectUpcomingReminders(
  tasks: Task[],
  settings: { notificationsEnabled: boolean; reminderOffsetMin: 0 | 10 | 60 },
  now: number,
): UpcomingReminder[] {
  if (!settings.notificationsEnabled) return [];

  return tasks
    .filter((t) => !t.completed && t.dueAt !== null)
    .map((t) => {
      const fireTime = calcFireTime(t, settings.reminderOffsetMin);
      return { task: t, fireTime };
    })
    .filter((x) => x.fireTime > now)
    .sort((a, b) => a.fireTime - b.fireTime)
    .slice(0, 3);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcFireTime(task: Task, offsetMin: number): number {
  if (!task.dueAt) return Infinity;
  if (task.dueHasTime) {
    return task.dueAt - offsetMin * 60_000;
  }
  // Date-only: 09:00 local on the due day
  const d = new Date(task.dueAt);
  d.setHours(9, 0, 0, 0);
  return d.getTime() - offsetMin * 60_000;
}

function calcOverdueTime(task: Task): number {
  if (!task.dueAt) return Infinity;
  if (task.dueHasTime) {
    return task.dueAt + 60 * 60_000; // +1 hour
  }
  // Date-only: start of the day after the due date
  return startOfDay(addDays(new Date(task.dueAt), 1)).getTime();
}

function reminderBody(task: Task, offsetMin: number): string {
  const dueLabel = task.dueAt ? formatDueDateTime(task) : '';
  if (offsetMin === 10) return `Due in 10 minutes · ${dueLabel}`;
  if (offsetMin === 60) return `Due in 1 hour · ${dueLabel}`;
  // offset 0 = at due time
  return dueLabel ? `Due ${dueLabel}` : 'Reminder';
}

function overdueBody(task: Task): string {
  if (!task.dueAt) return 'Overdue';
  const label = format(new Date(task.dueAt), 'EEE, MMM d');
  return `Overdue since ${label}`;
}

function formatDueDateTime(task: Task): string {
  if (!task.dueAt) return '';
  const d = new Date(task.dueAt);
  if (task.dueHasTime) {
    return format(d, "EEE, MMM d 'at' h:mm a");
  }
  return format(d, 'EEE, MMM d');
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface NotificationStore {
  items: NotificationRow[];
  unreadCount: number;

  hydrate: () => Promise<void>;
  syncInbox: (now: number) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  markReadForTask: (taskId: number) => Promise<void>;
  remove: (id: number) => Promise<NotificationRow | null>;
  restore: (snapshot: NotificationRow) => Promise<void>;
  clearAll: () => Promise<void>;
}

function countUnread(items: NotificationRow[]): number {
  return items.filter((n) => !n.read).length;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  items: [],
  unreadCount: 0,

  hydrate: async () => {
    const items = await getAllNotifications();
    set({ items, unreadCount: countUnread(items) });
  },

  syncInbox: async (now: number) => {
    const enabled = (await getSetting('notifications_enabled')) !== '0';
    if (!enabled) return;

    const offsetMin = Number((await getSetting('reminder_offset_min')) ?? '0') as 0 | 10 | 60;

    // Import tasks lazily to avoid circular deps
    const { useTaskStore } = await import('./useTaskStore');
    const tasks = useTaskStore.getState().tasks;

    const newItems: NotificationRow[] = [];

    for (const task of tasks) {
      if (task.completed) continue;
      if (!task.dueAt) continue;

      const fireTime = calcFireTime(task, offsetMin);

      // Reminder entry
      if (fireTime <= now && fireTime >= task.createdAt) {
        const dedupeKey = `reminder:${task.id}:${task.dueAt}:${offsetMin}`;
        const body = reminderBody(task, offsetMin);
        const inserted = await insertNotification({
          taskId: task.id,
          type: 'reminder',
          title: task.title,
          body,
          dedupeKey,
          fireAt: fireTime,
          read: false,
          createdAt: fireTime,
        });
        if (inserted) newItems.push(inserted);
      }

      // Overdue entry
      const overdueAt = calcOverdueTime(task);
      if (getDueStatus(task, now).kind === 'overdue' && overdueAt <= now && overdueAt >= task.createdAt) {
        const dedupeKey = `overdue:${task.id}:${task.dueAt}`;
        const body = overdueBody(task);
        const inserted = await insertNotification({
          taskId: task.id,
          type: 'overdue',
          title: task.title,
          body,
          dedupeKey,
          fireAt: overdueAt,
          read: false,
          createdAt: overdueAt,
        });
        if (inserted) newItems.push(inserted);
      }
    }

    if (newItems.length > 0) {
      // Re-read to get the latest sorted list
      const items = await getAllNotifications();
      set({ items, unreadCount: countUnread(items) });
    }
  },

  markRead: async (id: number) => {
    // Optimistic
    set((s) => {
      const items = s.items.map((n) => (n.id === id ? { ...n, read: true } : n));
      return { items, unreadCount: countUnread(items) };
    });
    try {
      await markNotificationRead(id);
    } catch {
      // revert
      const items = await getAllNotifications();
      set({ items, unreadCount: countUnread(items) });
    }
  },

  markAllRead: async () => {
    // Optimistic
    set((s) => {
      const items = s.items.map((n) => ({ ...n, read: true }));
      return { items, unreadCount: 0 };
    });
    try {
      await markAllNotificationsRead();
    } catch {
      const items = await getAllNotifications();
      set({ items, unreadCount: countUnread(items) });
    }
  },

  markReadForTask: async (taskId: number) => {
    set((s) => {
      const items = s.items.map((n) =>
        n.taskId === taskId && !n.read ? { ...n, read: true } : n,
      );
      return { items, unreadCount: countUnread(items) };
    });
    try {
      await dbMarkReadForTask(taskId);
    } catch {
      const items = await getAllNotifications();
      set({ items, unreadCount: countUnread(items) });
    }
  },

  remove: async (id: number) => {
    const snapshot = get().items.find((n) => n.id === id) ?? null;
    if (!snapshot) return null;
    // Optimistic
    set((s) => {
      const items = s.items.filter((n) => n.id !== id);
      return { items, unreadCount: countUnread(items) };
    });
    try {
      await deleteNotification(id);
    } catch {
      set((s) => {
        const items = [snapshot, ...s.items].sort((a, b) => b.fireAt - a.fireAt);
        return { items, unreadCount: countUnread(items) };
      });
      showToast("Couldn't remove notification.");
      return null;
    }
    return snapshot;
  },

  restore: async (snapshot: NotificationRow) => {
    set((s) => {
      const items = [snapshot, ...s.items].sort((a, b) => b.fireAt - a.fireAt);
      return { items, unreadCount: countUnread(items) };
    });
    try {
      await insertNotification(snapshot);
    } catch {
      set((s) => {
        const items = s.items.filter((n) => n.id !== snapshot.id);
        return { items, unreadCount: countUnread(items) };
      });
    }
  },

  clearAll: async () => {
    const prev = get().items;
    set({ items: [], unreadCount: 0 });
    try {
      await clearAllNotifications();
    } catch {
      set({ items: prev, unreadCount: countUnread(prev) });
      showToast("Couldn't clear notifications.");
    }
  },
}));
