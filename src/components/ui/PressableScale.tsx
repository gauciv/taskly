import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({ style, children, haptic, onPress, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animStyle, style]}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 400, mass: 0.5 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.9 });
      }}
      onPress={(e) => {
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.(e);
      }}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
