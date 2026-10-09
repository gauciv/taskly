import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radii } from '@/theme/tokens';
import { Task } from '@/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Feather } from '@expo/vector-icons';
import { SwipeableTaskCard } from '@/components/task/SwipeableTaskCard';
import { useTaskStore } from '@/store/useTaskStore';
import { showToast } from '@/components/ui/Toast';
import { selectSortedTasks } from '@/store/selectors';

type SectionItem =
  | { type: 'header'; title: string; count: number; collapsible?: boolean; collapsed?: boolean }
  | { type: 'task'; task: Task }
  | { type: 'empty'; message: string };

export default function TasksScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

  const sorted = useMemo(() => selectSortedTasks(tasks), [tasks]);
  const active = useMemo(() => sorted.filter((t) => !t.completed), [sorted]);
  const completed = useMemo(() => sorted.filter((t) => t.completed), [sorted]);

  function getCat(id: number | null) {
    return id ? categories.find((c) => c.id === id) : undefined;
  }

  const handleDelete = useCallback(async (id: number) => {
    const snapshot = await deleteTask(id);
    if (snapshot) {
      showToast('Task deleted', {
        label: 'Undo',
        onPress: () => restoreTask(snapshot),
      });
    }
  }, [deleteTask, restoreTask]);

  const handleToggle = useCallback((id: number) => {
    toggleComplete(id);
  }, [toggleComplete]);

  const items = useMemo<SectionItem[]>(() => {
    const list: SectionItem[] = [];

    list.push({ type: 'header', title: 'Active', count: active.length });
    if (active.length === 0) {
      list.push({ type: 'empty', message: 'No active tasks. Great job!' });
    } else {
      active.forEach((t) => list.push({ type: 'task', task: t }));
    }

    if (completed.length > 0) {
      list.push({
        type: 'header',
        title: 'Completed',
        count: completed.length,
        collapsible: true,
        collapsed: completedCollapsed,
      });
      if (!completedCollapsed) {
        completed.forEach((t) => list.push({ type: 'task', task: t }));
      }
    }

    return list;
  }, [active, completed, completedCollapsed]);

  const renderItem = useCallback<ListRenderItem<SectionItem>>((info) => {
    const item = info.item;
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <AppText variant="label" color={Colors.textMuted}>
            {item.title} ({item.count})
          </AppText>
          {item.collapsible && (
            <TouchableOpacity onPress={() => setCompletedCollapsed((v) => !v)} hitSlop={8}>
              <Feather
                name={item.collapsed ? 'chevron-down' : 'chevron-up'}
                size={16}
                color={Colors.textFaint}
              />
            </TouchableOpacity>
          )}
        </View>
      );
    }
    if (item.type === 'empty') {
      return (
        <AppText variant="body" color={Colors.textFaint} style={styles.emptyLine}>
          {item.message}
        </AppText>
      );
    }
    const task = item.task;
    const cat = getCat(task.categoryId);
    return (
      <SwipeableTaskCard
        task={task}
        category={cat}
        onPress={() => router.push(`/task/${task.id}`)}
        onToggle={() => handleToggle(task.id)}
        onDelete={() => handleDelete(task.id)}
        index={info.index}
      />
    );
  }, [categories, handleToggle, handleDelete, completedCollapsed]);

  const keyExtractor = useCallback((item: SectionItem) => {
    if (item.type === 'task') return `task-${item.task.id}`;
    if (item.type === 'header') return `hdr-${item.title}`;
    return `empty-${item.message}`;
  }, []);

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText variant="h2" color={Colors.text}>My Tasks</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {active.length} active task{active.length !== 1 ? 's' : ''}
          </AppText>
        </View>
        <IconButton
          icon="plus"
          onPress={() => router.push('/task/new')}
          accessibilityLabel="Add task"
          color={Colors.onAccent}
          bgColor={Colors.lime}
        />
      </View>

      {tasks.length === 0 ? (
        <EmptyState
          icon="check-square"
          title="No tasks yet"
          subtitle="Tap + to add your first task"
          actionLabel="Add task"
          onAction={() => router.push('/task/new')}
        />
      ) : (
        <Animated.FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          itemLayoutAnimation={LinearTransition.springify().damping(18)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating + button */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s4,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  list: {
    paddingTop: Spacing.s3,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s2,
    marginTop: Spacing.s3,
  },
  emptyLine: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s3,
    textAlign: 'center',
  },
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
