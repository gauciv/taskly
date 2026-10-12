# Taskly: Build Progress
Status: COMPLETE
Current phase: Final 2
Last updated: 2026-10-12

## Checklist (tick [x] only when verified)
- P0:  [x] 0.1 [x] 0.2 [x] 0.3 [x] 0.4 [x] 0.5 [x] 0.6
- P1:  [x] 1.1 [x] 1.2 [x] 1.3 [x] 1.4 [x] 1.5 [x] 1.6 [x] 1.7 [x] 1.8 [x] 1.9 [x] 1.10 [x] 1.11 [x] 1.12 [x] 1.13
- P2:  [x] 2.1 [x] 2.2 [x] 2.3 [x] 2.4 [x] 2.5 [x] 2.6 [x] 2.7 [x] 2.8 [x] 2.9
- P3:  [x] 3.1 [x] 3.2 [x] 3.3 [x] 3.4 [x] 3.5
- P4:  [x] 4.1 [x] 4.2 [x] 4.3 [x] 4.4 [x] 4.5 [x] 4.6
- P5:  [x] 5.1 [x] 5.2 [x] 5.3 [x] 5.4 [x] 5.5 [x] 5.6
- P6:  [x] 6.1 [x] 6.2 [x] 6.3 [x] 6.4 [x] 6.5
- P7:  [x] 7.1 [x] 7.2 [x] 7.3 [x] 7.4
- P8:  [x] 8.1 [x] 8.2 [x] 8.3 [x] 8.4 [x] 8.5
- P9:  [x] 9.1 [x] 9.2 [x] 9.3 [x] 9.4 [x] 9.5 [x] 9.6 [x] 9.7
- P10: [x] 10.1 [x] 10.2 [x] 10.3 [x] 10.4 [x] 10.5
- P11: [x] 11.0 [x] 11.1 [x] 11.2 [x] 11.3 [x] 11.4 [x] 11.5 [x] 11.6 [x] 11.7 [x] 11.8

## Phase commits
(one line per phase: `P<n> – <git short hash> – <date>`)

## Decisions
- Expo SDK 57 produced by create-expo-app@latest; react-native-reanimated 4.5.1 with react-native-worklets 0.10.1 (already bundled). No babel plugin needed for Reanimated 4.
- reactCompiler experiment removed from app.json (can cause issues with strict Reanimated usage).
- Design reference image was available in run 1; UI based on it.
- ReanimatedSwipeable from react-native-gesture-handler/ReanimatedSwipeable (confirmed present in v2.32.0).
- Settings screen uses a fully custom animated toggle (Reanimated interpolateColor + withSpring thumb translation) instead of the stock RN Switch, matching the dark design system.
- P11 audit: all screens verified against the design system; no stock-looking controls; custom animated toggle replaces Switch; README updated with full feature table and architecture description.
- UI fix 2026-10-11: Tasks tab filters redesigned (single status row + filter sheet); root cause: three horizontal ScrollViews lacked flexGrow:0/flexShrink:0 so the flex:1 task list compressed them to zero height, and Chip had a fixed height:32 that clipped Poppins' tall line metrics on Android. Fixed by adding flexGrow:0/flexShrink:0 to all chip scrollers, replacing fixed height with minHeight:36 + paddingVertical:8, and adding includeFontPadding:false/explicit lineHeight on Android. Category and priority filters moved into a Modal bottom sheet; only one status chip row remains on the main screen; FAB hidden when no tasks exist.

## UI Update 2
- [x] U2.1  ConfirmDialog + ConfirmHost, all destructive actions use it
- [x] U2.2  Floating/header "+" removed; raised center "+" in tab bar (+ schedule-day prefill store)
- [x] U2.3  Route restructure: details at task/[id], edit at task/edit/[id], routes helper, all navigation updated
- [x] U2.4  Task Details screen
- [x] U2.5  Compact Recent Activity row
- [x] U2.6  Weekly Activity chart card (+ selectWeeklyActivity)
- [x] U2.7  Pull-to-refresh (Home, Tasks, Schedule, Notifications) + usePullRefresh
- [x] U2.8  Notifications data layer: migration v2, repo, store, syncInbox, listeners, upcoming selector
- [x] U2.9  Notifications screen UI, bell badge, routing
- [x] U2.10 Settings cleanup (no "Remind me" label, no sample data, confirmations, About line, README)
- [x] U2.11 Final QA: tsc, lint, bundle, visual audit vs reference image, grep checks, commit

