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
import { showToast } from '@/components/ui/Toast';
import {
  syncTaskNotification,
  cancelTaskNotification,
} from '@/services/notifications';

interface TaskStore {
  tasks: Task[];
  categories: Category[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: number, patch: Partial<TaskInput> & { notificationId?: string | null }) => Promise<void>;
  toggleComplete: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<TaskSnapshot | null>;
  restoreTask: (snapshot: TaskSnapshot) => Promise<void>;
  addCategory: (cat: { name: string; color: string; icon: string }) => Promise<void>;
  clearCompleted: () => Promise<void>;
  resetAll: () => Promise<void>;
}

// Note: loadSampleData removed per U2.10

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  categories: [],
  hydrated: false,

  hydrate: async () => {
    const [tasks, categories] = await Promise.all([getAllTasks(), getAllCategories()]);
    set({ tasks, categories, hydrated: true });
  },

  addTask: async (input) => {
    try {
      const task = await insertTask(input);
      set((s) => ({ tasks: [task, ...s.tasks] }));
      await syncTaskNotification(task);
      // Sync notification inbox for new task
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        await useNotificationStore.getState().syncInbox(Date.now());
      } catch {}
    } catch {
      showToast("Couldn't save. Try again.");
    }
  },

  updateTask: async (id, patch) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) return;
    const optimistic: Task = { ...prev, ...patch, updatedAt: Date.now() } as Task;
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? optimistic : t)) }));
    try {
      const updated = await updateTask(id, patch);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      await syncTaskNotification(updated);
      // Sync notification inbox after update
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        await useNotificationStore.getState().syncInbox(Date.now());
      } catch {}
    } catch {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? prev : t)) }));
      showToast("Couldn't save. Try again.");
    }
  },

  toggleComplete: async (id) => {
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
        // Mark notification inbox entries read for this task
        try {
          const { useNotificationStore } = await import('./useNotificationStore');
          await useNotificationStore.getState().markReadForTask(id);
        } catch {}
      } else {
        await syncTaskNotification(updated);
      }
    } catch {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
      showToast("Couldn't save. Try again.");
    }
  },

  deleteTask: async (id) => {
    const snapshot = get().tasks.find((t) => t.id === id) ?? null;
    if (!snapshot) return null;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    try {
      await dbDeleteTask(id);
      await cancelTaskNotification(snapshot);
    } catch {
      set((s) => ({ tasks: [snapshot, ...s.tasks] }));
      showToast("Couldn't delete. Try again.");
      return null;
    }
    return snapshot;
  },

  restoreTask: async (snapshot) => {
    set((s) => ({ tasks: [snapshot, ...s.tasks] }));
    try {
      await insertTaskWithId(snapshot);
      await syncTaskNotification(snapshot);
    } catch {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== snapshot.id) }));
      showToast("Couldn't restore. Try again.");
    }
  },

  addCategory: async ({ name, color, icon }) => {
    try {
      const cat = await insertCategory(name, color, icon);
      set((s) => ({ categories: [...s.categories, cat] }));
    } catch {
      showToast("Couldn't save category. Try again.");
    }
  },

  clearCompleted: async () => {
    const completed = get().tasks.filter((t) => t.completed);
    set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) }));
    try {
      const db = await import('@/db/client').then((m) => m.getDb());
      await (await db).execAsync('DELETE FROM tasks WHERE completed = 1');
      for (const t of completed) await cancelTaskNotification(t);
    } catch {
      set((s) => ({ tasks: [...s.tasks, ...completed] }));
      showToast("Couldn't clear. Try again.");
    }
  },

  resetAll: async () => {
    const db = await import('@/db/client').then((m) => m.getDb());
    await (await db).execAsync('DELETE FROM tasks');
    await (await db).execAsync('DELETE FROM categories');
    await (await db).execAsync('DELETE FROM notifications');
    await (await db).execAsync("DELETE FROM settings WHERE key != 'onboarded'");
    // Re-run migrations to re-seed
    await import('@/db/migrations').then((m) => m.runMigrations());
    const [tasks, categories] = await Promise.all([getAllTasks(), getAllCategories()]);
    set({ tasks, categories });
    // Clear notification store
    try {
      const { useNotificationStore } = await import('./useNotificationStore');
      useNotificationStore.setState({ items: [], unreadCount: 0 });
    } catch {}
  },
}));
