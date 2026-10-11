/**
 * Notifications service — local reminders only.
 *
 * expo-notifications removed remote push from Expo Go in SDK 53.
 * The module itself throws at import time in Expo Go, so we load it
 * lazily and fall back to no-ops when it is unavailable.
 */

import { Platform } from 'react-native';
import { Task } from '@/types';
import { getSetting, setSetting } from '@/db/settingsRepo';
import { formatDueLabel } from '@/utils/date';

// ── Lazy loader ───────────────────────────────────────────────────────────────
// Returns the expo-notifications module or null if unavailable (Expo Go SDK 53+).
type ExpoNotifications = typeof import('expo-notifications');
let _notif: ExpoNotifications | null | 'unloaded' = 'unloaded';

function getNotif(): ExpoNotifications | null {
  if (_notif !== 'unloaded') return _notif;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications') as ExpoNotifications;
    _notif = mod;
  } catch {
    _notif = null;
  }
  return _notif;
}

// ── Foreground handler (set up once, no-op if unavailable) ───────────────────
try {
  const n = getNotif();
  if (n) {
    n.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch {}

// ── Android channel ───────────────────────────────────────────────────────────
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const n = getNotif();
    if (!n) return;
    await n.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: n.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D9FF3F',
    });
  } catch {}
}

// ── Permission ────────────────────────────────────────────────────────────────
export async function ensurePermission(): Promise<boolean> {
  try {
    const n = getNotif();
    if (!n) return false;
    const asked = await getSetting('notif_asked');
    if (asked === '1') {
      const { status } = await n.getPermissionsAsync();
      return status === 'granted';
    }
    await setSetting('notif_asked', '1');
    const { status } = await n.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Fire time calculation ─────────────────────────────────────────────────────
async function getFireTime(task: Task): Promise<Date | null> {
  if (!task.dueAt) return null;
  const offsetMin = Number((await getSetting('reminder_offset_min')) ?? '0');
  let fireMs: number;
  if (task.dueHasTime) {
    fireMs = task.dueAt - offsetMin * 60 * 1000;
  } else {
    const d = new Date(task.dueAt);
    d.setHours(9, 0, 0, 0);
    fireMs = d.getTime() - offsetMin * 60 * 1000;
  }
  if (fireMs <= Date.now()) return null;
  return new Date(fireMs);
}

// ── Sync ──────────────────────────────────────────────────────────────────────
export async function syncTaskNotification(task: Task): Promise<void> {
  try {
    const n = getNotif();
    if (!n) return;
    const enabled = (await getSetting('notifications_enabled')) !== '0';
    if (!enabled || task.completed) {
      await cancelTaskNotification(task);
      return;
    }
    const granted = await ensurePermission();
    if (!granted) return;
    await ensureChannel();
    if (task.notificationId) {
      await n.cancelScheduledNotificationAsync(task.notificationId).catch(() => {});
    }
    const fireDate = await getFireTime(task);
    if (!fireDate) return;
    const body = formatDueLabel(task);
    await n.scheduleNotificationAsync({
      identifier: `task-${task.id}`,
      content: {
        title: task.title,
        body: body || 'Reminder',
        data: { taskId: task.id },
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: {
        type: n.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
    const { updateTask } = await import('@/db/tasksRepo');
    await updateTask(task.id, { notificationId: `task-${task.id}` });
  } catch {}
}

export async function cancelTaskNotification(
  task: Pick<Task, 'notificationId' | 'id'>
): Promise<void> {
  try {
    const n = getNotif();
    if (!n) return;
    const id = task.notificationId ?? `task-${task.id}`;
    await n.cancelScheduledNotificationAsync(id).catch(() => {});
  } catch {}
}

export async function resyncAll(tasks: Task[]): Promise<void> {
  try {
    const n = getNotif();
    if (!n) return;
    await n.cancelAllScheduledNotificationsAsync();
    const enabled = (await getSetting('notifications_enabled')) !== '0';
    if (!enabled) return;
    for (const task of tasks) {
      if (!task.completed && task.dueAt) {
        await syncTaskNotification(task);
      }
    }
  } catch {}
}

// ── Deep-link on notification tap ─────────────────────────────────────────────
export function addNotificationTapListener(
  onTap: (taskId: number) => void
): () => void {
  try {
    const n = getNotif();
    if (!n) return () => {};
    const sub = n.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (typeof data?.taskId === 'number') onTap(data.taskId);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

export async function checkLastNotificationResponse(
  onTap: (taskId: number) => void
): Promise<void> {
  try {
    const n = getNotif();
    if (!n) return;
    const response = await n.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (typeof data?.taskId === 'number') onTap(data.taskId);
    }
  } catch {}
}
