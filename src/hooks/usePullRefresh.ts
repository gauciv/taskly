import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/utils/feedback';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { showToast } from '@/components/ui/Toast';
import { logError } from '@/utils/logger';

const MIN_SPINNER_MS = 600;

/**
 * Shared pull-to-refresh hook.
 * Re-loads tasks+categories+settings from SQLite, re-syncs scheduled
 * reminders, and calls syncInbox on the notification store.
 * Keeps the spinner visible for at least 600 ms to feel intentional.
 */
export function usePullRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const startRef = useRef(0);
  // Stable ref so the error action can call the latest onRefresh without a circular dep
  const onRefreshRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const hydrateTask = useTaskStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    startRef.current = Date.now();
    try {
      await Promise.all([hydrateTask(), hydrateSettings()]);

      const { resyncAll } = await import('@/services/notifications');
      const tasks = useTaskStore.getState().tasks;
      await resyncAll(tasks);

      try {
        const { useNotificationStore } = await import('@/store/useNotificationStore');
        await useNotificationStore.getState().syncInbox(Date.now());
      } catch (error) {
        logError('pullRefresh.syncInbox', error);
      }

      const elapsed = Date.now() - startRef.current;
      if (elapsed < MIN_SPINNER_MS) {
        await new Promise<void>((r) => setTimeout(r, MIN_SPINNER_MS - elapsed));
      }
      haptic.success();
    } catch (error) {
      logError('pullRefresh', error);
      showToast("Couldn't refresh. Try again.", {
        type: 'error',
        action: { label: 'Retry', onPress: () => { void onRefreshRef.current(); } },
      });
    } finally {
      setRefreshing(false);
    }
  }, [hydrateTask, hydrateSettings]);

  // Keep ref in sync with latest callback (updated in an effect, never during render)
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  return { refreshing, onRefresh };
}
