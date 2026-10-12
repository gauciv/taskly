/**
 * Centralized haptic feedback helper.
 * This is the ONLY place expo-haptics is called.
 * All methods respect the haptics_enabled setting and never throw.
 */
import * as Haptics from 'expo-haptics';

function isEnabled(): boolean {
  try {
    // Dynamic require to avoid circular imports at module init time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useSettingsStore } = require('@/store/useSettingsStore') as typeof import('@/store/useSettingsStore');
    return useSettingsStore.getState().hapticsEnabled;
  } catch {
    // swallowed intentionally — haptics failure must never crash the app
    return true;
  }
}

function run(fn: () => Promise<void>): void {
  try {
    if (isEnabled()) fn().catch(() => {
      // swallowed intentionally — haptics failure must never crash the app
    });
  } catch {
    // swallowed intentionally — haptics failure must never crash the app
  }
}

export const haptic = {
  selection: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
