import type { Href } from 'expo-router';

export const taskDetailsHref = (id: number): Href => `/task/${id}` as Href;
export const taskEditHref = (id: number): Href => `/task/edit/${id}` as Href;
export const newTaskHref: Href = '/task/new' as Href;
export const newTaskWithDueHref = (dueMs: number): Href =>
  ({ pathname: '/task/new', params: { due: String(dueMs) } }) as Href;
export const notificationsHref: Href = '/notifications' as Href;
export const achievementsHref: Href = '/achievements' as Href;
