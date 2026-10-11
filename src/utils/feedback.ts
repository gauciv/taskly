/**
 * Centralized haptic feedback helper.
 * This is the ONLY place expo-haptics is called.
 * All methods respect the haptics_enabled setting and never throw.
 */
import * as Haptics from 'expo-haptics';
import { getSetting } from '@/db/settingsRepo';

async function isEnabled(): Promise<boolean> {
  try {
    const val = await getSetting('haptics_enabled');
    return val !== '0';
  } catch {
    // swallowed intentionally — haptics failure must never crash the app
    return true;
  }
}

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    if (await isEnabled()) await fn();
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
