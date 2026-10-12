import { getDb } from './client';
import { Task, TaskInput, Priority } from '@/types';

interface TaskRow {
  id: number;
  title: string;
  notes: string;
  category_id: number | null;
  priority: number;
  due_at: number | null;
  due_has_time: number;
  completed: number;
  completed_at: number | null;
  notification_id: string | null;
  created_at: number;
  updated_at: number;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    categoryId: row.category_id,
    priority: row.priority as Priority,
    dueAt: row.due_at,
    dueHasTime: row.due_has_time === 1,
    completed: row.completed === 1,
    completedAt: row.completed_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY created_at DESC');
  return rows.map(rowToTask);
}

export async function insertTask(input: TaskInput): Promise<Task> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO tasks (title, notes, category_id, priority, due_at, due_has_time, completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      input.title.trim(),
      input.notes?.trim() ?? '',
      input.categoryId ?? null,
      input.priority ?? Priority.Medium,
      input.dueAt ?? null,
      input.dueHasTime ? 1 : 0,
      now,
      now,
    ]
  );
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [result.lastInsertRowId]);
  if (!row) throw new Error('Task was written but could not be read back');
  return rowToTask(row);
}

export async function updateTask(id: number, patch: Partial<TaskInput> & { completed?: boolean; completedAt?: number | null; notificationId?: string | null }): Promise<Task> {
  const db = await getDb();
  const now = Date.now();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.title !== undefined)      { fields.push('title = ?');         values.push(patch.title.trim()); }
  if (patch.notes !== undefined)      { fields.push('notes = ?');         values.push(patch.notes.trim()); }
  if ('categoryId' in patch)          { fields.push('category_id = ?');   values.push(patch.categoryId ?? null); }
  if (patch.priority !== undefined)   { fields.push('priority = ?');      values.push(patch.priority); }
  if ('dueAt' in patch)               { fields.push('due_at = ?');        values.push(patch.dueAt ?? null); }
  if (patch.dueHasTime !== undefined) { fields.push('due_has_time = ?');  values.push(patch.dueHasTime ? 1 : 0); }
  if (patch.completed !== undefined)  { fields.push('completed = ?');     values.push(patch.completed ? 1 : 0); }
  if ('completedAt' in patch)         { fields.push('completed_at = ?');  values.push(patch.completedAt ?? null); }
  if ('notificationId' in patch)      { fields.push('notification_id = ?'); values.push(patch.notificationId ?? null); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  if (!row) throw new Error('Task was written but could not be read back');
  return rowToTask(row);
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function insertTaskWithId(task: Task): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO tasks
      (id, title, notes, category_id, priority, due_at, due_has_time, completed, completed_at, notification_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.notes,
      task.categoryId ?? null,
      task.priority,
      task.dueAt ?? null,
      task.dueHasTime ? 1 : 0,
      task.completed ? 1 : 0,
      task.completedAt ?? null,
      task.notificationId ?? null,
      task.createdAt,
      task.updatedAt,
    ]
  );
}
