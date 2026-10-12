import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
  ListRenderItem,
  AppState,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, TabBar as TabBarTokens } from '@/theme/tokens';
import { Task } from '@/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { SwipeableTaskCard } from '@/components/task/SwipeableTaskCard';
import { FilterSheet } from '@/components/task/FilterSheet';
import { useTaskStore } from '@/store/useTaskStore';
import { selectSortedTasks } from '@/store/selectors';
import { taskDetailsHref } from '@/utils/routes';
import { getDueStatus } from '@/utils/dueStatus';
import { useTaskFilters, type StatusFilter } from '@/store/useTaskFilters';
import { usePullRefresh } from '@/hooks/usePullRefresh';

type TaskListEntry =
  | { type: 'activeHeader'; key: string; count: number }
  | { type: 'completedHeader'; key: string; count: number; collapsed: boolean }
  | { type: 'empty'; key: string }
  | { type: 'task'; key: string; taskId: number; index: number };

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Today', value: 'today' },
  { label: 'Overdue', value: 'overdue' },
];

export default function TasksScreen() {
  const params = useLocalSearchParams<{ filter?: string; category?: string }>();
  const insets = useSafeAreaInsets();

  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const recentlyToggledIds = useTaskStore((s) => s.recentlyToggledIds);

  const { query, status, categoryId, priority, setQuery, setStatus, setCategoryId, setPriority, clearAll } =
    useTaskFilters();

  const [searchRaw, setSearchRaw] = useState(query);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const [enteringEnabled, setEnteringEnabled] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { refreshing, onRefresh } = usePullRefresh();

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

  // Apply route params on mount/change
  useEffect(() => {
    const f = params.filter;
    if (f === 'today' || f === 'overdue' || f === 'active' || f === 'completed') {
      setStatus(f);
    }
    if (params.category) setCategoryId(Number(params.category));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.filter, params.category]);

  function handleSearchChange(text: string) {
    setSearchRaw(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(text), 150);
  }

  function clearSearch() {
    setSearchRaw('');
    setQuery('');
  }

  function handleClearAll() {
    clearSearch();
    clearAll();
  }

  const sorted = useMemo(() => selectSortedTasks(tasks, nowMs, recentlyToggledIds), [tasks, recentlyToggledIds, nowMs]);

  const applyFilters = useCallback(
    (list: Task[], q: string, s: StatusFilter, catId: number | null, pri: string) => {
      const lq = q.toLowerCase().trim();
      if (lq) {
        list = list.filter((t) => {
          const cat = t.categoryId ? categories.find((c) => c.id === t.categoryId) : null;
          return (
            t.title.toLowerCase().includes(lq) ||
            t.notes.toLowerCase().includes(lq) ||
            (cat?.name.toLowerCase().includes(lq) ?? false)
          );
        });
      }
      const isCompletedForSort = (task: Task) => {
        const recent = recentlyToggledIds[task.id];
        return recent && recent ? recent.previousCompleted : task.completed;
      };
      if (s === 'active') list = list.filter((t) => !isCompletedForSort(t));
      if (s === 'completed') list = list.filter((t) => isCompletedForSort(t));
      if (s === 'today' || s === 'overdue') {
        list = list.filter((task) => {
          const recent = recentlyToggledIds[task.id];
          const statusTask = recent && !recent.previousCompleted ? { ...task, completed: false } : task;
          const kind = getDueStatus(statusTask, nowMs).kind;
          return s === 'today' ? kind === 'today' : kind === 'overdue';
        });
      }
      if (catId !== null) list = list.filter((t) => t.categoryId === catId);
      if (pri !== 'all') list = list.filter((t) => String(t.priority) === pri);
      return list;
    },
    [categories, recentlyToggledIds, nowMs]
  );

  const filtered = useMemo(
    () => applyFilters(sorted, query, status, categoryId, priority),
    [sorted, query, status, categoryId, priority, applyFilters]
  );

  // Count for the sheet "Show N tasks" button — reflects sheet selections live
  const sheetMatchCount = filtered.length;

  const active = useMemo(() => filtered.filter((t) => {
    const recent = recentlyToggledIds[t.id];
    return !(recent && recent ? recent.previousCompleted : t.completed);
  }), [filtered, recentlyToggledIds]);
  const completed = useMemo(() => filtered.filter((t) => {
    const recent = recentlyToggledIds[t.id];
    return recent && recent ? recent.previousCompleted : t.completed;
  }), [filtered, recentlyToggledIds]);

  function getCat(id: number | null) {
    return id ? categories.find((c) => c.id === id) : undefined;
  }


  // Active filter pill count (category + priority only; status lives in the chips row)
  const activePillCount = useMemo(() => {
    let n = 0;
    if (categoryId !== null) n++;
    if (priority !== 'all') n++;
    return n;
  }, [categoryId, priority]);

  const hasFiltersOrSearch = query || status !== 'all' || categoryId !== null || priority !== 'all';
  const noResults = filtered.length === 0 && !!hasFiltersOrSearch;
  const hasTasks = tasks.length > 0;
  const listEntries = useMemo<TaskListEntry[]>(() => {
    const entries: TaskListEntry[] = [{ type: 'activeHeader', key: 'active-header', count: active.length }];
    if (active.length === 0) entries.push({ type: 'empty', key: 'empty-active' });
    else active.forEach((task, index) => entries.push({ type: 'task', key: `active-${task.id}`, taskId: task.id, index }));
    if (completed.length > 0) {
      entries.push({ type: 'completedHeader', key: 'completed-header', count: completed.length, collapsed: completedCollapsed });
      if (!completedCollapsed) completed.forEach((task, index) => entries.push({ type: 'task', key: `completed-${task.id}`, taskId: task.id, index }));
    }
    return entries;
  }, [active, completed, completedCollapsed]);

  const renderListItem = useCallback<ListRenderItem<TaskListEntry>>(({ item }) => {
    if (item.type === 'activeHeader') {
      return <View style={styles.sectionHeader}><AppText variant="label" color={Colors.textMuted}>Active ({item.count})</AppText></View>;
    }
    if (item.type === 'completedHeader') {
      return (
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setCompletedCollapsed((value) => !value)}>
          <AppText variant="label" color={Colors.textMuted}>Completed ({item.count})</AppText>
          <Feather name={item.collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.textFaint} />
        </TouchableOpacity>
      );
    }
    if (item.type === 'empty') {
      return <AppText variant="body" color={Colors.textFaint} style={styles.emptyLine}>No active tasks</AppText>;
    }
    return <TaskListRow taskId={item.taskId} index={item.index} enteringEnabled={enteringEnabled} />;
  }, [enteringEnabled]);
  const keyExtractor = useCallback((item: TaskListEntry) => item.key, []);

  // Bottom padding for the list: tab bar + bottom inset + extra for FAB
  const listBottomPad = TabBarTokens.height + insets.bottom + 96;

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header — no + button here */}
      <View style={styles.header}>
        <View>
          <AppText variant="h2">My Tasks</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {active.length} active · {completed.length} done
          </AppText>
        </View>
      </View>

      {/* Search + filter button — hidden when no tasks at all */}
      {hasTasks && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
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
              <TouchableOpacity onPress={clearSearch} hitSlop={8}>
                <Feather name="x" size={16} color={Colors.textFaint} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter button */}
          <TouchableOpacity
            style={[
              styles.filterBtn,
              activePillCount > 0 && styles.filterBtnActive,
            ]}
            onPress={() => setSheetOpen(true)}
            accessibilityLabel="Open filters"
            accessibilityRole="button"
          >
            <Feather
              name="sliders"
              size={18}
              color={activePillCount > 0 ? Colors.lime : Colors.textMuted}
            />
            {activePillCount > 0 && (
              <View style={styles.filterBadge}>
                <AppText variant="caption" color={Colors.onAccent} style={styles.filterBadgeText}>
                  {activePillCount}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Status chip row — hidden when no tasks at all */}
      {hasTasks && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chipRow}
        >
          {STATUS_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={status === opt.value}
              onPress={() => setStatus(opt.value)}
              color={Colors.lime}
            />
          ))}
        </ScrollView>
      )}

      {/* Active filter pills — only when category or priority is set */}
      {hasTasks && activePillCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroller}
          contentContainerStyle={styles.pillRow}
        >
          {categoryId !== null && (
            <TouchableOpacity
              style={styles.pill}
              onPress={() => setCategoryId(null)}
              accessibilityLabel={`Remove ${getCat(categoryId)?.name ?? 'category'} filter`}
            >
              <AppText variant="caption" color={Colors.text}>
                {getCat(categoryId)?.name ?? 'Category'} ×
              </AppText>
            </TouchableOpacity>
          )}
          {priority !== 'all' && (
            <TouchableOpacity
              style={styles.pill}
              onPress={() => setPriority('all')}
              accessibilityLabel={`Remove priority filter`}
            >
              <AppText variant="caption" color={Colors.text}>
                {priority === '2' ? 'High' : priority === '1' ? 'Medium' : 'Low'} ×
              </AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setCategoryId(null); setPriority('all'); }} hitSlop={8}>
            <AppText variant="caption" color={Colors.lime}>Clear all</AppText>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Main content area */}
      {!hasTasks ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="check-square"
            title="No tasks yet"
            subtitle="Tap the + button to add your first task."
          />
        </View>
      ) : noResults ? (
        <View style={styles.noResults}>
          <EmptyState
            icon="search"
            title="No matching tasks"
            subtitle="Try different filters or search terms"
          />
          <Button label="Clear filters" onPress={handleClearAll} variant="ghost" />
        </View>
      ) : (
        <Animated.FlatList
          data={listEntries}
          keyExtractor={keyExtractor}
          renderItem={renderListItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: listBottomPad, flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.lime}
              colors={[Colors.lime]}
              progressBackgroundColor={Colors.surfaceAlt}
            />
          }
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {/* FAB removed — center tab bar button handles new tasks */}

      {/* Filter sheet */}
      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        categories={categories}
        categoryId={categoryId}
        priority={priority}
        onCategoryChange={setCategoryId}
        onPriorityChange={setPriority}
        onReset={() => { setCategoryId(null); setPriority('all'); }}
        matchCount={sheetMatchCount}
      />
    </Screen>
  );
}

