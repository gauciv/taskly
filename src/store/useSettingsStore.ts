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
  hydrate: () => Promise<void>;
  setUserName: (name: string) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setReminderOffset: (min: 0 | 10 | 60) => Promise<void>;
  setOnboarded: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  userName: 'Friend',
  notificationsEnabled: true,
  reminderOffsetMin: 0,
  onboarded: false,
  hydrated: false,

  hydrate: async () => {
    const settings = await getAllSettings();
    set({
      userName: settings['user_name'] ?? 'Friend',
      notificationsEnabled: settings['notifications_enabled'] !== '0',
      reminderOffsetMin: (Number(settings['reminder_offset_min'] ?? 0)) as 0 | 10 | 60,
      onboarded: settings['onboarded'] === '1',
      hydrated: true,
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
}));
