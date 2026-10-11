import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, TouchTarget } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { AppText } from './AppText';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface IconButtonProps {
  icon: FeatherIconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  bgColor?: string;
  /** boolean dot badge (legacy) */
  badge?: boolean;
  /** numeric badge — shows a red circle with a count; caps display at "9+" */
  badgeCount?: number;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 20,
  color = Colors.text,
  bgColor = Colors.surfaceAlt,
  badge,
  badgeCount,
}: IconButtonProps) {
  const showDot = badge && !badgeCount;
  const showNum = typeof badgeCount === 'number' && badgeCount > 0;
  const numLabel = badgeCount && badgeCount > 9 ? '9+' : String(badgeCount ?? 0);

  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: bgColor, width: TouchTarget, height: TouchTarget }]}
    >
      <Feather name={icon} size={size} color={color} />
      {showDot && <View style={styles.dot} />}
      {showNum && (
        <View style={styles.numBadge}>
          <AppText variant="caption" color="#fff" style={styles.numText}>
            {numLabel}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
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
  numBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  numText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 14,
    includeFontPadding: false,
  },
});
