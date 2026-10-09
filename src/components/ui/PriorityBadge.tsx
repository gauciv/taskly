import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, tintedFill } from '@/theme/tokens';
import { AppText } from './AppText';

type Priority = 0 | 1 | 2;
type Mode = 'dot' | 'label';

const labels: Record<Priority, string> = { 0: 'Low', 1: 'Medium', 2: 'High' };
const colors: Record<Priority, string> = {
  0: Colors.priority.low,
  1: Colors.priority.medium,
  2: Colors.priority.high,
};

interface PriorityBadgeProps {
  priority: Priority;
  mode?: Mode;
}

export function PriorityBadge({ priority, mode = 'dot' }: PriorityBadgeProps) {
  const color = colors[priority];

  if (mode === 'dot') {
    return <View style={[styles.dot, { backgroundColor: color }]} />;
  }

  return (
    <View style={[styles.label, { backgroundColor: tintedFill(color) }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color={color}>
        {labels[priority]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
