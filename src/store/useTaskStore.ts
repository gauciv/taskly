import { create } from 'zustand';
import { InteractionManager } from 'react-native';
import { Task, TaskInput, TaskSnapshot, Category } from '@/types';
import {
  getAllTasks,
  insertTask,
  updateTask,
  deleteTask as dbDeleteTask,
  insertTaskWithId,
} from '@/db/tasksRepo';
import { getAllCategories, insertCategory } from '@/db/categoriesRepo';
import {
  syncTaskNotification,
  cancelTaskNotification,
} from '@/services/notifications';
import { reportError } from '@/utils/errors';
import { onTaskCompleted, onTaskUncompleted } from '@/services/feedback';
import { haptic } from '@/utils/feedback';
import { showToast } from '@/components/ui/Toast';

interface RecentToggle { expiresAt: number; previousCompleted: boolean }
function taskCollection(tasks: Task[]) {
  return {
    tasks,
    tasksById: Object.fromEntries(tasks.map((task) => [task.id, task])) as Record<number, Task>,
    orderedTaskIds: tasks.map((task) => task.id),
  };
}

interface TaskStore {
  tasks: Task[];
  tasksById: Record<number, Task>;
  orderedTaskIds: number[];
  recentlyToggledIds: Record<number, RecentToggle>;
  categories: Category[];
  hydrated: boolean;
  highlightTaskId: number | null;
  highlightNonce: number;
  hydrate: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<number | null>;
  updateTask: (id: number, patch: Partial<TaskInput> & { notificationId?: string | null }) => Promise<boolean>;
  toggleComplete: (id: number, originX?: number, originY?: number) => Promise<void>;
  deleteTask: (id: number) => Promise<TaskSnapshot | null>;
  restoreTask: (snapshot: TaskSnapshot) => Promise<void>;
  addCategory: (cat: { name: string; color: string; icon: string }) => Promise<void>;
  clearCompleted: () => Promise<void>;
  resetAll: () => Promise<void>;
  setHighlight: (id: number | null) => void;
}

