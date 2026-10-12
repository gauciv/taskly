import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { haptic } from '@/utils/feedback';
import { Colors } from '@/theme/tokens';

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel?: string;
}

const SPARK_COUNT = 8;
const SPARK_RADIUS = 28;

interface BurstPartProps {
  index: number;
  progress: SharedValue<number>;
}

function Spark({ index, progress }: BurstPartProps) {
  const angle = (index / SPARK_COUNT) * 2 * Math.PI;
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, progress.value));
    return {
      opacity: Math.min(1, Math.max(0, t < 0.6 ? 0.8 : 0.8 * (1 - (t - 0.6) / 0.4))),
      transform: [
        { translateX: Math.cos(angle) * SPARK_RADIUS * t },
        { translateY: Math.sin(angle) * SPARK_RADIUS * t },
        { scale: 1 - t * 0.45 },
      ],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.spark, style]} />;
}

function RingBurst({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, progress.value));
    return {
      opacity: Math.min(1, Math.max(0, 0.6 * (1 - t))),
      transform: [{ scale: 0.6 + t * 1.4 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.burstRing, style]} />;
}

export function AnimatedCheckbox({ checked, onToggle, accessibilityLabel }: AnimatedCheckboxProps) {
  const { reduceMotion } = useMotionPrefs();
  const fillScale = useSharedValue(checked ? 1 : 0);
  const iconProgress = useSharedValue(checked ? 1 : 0);
  const popScale = useSharedValue(1);
  const pressScale = useSharedValue(1);
  const burstProgress = useSharedValue(0);
  const [playingBurst, setPlayingBurst] = useState(false);
  const previousChecked = useRef(checked);

  useAnimatedReaction(
    () => Math.min(1, Math.max(0, burstProgress.value)),
    (value, previous) => {
      if (value > 0 && (previous === null || previous === 0)) runOnJS(setPlayingBurst)(true);
      if (value >= 1) runOnJS(setPlayingBurst)(false);
    },
  );

  useEffect(() => {
    const changed = previousChecked.current !== checked;
    previousChecked.current = checked;
    if (reduceMotion) {
      cancelAnimation(burstProgress);
      fillScale.value = checked ? 1 : 0;
      iconProgress.value = checked ? 1 : 0;
      popScale.value = 1;
      burstProgress.value = 0;
      return;
    }
    if (!changed) return;

    if (checked) {
      fillScale.value = 0;
      iconProgress.value = 0;
      fillScale.value = withSpring(1, { damping: 16, stiffness: 280 });
      iconProgress.value = withDelay(60, withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }));
      popScale.value = withDelay(140, withSequence(
        withTiming(1.15, { duration: 45 }),
        withSpring(1, { damping: 13, stiffness: 320 }),
      ));
      burstProgress.value = 0;
      burstProgress.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    } else {
      cancelAnimation(burstProgress);
      burstProgress.value = 0;
      fillScale.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });
      iconProgress.value = withTiming(0, { duration: 80 });
      popScale.value = withTiming(1, { duration: 100 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, reduceMotion]);

  const touchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.min(1, Math.max(0.9, pressScale.value)) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.min(1, Math.max(0, fillScale.value)) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, iconProgress.value)),
    transform: [{ scale: Math.min(1, Math.max(0, iconProgress.value)) }],
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.min(1.15, Math.max(1, popScale.value)) }],
  }));

  function handlePress() {
    haptic.light();
    onToggle();
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        if (!reduceMotion) pressScale.value = withTiming(0.9, { duration: 75 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 18, stiffness: 320 });
      }}
      accessibilityLabel={accessibilityLabel ?? (checked ? 'Mark task as not completed' : 'Mark task as completed')}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      style={styles.hitTarget}
    >
      <Animated.View style={[styles.circle, { borderColor: checked ? Colors.lime : Colors.textFaint }, touchStyle]}>
        {playingBurst && checked && !reduceMotion && (
          <View pointerEvents="none" style={styles.burstLayer}>
            <RingBurst progress={burstProgress} />
            {Array.from({ length: SPARK_COUNT }, (_, index) => (
              <Spark key={index} index={index} progress={burstProgress} />
            ))}
          </View>
        )}
        {checked && (
          <Animated.View style={[styles.popLayer, popStyle]}>
              <Animated.View style={[styles.fill, fillStyle]} />
              <Animated.View style={[styles.check, iconStyle]}>
                <Feather name="check" size={16} color={Colors.onAccent} />
              </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popLayer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 11,
    backgroundColor: Colors.lime,
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstLayer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.lime,
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lime,
  },
});
