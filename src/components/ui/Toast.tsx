import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Spacing, TabBar } from '@/theme/tokens';
import { AppText } from './AppText';
import { create } from 'zustand';

// ---- Toast store ----
export interface ToastState {
  id: number;
  message: string;
  action?: { label: string; onPress: () => void };
}

interface ToastStore {
  toast: ToastState | null;
  show: (message: string, action?: { label: string; onPress: () => void }) => void;
  dismiss: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  show: (message, action) => set({ toast: { id: nextId++, message, action } }),
  dismiss: () => set({ toast: null }),
}));

export function showToast(message: string, action?: { label: string; onPress: () => void }) {
  useToastStore.getState().show(message, action);
}

// ---- ToastHost ----
const AUTO_DISMISS_MS = 4000;

export function ToastHost() {
  const { toast, dismiss } = useToastStore();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast) {
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220, mass: 0.9 });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        hideToast();
      }, AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast?.id]);

  function hideToast() {
    opacity.value = withTiming(0, { duration: 180 }, (done) => {
      if (done) runOnJS(dismiss)();
    });
    translateY.value = withTiming(20, { duration: 180 });
  }

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  return (
    <Animated.View style={[styles.pill, style]} pointerEvents="box-none">
      <AppText variant="label" color={Colors.text} style={styles.message}>
        {toast.message}
      </AppText>
      {toast.action && (
        <TouchableOpacity
          onPress={() => {
            toast.action?.onPress();
            hideToast();
          }}
          hitSlop={8}
        >
          <AppText variant="label" color={Colors.lime} style={styles.action}>
            {toast.action.label}
          </AppText>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: TabBar.height + 16,
    left: Spacing.screenH,
    right: Spacing.screenH,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 999,
    paddingHorizontal: Spacing.s4,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
  },
  action: {
    marginLeft: Spacing.s3,
    fontFamily: 'Poppins_600SemiBold',
  },
});
