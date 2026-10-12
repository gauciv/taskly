import React, { memo, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { Task, Category } from '@/types';
import { AppText } from '@/components/ui/AppText';
import { AnimatedCheckbox } from '@/components/ui/AnimatedCheckbox';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { PressableScale } from '@/components/ui/PressableScale';
import { formatDueLabel } from '@/utils/date';
import { getDueStatus } from '@/utils/dueStatus';
import { useTaskStore } from '@/store/useTaskStore';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface TaskCardProps {
  task: Task;
  category?: Category;
  onPress: () => void;
  onToggle: () => void;
  index?: number;
  enteringEnabled?: boolean;
}

function TaskCardInner({ task: taskInput, category, onPress, onToggle, index = 0, enteringEnabled = true }: TaskCardProps) {
  const task = useTaskStore((s) => s.tasksById[taskInput.id]) ?? taskInput;
  const dueStatus = getDueStatus(task);
  const dueLabel = task.completed ? 'Completed' : formatDueLabel(task);
  const dueColor = dueStatus.tone;
  const cardBg = task.completed && category
    ? tintedFill(category.color)
    : Colors.surfaceAlt;

  const delay = Math.min(index, 6) * 40;

  // Highlight pulse (arrival animation on add/edit/restore)
  const isHighlighted = useTaskStore((s) => s.highlightTaskId === task.id);
  const highlightNonce = useTaskStore((s) => s.highlightTaskId === task.id ? s.highlightNonce : 0);
  const setHighlight    = useTaskStore((s) => s.setHighlight);
  const borderOpacity   = useSharedValue(0);
  const cardScale       = useSharedValue(1);

  useEffect(() => {
    if (!isHighlighted) return;
    // Pulse: lime border fade in/out + scale nudge
    borderOpacity.value = withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(0, { duration: 950 }, (finished) => {
        if (finished) runOnJS(setHighlight)(null);
      }),
    );
    cardScale.value = withSequence(
      withSpring(1.02, { damping: 14, stiffness: 280 }),
      withSpring(1,    { damping: 14, stiffness: 280 }),
    );
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHighlighted, highlightNonce]);

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, borderOpacity.value)),
  }));
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // The outer Animated.View owns enter/exit/layout animations ONLY — no transform.
  // The highlight Animated.View owns the border/scale pulse — separate node.
  // PressableScale owns the press-scale transform ONLY — no layout prop.
  return (
    <Animated.View
      entering={enteringEnabled ? FadeInDown.delay(delay).duration(220) : undefined}
      exiting={FadeOutLeft.duration(180)}
      layout={LinearTransition.duration(220)}
    >
      <Animated.View style={scaleStyle}>
        <View style={styles.highlightFrame}>
        <Animated.View pointerEvents="none" style={[styles.highlightBorder, highlightStyle]} />
        <PressableScale
          onPress={onPress}
          style={[styles.card, { backgroundColor: cardBg }]}
        >
          <View style={styles.left}>
            {category && (
              <View style={[styles.pill, { backgroundColor: tintedFill(category.color) }]}>
                <Feather name={category.icon as FeatherIconName} size={10} color={category.color} />
                <Text style={[styles.pillText, { color: category.color }]}>{category.name}</Text>
              </View>
            )}
            <AppText
              variant="title"
              numberOfLines={2}
              style={[styles.title, task.completed && styles.titleCompleted]}
              color={task.completed ? Colors.textMuted : Colors.text}
            >
              {task.title}
            </AppText>
            <View style={styles.meta}>
              {dueLabel ? (
                <View style={styles.dueRow}>
                  <Feather name="clock" size={11} color={dueColor} />
                  <Text style={[styles.dueText, { color: dueColor }]}>{dueLabel}</Text>
                </View>
              ) : null}
              <PriorityBadge priority={task.priority} mode="dot" />
            </View>
          </View>
          <AnimatedCheckbox
            checked={task.completed}
            onToggle={onToggle}
            categoryColor={category?.color}
            accessibilityLabel={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}
          />
        </PressableScale>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export const TaskCard = memo(TaskCardInner, (previous, next) =>
  previous.task.id === next.task.id &&
  previous.category === next.category &&
  previous.index === next.index &&
  previous.enteringEnabled === next.enteringEnabled
);

const styles = StyleSheet.create({
  highlightFrame: { position: 'relative', borderRadius: Radii.taskCard },
  highlightBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radii.taskCard, borderWidth: 2, borderColor: Colors.lime },
  card: {
    borderRadius: Radii.taskCard,
    padding: Spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    marginHorizontal: Spacing.screenH,
  },
  left: {
    flex: 1,
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
  },
  title: {
    flexShrink: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
  },
});
