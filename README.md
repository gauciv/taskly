# Taskly

A polished dark-themed To-Do List mobile app built with React Native, Expo, and SQLite — a Mobile Application Development mini project.

## Features

| Code | Feature | Where |
|------|---------|-------|
| R1 | Add task | Center "+" in the tab bar; contextual "Add task" buttons on empty states |
| R2 | Display tasks | Home (today & overdue), Tasks tab (all, sectioned), Schedule (by day/time) |
| R3 | Mark completed | Animated checkbox on every task card — tap to toggle, persists across restarts |
| R4 | Task Details | Tap any task card → read-only details screen with full info grid and notes |
| R5 | Edit task | Edit button on the details screen → edit form — all fields editable |
| R6 | Delete task | Swipe-left on a card, or Delete button on details/edit screens — confirm dialog + undo toast |
| R7 | Local storage | expo-sqlite; all data survives app kills and restarts |
| E1 | Categories | 5 seeded categories; create custom ones inline in the task form; filter in Tasks tab |
| E2 | Due dates | Date + optional time; overdue highlighted in red; Schedule tab shows a weekly timeline |
| E3 | Search | Instant search by title, notes, or category name (150 ms debounce) in Tasks tab |
| E4 | Notifications | Local scheduled reminders; configurable offset (at due time / 10 min / 1 hour before); in-app notification center with inbox, upcoming reminders, and swipe-to-dismiss |
| E5 | Priority | Low / Medium / High; shown on cards; default sort puts high-priority first |
| E6 | Weekly Activity | Bar chart + progress ring on Home showing completed tasks over the last 7 days |
| E7 | Pull-to-refresh | Available on Home, Tasks, Schedule, and Notifications screens |
| E8 | Styled dialogs | Custom confirmation dialog (spring animation, warning haptic) for all destructive actions |
| E9 | Rewards | Completion celebrations, streak tracking, and six unlockable achievements |
| E10 | Feedback settings | Celebration and haptic toggles, with reduced-motion support |
| E11 | Error recovery | Visible error toasts with retry actions, form validation, and startup recovery screen |

## How to run

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS or Android). Your phone and computer must be on the same Wi-Fi network. If they aren't, use:

```bash
npx expo start --tunnel
```

## Folder structure

```
src/
  app/          expo-router screens (tabs, modals, welcome, notifications)
    (tabs)/     Home, Tasks, Schedule, Settings tab screens
    task/       Task Details ([id]), Edit ([edit/id]), New modal
    notifications.tsx  In-app notification center
  components/
    ui/         reusable primitives (AppText, Button, AnimatedCheckbox, Toast, ConfirmDialog…)
    task/       task-specific components (TaskCard, TaskForm, pickers, swipe)
  db/           SQLite client, migrations (v1+v2), and repository functions
  store/        Zustand stores (tasks, settings, notifications, schedule, filters) and selectors
  services/     notifications.ts — local reminder scheduling
  theme/        tokens.ts — all colors, spacing, radii, typography
  utils/        date helpers, route helpers
  types.ts      shared TypeScript types
```

## Architecture

The UI reads from Zustand stores (`useTaskStore`, `useSettingsStore`, `useNotificationStore`) which act as an in-memory cache. Every mutation updates the store optimistically (so the UI feels instant), then writes to SQLite via repository functions in `src/db/`; on error the store rolls back and shows a toast. Notification scheduling is a side-effect layer that runs after every task mutation. The in-app notification inbox is generated deterministically from task state via `syncInbox()`, called on app start, foreground resume, and every 30 seconds.
