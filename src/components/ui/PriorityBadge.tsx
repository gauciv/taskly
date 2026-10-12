import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, tintedFill } from '@/theme/tokens';
import { AppText } from './AppText';

type Priority = 0 | 1 | 2;

const labels: Record<Priority, string> = { 0: 'Low', 1: 'Medium', 2: 'High' };
const colors: Record<Priority, string> = {
  0: Colors.priority.low,
  1: Colors.priority.medium,
  2: Colors.priority.high,
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const color = colors[priority];
  return (
    <View style={[styles.pill, { backgroundColor: tintedFill(color) }]}>
      <Feather name="flag" size={11} color={color} />
      <AppText variant="caption" color={color} style={styles.label}>
        {labels[priority]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
  },
});
