import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radii, SpringConfig, tintedFill } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Confetti } from './Confetti';
import { useCelebrationStore, type CelebrationEvent } from '@/store/useCelebrationStore';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { haptic } from '@/utils/feedback';
import { achievementsHref } from '@/utils/routes';

const { width: SCREEN_W } = Dimensions.get('screen');

const AUTO_DISMISS_MS = 2600;

interface OverlayContentProps {
  event: CelebrationEvent;
  onDismiss: () => void;
}

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

function getEventContent(event: CelebrationEvent): {
  icon: FeatherIconName;
  iconColor: string;
  title: string;
  subtitle: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
} {
  switch (event.type) {
    case 'achievement':
      return {
        icon: event.icon as FeatherIconName,
        iconColor: event.color,
        title: event.title,
        subtitle: event.description,
        secondaryLabel: 'View achievements',
        onSecondary: () => router.push(achievementsHref),
      };
    case 'all_done':
      return {
        icon: 'sun',
        iconColor: Colors.lime,
        title: 'All caught up!',
        subtitle: 'You finished everything due today.',
      };
    case 'streak':
      return {
        icon: 'zap',
        iconColor: Colors.orange,
        title: `${event.days}-day streak!`,
        subtitle: 'Keep the momentum going.',
      };
    default:
      return {
        icon: 'check-circle',
        iconColor: Colors.lime,
        title: 'Nice work!',
        subtitle: 'Task completed.',
      };
  }
}

function OverlayContent({ event, onDismiss }: OverlayContentProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, SpringConfig);
    opacity.value = withTiming(1, { duration: 200 });
    haptic.success();
    const t = setTimeout(() => {
      haptic.light();
    }, 120);
    const dismiss = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => { clearTimeout(t); clearTimeout(dismiss); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value * 0.5 }));

  const content = getEventContent(event);

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Icon tile with glow */}
          <View style={[styles.iconTile, { backgroundColor: tintedFill(content.iconColor) }]}>
            <Feather name={content.icon} size={32} color={content.iconColor} />
          </View>
          <AppText variant="h2" style={styles.title}>{content.title}</AppText>
          <AppText variant="body" color={Colors.textMuted} style={styles.subtitle}>
            {content.subtitle}
          </AppText>
          <View style={styles.buttons}>
            {content.secondaryLabel && content.onSecondary && (
              <Button
                label={content.secondaryLabel}
                variant="ghost"
                onPress={() => { content.onSecondary?.(); onDismiss(); }}
                style={styles.btnHalf}
              />
            )}
            <Button
              label="Nice!"
              variant="primary"
              onPress={onDismiss}
              style={content.secondaryLabel ? styles.btnHalf : styles.btnFull}
            />
          </View>
        </Animated.View>
      </View>
    </>
  );
}

export function CelebrationOverlay() {
  const { current, dismiss } = useCelebrationStore();
  const { skipCelebrations } = useMotionPrefs();

  if (!current || skipCelebrations) return null;

  const showConfetti = current.type === 'all_done' || current.type === 'achievement';
  const originX = current.type === 'default' ? current.originX : undefined;
  const originY = current.type === 'default' ? current.originY : undefined;

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={dismiss}
      accessibilityLabel="Dismiss celebration"
    >
      {showConfetti && <Confetti count={40} originX={originX} originY={originY} />}
      <OverlayContent event={current} onDismiss={dismiss} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  centerer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenH,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card + 4,
    padding: Spacing.s6,
    width: Math.min(SCREEN_W - Spacing.screenH * 2, 360),
    alignItems: 'center',
    gap: Spacing.s3,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.s3,
    marginTop: Spacing.s2,
    width: '100%',
  },
  btnFull: { flex: 1 },
  btnHalf: { flex: 1 },
});
