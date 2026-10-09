import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { format, addWeeks, subWeeks, isSameDay, isToday as dfnsIsToday } from 'date-fns';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { TaskCard } from '@/components/task/TaskCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTaskStore } from '@/store/useTaskStore';
import { selectTasksForDay, selectDayHasTasks } from '@/store/selectors';
import { weekDays, formatTime } from '@/utils/date';
import type { Task, Category } from '@/types';

const TIME_LABELS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function ScheduleScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);

  const [anchor, setAnchor] = useState(() => Date.now());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const dayTasks = useMemo(() => selectTasksForDay(tasks, selectedDay), [tasks, selectedDay]);

  const allDayTasks = useMemo(() => dayTasks.filter((t) => !t.dueHasTime), [dayTasks]);
  const timedTasks = useMemo(
    () => [...dayTasks.filter((t) => t.dueHasTime)].sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0)),
    [dayTasks]
  );

  function getCat(id: number | null): Category | undefined {
    return id ? categories.find((c) => c.id === id) : undefined;
  }

  function prevWeek() { setAnchor((a) => subWeeks(new Date(a), 1).getTime()); }
  function nextWeek() { setAnchor((a) => addWeeks(new Date(a), 1).getTime()); }
  function goToday() {
    const now = Date.now();
    setAnchor(now);
    setSelectedDay(new Date(now));
  }

  const handleDayPress = useCallback((day: Date) => {
    setSelectedDay(day);
  }, []);

  const openNew = useCallback(() => {
    const d = new Date(selectedDay);
    d.setHours(9, 0, 0, 0);
    router.push({ pathname: '/task/new', params: { due: String(d.getTime()) } });
  }, [selectedDay]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="h2" color={Colors.text}>Task Schedule</AppText>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.todayPill} onPress={goToday}>
            <AppText variant="caption" color={Colors.lime}>Today</AppText>
          </TouchableOpacity>
          <IconButton icon="plus" onPress={openNew} accessibilityLabel="Add task" color={Colors.onAccent} bgColor={Colors.lime} />
        </View>
      </View>

      {/* Month + nav */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={prevWeek} hitSlop={8} accessibilityLabel="Previous week">
          <Feather name="chevron-left" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        <AppText variant="title" color={Colors.text}>
          {format(new Date(anchor), 'MMMM yyyy')}
        </AppText>
        <TouchableOpacity onPress={nextWeek} hitSlop={8} accessibilityLabel="Next week">
          <Feather name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Week strip */}
      <View style={styles.weekStrip}>
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDay);
          const isToday = dfnsIsToday(day);
          const hasTasks = selectDayHasTasks(tasks, day);
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !isSelected && isToday && styles.dayCellToday,
              ]}
              onPress={() => handleDayPress(day)}
              accessibilityLabel={format(day, 'EEEE MMM d')}
              accessibilityState={{ selected: isSelected }}
            >
              <AppText
                variant="caption"
                color={isSelected ? Colors.onAccent : Colors.textFaint}
              >
                {format(day, 'EEE').toUpperCase()}
              </AppText>
              <AppText
                variant="label"
                color={isSelected ? Colors.onAccent : isToday ? Colors.lime : Colors.text}
              >
                {format(day, 'd')}
              </AppText>
              {hasTasks && (
                <View style={[styles.taskDot, { backgroundColor: isSelected ? Colors.onAccent : Colors.lime }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Task count caption */}
      <AppText variant="caption" color={Colors.textMuted} style={styles.countCaption}>
        You have {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} this day
      </AppText>

      {/* Timeline */}
      <Animated.View
        key={selectedDay.toDateString()}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={styles.timeline}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.timelineContent}>
          {dayTasks.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Nothing planned"
              subtitle="Enjoy your day!"
              actionLabel="Add task"
              onAction={openNew}
            />
          ) : (
            <>
              {/* All-day section */}
              {allDayTasks.length > 0 && (
                <View style={styles.allDaySection}>
                  <AppText variant="caption" color={Colors.textMuted} style={styles.allDayLabel}>All day</AppText>
                  {allDayTasks.map((task, i) => (
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

              {/* Timed tasks with dashed line */}
              {timedTasks.length > 0 && (
                <View style={styles.timedSection}>
                  <View style={styles.timelineLineCol}>
                    {/* Dashed vertical line */}
                    <View style={styles.dashedLine} />
                  </View>
                  <View style={styles.timedCards}>
                    {timedTasks.map((task, i) => (
                      <View key={task.id} style={styles.timedRow}>
                        <AppText variant="caption" color={Colors.textFaint} style={styles.timeLabel}>
                          {task.dueAt ? formatTime(task.dueAt) : ''}
                        </AppText>
                        <View style={styles.timedCard}>
                          <TaskCard
                            task={task}
                            category={getCat(task.categoryId)}
                            onPress={() => router.push(`/task/${task.id}`)}
                            onToggle={() => toggleComplete(task.id)}
                            index={i}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  todayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.chip,
    borderWidth: 1,
    borderColor: Colors.lime + '55',
    backgroundColor: tintedFill(Colors.lime),
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    marginBottom: Spacing.s3,
  },
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.s3,
    gap: Spacing.s1,
    marginBottom: Spacing.s2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.s2,
    borderRadius: Radii.input,
    gap: 2,
    minHeight: 64,
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Colors.lime,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.lime,
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  countCaption: {
    paddingHorizontal: Spacing.screenH,
    marginBottom: Spacing.s3,
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 100,
  },
  allDaySection: {
    marginBottom: Spacing.s4,
    gap: Spacing.s2,
  },
  allDayLabel: {
    paddingHorizontal: Spacing.screenH,
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  taskWrap: {},
  timedSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenH,
  },
  timelineLineCol: {
    width: 48,
    alignItems: 'center',
    position: 'relative',
  },
  dashedLine: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    width: 1,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    borderStyle: 'dashed',
  },
  timedCards: {
    flex: 1,
    gap: Spacing.s3,
  },
  timedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s2,
  },
  timeLabel: {
    width: 48,
    paddingTop: 4,
    textAlign: 'right',
    fontFamily: 'Poppins_500Medium',
  },
  timedCard: {
    flex: 1,
  },
});
