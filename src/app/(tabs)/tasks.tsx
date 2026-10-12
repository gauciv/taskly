import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
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
import { showToast } from '@/components/ui/Toast';
import { selectSortedTasks } from '@/store/selectors';
import { taskDetailsHref } from '@/utils/routes';
import { isToday, isOverdue } from '@/utils/date';
import { useTaskFilters, type StatusFilter } from '@/store/useTaskFilters';
import { usePullRefresh } from '@/hooks/usePullRefresh';

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
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);

  const { query, status, categoryId, priority, setQuery, setStatus, setCategoryId, setPriority, clearAll } =
    useTaskFilters();

  const [searchRaw, setSearchRaw] = useState(query);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { refreshing, onRefresh } = usePullRefresh();

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

  const sorted = useMemo(() => selectSortedTasks(tasks), [tasks]);

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
      if (s === 'active') list = list.filter((t) => !t.completed);
      if (s === 'completed') list = list.filter((t) => t.completed);
      if (s === 'today') list = list.filter((t) => t.dueAt !== null && isToday(t.dueAt));
      if (s === 'overdue') list = list.filter((t) => isOverdue(t));
      if (catId !== null) list = list.filter((t) => t.categoryId === catId);
      if (pri !== 'all') list = list.filter((t) => String(t.priority) === pri);
      return list;
    },
    [categories]
  );

  const filtered = useMemo(
    () => applyFilters(sorted, query, status, categoryId, priority),
    [sorted, query, status, categoryId, priority, applyFilters]
  );

  // Count for the sheet "Show N tasks" button — reflects sheet selections live
  const sheetMatchCount = filtered.length;

  const active = useMemo(() => filtered.filter((t) => !t.completed), [filtered]);
  const completed = useMemo(() => filtered.filter((t) => t.completed), [filtered]);

  function getCat(id: number | null) {
    return id ? categories.find((c) => c.id === id) : undefined;
  }

  const handleDelete = useCallback(
    async (id: number) => {
      const snapshot = await deleteTask(id);
      if (snapshot) {
        showToast('Task deleted', { label: 'Undo', onPress: () => restoreTask(snapshot) });
      }
    },
    [deleteTask, restoreTask]
  );

  const handleToggle = useCallback((id: number) => toggleComplete(id), [toggleComplete]);

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
            subtitle="Tap + to add your first task"
            actionLabel="Add task"
            onAction={() => router.push('/task/new')}
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
        <Animated.ScrollView
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
                  onPress={() => router.push(taskDetailsHref(task.id))}
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
                      onPress={() => router.push(taskDetailsHref(task.id))}
                      onToggle={() => handleToggle(task.id)}
                      onDelete={() => handleDelete(task.id)}
                      index={i}
                    />
                  </View>
                ))}
            </>
          )}
        </Animated.ScrollView>
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
