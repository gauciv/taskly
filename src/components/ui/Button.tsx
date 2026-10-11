import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  interpolateColor,
  FadeIn,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';
export type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';

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
  status?: ButtonStatus;
}

const variantConfig: Record<Variant, { bg: string; textColor: string; borderColor?: string }> = {
  primary:   { bg: Colors.lime,       textColor: Colors.onAccent },
  secondary: { bg: Colors.surfaceAlt, textColor: Colors.text },
  danger:    { bg: Colors.danger,     textColor: Colors.text },
  ghost:     { bg: 'transparent',     textColor: Colors.lime, borderColor: Colors.border },
};

const sizeConfig: Record<Size, { paddingH: number; paddingV: number; height: number }> = {
  sm: { paddingH: Spacing.s3,  paddingV: Spacing.s2, height: 36 },
  md: { paddingH: Spacing.s5,  paddingV: Spacing.s3, height: 48 },
  lg: { paddingH: Spacing.s5,  paddingV: Spacing.s4, height: 56 },
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
  status = 'idle',
}: ButtonProps) {
  const vc = variantConfig[variant];
  const sc = sizeConfig[size];

  const effectiveStatus: ButtonStatus = loading ? 'loading' : status;
  const isDisabled = disabled || effectiveStatus === 'loading';

  const bgProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (effectiveStatus === 'success') {
      bgProgress.value = withTiming(1, { duration: 250 });
      const t = setTimeout(() => { bgProgress.value = withTiming(0, { duration: 300 }); }, 600);
      return () => clearTimeout(t);
    }
    if (effectiveStatus === 'error') {
      bgProgress.value = withTiming(1, { duration: 150 });
      shakeX.value = withSequence(
        withTiming(6,  { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6,  { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0,  { duration: 50 }),
      );
      const t = setTimeout(() => { bgProgress.value = withTiming(0, { duration: 250 }); }, 500);
      return () => clearTimeout(t);
    }
    bgProgress.value = withTiming(0, { duration: 200 });
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStatus]);

  const successBg = variant === 'ghost' ? Colors.success + '22' : Colors.success;
  const errorBg   = variant === 'ghost' ? Colors.danger  + '22' : Colors.danger;

  const animStyle = useAnimatedStyle(() => {
    const statusBg = effectiveStatus === 'error' ? errorBg : successBg;
    return {
      backgroundColor: interpolateColor(bgProgress.value, [0, 1], [vc.bg, statusBg]),
      transform: [{ translateX: shakeX.value }],
    };
  });

  const showCheck   = effectiveStatus === 'success';
  const showSpinner = effectiveStatus === 'loading';
  const checkColor  = variant === 'ghost' ? Colors.success : Colors.onAccent;

  return (
    <PressableScale
      haptic
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      style={[
        styles.hitArea,
        {
          height: sc.height,
          width: fullWidth ? '100%' : undefined,
          opacity: (isDisabled && effectiveStatus !== 'loading') ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.base,
          {
            paddingHorizontal: sc.paddingH,
            paddingVertical: sc.paddingV,
            borderColor: vc.borderColor ?? 'transparent',
            borderWidth: vc.borderColor ? 1 : 0,
          },
          animStyle,
        ]}
      >
        {showSpinner ? (
          <ActivityIndicator color={vc.textColor} size="small" />
        ) : showCheck ? (
          <Animated.View entering={FadeIn.duration(180)}>
            <Feather name="check" size={size === 'sm' ? 14 : 18} color={checkColor} />
          </Animated.View>
        ) : (
          <AppText
            variant="label"
            color={vc.textColor}
            style={[Typography.label, { fontFamily: 'Poppins_600SemiBold' }]}
          >
            {label}
          </AppText>
        )}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  base: {
    borderRadius: Radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
});
