# Taskly

A polished dark-themed To-Do List mobile app built with React Native, Expo, and SQLite — a Mobile Application Development mini project.

## Features

| Code | Feature | Where |
|------|---------|-------|
| R1 | Add task | "+" button on Home, Tasks, and Schedule; task form at `/task/new` |
| R2 | Display tasks | Home (today & overdue), Tasks tab (all, sectioned), Schedule (by day/time) |
| R3 | Mark completed | Animated checkbox on every task card — tap to toggle, persists across restarts |
| R4 | Edit task | Tap any task card → edit form at `/task/[id]` — all fields editable |
| R5 | Delete task | Swipe-left on a card, or trash icon in the edit form — undo via toast |
| R6 | Local storage | expo-sqlite; all data survives app kills and restarts |
| E1 | Categories | 5 seeded categories; create custom ones inline in the task form; filter in Tasks tab |
| E2 | Due dates | Date + optional time; overdue highlighted in red; Schedule tab shows a weekly timeline |
| E3 | Search | Instant search by title, notes, or category name (150 ms debounce) in Tasks tab |
| E4 | Notifications | Local scheduled reminders; configurable offset (at due time / 10 min / 1 hour before) |
| E5 | Priority | Low / Medium / High; shown on cards; default sort puts high-priority first |

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
  app/          expo-router screens (tabs, modals, welcome)
  components/
    ui/         reusable primitives (AppText, Button, AnimatedCheckbox, NotchCard, Toast…)
    task/       task-specific components (TaskCard, TaskForm, pickers, swipe)
  db/           SQLite client, migrations, and repository functions
  store/        Zustand stores (tasks + settings) and selectors
  services/     notifications.ts — local reminder scheduling
  theme/        tokens.ts — all colors, spacing, radii, typography
  utils/        date helpers and sample data
  types.ts      shared TypeScript types
```

## Architecture

The UI reads from two Zustand stores (`useTaskStore`, `useSettingsStore`) which act as an in-memory cache. Every mutation updates the store optimistically (so the UI feels instant), then writes to SQLite via repository functions in `src/db/`; on error the store rolls back and shows a toast. Notification scheduling is a side-effect layer that runs after every task mutation, with full try/catch so it never crashes the app.
