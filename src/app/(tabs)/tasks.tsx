import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { Task } from '@/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { SwipeableTaskCard } from '@/components/task/SwipeableTaskCard';
import { useTaskStore } from '@/store/useTaskStore';
import { showToast } from '@/components/ui/Toast';
import { selectSortedTasks } from '@/store/selectors';
import { isToday, isOverdue } from '@/utils/date';

type StatusFilter = 'all' | 'active' | 'completed' | 'today' | 'overdue';
type PriorityFilter = 'all' | '0' | '1' | '2';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Today', value: 'today' },
  { label: 'Overdue', value: 'overdue' },
];

const PRIORITY_OPTIONS: { label: string; value: PriorityFilter; color: string }[] = [
  { label: 'All', value: 'all', color: Colors.lime },
  { label: 'High', value: '2', color: Colors.priority.high },
  { label: 'Medium', value: '1', color: Colors.priority.medium },
  { label: 'Low', value: '0', color: Colors.priority.low },
];

export default function TasksScreen() {
  const params = useLocalSearchParams<{ filter?: string; category?: string }>();
  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);

  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const f = params.filter;
    if (f === 'today' || f === 'overdue' || f === 'active' || f === 'completed') return f;
    return 'all';
  });
  const [categoryFilter, setCategoryFilter] = useState<number | null>(() =>
    params.category ? Number(params.category) : null
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

  // Sync route params on mount
  useEffect(() => {
    if (params.filter === 'today') setStatusFilter('today');
    if (params.filter === 'overdue') setStatusFilter('overdue');
    if (params.category) setCategoryFilter(Number(params.category));
  }, [params.filter, params.category]);

  function handleSearchChange(text: string) {
    setSearchRaw(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(text), 150);
  }

  function clearFilters() {
    setSearch('');
    setSearchRaw('');
    setStatusFilter('all');
    setCategoryFilter(null);
    setPriorityFilter('all');
  }

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== 'all') n++;
    if (categoryFilter !== null) n++;
    if (priorityFilter !== 'all') n++;
    if (search) n++;
    return n;
  }, [statusFilter, categoryFilter, priorityFilter, search]);

  const sorted = useMemo(() => selectSortedTasks(tasks), [tasks]);

  const filtered = useMemo(() => {
    let list = sorted;
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((t) => {
        const cat = t.categoryId ? categories.find((c) => c.id === t.categoryId) : null;
        return (
          t.title.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          (cat?.name.toLowerCase().includes(q) ?? false)
        );
      });
    }
    if (statusFilter === 'active') list = list.filter((t) => !t.completed);
    if (statusFilter === 'completed') list = list.filter((t) => t.completed);
    if (statusFilter === 'today') list = list.filter((t) => t.dueAt !== null && isToday(t.dueAt));
    if (statusFilter === 'overdue') list = list.filter((t) => isOverdue(t));
    if (categoryFilter !== null) list = list.filter((t) => t.categoryId === categoryFilter);
    if (priorityFilter !== 'all') list = list.filter((t) => String(t.priority) === priorityFilter);
    return list;
  }, [sorted, search, statusFilter, categoryFilter, priorityFilter, categories]);

  const active = useMemo(() => filtered.filter((t) => !t.completed), [filtered]);
  const completed = useMemo(() => filtered.filter((t) => t.completed), [filtered]);

  function getCat(id: number | null) {
    return id ? categories.find((c) => c.id === id) : undefined;
  }

  const handleDelete = useCallback(async (id: number) => {
    const snapshot = await deleteTask(id);
    if (snapshot) {
      showToast('Task deleted', { label: 'Undo', onPress: () => restoreTask(snapshot) });
    }
  }, [deleteTask, restoreTask]);

  const handleToggle = useCallback((id: number) => toggleComplete(id), [toggleComplete]);

  const noResults = filtered.length === 0 && (search || statusFilter !== 'all' || categoryFilter !== null || priorityFilter !== 'all');

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText variant="h2">My Tasks</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {active.length} active · {completed.length} done
          </AppText>
        </View>
        <View style={styles.headerRight}>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <AppText variant="caption" color={Colors.onAccent}>{activeFilterCount}</AppText>
            </View>
          )}
          <IconButton icon="plus" onPress={() => router.push('/task/new')} accessibilityLabel="Add task" color={Colors.onAccent} bgColor={Colors.lime} />
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={Colors.textFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={Colors.textFaint}
          value={searchRaw}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          accessibilityLabel="Search tasks"
        />
        {searchRaw ? (
          <TouchableOpacity onPress={() => { setSearchRaw(''); setSearch(''); }} hitSlop={8}>
            <Feather name="x" size={16} color={Colors.textFaint} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={statusFilter === opt.value}
            onPress={() => setStatusFilter(opt.value)}
            color={Colors.lime}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Chip label="All" selected={categoryFilter === null} onPress={() => setCategoryFilter(null)} color={Colors.lime} />
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            selected={categoryFilter === cat.id}
            onPress={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
            color={cat.color}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {PRIORITY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={priorityFilter === opt.value}
            onPress={() => setPriorityFilter(opt.value)}
            color={opt.color}
          />
        ))}
      </ScrollView>

      {/* List */}
      {tasks.length === 0 ? (
        <EmptyState
          icon="check-square"
          title="No tasks yet"
          subtitle="Tap + to add your first task"
          actionLabel="Add task"
          onAction={() => router.push('/task/new')}
        />
      ) : noResults ? (
        <View style={styles.noResults}>
          <EmptyState
            icon="search"
            title="No results"
            subtitle="Try different filters or search terms"
          />
          <Button label="Clear filters" onPress={clearFilters} variant="ghost" />
        </View>
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {/* Active section */}
          <View style={styles.sectionHeader}>
            <AppText variant="label" color={Colors.textMuted}>
              Active ({active.length})
            </AppText>
          </View>
          {active.length === 0 ? (
            <AppText variant="body" color={Colors.textFaint} style={styles.emptyLine}>
              No active tasks
            </AppText>
          ) : (
            active.map((task, i) => (
              <View key={task.id} style={styles.cardWrap}>
                <SwipeableTaskCard
                  task={task}
                  category={getCat(task.categoryId)}
                  onPress={() => router.push(`/task/${task.id}`)}
                  onToggle={() => handleToggle(task.id)}
                  onDelete={() => handleDelete(task.id)}
                  index={i}
                />
              </View>
            ))
          )}

          {/* Completed section */}
          {completed.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setCompletedCollapsed((v) => !v)}
              >
                <AppText variant="label" color={Colors.textMuted}>
                  Completed ({completed.length})
                </AppText>
                <Feather
                  name={completedCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.textFaint}
                />
              </TouchableOpacity>
              {!completedCollapsed &&
                completed.map((task, i) => (
                  <View key={task.id} style={styles.cardWrap}>
                    <SwipeableTaskCard
                      task={task}
                      category={getCat(task.categoryId)}
                      onPress={() => router.push(`/task/${task.id}`)}
                      onToggle={() => handleToggle(task.id)}
                      onDelete={() => handleDelete(task.id)}
                      index={i}
                    />
                  </View>
                ))}
            </>
          )}
          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      )}

      {/* FAB */}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  filterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.s3,
    marginBottom: Spacing.s2,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 10,
    gap: Spacing.s2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s1,
  },
  list: {
    paddingTop: Spacing.s2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s2,
    marginTop: Spacing.s2,
  },
  emptyLine: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s3,
  },
  cardWrap: {
    marginBottom: Spacing.s2,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: Spacing.s6,
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
