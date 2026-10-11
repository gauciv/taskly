# Taskly: Build Progress
Status: COMPLETE   <!-- set to COMPLETE only after P11.8 -->
Current phase: P11
Last updated: 2026-10-11

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
- [ ] U2.7  Pull-to-refresh (Home, Tasks, Schedule, Notifications) + usePullRefresh
- [ ] U2.8  Notifications data layer: migration v2, repo, store, syncInbox, listeners, upcoming selector
- [ ] U2.9  Notifications screen UI, bell badge, routing
- [ ] U2.10 Settings cleanup (no "Remind me" label, no sample data, confirmations, About line, README)
- [ ] U2.11 Final QA: tsc, lint, bundle, visual audit vs reference image, grep checks, commit

## Known issues
(non-blocking bugs or warnings)

## Blockers
(anything that stopped progress; empty if none)