## UI Update 3
- [x] U3.1  Settings chip clipping fixed + animated-height audit + capability-based banner (useNotificationStatus)
- [x] U3.2  Home hero card redesign (compact ring + mini week bars + streak pill, selectStreak)
- [x] U3.3  Feedback foundation: haptics map, logger, Toast v2, reportError, Feedback settings, motion prefs
- [x] U3.4  Error handling everywhere: rollback + Retry, ErrorScreen, ErrorBoundary, form validation visuals, permission feedback, catch audit
- [x] U3.5  Success micro-interactions: Button status, save morph, highlight pulse, ring burst, settings Saved, empty-state float
- [x] U3.6  Celebration engine: Confetti, CelebrationOverlay, onTaskCompleted logic, contextual toasts, rate limits
- [x] U3.7  Achievements: unlock logic, Achievements screen, Settings entry, streak pill link, unlock overlay
- [x] U3.8  Final QA: tsc, lint, bundle, visual audit vs reference image, grep checks, README, commit

## Decisions
- U3: selectStreak counts consecutive local days with ≥1 completed task (by completed_at) ending today or yesterday if no task completed today yet.
- U3: Deleting completed tasks can lower derived stats (streaks, totals); noted in code.
- U3: useNotificationStatus is an in-memory zustand store (not persisted) reset on app launch.
- U3: Toast v2 replaces old Toast entirely; showToast signature extended with optional type param (backward compatible).
- U3: CelebrationOverlay and Confetti mounted in root layout above Stack/ToastHost.
- U3: Achievements stored as JSON under settings key "achievements".
- U3: useCelebrationStore queue max 2, achievement > all-done > streak > default priority.
- U3: ErrorScreen used for startup failure and ErrorBoundary; raw error shown only in __DEV__.
- U3: "last_all_done_day" persisted in settings to fire all-done overlay at most once per day.

## Fix 4
- [x] U4.1  Hero card rebuilt with in-flow flex structure (root cause logged)
- [x] U4.2  Audit of other U3 components for collapse/overlap
- [x] U4.3  Idle animations removed; EmptyState static, centered, full button label
- [x] U4.4  Final QA, grep checks, commit

## Decisions
- Fix 4 supersedes UI Update 3 §6 item 9 (floating empty-state icons) and the bell-wiggle in §6 item 5: the app has NO idle or looping decorative animations.
- U4.1 root cause: the hero's auto-height card contained a `flex: 1` row and a `flex: 1` right column while only a `maxHeight` constrained it, creating a cyclic height measurement in the Home ScrollView; the chart also combined its bars and labels inside a fixed-height plot. The replacement uses in-flow rows, an uncapped card with `minHeight`, and separate fixed-height plot/label rows.
- U4.2 layout audit: achievements summary/badges and Settings/Notifications sections remain in normal flow; fixed 100% heights are confined to progress fills inside fixed tracks. Celebration and toast absolute positioning is intentional full-screen/anchored overlay behavior. Toast bottom offset (TabBar height + 48) clears the tab bar and raised add control.
- U4.3: EmptyState is static across all routes; the only former `withRepeat` usage was its decorative float. Every remaining `withSequence` is a finite interaction response (field/button/card shake, press/checkbox feedback, or toast error shake).
- U4.4 layout review: at 360 px the hero has 286 px inner width (104 px ring zone, divider, gaps, and a shrinkable chart zone); at 412 px it has 338 px. The row and chart tracks remain fixed/in-flow, the card has `minHeight: 148` and no max-height, and bars cap at 20 px. Scenarios checked from selectors: due-today tasks show the ratio; completion of all due-today tasks shows check/All done; completed-only overdue data yields the appropriate completed-today or Free day state; no-today tasks with existing history show Free day; zero total tasks hide the hero. Empty state appears only when today's/overdue list is empty. Home absolute elements are the two decorative notch overlays; hero's sole absolute element is the centered ring label. No Home content uses `height: '100%'`.

## Fix 5
- [x] U5.1  Add-task buttons removed from empty states, copy updated, EmptyState centered
- [x] U5.2  Home chart rebuilt (gifted-charts area line, or SVG fallback), ring tweak
- [x] U5.3  Final QA, grep checks, README, commit

