import { getDb } from './client';

const SEED_CATEGORIES = [
  { name: 'Work',     color: '#8B7CFF', icon: 'briefcase' },
  { name: 'Personal', color: '#D9FF3F', icon: 'user' },
  { name: 'Study',    color: '#29C7E8', icon: 'book-open' },
  { name: 'Health',   color: '#FF7AA8', icon: 'heart' },
  { name: 'Shopping', color: '#FF9F6B', icon: 'shopping-bag' },
];

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const v = version?.user_version ?? 0;

  if (v < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        due_at INTEGER,
        due_has_time INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER,
        notification_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
      CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  }

  // Seed only when empty, transactionally. INSERT (never REPLACE) avoids
  // deleting referenced category rows, which would null tasks.category_id.
  await db.withTransactionAsync(async () => {
    const catCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
    if ((catCount?.count ?? 0) !== 0) return;
    const now = Date.now();
    for (const cat of SEED_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (name, color, icon, created_at) VALUES (?, ?, ?, ?)',
        [cat.name, cat.color, cat.icon, now]
      );
    }
  });

  if (v < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        dedupe_key TEXT NOT NULL UNIQUE,
        fire_at INTEGER NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_fire ON notifications(fire_at);

      PRAGMA user_version = 2;
    `);
  }

  // Seed default settings
  await db.runAsync(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('notifications_enabled', '1')",
    []
  );
  await db.runAsync(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_offset_min', '0')",
    []
  );
}
