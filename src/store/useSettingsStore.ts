import { create } from 'zustand';
import { getAllSettings, setSetting } from '@/db/settingsRepo';
import { resyncAll } from '@/services/notifications';
import { useTaskStore } from './useTaskStore';

interface SettingsStore {
  userName: string;
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
    } catch {}
    set({
      userName: settings['user_name'] ?? 'Friend',
      notificationsEnabled: settings['notifications_enabled'] !== '0',
      reminderOffsetMin: (Number(settings['reminder_offset_min'] ?? 0)) as 0 | 10 | 60,
      onboarded: settings['onboarded'] === '1',
      hydrated: true,
      celebrationsEnabled: settings['celebrations_enabled'] !== '0',
      hapticsEnabled: settings['haptics_enabled'] !== '0',
      achievements,
      achievementsUnlocked: Object.keys(achievements).length,
    });
  },

  setUserName: async (name) => {
    set({ userName: name });
    await setSetting('user_name', name);
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
