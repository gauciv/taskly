import { useReducedMotion } from 'react-native-reanimated';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * Returns true when animations should be reduced.
 * Combines the OS-level reduced-motion preference with the in-app Celebrations toggle.
 * When this returns true: skip confetti, shakes, loops; use short fades only.
 */
export function useMotionPrefs(): { reduceMotion: boolean; skipCelebrations: boolean } {
  const osReducedMotion = useReducedMotion();
  const celebrationsEnabled = useSettingsStore((s) => s.celebrationsEnabled);

  const reduceMotion = !!osReducedMotion;
  const skipCelebrations = !celebrationsEnabled || reduceMotion;

  return { reduceMotion, skipCelebrations };
}
