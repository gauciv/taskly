# Taskly

Taskly is a dark, mobile task planner built for a Mobile Application Development project. It supports the complete task workflow, saves data locally with SQLite, and adds categories, scheduling, search, reminders, and priority tools.

## Features

### Core requirements

| Requirement | Taskly implementation |
|---|---|
| Create | Add tasks from the raised center `+` button on every tab; Schedule pre-fills its selected day. |
| Read and organize | Home shows today's and overdue tasks; Tasks groups the full list; Schedule shows tasks by day and time. |
| Update | Edit title, notes, category, priority, due date, and reminder from the task form. |
| Complete | Toggle completion from a task card or Details; changes save to SQLite and can be undone from feedback. |
| Delete | Delete from swipe actions, Details, or Edit after confirmation; the toast offers Undo. |
| Persistence | SQLite stores tasks, categories, settings, and notification history across app restarts. |

### Five enhancements

| Enhancement | Implementation |
|---|---|
| Categories | Seeded and custom categories, colored card pills, and category filters. |
| Due dates and times | All-day or timed tasks, Schedule timeline, and shared today/upcoming/overdue status rules. |
| Search | Debounced search across task titles, notes, and category names. |
| Reminders | Local scheduled notifications with configurable offsets and an in-app notification center. |
| Priority | Low, Medium, and High priorities with labeled card pills, filters, and priority-aware sorting. |

### Extras

- Home progress ring and seven-day gradient activity chart.
- Streaks, achievements, contextual completion celebrations, and confetti.
- Feedback settings for celebrations and haptics, with reduced-motion support.
- Pull-to-refresh, inline form validation, recoverable error toasts, and startup recovery.
- Empty states, confirmation dialogs, notification unread badge, and undo actions.

## Tech stack

React Native, Expo SDK 57, TypeScript, Expo Router, Expo SQLite, Zustand, Reanimated, Feather icons, `react-native-svg`, `react-native-gifted-charts`, `expo-linear-gradient`, and Poppins.

## How to run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on a phone connected to the same Wi-Fi network. For a network that blocks local discovery, run `npx expo start --tunnel` instead. To use an Android emulator, start the server and press `a` in its terminal.

## Performance notes

Test smoothness on a real device or with `npx expo start --no-dev --minify`; emulators using software rendering and Expo Go development mode can be slower than a release build.

## Folder structure

```text
src/
  app/          Expo Router routes and screens
    (tabs)/     Home, Tasks, Schedule, and Settings
    task/       Create, edit, and view task details
  components/
    task/       Task cards, form, pickers, filters, and swipe actions
    ui/         Shared controls, feedback, charts, and empty/error states
  db/           SQLite setup, migrations, and repositories
  hooks/        Motion preferences, fonts, and refresh behavior
  services/     Notification scheduling, achievements, and feedback logic
  store/        Zustand stores and task selectors
  theme/        Shared color, spacing, typography, and radius tokens
  utils/        Due-date rules, feedback, errors, and typed routes
```

## Architecture

The UI reads and sends actions through Zustand stores, which hold the current app state. Stores optimistically update the visible state and persist changes through focused SQLite repositories, rolling back and reporting errors when writes fail. Local notifications run as a side-effect service, while notification history and derived rewards use the same task data.

## Demo script

1. Open the welcome screen, enter a name, and continue to Home.
2. Use the center `+` button to create a task with a title, Study category, High priority, and a due time.
3. Show the new task on Home, then open Schedule and locate it on its due day.
4. Open the task's Details screen and point out its category, priority, due status, reminder, notes, and activity.
5. Edit the title or notes, save, and return to Details to show the updated values.
6. Complete the task from its card and show the immediate check animation, feedback, and celebration.
7. Open Tasks, search for the task, then demonstrate the status, category, and priority filters.
8. Open the notification center and show the unread state or the empty state; enable reminders if the device supports them.
9. Open Settings and show the feedback toggles, achievements entry, clear-completed action, and reset confirmation.
10. Restart the app and verify that the task, category, priority, and settings persisted.

## Credits

Built by Gauciv.
