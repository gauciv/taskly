import { create } from 'zustand';
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

interface TaskStore {
  tasks: Task[];
  categories: Category[];
  hydrated: boolean;
  highlightTaskId: number | null;
  highlightNonce: number;
  hydrate: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<number | null>;
  updateTask: (id: number, patch: Partial<TaskInput> & { notificationId?: string | null }) => Promise<void>;
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
  categories: [],
  hydrated: false,
  highlightTaskId: null,
  highlightNonce: 0,

  hydrate: async () => {
    const [tasks, categories] = await Promise.all([getAllTasks(), getAllCategories()]);
    set({ tasks, categories, hydrated: true });
  },

  setHighlight: (id) => {
    set((s) => ({ highlightTaskId: id, highlightNonce: id !== null ? s.highlightNonce + 1 : s.highlightNonce }));
  },

  addTask: async (input) => {
    try {
      const task = await insertTask(input);
      set((s) => ({ tasks: [task, ...s.tasks], highlightTaskId: task.id, highlightNonce: s.highlightNonce + 1 }));
      await syncTaskNotification(task);
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        await useNotificationStore.getState().syncInbox(Date.now());
      } catch {}
      return task.id;
    } catch (err) {
      reportError(err, { context: 'addTask', userMessage: "Couldn't save your task", retry: () => get().addTask(input) });
      return null;
    }
  },

  updateTask: async (id, patch) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) return;
    const optimistic: Task = { ...prev, ...patch, updatedAt: Date.now() } as Task;
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? optimistic : t)) }));
    try {
      const updated = await updateTask(id, patch);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)), highlightTaskId: id, highlightNonce: s.highlightNonce + 1 }));
      await syncTaskNotification(updated);
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        await useNotificationStore.getState().syncInbox(Date.now());
      } catch {}
    } catch (err) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? prev : t)) }));
      reportError(err, { context: 'updateTask', userMessage: "Couldn't save your task", retry: () => get().updateTask(id, patch) });
    }
  },

  toggleComplete: async (id, originX, originY) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const now = Date.now();
    const completed = !task.completed;
    const patch = { completed, completedAt: completed ? now : null };
    const optimistic: Task = { ...task, ...patch, updatedAt: now };
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? optimistic : t)) }));
    try {
      const updated = await updateTask(id, patch);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      if (completed) {
        await cancelTaskNotification(updated);
        try {
          const { useNotificationStore } = await import('./useNotificationStore');
          await useNotificationStore.getState().markReadForTask(id);
        } catch {}
        // Fire celebration/feedback
        const { onTaskCompleted } = await import('@/services/feedback');
        await onTaskCompleted(optimistic, get().tasks, originX, originY);
      } else {
        await syncTaskNotification(updated);
        const { onTaskUncompleted } = await import('@/services/feedback');
        onTaskUncompleted();
      }
    } catch (err) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
      reportError(err, { context: 'toggleComplete', userMessage: "Couldn't save. Try again", retry: () => get().toggleComplete(id) });
    }
  },

  deleteTask: async (id) => {
    const snapshot = get().tasks.find((t) => t.id === id) ?? null;
    if (!snapshot) return null;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    try {
      await dbDeleteTask(id);
      await cancelTaskNotification(snapshot);
    } catch (err) {
      set((s) => ({ tasks: [snapshot, ...s.tasks] }));
      reportError(err, { context: 'deleteTask', userMessage: "Couldn't delete. Try again", retry: () => get().deleteTask(id) });
      return null;
    }
    return snapshot;
  },

  restoreTask: async (snapshot) => {
    set((s) => ({ tasks: [snapshot, ...s.tasks], highlightTaskId: snapshot.id, highlightNonce: s.highlightNonce + 1 }));
    try {
      await insertTaskWithId(snapshot);
      await syncTaskNotification(snapshot);
    } catch (err) {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== snapshot.id) }));
      reportError(err, { context: 'restoreTask', userMessage: "Couldn't restore. Try again", retry: () => get().restoreTask(snapshot) });
    }
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
    set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) }));
    try {
      const db = await import('@/db/client').then((m) => m.getDb());
      await (await db).execAsync('DELETE FROM tasks WHERE completed = 1');
      for (const t of completed) await cancelTaskNotification(t);
    } catch (err) {
      set((s) => ({ tasks: [...s.tasks, ...completed] }));
      reportError(err, { context: 'clearCompleted', userMessage: "Couldn't clear. Try again", retry: () => get().clearCompleted() });
    }
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
      set({ tasks, categories });
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        useNotificationStore.setState({ items: [], unreadCount: 0 });
      } catch {}
    } catch (err) {
      reportError(err, { context: 'resetAll', userMessage: "Couldn't reset app data. Try again", retry: () => get().resetAll() });
    }
  },
}));
