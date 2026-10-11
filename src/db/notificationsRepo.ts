import { getDb } from './client';

export interface NotificationRow {
  id: number;
  taskId: number | null;
  type: 'reminder' | 'overdue';
  title: string;
  body: string;
  dedupeKey: string;
  fireAt: number;
  read: boolean;
  createdAt: number;
}

interface RawRow {
  id: number;
  task_id: number | null;
  type: string;
  title: string;
  body: string;
  dedupe_key: string;
  fire_at: number;
  read: number;
  created_at: number;
}

function rowToNotif(r: RawRow): NotificationRow {
  return {
    id: r.id,
    taskId: r.task_id,
    type: r.type as 'reminder' | 'overdue',
    title: r.title,
    body: r.body,
    dedupeKey: r.dedupe_key,
    fireAt: r.fire_at,
    read: r.read === 1,
    createdAt: r.created_at,
  };
}

const MAX_ENTRIES = 100;

export async function getAllNotifications(): Promise<NotificationRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    'SELECT * FROM notifications ORDER BY fire_at DESC',
  );
  return rows.map(rowToNotif);
}

/** Insert if the dedupe_key is new. Returns the inserted row or null if duplicate. */
export async function insertNotification(
  entry: Omit<NotificationRow, 'id'>,
): Promise<NotificationRow | null> {
  const db = await getDb();

  // Check duplicate
  const exists = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM notifications WHERE dedupe_key = ?',
    [entry.dedupeKey],
  );
  if (exists) return null;

  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO notifications (task_id, type, title, body, dedupe_key, fire_at, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.taskId,
      entry.type,
      entry.title,
      entry.body,
      entry.dedupeKey,
      entry.fireAt,
      entry.read ? 1 : 0,
      entry.createdAt ?? now,
    ],
  );

  // Prune oldest beyond MAX_ENTRIES
  await db.execAsync(
    `DELETE FROM notifications WHERE id NOT IN (
       SELECT id FROM notifications ORDER BY fire_at DESC LIMIT ${MAX_ENTRIES}
     )`,
  );

  const row = await db.getFirstAsync<RawRow>(
    'SELECT * FROM notifications WHERE id = ?',
    [result.lastInsertRowId],
  );
  return row ? rowToNotif(row) : null;
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
}

export async function markAllNotificationsRead(): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notifications SET read = 1');
}

export async function markReadForTask(taskId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE notifications SET read = 1 WHERE task_id = ? AND read = 0',
    [taskId],
  );
}

export async function deleteNotification(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notifications WHERE id = ?', [id]);
}

export async function clearAllNotifications(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM notifications');
}
