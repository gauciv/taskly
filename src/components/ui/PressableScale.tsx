import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  haptic?: boolean;
}

export function PressableScale({ style, children, haptic, onPress, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Use a plain Pressable as the hit target and an Animated.View child for the
  // scale transform. This avoids the Reanimated warning about "transform being
  // overwritten by a layout animation" when the parent Animated.View has a
  // layout prop (e.g. LinearTransition on the TaskCard wrapper).
  return (
    <Pressable
      onPressIn={(e) => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 400, mass: 0.5 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.9 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.(e);
      }}
      {...props}
    >
      <Animated.View style={[animStyle, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
