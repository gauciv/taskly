import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, Radii, tintedFill } from '@/theme/tokens';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface NotchCardProps {
  color: string;
  icon?: FeatherIconName;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

const NOTCH = 36;
const RADIUS = Radii.card;

function buildNotchPath(w: number, h: number): string {
  // Full card with top-right corner notched off diagonally
  return [
    `M ${RADIUS} 0`,
    `L ${w - NOTCH} 0`,
    `L ${w} ${NOTCH}`,
    `L ${w} ${h - RADIUS}`,
    `Q ${w} ${h} ${w - RADIUS} ${h}`,
    `L ${RADIUS} ${h}`,
    `Q 0 ${h} 0 ${h - RADIUS}`,
    `L 0 ${RADIUS}`,
    `Q 0 0 ${RADIUS} 0`,
    'Z',
  ].join(' ');
}

export function NotchCard({ color, icon, children, style }: NotchCardProps) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setDims({ w: width, h: height });
  }

  return (
    <View style={[styles.outer, { backgroundColor: color }, style]} onLayout={onLayout}>
      {dims && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={dims.w}
          height={dims.h}
        >
          <Path d={buildNotchPath(dims.w, dims.h)} fill={color} />
          {/* Shade the notch triangle */}
          <Path
            d={`M ${dims.w - NOTCH} 0 L ${dims.w} 0 L ${dims.w} ${NOTCH} Z`}
            fill={Colors.bg}
            opacity={0.85}
          />
        </Svg>
      )}
      {icon && (
        <View style={[styles.iconTile, { backgroundColor: tintedFill('#000000') }]}>
          <Feather name={icon} size={18} color={Colors.onAccent} />
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: RADIUS,
    overflow: 'hidden',
    padding: 16,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
});
