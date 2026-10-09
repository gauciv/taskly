import { getDb } from './client';
import { Category } from '@/types';

interface CategoryRow {
  id: number;
  name: string;
  color: string;
  icon: string;
  created_at: number;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories ORDER BY created_at ASC');
  return rows.map(rowToCategory);
}

export async function insertCategory(name: string, color: string, icon: string): Promise<Category> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.runAsync(
    'INSERT INTO categories (name, color, icon, created_at) VALUES (?, ?, ?, ?)',
    [name, color, icon, now]
  );
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowId]);
  return rowToCategory(row!);
}
