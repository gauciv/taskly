import { create } from 'zustand';
import { getAllSettings, setSetting } from '@/db/settingsRepo';
import { resyncAll } from '@/services/notifications';
import { useTaskStore } from './useTaskStore';
import { reportError } from '@/utils/errors';

interface SettingsStore {
  userName: string;
  avatarSeed: string | null;
  notificationsEnabled: boolean;
  reminderOffsetMin: 0 | 10 | 60;
  onboarded: boolean;
  hydrated: boolean;
  celebrationsEnabled: boolean;
  hapticsEnabled: boolean;
  achievementsUnlocked: number;
  // Raw achievements JSON: { [id]: unlockedAtMs }
  achievements: Record<string, number>;

  hydrate: () => Promise<void>;
  setUserName: (name: string) => Promise<void>;
  setAvatarSeed: (seed: string) => Promise<boolean>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setReminderOffset: (min: 0 | 10 | 60) => Promise<void>;
  setOnboarded: () => Promise<void>;
  setCelebrationsEnabled: (enabled: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  unlockAchievement: (id: string) => Promise<boolean>;
  isAchievementUnlocked: (id: string) => boolean;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  userName: 'Friend',
  avatarSeed: null,
  notificationsEnabled: true,
  reminderOffsetMin: 0,
  onboarded: false,
  hydrated: false,
  celebrationsEnabled: true,
  hapticsEnabled: true,
  achievementsUnlocked: 0,
  achievements: {},

  hydrate: async () => {
    const settings = await getAllSettings();
    let achievements: Record<string, number> = {};
    try {
      achievements = JSON.parse(settings['achievements'] ?? '{}') as Record<string, number>;
    } catch (error) {
      reportError(error, { context: 'settings.parseAchievements', userMessage: 'Saved reward data could not be read' });
    }
    set({
      userName: settings['user_name'] ?? 'Friend',
      avatarSeed: settings['avatar_seed'] ?? null,
      notificationsEnabled: settings['notifications_enabled'] !== '0',
      reminderOffsetMin: (Number(settings['reminder_offset_min'] ?? 0)) as 0 | 10 | 60,
      onboarded: settings['onboarded'] === '1',
      hydrated: true,
      celebrationsEnabled: settings['celebrations_enabled'] !== '0',
      hapticsEnabled: settings['haptics_enabled'] !== '0',
      achievements,
      achievementsUnlocked: Object.keys(achievements).length,
    });

    // Silently unlock achievements already earned (no overlay, no toast)
    // Evaluated against current task list after task store hydrates.
    // We schedule this as a microtask so the task store has a chance to hydrate first.
    Promise.resolve().then(async () => {
      try {
        const { useTaskStore } = await import('./useTaskStore');
        const tasks = useTaskStore.getState().tasks;
        if (tasks.length === 0) return; // nothing to evaluate yet
        const { evaluateAchievements } = await import('@/services/achievements');
        const newlyUnlocked = evaluateAchievements(tasks, Date.now(), get().achievements);
        for (const id of newlyUnlocked) {
          await get().unlockAchievement(id); // persist silently
        }
      } catch (error) {
        // Hydration remains available, with visible feedback for the background reward failure.
        reportError(error, { context: 'settings.hydrateAchievements', userMessage: 'Reward progress could not be refreshed' });
      }
    });
  },

  setUserName: async (name) => {
    set({ userName: name });
    await setSetting('user_name', name);
  },

  setAvatarSeed: async (seed) => {
    const previous = get().avatarSeed;
    set({ avatarSeed: seed });
    try {
      await setSetting('avatar_seed', seed);
    } catch (error) {
      set({ avatarSeed: previous });
      reportError(error, {
        context: 'settings.setAvatarSeed',
        userMessage: "Couldn't save your avatar",
        retry: () => { void get().setAvatarSeed(seed); },
      });
      return false;
    }
    return true;
  },

  setNotificationsEnabled: async (enabled) => {
    set({ notificationsEnabled: enabled });
    await setSetting('notifications_enabled', enabled ? '1' : '0');
    const tasks = useTaskStore.getState().tasks;
    await resyncAll(tasks);
  },

  setReminderOffset: async (min) => {
    set({ reminderOffsetMin: min });
    await setSetting('reminder_offset_min', String(min));
    const tasks = useTaskStore.getState().tasks;
    await resyncAll(tasks);
  },

  setOnboarded: async () => {
    set({ onboarded: true });
    await setSetting('onboarded', '1');
  },

  setCelebrationsEnabled: async (enabled) => {
    set({ celebrationsEnabled: enabled });
    await setSetting('celebrations_enabled', enabled ? '1' : '0');
  },

  setHapticsEnabled: async (enabled) => {
    set({ hapticsEnabled: enabled });
    await setSetting('haptics_enabled', enabled ? '1' : '0');
  },

  unlockAchievement: async (id) => {
    const { achievements } = get();
    if (achievements[id] !== undefined) return false; // already unlocked
    const updated = { ...achievements, [id]: Date.now() };
    set({ achievements: updated, achievementsUnlocked: Object.keys(updated).length });
    await setSetting('achievements', JSON.stringify(updated));
    return true;
  },

  isAchievementUnlocked: (id) => {
    return get().achievements[id] !== undefined;
  },
}));
