import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  AppState,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, TabBar as TabBarTokens, tintedFill } from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskCard } from '@/components/task/TaskCard';
import { ProgressHero } from '@/components/ui/ProgressHero';
import { Avatar } from '@/components/ui/Avatar';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import {
  selectTodayAndOverdue,
  selectOpenCountByCategory,
  selectWeeklyActivity,
  selectStreak,
} from '@/store/selectors';
import { taskDetailsHref, notificationsHref, tasksHref, tasksByCategoryHref } from '@/utils/routes';
import { usePullRefresh } from '@/hooks/usePullRefresh';
import type { Category } from '@/types';
import { startOfDay } from 'date-fns';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const recentlyToggledIds = useTaskStore((s) => s.recentlyToggledIds);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const userName = useSettingsStore((s) => s.userName);
  const avatarSeed = useSettingsStore((s) => s.avatarSeed);
  const [enteringEnabled, setEnteringEnabled] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setTimeout(() => setEnteringEnabled(false), 600);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNowMs(Date.now());
    });
    return () => sub.remove();
  }, []);
  const currentDay = startOfDay(new Date(nowMs)).getTime();

  const todayTasks = useMemo(() => selectTodayAndOverdue(tasks, nowMs, recentlyToggledIds), [tasks, recentlyToggledIds, nowMs]);
  const catCounts = useMemo(() => selectOpenCountByCategory(tasks, categories), [tasks, categories]);
  const weeklyActivity = useMemo(() => selectWeeklyActivity(tasks, currentDay), [tasks, currentDay]);
  const streak = useMemo(() => selectStreak(tasks, currentDay), [tasks, currentDay]);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const hasTasks = tasks.length > 0;
  const topCats = catCounts.slice(0, 6);
  const todaySlice = todayTasks.slice(0, 5);

  const { refreshing, onRefresh } = usePullRefresh();

  function getCat(id: number | null): Category | undefined {
    return id ? categories.find((c) => c.id === id) : undefined;
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: TabBarTokens.height + insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.lime}
            colors={[Colors.lime]}
            progressBackgroundColor={Colors.surfaceAlt}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <Avatar seed={avatarSeed?.trim() || userName.trim() || 'Taskly'} size={52} />
          <View style={styles.greeting}>
            <AppText variant="caption" color={Colors.textMuted}>Welcome back,</AppText>
            <AppText variant="title" color={Colors.text}>{userName}</AppText>
          </View>
          <IconButton
            icon="bell"
            accessibilityLabel="Notifications"
            badgeCount={unreadCount}
            onPress={() => router.push(notificationsHref)}
          />
        </Animated.View>

        {/* Progress Hero card */}
        {hasTasks && (
          <ProgressHero
            data={weeklyActivity}
            streak={streak}
            hasTasks={hasTasks}
          />
        )}

        {/* Recent Activity – compact horizontal row */}
        {topCats.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(220)} style={styles.section}>
            <SectionHeader
              title="Recent Activity"
              onSeeMore={() => router.push(tasksHref)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activityRow}
            >
              {topCats.map((item, i) => (
                <Animated.View
                  key={item.category.id}
                  entering={FadeInRight.delay(i < 4 ? i * 40 : 0).duration(220)}
                >
                  <Pressable
                    onPress={() =>
                      router.push(tasksByCategoryHref(item.category.id))
                    }
                    accessibilityLabel={`${item.category.name}: ${item.count} open task${item.count !== 1 ? 's' : ''}`}
                    style={({ pressed }) => [styles.compactCard, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <CompactCatCard
                      category={item.category}
                      count={item.count}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Tasks Today */}
        <Animated.View entering={FadeInDown.delay(180).duration(220)} style={[styles.section, todaySlice.length === 0 && styles.emptyTaskSection]}>
          <SectionHeader
            title="Tasks Today!"
            onSeeMore={() => router.push(tasksHref)}
          />
          {todaySlice.length === 0 ? (
            <EmptyState
              icon={tasks.length === 0 ? 'check-square' : 'sun'}
              title={tasks.length === 0 ? 'No tasks yet' : 'All clear for today'}
              subtitle={tasks.length === 0 ? 'Tap the + button to add your first task.' : 'No tasks due. Enjoy your day!'}
            />
          ) : (
            <View style={styles.taskList}>
              {todaySlice.map((task, i) => (
                <View key={task.id} style={styles.taskWrap}>
                  <TaskCard
                    task={task}
                    category={getCat(task.categoryId)}
                    onPress={() => router.push(taskDetailsHref(task.id))}
                    onToggle={() => toggleComplete(task.id)}
                    index={i}
                    enteringEnabled={enteringEnabled}
                  />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function CompactCatCard({ category, count }: { category: Category; count: number }) {
  const catColor = category.color;
  return (
    <View style={[styles.notchCompact, { backgroundColor: tintedFill(catColor), borderColor: catColor + '44' }]}>
      <View style={[styles.notchCorner, { borderBottomColor: tintedFill(catColor) }]} />
      <View style={[styles.notchCornerBg, { borderBottomColor: Colors.bg }]} />

      <View style={[styles.iconTile, { backgroundColor: catColor + '33' }]}>
        <Feather name={category.icon as FeatherIconName} size={16} color={catColor} />
      </View>
      <View style={styles.notchBottom}>
        <AppText variant="label" color={Colors.text} style={styles.catNameText} numberOfLines={1}>
          {category.name}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {count} open task{count !== 1 ? 's' : ''}
        </AppText>
      </View>
    </View>
  );
}

const NOTCH_SIZE = 22;

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 0,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s4,
    gap: Spacing.s3,
  },
  greeting: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  emptyTaskSection: {
    flexGrow: 1,
  },
  activityRow: {
    paddingHorizontal: Spacing.screenH,
    gap: 12,
    flexDirection: 'row',
  },
  compactCard: {
    // wrapper for pressable feedback
  },
  notchCompact: {
    width: 152,
    height: 104,
    borderRadius: Radii.taskCard,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  notchCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: NOTCH_SIZE,
    borderLeftWidth: NOTCH_SIZE,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  notchCornerBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: NOTCH_SIZE,
    borderRightWidth: NOTCH_SIZE,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: Colors.bg,
    borderRightColor: Colors.bg,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notchBottom: {
    gap: 2,
  },
  catNameText: {
    flexShrink: 1,
  },
  taskList: {
    gap: Spacing.s2,
  },
  taskWrap: {},
});
