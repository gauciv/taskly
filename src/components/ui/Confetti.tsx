import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { runOnUI } from 'react-native-worklets';
import { Colors } from '@/theme/tokens';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('screen');
const PARTICLE_CAP = 36;
const PALETTE = [Colors.lime, Colors.purple, Colors.cyan, Colors.pink, Colors.orange];
const DURATION = 700;
const G = 120;

interface ParticleSeed {
  id: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  color: string;
  isCircle: boolean;
  delay: number;
}
function seeded(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
function makeParticles(): ParticleSeed[] {
  return Array.from({ length: PARTICLE_CAP }, (_, id) => {
    const angle = (seeded(id * 13) * 360 - 30) * Math.PI / 180;
    const speed = 25 + seeded(id * 19) * 25;
    return {
      id,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      size: 4 + seeded(id * 31) * 8,
      spin: 200 + seeded(id * 37) * 400,
      color: PALETTE[Math.floor(seeded(id * 41) * PALETTE.length)],
      isCircle: seeded(id * 43) > 0.5,
      delay: seeded(id * 47) * 60,
    };
  });
}

function ConfettiParticle({
  particle,
  t,
  originX,
  originY,
  enabled,
  spread,
}: {
  particle: ParticleSeed;
  t: SharedValue<number>;
  originX: number;
  originY: number;
  enabled: boolean;
  spread: number;
}) {
  const style = useAnimatedStyle(() => {
    const localT = Math.max(0, t.value - particle.delay / DURATION);
    const x = originX + particle.vx * localT * spread;
    const y = originY + (particle.vy * localT + 0.5 * G * localT * localT) * spread;
    const opacity = enabled ? Math.min(1, Math.max(0, localT > 0.7 ? 1 - (localT - 0.7) / 0.3 : 1)) : 0;
    return {
      position: 'absolute' as const,
      left: x - particle.size / 2,
      top: y - particle.size / 2,
      width: particle.size,
      height: particle.isCircle ? particle.size : particle.size * 0.6,
      borderRadius: particle.isCircle ? particle.size / 2 : 2,
      backgroundColor: particle.color,
      opacity,
      transform: [{ rotate: `${particle.spin * localT}deg` }],
    };
  });
  return <Animated.View style={style} />;
}

interface ConfettiProps {
  active: boolean;
  burstKey: string;
  count?: number;
  originX?: number;
  originY?: number;
  spread?: number;
  onFinish?: () => void;
}

/** Always-mounted particle layer. Bursts only reset shared values; no React frame updates. */
export function Confetti({
  active,
  burstKey,
  count = PARTICLE_CAP,
  originX = SCREEN_W / 2,
  originY = SCREEN_H * 0.4,
  spread = 1,
  onFinish,
}: ConfettiProps) {
  const t = useSharedValue(1);
  const particles = useMemo(() => makeParticles(), []);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!active || !burstKey) return;
    const finish = () => finishRef.current?.();
    runOnUI(() => {
      'worklet';
      t.value = 0;
      t.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) runOnJS(finish)();
      });
    })();
  }, [active, burstKey, originX, originY, t]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          particle={particle}
          t={t}
          originX={originX}
          originY={originY}
          spread={spread}
          enabled={active && particle.id < Math.min(PARTICLE_CAP, Math.max(0, count))}
        />
      ))}
    </View>
  );
}
