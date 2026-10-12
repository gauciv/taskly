export enum Priority {
  Low = 0,
  Medium = 1,
  High = 2,
}

export interface Category {
  id: number;
  name: string;
  color: string;   // hex
  icon: string;    // Feather icon name
  createdAt: number;
}

export interface Task {
  id: number;
  title: string;
  notes: string;
  categoryId: number | null;
  priority: Priority;
  dueAt: number | null;
  dueHasTime: boolean;
  completed: boolean;
  completedAt: number | null;
  notificationId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TaskInput {
  title: string;
  notes?: string;
  categoryId?: number | null;
  priority?: Priority;
  dueAt?: number | null;
  dueHasTime?: boolean;
}

// TaskSnapshot is a full Task copy used for undo/restore operations
export type TaskSnapshot = Task;
