/**
 * Notifications service — local reminders only.
 *
 * expo-notifications removed remote push from Expo Go in SDK 53.
 * The module itself throws at import time in Expo Go, so we load it
 * lazily and fall back to no-ops when it is unavailable.
 */

import { Linking, Platform } from 'react-native';
import { Task } from '@/types';
import { getSetting, setSetting } from '@/db/settingsRepo';
import { formatDueLabel } from '@/utils/date';
import { logError, logInfo } from '@/utils/logger';
import { reportError } from '@/utils/errors';
import { showToast } from '@/components/ui/Toast';

// ── Lazy loader ───────────────────────────────────────────────────────────────
// Returns the expo-notifications module or null if unavailable (Expo Go SDK 53+).
type ExpoNotifications = typeof import('expo-notifications');
let _notif: ExpoNotifications | null | 'unloaded' = 'unloaded';
let permissionToastShown = false;
let unsupportedToastShown = false;

async function setCapabilityStatus(reason: 'permission_denied' | 'unsupported' | null): Promise<void> {
  const { useNotificationStatus } = await import('@/store/useNotificationStatus');
  useNotificationStatus.getState().setStatus(reason);
  if (reason === 'permission_denied' && !permissionToastShown) {
    permissionToastShown = true;
    showToast('Notification permission is off', {
      type: 'warning',
      action: {
        label: 'Open settings',
        onPress: () => {
          void Linking.openSettings().catch((error: unknown) => reportError(error, {
            context: 'notifications.openSettings',
            userMessage: "Couldn't open system settings",
          }));
        },
      },
    });
  } else if (reason === 'unsupported' && !unsupportedToastShown) {
    unsupportedToastShown = true;
    showToast("Reminders can't be scheduled on this device or app build", { type: 'info' });
  }
}

function getNotif(): ExpoNotifications | null {
  if (_notif !== 'unloaded') return _notif;
  try {
    // Dynamic require for lazy loading — module may throw at import in Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications') as ExpoNotifications;
    _notif = mod;
  } catch {
    // Expected in Expo Go builds where expo-notifications is unavailable.
    logInfo('notifications.loadModule', 'expo-notifications is unavailable in this app build');
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
} catch (error) {
  logError('notifications.setHandler', error);
}

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
  } catch (error) {
    await setCapabilityStatus('unsupported');
    logError('notifications.ensureChannel', error);
  }
}

// ── Permission ────────────────────────────────────────────────────────────────
export async function ensurePermission(): Promise<boolean> {
  try {
    const n = getNotif();
    if (!n) {
      // Module unavailable → unsupported (Expo Go)
      await setCapabilityStatus('unsupported');
      return false;
    }
    const asked = await getSetting('notif_asked');
    if (asked === '1') {
      const { status } = await n.getPermissionsAsync();
      await setCapabilityStatus(status === 'granted' ? null : 'permission_denied');
      return status === 'granted';
    }
    await setSetting('notif_asked', '1');
    const { status } = await n.requestPermissionsAsync();
    await setCapabilityStatus(status === 'granted' ? null : 'permission_denied');
    return status === 'granted';
  } catch (error) {
    await setCapabilityStatus('unsupported');
    logError('notifications.ensurePermission', error);
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
    if (!n) {
      await setCapabilityStatus('unsupported');
      return;
    }
    const enabled = (await getSetting('notifications_enabled')) !== '0';
    if (!enabled || task.completed) {
      await cancelTaskNotification(task);
      return;
    }
    const granted = await ensurePermission();
    if (!granted) return;
    await ensureChannel();
    if (task.notificationId) {
      await n.cancelScheduledNotificationAsync(task.notificationId).catch((error) => {
        reportError(error, { context: 'notifications.replaceSchedule.cancel', userMessage: 'The previous reminder could not be replaced' });
      });
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
  } catch (error) {
    await setCapabilityStatus('unsupported');
    logError('notifications.syncTask', error);
  }
}

export async function cancelTaskNotification(
  task: Pick<Task, 'notificationId' | 'id'>
): Promise<void> {
  try {
    const n = getNotif();
    if (!n) return;
    const id = task.notificationId ?? `task-${task.id}`;
    await n.cancelScheduledNotificationAsync(id).catch((error) => {
      reportError(error, { context: 'notifications.cancelTask', userMessage: "Couldn't cancel this reminder", retry: () => { void cancelTaskNotification(task); } });
    });
  } catch (error) {
    reportError(error, { context: 'notifications.cancelTask', userMessage: "Couldn't cancel this reminder", retry: () => { void cancelTaskNotification(task); } });
  }
}

export async function resyncAll(tasks: Task[]): Promise<void> {
  try {
    const n = getNotif();
    if (!n) {
      await setCapabilityStatus('unsupported');
      return;
    }
    await n.cancelAllScheduledNotificationsAsync();
    const enabled = (await getSetting('notifications_enabled')) !== '0';
    if (!enabled) return;
    for (const task of tasks) {
      if (!task.completed && task.dueAt) {
        await syncTaskNotification(task);
      }
    }
  } catch (error) {
    reportError(error, { context: 'notifications.resyncAll', userMessage: "Couldn't refresh reminders", retry: () => { void resyncAll(tasks); } });
  }
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
  } catch (error) {
    reportError(error, { context: 'notifications.addTapListener', userMessage: 'Notification actions are unavailable' });
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
  } catch (error) {
    reportError(error, { context: 'notifications.checkLastResponse', userMessage: "Couldn't open the selected notification" });
  }
}
