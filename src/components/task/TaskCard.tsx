import React, { memo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { Task, Category } from '@/types';
import { AppText } from '@/components/ui/AppText';
import { AnimatedCheckbox } from '@/components/ui/AnimatedCheckbox';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { PressableScale } from '@/components/ui/PressableScale';
import { formatDueLabel, isOverdue } from '@/utils/date';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface TaskCardProps {
  task: Task;
  category?: Category;
  onPress: () => void;
  onToggle: () => void;
  index?: number;
}

function TaskCardInner({ task, category, onPress, onToggle, index = 0 }: TaskCardProps) {
  const dueLabel = formatDueLabel(task);
  const overdue = isOverdue(task);
  const dueColor = overdue && !task.completed ? Colors.danger : Colors.textMuted;
  const cardBg = task.completed && category
    ? tintedFill(category.color)
    : Colors.surfaceAlt;

  const delay = Math.min(index, 6) * 40;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(220)}
      exiting={FadeOutLeft.duration(180)}
      layout={LinearTransition.springify().damping(18)}
    >
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
            style={[
              styles.title,
              task.completed && styles.titleCompleted,
            ]}
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
          accessibilityLabel={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}
        />
      </PressableScale>
    </Animated.View>
  );
}

export const TaskCard = memo(TaskCardInner);

const styles = StyleSheet.create({
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
