import { useCallback, useRef, useState } from 'react';
import { haptic } from '@/utils/feedback';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { showToast } from '@/components/ui/Toast';

const MIN_SPINNER_MS = 600;

/**
 * Shared pull-to-refresh hook.
 * Re-loads tasks+categories+settings from SQLite, re-syncs scheduled
 * reminders, and (after U2.8) calls syncInbox on the notification store.
 * Keeps the spinner visible for at least 600 ms to feel intentional.
 */
export function usePullRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const startRef = useRef(0);

  const hydrateTask = useTaskStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    startRef.current = Date.now();
    try {
      // Reload tasks+categories and settings from SQLite silently
      await Promise.all([hydrateTask(), hydrateSettings()]);

      // Re-sync scheduled system notifications with the fresh task list
      const { resyncAll } = await import('@/services/notifications');
      const tasks = useTaskStore.getState().tasks;
      await resyncAll(tasks);

      // Sync notification inbox (wired in U2.8; no-op if store not loaded)
      try {
        const { useNotificationStore } = await import('@/store/useNotificationStore');
        await useNotificationStore.getState().syncInbox(Date.now());
      } catch {
        // U2.8 not yet present – safe to ignore
      }

      // Keep spinner visible for at least MIN_SPINNER_MS
      const elapsed = Date.now() - startRef.current;
      if (elapsed < MIN_SPINNER_MS) {
        await new Promise<void>((r) => setTimeout(r, MIN_SPINNER_MS - elapsed));
      }
      haptic.success();
    } catch {
      showToast("Couldn't refresh. Try again.", {
        type: 'error',
        action: { label: 'Retry', onPress: onRefresh },
      });
    } finally {
      setRefreshing(false);
    }
  }, [hydrateTask, hydrateSettings]);

  return { refreshing, onRefresh };
}