## Decisions
- Fix 5: use `react-native-gifted-charts` for the Home area chart if installed version supports Expo Go gradients and the requested point interactions; otherwise use the specified SVG fallback.
- U5.1: the Home zero-task state uses the same “No tasks yet” copy as Tasks; Schedule's selected day is accessed through the raised tab-bar +, so the empty state has no separate task-creation action.
- U5.2 dependency decision: installed gifted-charts 1.4.81; peer dependencies list React, React Native, `react-native-svg`, and optional `expo-linear-gradient`/`react-native-linear-gradient`. The project's existing Expo Go dependencies include `react-native-svg` and `expo-linear-gradient`; no native gradient module was added. The chart renders area gradients with its SVG gradient implementation.
- U5.3 QA: no add-task copy remains in source; only Clear filters retains an EmptyState-adjacent action. No `withRepeat` calls remain. ProgressHero's sole absolute layout is the centered ring label (`StyleSheet.absoluteFill`); no fixed `height: '100%'` remains there. Read-through covered multiple-day data, today-only data, all-zero history, no tasks, empty Tasks/Schedule, and filtered no-results. At 360 px the hero right zone has about 149 px before chart inset; at 412 px about 201 px. The 72 px plot/labels box and data-driven card height remain stable, with the smaller 72 px ring freeing extra space.

## Fix 6
- [x] U6.1  Reanimated invalid color crash fixed (opacity-based pulses, withAlpha helper, audit)
- [x] U6.2  Category persistence bug fixed (root cause logged, safe seeding/migrations, read-after-write)
- [x] U6.3  getDueStatus single source of truth (date-only overdue bug, formatSpan)
- [x] U6.4  Task Details redesign (hero, due card, info cards, notes, activity timeline, sticky action bar)
- [x] U6.5  Feedback latency/jank pass (no awaits before feedback, delayed re-sort, memoized lists, prewarmed confetti)
- [x] U6.6  Final QA, grep checks, README, commit
- Fix 6 U6.1: animated color alpha formatting can produce scientific notation and fail Reanimated's parser. Use fixed colors with animated opacity for pulses; `withAlpha` is for static tints only.
- U6.1 root cause confirmed: `TaskCard` interpolated `borderOpacity.value` into an `rgba()` string inside `useAnimatedStyle`; its final near-zero timing frame produced exponent notation. The highlight now overlays a fixed lime border and animates clamped opacity; scale is a separate animated wrapper. Checkbox burst ring uses fixed geometry/color with opacity/scale animation.
- U6.2 diagnosis: the historical category-null event is not reproducible from this checkout. Startup migration already used an empty-table guard and plain category INSERT; form state, task INSERT parameter order, row mapping, and patch-only UPDATE all preserve the numeric category ID. Hardened the guarded seed into one transaction and made read-after-write failures explicit. No repair is possible for rows whose prior `category_id` is already NULL.
- U6.3: due state now comes from `getDueStatus`; date-only tasks remain `today` until the local day changes, while timed tasks cross to overdue after their exact timestamp. Day spans use calendar-day differences for DST safety; duration text floors to singular/plural minute, hour, day, or week units. Inbox overdue entries remain delayed by one hour for timed tasks and start of the next local day for date-only tasks.
- U6.4: Details is now an in-flow column with a scrollable hero/due/info/reminder/notes/activity stack and a sibling safe-area action bar. On short screens the information stack scrolls behind no controls; the 52 px delete target and 56 px primary action remain fixed at the bottom. Date-only due rows explicitly say “All day”.
- U6.5: Completion now animates/press-scales and haptics before the synchronous optimistic update, then acknowledges immediately; SQLite, reminders, inbox work, and reward evaluation run after interactions. `recentlyToggledIds` holds the previous section/sort state for 700 ms. Task rows use stable IDs, memoized cards, per-ID store subscriptions, and FlatList virtualization; entering motion is disabled after the first 600 ms. Confetti keeps 36 particles mounted and starts a shared UI-thread timing value with `runOnUI`; default bursts stay within an 80 px spread and finish in 700 ms. Success/info toasts replace immediately and errors take priority. Refresh no longer has a minimum spinner delay.
- U6.5 performance note added to README: compare smoothness on a real device or a minified no-dev run because Expo Go dev mode and software-rendered emulators are slower.
- U6.6 final audit: animated worklet color-string construction 0; category `INSERT OR REPLACE` 0; category deletes 1 (explicit reset only); other `INSERT OR REPLACE` uses target settings/tasks only; `formatDistance`/"about " due wording 0; direct `Haptics.*` outside `utils/feedback.ts` 0; `console.*` outside the guarded logger 0. Silent catches are confined to the haptics helper and the documented optional Expo Notifications lazy-load fallback; the latter emits a DEV info line instead of an error. Completion handlers haptic and optimistically update before toast/rewards/persistence; details and list share the same store path. Permission capability failures now show one warning/info toast per session, and the Settings banner's Open Settings action reports failures.
- U6.6 layout/path review: Task Details remains scrollable above its sibling safe-area action bar at compact and tall viewport sizes. Date-only due-today, timed overdue, completed, upcoming, and none states route through `getDueStatus`; notification inbox keeps timed +60-minute and date-only next-day overdue thresholds. Category write/read/hydrate/edit paths preserve numeric IDs; no deterministic startup loss source was found in this checkout, and previously nulled IDs cannot be reconstructed.

