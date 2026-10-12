import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Colors } from '@/theme/tokens';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('screen');

const PALETTE = [Colors.lime, Colors.purple, Colors.cyan, Colors.pink, Colors.orange];
const DURATION = 1800;
const G = 600; // gravity px/s²

interface Particle {
  id: number;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  size: number;
  spin: number; // deg/s
  color: string;
  isCircle: boolean;
  delay: number;
}

function seeded(seed: number): number {
  // Simple deterministic pseudo-random from seed
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function makeParticles(count: number, originX: number, originY: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (seeded(i * 13) * 360 - 30) * (Math.PI / 180); // mostly upward
    const speed = 200 + seeded(i * 19) * 300;
    return {
      id: i,
      x0: originX,
      y0: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 200, // upward bias
      size: 4 + seeded(i * 31) * 8,
      spin: 200 + seeded(i * 37) * 400,
      color: PALETTE[Math.floor(seeded(i * 41) * PALETTE.length)],
      isCircle: seeded(i * 43) > 0.5,
      delay: seeded(i * 47) * 80,
    };
  });
}

function ConfettiParticle({
  particle,
  t,
}: {
  particle: Particle;
  t: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const localT = Math.max(0, t.value - particle.delay / DURATION);
    const x = particle.x0 + particle.vx * localT;
    const y = particle.y0 + particle.vy * localT + 0.5 * G * localT * localT;
    const rotate = particle.spin * localT;
    const opacity = localT > 0.7 ? 1 - (localT - 0.7) / 0.3 : 1;
    return {
      position: 'absolute' as const,
      left: x - particle.size / 2,
      top: y - particle.size / 2,
      width: particle.size,
      height: particle.isCircle ? particle.size : particle.size * 0.6,
      borderRadius: particle.isCircle ? particle.size / 2 : 2,
      backgroundColor: particle.color,
      opacity,
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  return <Animated.View style={style} />;
}

interface ConfettiProps {
  count?: number;
  originX?: number;
  originY?: number;
  onFinish?: () => void;
}

export function Confetti({
  count = 40,
  originX = SCREEN_W / 2,
  originY = SCREEN_H * 0.4,
  onFinish,
}: ConfettiProps) {
  const t = useSharedValue(0);
  // useMemo keeps particles stable across re-renders without touching refs during render
  const particles = useMemo(
    () => makeParticles(count, originX, originY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally computed once at mount
  );
  const finished = useRef(false);

  function handleFinish() {
    if (!finished.current) {
      finished.current = true;
      onFinish?.();
    }
  }

  useEffect(() => {
    t.value = 0;
    finished.current = false;
    t.value = withTiming(1, { duration: DURATION, easing: Easing.linear }, (done) => {
      if (done) runOnJS(handleFinish)();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} particle={p} t={t} />
      ))}
    </View>
  );
}
