import React, { useEffect } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { haptic } from '@/utils/feedback';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { Colors } from '@/theme/tokens';

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  categoryColor?: string;
  accessibilityLabel?: string;
}

/** Ring burst spark */
const SPARK_COUNT = 8;
const SPARK_RADIUS = 28;

interface SparkProps {
  index: number;
  progress: SharedValue<number>;
  color: string;
}

function Spark({ index, progress, color }: SparkProps) {
  const angle = (index / SPARK_COUNT) * 2 * Math.PI;
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const dist = SPARK_RADIUS * t;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const opacity = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    return {
      position: 'absolute' as const,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: color,
      opacity,
      transform: [{ translateX: x }, { translateY: y }],
    };
  });
  return <Animated.View style={style} />;
}

/** Expanding ring burst */
interface RingBurstProps {
  progress: SharedValue<number>;
  color: string;
}

function RingBurst({ progress, color }: RingBurstProps) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const size = 12 + t * (24 * 2 - 12);
    const opacity = t < 0.5 ? 0.6 : 0.6 * (1 - (t - 0.5) / 0.5);
    return {
      position: 'absolute' as const,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
      borderColor: color,
      opacity,
      alignSelf: 'center' as const,
    };
  });
  return <Animated.View style={style} />;
}

export function AnimatedCheckbox({
  checked,
  onToggle,
  categoryColor,
  accessibilityLabel,
}: AnimatedCheckboxProps) {
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const burstProgress = useSharedValue(0);
  const { reduceMotion } = useMotionPrefs();

  const burstColor = categoryColor ?? Colors.lime;

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 });
    if (checked && !reduceMotion) {
      // Pop scale
      scale.value = withSequence(
        withTiming(1.25, { duration: 80 }),
        withSpring(1, { damping: 14, stiffness: 300 })
      );
      // Ring burst
      burstProgress.value = 0;
      burstProgress.value = withTiming(1, { duration: 450 });
    } else if (!checked) {
      // Reverse pop only
      scale.value = withSequence(
        withTiming(0.85, { duration: 80 }),
        withSpring(1, { damping: 18, stiffness: 220 })
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, reduceMotion]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', Colors.lime]),
    borderColor: interpolateColor(progress.value, [0, 1], [Colors.textFaint, Colors.lime]),
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    haptic.light();
    runOnJS(onToggle)();
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel ?? (checked ? 'Mark incomplete' : 'Mark complete')}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      style={styles.pressable}
    >
      {/* Burst layer — behind the box */}
      {!reduceMotion && (
        <View style={styles.burstWrap} pointerEvents="none">
          <RingBurst progress={burstProgress} color={burstColor} />
          {Array.from({ length: SPARK_COUNT }, (_, i) => (
            <Spark key={i} index={i} progress={burstProgress} color={burstColor} />
          ))}
        </View>
      )}
      <Animated.View style={[styles.box, boxStyle]}>
        {checked && <Feather name="check" size={14} color={Colors.onAccent} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstWrap: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
