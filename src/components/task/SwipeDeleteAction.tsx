import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { haptic } from '@/utils/feedback';
import { Colors, Spacing } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';

interface SwipeDeleteActionProps {
  onDelete: () => void;
}

export function SwipeDeleteAction({ onDelete }: SwipeDeleteActionProps) {
  return (
    <TouchableOpacity
      style={styles.action}
      onPress={() => {
        haptic.medium();
        onDelete();
      }}
      accessibilityLabel="Delete task"
      accessibilityRole="button"
    >
      <Feather name="trash-2" size={20} color={Colors.text} />
      <AppText variant="caption" color={Colors.text}>Delete</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 20,
    marginVertical: 0,
    gap: 4,
    marginRight: Spacing.screenH,
  },
});
