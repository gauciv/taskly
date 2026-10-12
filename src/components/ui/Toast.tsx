import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { create } from 'zustand';
import { Colors, Spacing, TabBar, Radii, tintedFill } from '@/theme/tokens';
import { AppText } from './AppText';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  action?: { label: string; onPress: () => void };
}

interface ToastStore {
  queue: ToastState[];
  current: ToastState | null;
  show: (message: string, opts?: { type?: ToastType; action?: { label: string; onPress: () => void } }) => void;
  dismiss: () => void;
  _next: () => void;
}

let nextId = 0;
const MAX_QUEUE = 3;

export const useToastStore = create<ToastStore>((set, get) => ({
  queue: [],
  current: null,

  show: (message, opts) => {
    const type: ToastType = opts?.type ?? 'info';
    const action = opts?.action;
    const { current, queue } = get();

    // Deduplicate consecutive identical messages
    if (current && current.message === message && current.type === type) return;
    if (queue.length > 0 && queue[queue.length - 1].message === message) return;

    const item: ToastState = { id: nextId++, message, type, action };

    if (!current) {
      set({ current: item });
    } else if (type === 'error') {
      set({ current: item });
    } else if (type === 'success' || type === 'info') {
      set({ current: item });
    } else if (queue.length < MAX_QUEUE) {
      set({ queue: [...queue, item] });
    }
    // else: drop
  },

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
    } else {
      set({ current: null });
    }
  },

  _next: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
    } else {
      set({ current: null });
    }
  },
}));

/** Main entry point — backward compatible with the old showToast API */
export function showToast(
  message: string,
  actionOrOpts?: { label: string; onPress: () => void } | { type?: ToastType; action?: { label: string; onPress: () => void } },
) {
  if (!actionOrOpts) {
    useToastStore.getState().show(message);
    return;
  }
  // Legacy API: { label, onPress }
  if ('label' in actionOrOpts) {
    useToastStore.getState().show(message, { action: actionOrOpts });
    return;
  }
  // New API: { type?, action? }
  useToastStore.getState().show(message, actionOrOpts);
}

// ── Visual config per type ────────────────────────────────────────────────────
const TYPE_CONFIG: Record<ToastType, { icon: React.ComponentProps<typeof Feather>['name']; color: string; duration: number }> = {
  success: { icon: 'check-circle', color: Colors.success,  duration: 2500 },
  info:    { icon: 'info',         color: Colors.purple,   duration: 3000 },
  warning: { icon: 'alert-triangle', color: Colors.warning, duration: 4000 },
  error:   { icon: 'alert-circle', color: Colors.danger,   duration: 5000 },
};

// Tab bar height + raised center button protrusion (~24px) + gap
const TOAST_BOTTOM = TabBar.height + 48;

export function ToastHost() {
  const { current, dismiss } = useToastStore();
  const opacity   = useSharedValue(0);
  const translateY = useSharedValue(24);
  const shakeX    = useSharedValue(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (current) {
      // Entrance animation
      opacity.value    = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.9 });

      // Shake for errors
      if (current.type === 'error') {
        shakeX.value = withSequence(
          withTiming( 6, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming( 6, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming( 4, { duration: 40 }),
          withTiming(-4, { duration: 40 }),
          withTiming( 0, { duration: 40 }),
        );
      }

      const cfg = TYPE_CONFIG[current.type];
      const dur = current.action ? cfg.duration + 1000 : cfg.duration;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hideToast, dur);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  function hideToast() {
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.value    = withTiming(0, { duration: 180 }, (done) => { if (done) runOnJS(dismiss)(); });
    translateY.value = withTiming(24, { duration: 180 });
  }

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: shakeX.value },
    ],
  }));

  if (!current) return null;

  const cfg = TYPE_CONFIG[current.type];
  const iconTileBg = tintedFill(cfg.color);
  const isError = current.type === 'error';
  const actionColor = isError ? Colors.text : Colors.lime;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={hideToast}
      style={[styles.touchTarget]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        {/* Icon tile */}
        <View style={[styles.iconTile, { backgroundColor: iconTileBg }]}>
          <Feather name={cfg.icon} size={16} color={cfg.color} />
        </View>
        {/* Message */}
        <AppText variant="label" color={Colors.text} style={styles.message} numberOfLines={2}>
          {current.message}
        </AppText>
        {/* Action */}
        {current.action && (
          <TouchableOpacity
            onPress={() => { current.action?.onPress(); hideToast(); }}
            hitSlop={8}
          >
            <AppText variant="label" color={actionColor} style={styles.action}>
              {current.action.label}
            </AppText>
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    position: 'absolute',
    bottom: TOAST_BOTTOM,
    left: Spacing.screenH,
    right: Spacing.screenH,
    zIndex: 9999,
  },
  pill: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    ...Platform.select({ android: { borderWidth: 1, borderColor: Colors.border } }),
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
  },
  action: {
    fontFamily: 'Poppins_600SemiBold',
    flexShrink: 0,
  },
});
