import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radii, Spacing } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { AppText } from './AppText';
import { tintedFill } from '@/theme/tokens';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: FeatherIconName;
  color?: string; // accent color when selected
  accessibilityLabel?: string;
}

export function Chip({ label, selected, onPress, icon, color = Colors.lime, accessibilityLabel }: ChipProps) {
  const bg = selected ? tintedFill(color) : Colors.surfaceAlt;
  const textColor = selected ? color : Colors.textMuted;
  const iconColor = selected ? color : Colors.textFaint;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected: selected ?? false }}
      style={[styles.chip, { backgroundColor: bg, borderColor: selected ? color + '55' : Colors.border }]}
    >
      {icon && (
        <View style={styles.iconWrap}>
          <Feather name={icon} size={12} color={iconColor} />
        </View>
      )}
      <AppText variant="caption" color={textColor} style={styles.label}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s2,
    borderRadius: Radii.chip,
    borderWidth: 1,
    gap: 4,
    height: 32,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Poppins_500Medium',
  },
});
