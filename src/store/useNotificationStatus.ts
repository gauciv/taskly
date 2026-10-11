/**
 * In-memory store tracking notification permission/scheduling capability.
 * Populated by ensurePermission() and by scheduling attempts in the notifications service.
 * Reset on every app launch (not persisted).
 */
import { create } from 'zustand';

export type NotifStatusReason = 'permission_denied' | 'unsupported' | null;

interface NotificationStatusStore {
  reason: NotifStatusReason;
  setStatus: (reason: NotifStatusReason) => void;
}

export const useNotificationStatus = create<NotificationStatusStore>((set) => ({
  reason: null,
  setStatus: (reason) => set({ reason }),
}));
