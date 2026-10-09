import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, Category } from '@/types';
import { getSetting, setSetting } from '@/db/settingsRepo';
import { formatDueLabel } from '@/utils/date';

// ── Foreground handler ────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Android channel ───────────────────────────────────────────────────────────
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D9FF3F',
    });
  } catch {}
}

// ── Permission ────────────────────────────────────────────────────────────────
export async function ensurePermission(): Promise<boolean> {
  try {
    const asked = await getSetting('notif_asked');
    if (asked === '1') {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    }
    await setSetting('notif_asked', '1');
    const { status } = await Notifications.requestPermissionsAsync();
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
    // Date-only: fire at 09:00 local on that day
    const d = new Date(task.dueAt);
    d.setHours(9, 0, 0, 0);
    fireMs = d.getTime() - offsetMin * 60 * 1000;
  }

  if (fireMs <= Date.now()) return null; // Already in the past
  return new Date(fireMs);
}

// ── Sync ──────────────────────────────────────────────────────────────────────
export async function syncTaskNotification(task: Task): Promise<void> {
  try {
    const enabled = (await getSetting('notifications_enabled')) !== '0';
    if (!enabled || task.completed) {
      await cancelTaskNotification(task);
      return;
    }

    const granted = await ensurePermission();
    if (!granted) return;

    await ensureChannel();

    // Cancel old notification first
    if (task.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(task.notificationId).catch(() => {});
    }

    const fireDate = await getFireTime(task);
    if (!fireDate) return;

    const body = formatDueLabel(task);

    await Notifications.scheduleNotificationAsync({
      identifier: `task-${task.id}`,
      content: {
        title: task.title,
        body: body || 'Reminder',
        data: { taskId: task.id },
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });

    // Update notificationId in DB
    const { updateTask } = await import('@/db/tasksRepo');
    await updateTask(task.id, { notificationId: `task-${task.id}` });
  } catch {
    // Never crash the app due to notification errors
  }
}

export async function cancelTaskNotification(task: Pick<Task, 'notificationId' | 'id'>): Promise<void> {
  try {
    const id = task.notificationId ?? `task-${task.id}`;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  } catch {}
}

export async function resyncAll(tasks: Task[]): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const enabled = (await getSetting('notifications_enabled')) !== '0';
    if (!enabled) return;
    for (const task of tasks) {
      if (!task.completed && task.dueAt) {
        await syncTaskNotification(task);
      }
    }
  } catch {}
}

// ── Deep-link on notification tap ────────────────────────────────────────────
export function addNotificationTapListener(onTap: (taskId: number) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    if (typeof data?.taskId === 'number') {
      onTap(data.taskId);
    }
  });
  return () => sub.remove();
}

export async function checkLastNotificationResponse(onTap: (taskId: number) => void): Promise<void> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (typeof data?.taskId === 'number') {
        onTap(data.taskId);
      }
    }
  } catch {}
}
