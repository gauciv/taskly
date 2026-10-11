import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  BackHandler,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { Colors, Spacing, Radii, SpringConfig, tintedFill } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

// ── Dialog state ──────────────────────────────────────────────────────────────
interface DialogOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface DialogStore {
  options: DialogOptions | null;
  resolve: ((value: boolean) => void) | null;
  open: (opts: DialogOptions, resolve: (value: boolean) => void) => void;
  close: () => void;
}

const useDialogStore = create<DialogStore>((set) => ({
  options: null,
  resolve: null,
  open: (options, resolve) => set({ options, resolve }),
  close: () => set({ options: null, resolve: null }),
}));

export function confirm(opts: DialogOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    useDialogStore.getState().open(opts, resolve);
  });
}

// ── ConfirmHost (mount once in root layout) ───────────────────────────────────
export function ConfirmHost() {
  const { options, resolve, close } = useDialogStore();
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (options) {
      scale.value = withSpring(1, SpringConfig);
      opacity.value = withTiming(1, { duration: 180 });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
    }
  }, [options]);

  useEffect(() => {
    if (!options || Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true;
    });
    return () => handler.remove();
  }, [options]);

  function animateClose(value: boolean) {
    opacity.value = withTiming(0, { duration: 160 }, (done) => {
      if (done) {
        runOnJS(finish)(value);
      }
    });
    scale.value = withTiming(0.92, { duration: 160 });
  }

  function finish(value: boolean) {
    resolve?.(value);
    close();
  }

  function handleCancel() {
    animateClose(false);
  }

  function handleConfirm() {
    animateClose(true);
  }

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!options) return null;

  const iconName: React.ComponentProps<typeof Feather>['name'] = options.destructive
    ? 'trash-2'
    : 'alert-triangle';

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      {/* Backdrop */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleCancel}
        accessibilityLabel="Cancel"
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </TouchableOpacity>

      {/* Card */}
      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Icon tile */}
          <View style={[styles.iconTile, { backgroundColor: tintedFill(Colors.danger) }]}>
            <Feather name={iconName} size={24} color={Colors.danger} />
          </View>

          <AppText variant="title" style={styles.title}>
            {options.title}
          </AppText>
          <AppText variant="body" color={Colors.textMuted} style={styles.message}>
            {options.message}
          </AppText>

          <View style={styles.buttons}>
            <Button
              label={options.cancelLabel ?? 'Cancel'}
              variant="secondary"
              onPress={handleCancel}
              style={styles.btn}
            />
            <Button
              label={options.confirmLabel}
              variant={options.destructive ? 'danger' : 'primary'}
              onPress={handleConfirm}
              style={styles.btn}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centerer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenH,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.s6,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: Spacing.s3,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.s3,
    marginTop: Spacing.s2,
    width: '100%',
  },
  btn: {
    flex: 1,
  },
});
