import React, { useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/theme/tokens';

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel?: string;
}

export function AnimatedCheckbox({ checked, onToggle, accessibilityLabel }: AnimatedCheckboxProps) {
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 });
    scale.value = withSequence(
      withTiming(checked ? 1.2 : 0.9, { duration: 100 }),
      withSpring(1, { damping: 18, stiffness: 220, mass: 0.9 })
    );
  }, [checked]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', Colors.lime]),
    borderColor: interpolateColor(progress.value, [0, 1], [Colors.textFaint, Colors.lime]),
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onToggle();
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel ?? (checked ? 'Mark incomplete' : 'Mark complete')}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
    >
      <Animated.View style={[styles.box, boxStyle]}>
        {checked && <Feather name="check" size={14} color={Colors.onAccent} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
