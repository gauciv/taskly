import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { NotchCard } from '@/components/ui/NotchCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskCard } from '@/components/task/TaskCard';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  selectTodayAndOverdue,
  selectOpenCountByCategory,
  selectOverdueCount,
} from '@/store/selectors';
import type { Category } from '@/types';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function HomeScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const userName = useSettingsStore((s) => s.userName);

  const todayTasks = useMemo(() => selectTodayAndOverdue(tasks), [tasks]);
  const overdueCount = useMemo(() => selectOverdueCount(tasks), [tasks]);
  const catCounts = useMemo(() => selectOpenCountByCategory(tasks, categories), [tasks, categories]);

  const todayTotal = todayTasks.length;
  const todayDone = todayTasks.filter((t) => t.completed).length;
  const showProgress = todayTotal > 0;
  const progressPct = todayTotal > 0 ? todayDone / todayTotal : 0;

  const topCats = catCounts.slice(0, 3);
  const todaySlice = todayTasks.slice(0, 5);

  function getCat(id: number | null): Category | undefined {
    return id ? categories.find((c) => c.id === id) : undefined;
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <View style={styles.avatar}>
            <AppText variant="title" color={Colors.onAccent}>
              {getInitials(userName)}
            </AppText>
          </View>
          <View style={styles.greeting}>
            <AppText variant="caption" color={Colors.textMuted}>Welcome back,</AppText>
            <AppText variant="title" color={Colors.text}>{userName}</AppText>
          </View>
          <IconButton
            icon="bell"
            accessibilityLabel="Notifications"
            badge={overdueCount > 0}
            onPress={() => router.push({ pathname: '/(tabs)/tasks' })}
          />
        </Animated.View>

        {/* Progress card */}
        {showProgress && (
          <Animated.View
            entering={FadeInDown.delay(60).duration(220)}
            style={styles.progressCard}
          >
            <AppText variant="label" color={Colors.textMuted}>
              {todayDone} of {todayTotal} done today
            </AppText>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` as `${number}%` }]}
                layout={LinearTransition.springify().damping(18)}
              />
            </View>
          </Animated.View>
        )}

        {/* Recent Activity */}
        {topCats.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(220)} style={styles.section}>
            <SectionHeader
              title="Recent Activity"
              onSeeMore={() => router.push('/(tabs)/tasks')}
            />
            <View style={styles.notchGrid}>
              {/* Tall left card */}
              {topCats[0] && (
                <TouchableOpacity
                  style={styles.tallCard}
                  onPress={() => router.push('/(tabs)/tasks')}
                  accessibilityLabel={`${topCats[0].category.name} tasks`}
                >
                  <NotchCard
                    color={topCats[0].category.color}
                    icon={topCats[0].category.icon as FeatherIconName}
                    style={styles.tallCardInner}
                  >
                    <AppText variant="label" color={Colors.onAccent} style={styles.catName}>
                      {topCats[0].category.name}
                    </AppText>
                    <AppText variant="caption" color={Colors.onAccent + 'CC'}>
                      {topCats[0].count} Task{topCats[0].count !== 1 ? 's' : ''}
                    </AppText>
                  </NotchCard>
                </TouchableOpacity>
              )}
              {/* Two stacked right cards */}
              <View style={styles.stackedCards}>
                {topCats.slice(1, 3).map((item) => (
                  <TouchableOpacity
                    key={item.category.id}
                    style={styles.smallCard}
                    onPress={() => router.push('/(tabs)/tasks')}
                    accessibilityLabel={`${item.category.name} tasks`}
                  >
                    <NotchCard
                      color={item.category.color}
                      icon={item.category.icon as FeatherIconName}
                      style={styles.smallCardInner}
                    >
                      <AppText variant="caption" color={Colors.onAccent} style={styles.catName}>
                        {item.category.name}
                      </AppText>
                      <AppText variant="caption" color={Colors.onAccent + 'CC'}>
                        {item.count} Task{item.count !== 1 ? 's' : ''}
                      </AppText>
                    </NotchCard>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Tasks Today */}
        <Animated.View entering={FadeInDown.delay(180).duration(220)} style={styles.section}>
          <SectionHeader
            title="Tasks Today!"
            onSeeMore={() => router.push('/(tabs)/tasks')}
          />
          {todaySlice.length === 0 ? (
            <EmptyState
              icon="sun"
              title="All clear for today"
              subtitle="No tasks due. Enjoy your day!"
              actionLabel="Add your first task"
              onAction={() => router.push('/task/new')}
            />
          ) : (
            <View style={styles.taskList}>
              {todaySlice.map((task, i) => (
                <View key={task.id} style={styles.taskWrap}>
                  <TaskCard
                    task={task}
                    category={getCat(task.categoryId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onToggle={() => toggleComplete(task.id)}
                    index={i}
                  />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating + */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/task/new')}
        accessibilityLabel="Add new task"
        accessibilityRole="button"
      >
        <Feather name="plus" size={24} color={Colors.onAccent} />
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s4,
    gap: Spacing.s3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    flex: 1,
  },
  progressCard: {
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.sectionGap,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.s4,
    gap: Spacing.s2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.lime,
    borderRadius: 2,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  notchGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenH,
    gap: Spacing.s3,
  },
  tallCard: {
    flex: 1,
  },
  tallCardInner: {
    minHeight: 160,
  },
  stackedCards: {
    flex: 1,
    gap: Spacing.s3,
  },
  smallCard: {
    flex: 1,
  },
  smallCardInner: {
    minHeight: 72,
  },
  taskList: {
    gap: Spacing.s2,
  },
  taskWrap: {},
  fab: {
    position: 'absolute',
    right: Spacing.screenH,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