// Note: loadSampleData removed per U2.10

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  tasksById: {},
  orderedTaskIds: [],
  recentlyToggledIds: {},
  categories: [],
  hydrated: false,
  highlightTaskId: null,
  highlightNonce: 0,

  hydrate: async () => {
    const [tasks, categories] = await Promise.all([getAllTasks(), getAllCategories()]);
    set({ ...taskCollection(tasks), categories, hydrated: true });
  },

  setHighlight: (id) => {
    set((s) => ({ highlightTaskId: id, highlightNonce: id !== null ? s.highlightNonce + 1 : s.highlightNonce }));
  },

  addTask: async (input) => {
    try {
      const task = await insertTask(input);
      set((s) => ({ ...taskCollection([task, ...s.tasks]), highlightTaskId: task.id, highlightNonce: s.highlightNonce + 1 }));
      InteractionManager.runAfterInteractions(() => {
        void (async () => {
          try {
            await syncTaskNotification(task);
            const { useNotificationStore } = await import('./useNotificationStore');
            await useNotificationStore.getState().syncInbox(Date.now());
          } catch (err) {
            reportError(err, { context: 'addTask.notifications', userMessage: 'Task saved, but its reminder could not be updated' });
          }
        })();
      });
      return task.id;
    } catch (err) {
      reportError(err, { context: 'addTask', userMessage: "Couldn't save your task", retry: () => get().addTask(input) });
      return null;
    }
  },

  updateTask: async (id, patch) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) return false;
    const optimistic: Task = { ...prev, ...patch, updatedAt: Date.now() } as Task;
    set((s) => ({ ...taskCollection(s.tasks.map((t) => (t.id === id ? optimistic : t))) }));
    try {
      const updated = await updateTask(id, patch);
      set((s) => ({ ...taskCollection(s.tasks.map((t) => (t.id === id ? updated : t))), highlightTaskId: id, highlightNonce: s.highlightNonce + 1 }));
      InteractionManager.runAfterInteractions(() => {
        void (async () => {
          try {
            await syncTaskNotification(updated);
            const { useNotificationStore } = await import('./useNotificationStore');
            await useNotificationStore.getState().syncInbox(Date.now());
          } catch (err) {
            reportError(err, { context: 'updateTask.notifications', userMessage: 'Task saved, but its reminder could not be updated' });
          }
        })();
      });
      return true;
    } catch (err) {
      set((s) => ({ ...taskCollection(s.tasks.map((t) => (t.id === id ? prev : t))) }));
      reportError(err, { context: 'updateTask', userMessage: "Couldn't save your task", retry: () => get().updateTask(id, patch) });
      return false;
    }
  },

  toggleComplete: async (id, originX, originY) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const now = Date.now();
    const completed = !task.completed;
    haptic.light();
    const patch = { completed, completedAt: completed ? now : null };
    const optimistic: Task = { ...task, ...patch, updatedAt: now };
    const expiresAt = now + 700;
    set((s) => ({
      ...taskCollection(s.tasks.map((t) => (t.id === id ? optimistic : t))),
      recentlyToggledIds: { ...s.recentlyToggledIds, [id]: { expiresAt, previousCompleted: task.completed } },
    }));
    setTimeout(() => {
      set((s) => {
        const entry = s.recentlyToggledIds[id];
        if (!entry || entry.expiresAt !== expiresAt) return {};
        const next = { ...s.recentlyToggledIds };
        delete next[id];
        return { recentlyToggledIds: next };
      });
    }, 700);

    if (completed) {
      onTaskCompleted(optimistic, get().tasks, originX, originY, () => { void get().toggleComplete(id); });
    } else {
      onTaskUncompleted(optimistic, () => { void get().toggleComplete(id); });
    }

    InteractionManager.runAfterInteractions(() => {
      void (async () => {
        let updated: Task;
        try {
          updated = await updateTask(id, patch);
        } catch (err) {
          set((s) => s.tasksById[id] === optimistic
            ? { ...taskCollection(s.tasks.map((t) => (t.id === id ? task : t))) }
            : {});
          reportError(err, { context: 'toggleComplete', userMessage: "Couldn't save. Try again", retry: () => { void get().toggleComplete(id); } });
          return;
        }
        set((s) => ({ ...taskCollection(s.tasks.map((t) => (t.id === id && t === optimistic ? updated : t))) }));
        try {
          if (completed) {
            await cancelTaskNotification(updated);
            const { useNotificationStore } = await import('./useNotificationStore');
            await useNotificationStore.getState().markReadForTask(id);
            await useNotificationStore.getState().syncInbox(Date.now());
          } else {
            await syncTaskNotification(updated);
            const { useNotificationStore } = await import('./useNotificationStore');
            await useNotificationStore.getState().syncInbox(Date.now());
          }
        } catch (err) {
          reportError(err, { context: 'toggleComplete.notifications', userMessage: 'Task saved, but its reminder could not be updated' });
        }
      })();
    });
  },

  deleteTask: async (id) => {
    const snapshot = get().tasks.find((t) => t.id === id) ?? null;
    if (!snapshot) return null;
    set((s) => ({ ...taskCollection(s.tasks.filter((t) => t.id !== id)) }));
    showToast('Task deleted', { label: 'Undo', onPress: () => { void get().restoreTask(snapshot); } });
    try {
      await dbDeleteTask(id);
    } catch (err) {
      set((s) => ({ ...taskCollection([snapshot, ...s.tasks]) }));
      reportError(err, { context: 'deleteTask', userMessage: "Couldn't delete. Try again", retry: () => get().deleteTask(id) });
      return null;
    }
    InteractionManager.runAfterInteractions(() => {
      void cancelTaskNotification(snapshot).catch((err: unknown) => {
        reportError(err, { context: 'deleteTask.notifications', userMessage: 'Task deleted, but its reminder could not be cancelled' });
      });
    });
    return snapshot;
  },

  restoreTask: async (snapshot) => {
    set((s) => ({ ...taskCollection([snapshot, ...s.tasks]), highlightTaskId: snapshot.id, highlightNonce: s.highlightNonce + 1 }));
    try {
      await insertTaskWithId(snapshot);
    } catch (err) {
      set((s) => ({ ...taskCollection(s.tasks.filter((t) => t.id !== snapshot.id)) }));
      reportError(err, { context: 'restoreTask', userMessage: "Couldn't restore. Try again", retry: () => get().restoreTask(snapshot) });
      return;
    }
    InteractionManager.runAfterInteractions(() => {
      void syncTaskNotification(snapshot).catch((err: unknown) => reportError(err, { context: 'restoreTask.notifications', userMessage: 'Task restored, but its reminder could not be scheduled' }));
    });
  },

  addCategory: async ({ name, color, icon }) => {
    try {
      const cat = await insertCategory(name, color, icon);
      set((s) => ({ categories: [...s.categories, cat] }));
    } catch (err) {
      reportError(err, { context: 'addCategory', userMessage: "Couldn't save category. Try again" });
    }
  },

  clearCompleted: async () => {
    const completed = get().tasks.filter((t) => t.completed);
    set((s) => ({ ...taskCollection(s.tasks.filter((t) => !t.completed)) }));
    try {
      const db = await import('@/db/client').then((m) => m.getDb());
      await (await db).execAsync('DELETE FROM tasks WHERE completed = 1');
    } catch (err) {
      set((s) => ({ ...taskCollection([...s.tasks, ...completed]) }));
      reportError(err, { context: 'clearCompleted', userMessage: "Couldn't clear. Try again", retry: () => get().clearCompleted() });
      return;
    }
    InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          for (const task of completed) await cancelTaskNotification(task);
        } catch (err) {
          reportError(err, { context: 'clearCompleted.notifications', userMessage: 'Tasks cleared, but some reminders could not be cancelled' });
        }
      })();
    });
  },

  resetAll: async () => {
    try {
      const db = await import('@/db/client').then((m) => m.getDb());
      await (await db).execAsync('DELETE FROM tasks');
      await (await db).execAsync('DELETE FROM categories');
      await (await db).execAsync('DELETE FROM notifications');
      await (await db).execAsync("DELETE FROM settings WHERE key != 'onboarded'");
      await import('@/db/migrations').then((m) => m.runMigrations());
      const [tasks, categories] = await Promise.all([getAllTasks(), getAllCategories()]);
      set({ ...taskCollection(tasks), categories });
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        useNotificationStore.setState({ items: [], unreadCount: 0 });
      } catch (err) { reportError(err, { context: 'resetAll.notifications', userMessage: 'Data reset, but notifications could not be refreshed' }); }
    } catch (err) {
      reportError(err, { context: 'resetAll', userMessage: "Couldn't reset app data. Try again", retry: () => get().resetAll() });
    }
  },
}));
