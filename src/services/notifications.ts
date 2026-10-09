import { Task } from '@/types';

// No-op stubs — real implementation in P9
export async function ensurePermission(): Promise<boolean> {
  return false;
}

export async function syncTaskNotification(_task: Task): Promise<void> {
  // stub
}

export async function cancelTaskNotification(_task: Pick<Task, 'notificationId'>): Promise<void> {
  // stub
}

export async function resyncAll(_tasks: Task[]): Promise<void> {
  // stub
}
