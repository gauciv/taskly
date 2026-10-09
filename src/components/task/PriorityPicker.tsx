import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Priority } from '@/types';

interface PriorityPickerProps {
  value: Priority;
  onChange: (p: Priority) => void;
}

const OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: Priority.Low,    label: 'Low',    color: Colors.priority.low },
  { value: Priority.Medium, label: 'Medium', color: Colors.priority.medium },
  { value: Priority.High,   label: 'High',   color: Colors.priority.high },
];

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              {
                backgroundColor: selected ? tintedFill(opt.color) : Colors.surfaceAlt,
                borderColor: selected ? opt.color + '88' : Colors.border,
              },
            ]}
            onPress={() => onChange(opt.value)}
            accessibilityLabel={`Priority ${opt.label}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View style={[styles.dot, { backgroundColor: opt.color }]} />
            <AppText
              variant="label"
              color={selected ? opt.color : Colors.textMuted}
            >
              {opt.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.screenH,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.input,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
