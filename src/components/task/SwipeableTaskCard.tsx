import React, { useRef, useCallback, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SharedValue } from 'react-native-reanimated';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable/ReanimatedSwipeableProps';
import { Task, Category } from '@/types';
import { Spacing } from '@/theme/tokens';
import { TaskCard } from './TaskCard';
import { SwipeDeleteAction } from './SwipeDeleteAction';
import { confirm } from '@/components/ui/ConfirmDialog';

interface SwipeableTaskCardProps {
  task: Task;
  category?: Category;
  onPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
  index?: number;
  enteringEnabled?: boolean;
}

function SwipeableTaskCardInner({
  task,
  category,
  onPress,
  onToggle,
  onDelete,
  index,
  enteringEnabled,
}: SwipeableTaskCardProps) {
  const swipeRef = useRef<SwipeableMethods>(null);

  const handleDeletePress = useCallback(
    async (methods: SwipeableMethods) => {
      // Close swipeable while dialog is open
      methods.close();
      const ok = await confirm({
        title: 'Delete this task?',
        message: `"${task.title}" will be permanently removed.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (ok) {
        onDelete();
      }
    },
    [task.title, onDelete]
  );

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, _trans: SharedValue<number>, methods: SwipeableMethods) => (
      <SwipeDeleteAction
        onDelete={() => handleDeletePress(methods)}
      />
    ),
    [handleDeletePress]
  );

  return (
    <View style={styles.wrap}>
      <ReanimatedSwipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        containerStyle={styles.swipeable}
      >
        <TaskCard
          task={task}
          category={category}
          onPress={onPress}
          onToggle={onToggle}
          index={index}
          enteringEnabled={enteringEnabled}
        />
      </ReanimatedSwipeable>
    </View>
  );
}

export const SwipeableTaskCard = memo(SwipeableTaskCardInner, (previous, next) =>
  previous.task === next.task &&
  previous.category === next.category &&
  previous.index === next.index &&
  previous.enteringEnabled === next.enteringEnabled
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.s2,
  },
  swipeable: {
    overflow: 'visible',
  },
});
