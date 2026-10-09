import React from 'react';
import { ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const variantStyles: Record<Variant, { bg: string; textColor: string; borderColor?: string }> = {
  primary: { bg: Colors.lime, textColor: Colors.onAccent },
  secondary: { bg: Colors.surfaceAlt, textColor: Colors.text },
  danger: { bg: Colors.danger, textColor: Colors.text },
  ghost: { bg: 'transparent', textColor: Colors.lime, borderColor: Colors.border },
};

const sizeStyles: Record<Size, { paddingH: number; paddingV: number; height: number }> = {
  sm: { paddingH: Spacing.s3, paddingV: Spacing.s2, height: 36 },
  md: { paddingH: Spacing.s5, paddingV: Spacing.s3, height: 48 },
  lg: { paddingH: Spacing.s5, paddingV: Spacing.s4, height: 56 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      haptic
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      style={[
        styles.base,
        {
          backgroundColor: vs.bg,
          paddingHorizontal: ss.paddingH,
          paddingVertical: ss.paddingV,
          height: ss.height,
          borderColor: vs.borderColor ?? 'transparent',
          borderWidth: vs.borderColor ? 1 : 0,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.textColor} size="small" />
      ) : (
        <AppText
          variant="label"
          color={vs.textColor}
          style={[Typography.label, { fontFamily: 'Poppins_600SemiBold' }]}
        >
          {label}
        </AppText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
