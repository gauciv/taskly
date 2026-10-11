import React, { useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Spacing } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types';
import type { PriorityFilter } from '@/store/useTaskFilters';

type FeatherIconName = React.ComponentProps<typeof import('@expo/vector-icons').Feather>['name'];

const PRIORITY_OPTIONS: { label: string; value: PriorityFilter; color: string }[] = [
  { label: 'All', value: 'all', color: Colors.lime },
  { label: 'High', value: '2', color: Colors.priority.high },
  { label: 'Medium', value: '1', color: Colors.priority.medium },
  { label: 'Low', value: '0', color: Colors.priority.low },
];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  categoryId: number | null;
  priority: PriorityFilter;
  onCategoryChange: (id: number | null) => void;
  onPriorityChange: (p: PriorityFilter) => void;
  onReset: () => void;
  matchCount: number;
}

const SHEET_HEIGHT = 480;

export function FilterSheet({
  visible,
  onClose,
  categories,
  categoryId,
  priority,
  onCategoryChange,
  onPriorityChange,
  onReset,
  matchCount,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const animateIn = useCallback(() => {
    translateY.value = withSpring(0, { damping: 22, stiffness: 260, mass: 0.9 });
    backdropOpacity.value = withTiming(1, { duration: 200 });
  }, [translateY, backdropOpacity]);

  const animateOut = useCallback((onDone?: () => void) => {
    translateY.value = withSpring(SHEET_HEIGHT, { damping: 22, stiffness: 260, mass: 0.9 });
    backdropOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, [translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, animateIn]);

  function handleClose() {
    animateOut(onClose);
  }

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.s4 }, sheetStyle]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Title row */}
        <View style={styles.titleRow}>
          <AppText variant="title">Filters</AppText>
          <TouchableOpacity onPress={onReset} hitSlop={8} accessibilityLabel="Reset filters">
            <AppText variant="label" color={Colors.lime}>Reset</AppText>
          </TouchableOpacity>
        </View>

        {/* Category section */}
        <AppText variant="label" color={Colors.textMuted} style={styles.sectionLabel}>
          Category
        </AppText>
        <View style={styles.chipWrap}>
          <Chip
            label="All"
            selected={categoryId === null}
            onPress={() => onCategoryChange(null)}
            color={Colors.lime}
          />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              icon={cat.icon as FeatherIconName}
              selected={categoryId === cat.id}
              onPress={() => onCategoryChange(categoryId === cat.id ? null : cat.id)}
              color={cat.color}
            />
          ))}
        </View>

        {/* Priority section */}
        <AppText variant="label" color={Colors.textMuted} style={styles.sectionLabel}>
          Priority
        </AppText>
        <View style={styles.chipWrap}>
          {PRIORITY_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={priority === opt.value}
              onPress={() => onPriorityChange(opt.value)}
              color={opt.color}
            />
          ))}
        </View>

        {/* Show tasks button */}
        <Button
          label={`Show ${matchCount} task${matchCount !== 1 ? 's' : ''}`}
          onPress={handleClose}
          fullWidth
          style={styles.applyBtn}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.s5,
    gap: Spacing.s4,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.s1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    marginTop: Spacing.s1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  applyBtn: {
    marginTop: Spacing.s2,
  },
});