function TaskListRow({ taskId, index, enteringEnabled }: { taskId: number; index: number; enteringEnabled: boolean }) {
  const task = useTaskStore((state) => state.tasksById[taskId]);
  const category = useTaskStore((state) => {
    const categoryId = state.tasksById[taskId]?.categoryId;
    return categoryId === null || categoryId === undefined ? undefined : state.categories.find((entry) => entry.id === categoryId);
  });
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const onPress = useCallback(() => router.push(taskDetailsHref(taskId)), [taskId]);
  const onToggle = useCallback(() => { void toggleComplete(taskId); }, [taskId, toggleComplete]);
  const onDelete = useCallback(async () => {
    await deleteTask(taskId);
  }, [deleteTask, taskId]);
  if (!task) return null;
  return (
    <View style={styles.cardWrap}>
      <SwipeableTaskCard task={task} category={category} onPress={onPress} onToggle={onToggle} onDelete={onDelete} index={index} enteringEnabled={enteringEnabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s4,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.screenH,
    marginTop: Spacing.s3,
    marginBottom: Spacing.s2,
    height: 48,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.s3,
    height: 48,
    gap: Spacing.s2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    // Fix vertical centering on Android
    ...Platform.select({ android: { paddingVertical: 0 } }),
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.input,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    borderColor: Colors.lime,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  chipScroller: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  pillScroller: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.chip,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  list: {
    paddingTop: Spacing.s2,
    paddingHorizontal: Spacing.screenH,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.s2,
    marginTop: Spacing.s2,
  },
  emptyLine: {
    paddingVertical: Spacing.s3,
  },
  cardWrap: {
    marginBottom: Spacing.s2,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
