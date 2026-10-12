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

## Avatars

Profile avatars are generated locally from a saved seed with DiceBear Lorelei and rendered as SVG; they work offline and do not send profile data over the network. The DiceBear core and style packages are MIT licensed, and the Lorelei artwork is CC0 1.0, so attribution is not required. [DiceBear Lorelei license](https://github.com/dicebear/styles/blob/main/LICENSE.md).

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

## Releasing

Push a version tag to start the Android release workflow:

```bash
git tag v1.2.0
git push origin v1.2.0
```

The workflow builds only when the pushed tag's `major.minor` pair differs from the immediately previous lower plain `vX.Y.Z` tag (versions are sorted numerically). The first matching version tag builds. Patch-only tags skip the build.

| New tag | Previous tag | Result |
|---|---|---|
| `v1.0.0` | none | Build first release |
| `v1.1.0` | `v1.0.0` | Build: minor changed |
| `v1.1.1` | `v1.1.0` | Skip: patch only |
| `v1.1.2` | `v1.1.1` | Skip: patch only |
| `v1.2.0` | `v1.1.2` | Build: minor changed |
| `v1.2.5` | `v1.1.2` | Build: minor changed |
| `v2.0.0` | `v1.2.5` | Build: major changed |

A patch-only run finishes after the gate, with the build job marked skipped. For a release build, download the APK and SHA-256 file from **GitHub → Releases**. Builds target 64-bit Android phones (`arm64-v8a`) and x86_64 emulators. Allow installation from the browser or file manager when Android asks, then open Taskly. APKs use the standard Android debug key for sideloading and updates; this key is not suitable for Play Store publication. A private repository requires you to be signed in with repository access to download its APK.

Builds usually take about 15–25 minutes. To build without publishing a release, open **Actions → Release APK → Run workflow**; the resulting APK is available as a downloadable workflow artifact.

If publishing fails with a permissions error: Repository → Settings → Actions → General → Workflow permissions: Read and write.

## Debugging the release build

To collect verbose diagnostics, open **Actions → Release APK → Run workflow**, set **debug** to `true`, and start the run. The workflow summary shows the gate decision and preflight table. Download the `diagnostics` artifact from the build job; `diagnostics/REPORT.md` is the single file to share when asking for help. Diagnostics artifacts are retained for 14 days.

Preflight checks cover:

1. P1: runner toolchain, Android SDK/NDK, disk, memory, and CPU.
2. P2: Node compatibility with installed package engine ranges.
3. P3: Expo app config and version/package metadata.
4. P4: Expo package alignment and Expo Doctor.
5. P5: duplicate React/React Native versions and dependency tree.
6. P6: Gradle-referenced Node commands and package resolution from Android and project directories.
7. P7: Expo modules autolinking commands and their output.
8. P8: production-like Android JavaScript bundle export.
9. P9: reachability of Gradle, Google, Maven Central, and JitPack repositories.
10. P10: Gradle properties, wrapper version, and project files.
11. P11: case-sensitive relative and aliased imports in tracked source files.
12. P12: Git status, current tag description, and commit SHA.

After fixing a released version, a tag can be replaced with:

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag vX.Y.Z
git push origin vX.Y.Z
```

Patch-only tags such as `v1.0.1` are skipped by design when the previous release tag has the same major and minor version. Use a debug workflow dispatch for diagnostics, or publish a new major/minor version when a new release build is intended.
