import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '@/utils/feedback';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { reportError } from '@/utils/errors';

/** Refreshes the local cache and reminders; the spinner stops immediately on success or failure. */
export function usePullRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const hydrateTask = useTaskStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([hydrateTask(), hydrateSettings()]);
      const { resyncAll } = await import('@/services/notifications');
      await resyncAll(useTaskStore.getState().tasks);
      const { useNotificationStore } = await import('@/store/useNotificationStore');
      await useNotificationStore.getState().syncInbox(Date.now());
      haptic.success();
    } catch (error) {
      reportError(error, {
        context: 'pullRefresh',
        userMessage: "Couldn't refresh your tasks",
        retry: () => { void onRefreshRef.current(); },
      });
    } finally {
      setRefreshing(false);
    }
  }, [hydrateTask, hydrateSettings]);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  return { refreshing, onRefresh };
}
