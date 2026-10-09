import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, TouchTarget } from '@/theme/tokens';
import { PressableScale } from './PressableScale';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface IconButtonProps {
  icon: FeatherIconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  bgColor?: string;
  badge?: boolean;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 20,
  color = Colors.text,
  bgColor = Colors.surfaceAlt,
  badge,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: bgColor, width: TouchTarget, height: TouchTarget }]}
    >
      <Feather name={icon} size={size} color={color} />
      {badge && <View style={styles.badge} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
});