## Known issues
- Android export succeeds. The runner emits a Node `NO_COLOR` ignored because `FORCE_COLOR` is set notice; it does not affect the app bundle.
- Android prebuild succeeds and creates `android/app/debug.keystore`, with Expo's non-blocking notice that `expo-system-ui` is not installed for the configured `userInterfaceStyle`; the app's screens use their own dark theme.
- npm reported 30 dependency audit findings (11 moderate, 19 high) during the approved avatar-package install; dependency versions were not force-upgraded as part of this patch.

## Blockers
(anything that stopped progress; empty if none)

## Final
- [x] U7.1  Circular checkbox (empty ring / lime check), burst unmounted at rest, inner dot removed
- [x] U7.2  Labeled priority pill on cards, no standalone dots
- [x] U7.3  Final QA: tsc, lint, doctor, bundle, hygiene, acceptance audit, app.json
- [x] U7.4  README + demo script, Status: COMPLETE, final commit

## Decisions
- U7.1 root cause: the old checkbox intentionally rendered the category-colored ring burst and its sparks whenever motion was enabled, even at progress zero, so the ring/spark overlap read as a permanent inner dot. The replacement mounts the burst only while its shared progress is active; the resting unchecked tree contains only the empty circular outline.
- U7.2: `PriorityBadge` is only used by the shared `TaskCard`, so Home, Tasks, and Schedule now all render the same flag-and-label pill after the due label or alone when there is no due date. A source search found no remaining priority-dot mode or list-specific priority indicator.
- U7.3: TypeScript, lint, Expo Doctor (21/21), and Android export pass. Hygiene scan found no source color literals outside theme tokens, no `console.*` outside logger, no `withRepeat`, and no empty catches outside the haptics helper; the notification loader's optional-module catch logs DEV info. Removed seven unused direct Expo packages while retaining Expo Router peers and the chart's Expo gradient peer. Acceptance trace covered center add/prefilled Schedule date, CRUD + confirmation/Undo, shared completion/celebration path, Details/edit, SQLite/category persistence, due status, search/filter, notifications, settings/reset, achievements, and app metadata.
- U7.4: Replaced the working-notes README with the submission document: requirement map, tech stack, folder structure, three-sentence architecture, run instructions, performance note, credits, and a ten-step demo script. Progress status is COMPLETE; the legacy P0–P11 checklist and U3–U7 checklists are all complete.

## Final 2
- [x] U8.1  Generated avatars (DiceBear or fallback), Avatar component, picker sheet, welcome preview, initials removed
- [x] U8.2  release-apk.yml (gate: major/minor change only), .gitignore, lockfile, prebuild + YAML + gate validation
- [x] U8.3  README (avatars credit + Releasing), final QA, Status: COMPLETE, final commit (no tag, no push)

## Decisions
- U8.1: use DiceBear Lorelei (`@dicebear/core` and `@dicebear/lorelei`, both MIT package licenses; Lorelei artwork is CC0 1.0). Avatar SVG is generated on-device from the seed and cached in memory; no network requests or attribution requirement.
- U8.2: GitHub Actions uses the immediately preceding plain semantic-version tag (version-sorted) as the comparison baseline; it builds only when the major/minor pair changes. Manual dispatch builds an artifact without publishing a release. Android native files are generated per CI run and remain ignored locally.
- U8.2 validation: workflow YAML parsed; gate simulation passed first-release, major/minor, patch-only, and higher-patch cases. CI-mode Android prebuild completed and generated the standard debug keystore; the generated `android/` directory was removed. `package-lock.json` and `package.json` dependency sets match.
- U8.3: README documents local DiceBear avatars, app features, tech/architecture/run instructions, and the release workflow including exact version examples, manual artifacts, install/signing details, and permissions recovery. Final TypeScript/lint/Android export passed; source hygiene found no initials avatars, non-token color literals, or console calls outside the guarded logger. `npm ci --ignore-scripts --dry-run --offline` confirmed lockfile install consistency. No tag, remote, or push was created.
