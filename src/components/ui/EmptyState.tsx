import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface EmptyStateProps {
  icon?: FeatherIconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { reduceMotion } = useMotionPrefs();
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      translateY.value = 0;
      return;
    }
    translateY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconCluster, floatStyle]}>
        <View style={styles.iconBg}>
          <Feather name={icon} size={32} color={Colors.textFaint} />
        </View>
        <View style={[styles.iconDot, styles.dot1]}>
          <Feather name="star" size={12} color={Colors.lime} />
        </View>
        <View style={[styles.iconDot, styles.dot2]}>
          <Feather name="circle" size={8} color={Colors.purple} />
        </View>
      </Animated.View>
      <AppText variant="title" color={Colors.text} style={styles.title}>
        {title}
      </AppText>
      {subtitle && (
        <AppText variant="body" color={Colors.textMuted} style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.s8,
    paddingHorizontal: Spacing.s6,
    gap: Spacing.s3,
  },
  iconCluster: {
    width: 80,
    height: 80,
    marginBottom: Spacing.s2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot1: { top: 0, right: 0 },
  dot2: { bottom: 4, left: 0 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 20 },
  action: { marginTop: Spacing.s2 },
});
