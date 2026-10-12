import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/utils/feedback';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Colors,
  Spacing,
  Radii,
  SpringConfig,
  tintedFill,
  TabBar as TabBarTokens,
} from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { useNotificationStore, selectUpcomingReminders } from '@/store/useNotificationStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { taskDetailsHref } from '@/utils/routes';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import { formatSpan } from '@/utils/dueStatus';
import type { NotificationRow } from '@/db/notificationsRepo';
import { ensurePermission, resyncAll } from '@/services/notifications';

type Segment = 'all' | 'unread';

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60_000) return 'now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (isYesterday(new Date(ms))) return 'Yesterday';
  return format(new Date(ms), 'MMM d');
}

// ── Section grouping ──────────────────────────────────────────────────────────
interface SectionData {
  title: string;
  data: NotificationRow[];
}

function groupBySections(items: NotificationRow[]): SectionData[] {
  const today: NotificationRow[] = [];
  const yesterday: NotificationRow[] = [];
  const earlier: NotificationRow[] = [];
  for (const item of items) {
    const d = new Date(item.fireAt);
    if (isToday(d)) today.push(item);
    else if (isYesterday(d)) yesterday.push(item);
    else earlier.push(item);
  }
  const sections: SectionData[] = [];
  if (today.length) sections.push({ title: 'Today', data: today });
  if (yesterday.length) sections.push({ title: 'Yesterday', data: yesterday });
  if (earlier.length) sections.push({ title: 'Earlier', data: earlier });
  return sections;
}

// ── Segmented control ─────────────────────────────────────────────────────────
interface SegmentedControlProps {
  active: Segment;
  unreadCount: number;
  onPress: (seg: Segment) => void;
}

function SegmentedControl({ active, unreadCount, onPress }: SegmentedControlProps) {
  const translateX = useSharedValue(active === 'all' ? 0 : 1);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(translateX.value * 120, SpringConfig) }],
  }));

  function handlePress(seg: Segment) {
    translateX.value = seg === 'all' ? 0 : 1;
    haptic.selection();
    onPress(seg);
  }

  return (
    <View style={segStyles.container}>
      <Animated.View style={[segStyles.indicator, indicatorStyle]} />
      <TouchableOpacity
        style={segStyles.tab}
        onPress={() => handlePress('all')}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'all' }}
      >
        <AppText
          variant="label"
          color={active === 'all' ? Colors.text : Colors.textMuted}
        >
          All
        </AppText>
      </TouchableOpacity>
      <TouchableOpacity
        style={segStyles.tab}
        onPress={() => handlePress('unread')}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'unread' }}
      >
        <AppText
          variant="label"
          color={active === 'unread' ? Colors.text : Colors.textMuted}
        >
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    padding: 4,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.s3,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 120,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHigh,
  },
  tab: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    zIndex: 1,
  },
});

// ── Upcoming reminder row ─────────────────────────────────────────────────────
interface UpcomingRowProps {
  taskTitle: string;
  fireTime: number;
  dueAt: number | null;
  dueHasTime: boolean;
  onPress: () => void;
}

function UpcomingRow({ taskTitle, fireTime, dueAt, dueHasTime, onPress }: UpcomingRowProps) {
  // eslint-disable-next-line react-hooks/purity
  const diff = fireTime - Date.now();
  let countdown = '';
  if (diff < 3600_000) countdown = `in ${Math.max(1, Math.ceil(diff / 60_000))}m`;
  else if (diff < 86_400_000) {
    const h = Math.floor(diff / 3600_000);
    const m = Math.floor((diff % 3600_000) / 60_000);
    countdown = m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  } else {
    countdown = `in ${formatSpan(diff)}`;
  }
  const dueLabel = dueAt ? `${format(new Date(dueAt), 'MMM d')}${dueHasTime ? ` · ${format(new Date(dueAt), 'h:mm a')}` : ' · All day'}` : '';
  return (
    <TouchableOpacity style={upStyles.row} onPress={onPress} accessibilityRole="button">
      <View style={upStyles.iconTile}>
        <Feather name="clock" size={18} color={Colors.lime} />
      </View>
      <View style={upStyles.text}>
        <AppText variant="label" color={Colors.text} numberOfLines={1}>{taskTitle}</AppText>
        {dueLabel ? (
          <AppText variant="caption" color={Colors.textMuted}>{dueLabel}</AppText>
        ) : null}
      </View>
      <AppText variant="caption" color={Colors.lime}>{countdown}</AppText>
    </TouchableOpacity>
  );
}

const upStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s3,
    gap: Spacing.s3,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: tintedFill(Colors.lime),
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
});

// ── Notification item ─────────────────────────────────────────────────────────
interface NotifItemProps {
  item: NotificationRow;
  taskCompleted: boolean;
  taskDeleted: boolean;
  onPress: () => void;
  onDismiss: () => void;
}

function NotifItem({ item, taskCompleted, taskDeleted, onDismiss, onPress }: NotifItemProps) {
  const isReminder = item.type === 'reminder';
  const iconName: React.ComponentProps<typeof Feather>['name'] = isReminder ? 'bell' : 'alert-circle';
  const iconColor = isReminder ? Colors.lime : Colors.danger;

  const renderRightActions = useCallback(
    () => (
      <View style={itemStyles.swipeAction}>
        <Feather name="trash-2" size={20} color={Colors.text} />
      </View>
    ),
    []
  );

  function handlePress() {
    haptic.light();
    onPress();
  }

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      rightThreshold={48}
      overshootRight={false}
      onSwipeableWillOpen={onDismiss}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          itemStyles.container,
          !item.read && itemStyles.unread,
          pressed && itemStyles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${isReminder ? 'Reminder' : 'Overdue'}: ${item.title}, ${relativeTime(item.fireAt)}, ${item.read ? 'read' : 'unread'}`}
      >
        {/* Unread left border */}
        {!item.read && <View style={itemStyles.unreadBorder} />}

        <View style={[itemStyles.iconTile, { backgroundColor: tintedFill(iconColor) }]}>
          <Feather name={iconName} size={20} color={iconColor} />
        </View>

        <View style={itemStyles.body}>
          <AppText
            variant="label"
            color={item.read ? Colors.textMuted : Colors.text}
            style={!item.read && itemStyles.boldText}
            numberOfLines={1}
          >
            {item.title}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={2}>
            {item.body}
          </AppText>
          {taskCompleted && (
            <View style={itemStyles.donePill}>
              <Feather name="check" size={10} color={Colors.success} />
              <AppText variant="caption" color={Colors.success} style={itemStyles.doneText}>Done</AppText>
            </View>
          )}
          {taskDeleted && (
            <AppText variant="caption" color={Colors.textFaint} style={itemStyles.deletedText}>
              Task deleted
            </AppText>
          )}
        </View>

        <View style={itemStyles.right}>
          <AppText variant="caption" color={Colors.textFaint}>{relativeTime(item.fireAt)}</AppText>
          {!item.read && (
            <Animated.View exiting={FadeOut.duration(200)} style={itemStyles.unreadDot} />
          )}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.taskCard,
    marginHorizontal: Spacing.screenH,
    marginVertical: 4,
    padding: 14,
    gap: Spacing.s3,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  unread: {
    borderColor: Colors.lime + '33',
    backgroundColor: Colors.surfaceAlt,
  },
  pressed: {
    opacity: 0.8,
  },
  unreadBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.lime,
    borderTopLeftRadius: Radii.taskCard,
    borderBottomLeftRadius: Radii.taskCard,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  boldText: {
    fontFamily: 'Poppins_600SemiBold',
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  doneText: {
    color: Colors.success,
  },
  deletedText: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lime,
  },
  swipeAction: {
    width: 80,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.taskCard,
    marginVertical: 4,
    marginRight: Spacing.screenH,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>('all');

  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const remove = useNotificationStore((s) => s.remove);
  const restore = useNotificationStore((s) => s.restore);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const syncInbox = useNotificationStore((s) => s.syncInbox);

  const tasks = useTaskStore((s) => s.tasks);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const reminderOffsetMin = useSettingsStore((s) => s.reminderOffsetMin);

  const { refreshing, onRefresh } = usePullRefresh();

  // Upcoming reminders (computed, not stored)
  const upcoming = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => selectUpcomingReminders(tasks, { notificationsEnabled, reminderOffsetMin }, Date.now()),
    [tasks, notificationsEnabled, reminderOffsetMin]
  );

  const displayed = useMemo(
    () => (segment === 'unread' ? items.filter((n) => !n.read) : items),
    [items, segment]
  );

  const sections = useMemo(() => groupBySections(displayed), [displayed]);

  // Map task IDs for quick lookup
  const taskMap = useMemo(() => {
    const m = new Map<number, { completed: boolean }>();
    for (const t of tasks) m.set(t.id, { completed: t.completed });
    return m;
  }, [tasks]);

  async function handleMarkAllRead() {
    haptic.success();
    await markAllRead();
  }

  const handleItemPress = useCallback(async (item: NotificationRow) => {
    if (!item.read) await markRead(item.id);
    if (item.taskId === null) {
      showToast('This task was deleted');
      return;
    }
    router.push(taskDetailsHref(item.taskId));
  }, [markRead]);

  const handleDismiss = useCallback(async (item: NotificationRow) => {
    const snapshot = await remove(item.id);
    if (snapshot) {
      showToast('Notification dismissed', {
        label: 'Undo',
        onPress: () => restore(snapshot),
      });
    }
  }, [remove, restore]);

  async function handleClearAll() {
    const ok = await confirm({
      title: 'Clear all notifications?',
      message: 'Your notification history will be removed.',
      confirmLabel: 'Clear all',
      destructive: true,
    });
    if (!ok) return;
    await clearAll();
  }

  async function handleTurnOnNotifications() {
    const granted = await ensurePermission();
    if (!granted) {
      showToast('Permission denied. Enable in system settings.');
      return;
    }
    await setNotificationsEnabled(true);
    await resyncAll(tasks);
    await syncInbox(Date.now());
  }

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHead}>
        <AppText variant="label" color={Colors.textMuted}>{section.title}</AppText>
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: NotificationRow; index: number }) => {
      const taskInfo = item.taskId !== null ? taskMap.get(item.taskId) : undefined;
      const taskCompleted = taskInfo?.completed ?? false;
      const taskDeleted = item.taskId !== null && !taskMap.has(item.taskId);
      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index, 5) * 40).duration(220)}
          exiting={FadeOutLeft.duration(200)}
          layout={LinearTransition}
        >
          <NotifItem
            item={item}
            taskCompleted={taskCompleted}
            taskDeleted={taskDeleted}
            onPress={() => handleItemPress(item)}
            onDismiss={() => handleDismiss(item)}
          />
        </Animated.View>
      );
    },
    [taskMap, handleItemPress, handleDismiss]
  );

  const listBottomPad = TabBarTokens.height + insets.bottom + 40;

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        />
        <AppText variant="h2" style={styles.headerTitle}>Notifications</AppText>
        <View style={styles.headerActions}>
          <IconButton
            icon="check-circle"
            accessibilityLabel="Mark all as read"
            onPress={handleMarkAllRead}
            color={unreadCount > 0 ? Colors.lime : Colors.textFaint}
          />
          <IconButton
            icon="trash-2"
            accessibilityLabel="Clear all notifications"
            onPress={handleClearAll}
            color={items.length > 0 ? Colors.danger : Colors.textFaint}
          />
        </View>
      </View>

      {/* Off banner */}
      {!notificationsEnabled && (
        <View style={styles.offBanner}>
          <AppText variant="caption" color={Colors.textMuted} style={styles.offText}>
            Notifications are off
          </AppText>
          <TouchableOpacity onPress={handleTurnOnNotifications} accessibilityRole="button">
            <AppText variant="caption" color={Colors.lime}>Turn on</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Segmented control */}
      <SegmentedControl
        active={segment}
        unreadCount={unreadCount}
        onPress={setSegment}
      />

      {/* List */}
      {sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="bell"
            title={segment === 'unread' ? 'No unread notifications' : "You're all caught up"}
            subtitle={
              segment === 'unread'
                ? undefined
                : 'Reminders and overdue alerts will show up here.'
            }
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad, flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.lime}
              colors={[Colors.lime]}
              progressBackgroundColor={Colors.surfaceAlt}
            />
          }
          ListHeaderComponent={
            segment === 'all' && upcoming.length > 0 ? (
              <View style={styles.upcomingSection}>
                <AppText variant="label" color={Colors.textMuted} style={styles.upcomingHeader}>
                  Upcoming
                </AppText>
                {upcoming.map((u) => (
                  <UpcomingRow
                    key={u.task.id}
                    taskTitle={u.task.title}
                    fireTime={u.fireTime}
                    dueAt={u.task.dueAt}
                    dueHasTime={u.task.dueHasTime}
                    onPress={() => router.push(taskDetailsHref(u.task.id))}
                  />
                ))}
                <View style={styles.divider} />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s3,
    gap: Spacing.s2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  offBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offText: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionHead: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s2,
    marginTop: Spacing.s2,
  },
  upcomingSection: {
    marginBottom: Spacing.s2,
  },
  upcomingHeader: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s2,
    marginTop: Spacing.s2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.s3,
  },
});
