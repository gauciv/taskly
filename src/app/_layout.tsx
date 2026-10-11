import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { Stack, router, ErrorBoundary as ExpoErrorBoundary } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runMigrations } from '@/db/migrations';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { usePoppins } from '@/hooks/useFonts';
import { ToastHost } from '@/components/ui/Toast';
import { ConfirmHost } from '@/components/ui/ConfirmDialog';
import { CelebrationOverlay } from '@/components/ui/CelebrationOverlay';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { Colors } from '@/theme/tokens';
import {
  addNotificationTapListener,
  checkLastNotificationResponse,
  resyncAll,
} from '@/services/notifications';
import { taskDetailsHref } from '@/utils/routes';
import { logError } from '@/utils/logger';
import { confirm } from '@/components/ui/ConfirmDialog';

SplashScreen.preventAutoHideAsync();

// ── Root ErrorBoundary (expo-router hook) ─────────────────────────────────────
export { ExpoErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  const { fontsLoaded } = usePoppins();
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const hydrateTask = useTaskStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateNotifs = useNotificationStore((s) => s.hydrate);
  const syncInbox = useNotificationStore((s) => s.syncInbox);

  const init = useCallback(async () => {
    setInitError(null);
    try {
      await runMigrations();
      await Promise.all([hydrateTask(), hydrateSettings()]);
      await resyncAll(useTaskStore.getState().tasks);
      await hydrateNotifs();
      await syncInbox(Date.now());
      // Deep-link from cold start tap
      await checkLastNotificationResponse((taskId) => {
        router.push(taskDetailsHref(taskId));
        useNotificationStore.getState().markReadForTask(taskId);
      });
    } catch (err) {
      logError('RootLayout.init', err);
      setInitError(
        err instanceof Error ? err.message : 'Unknown startup error'
      );
    } finally {
      setDbReady(true);
    }
  }, [hydrateTask, hydrateSettings, hydrateNotifs, syncInbox]);

  useEffect(() => {
    init();
  }, []);

  // Foreground / background handler: sync inbox on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncInbox(Date.now()).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [syncInbox]);

  // 30-second inbox sync interval while app is active
  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncInbox(Date.now()).catch(() => {});
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [syncInbox]);

  // Notification tap while app is running
  useEffect(() => {
    const unsub = addNotificationTapListener((taskId) => {
      router.push(taskDetailsHref(taskId));
      useNotificationStore.getState().markReadForTask(taskId);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded) return null;

  // Startup failure screen (fonts loaded but db failed)
  if (dbReady && initError) {
    async function handleReset() {
      const ok = await confirm({
        title: 'Reset app data?',
        message: "All tasks and settings will be erased. This can't be undone.",
        confirmLabel: 'Reset everything',
        destructive: true,
      });
      if (!ok) return;
      try {
        const { getDb } = await import('@/db/client');
        const db = await getDb();
        await db.execAsync('DROP TABLE IF EXISTS tasks');
        await db.execAsync('DROP TABLE IF EXISTS categories');
        await db.execAsync('DROP TABLE IF EXISTS notifications');
        await db.execAsync('DROP TABLE IF EXISTS settings');
      } catch {}
      init();
    }

    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ErrorScreen
            message="The app couldn't start. Please try again."
            detail={initError}
            onRetry={init}
            onReset={handleReset}
          />
          <ConfirmHost />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!dbReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.root}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bg },
              animation: 'default',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="task/new"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="task/[id]"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="task/edit/[id]"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="notifications"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="achievements"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
          </Stack>
          {/* Global overlays — above everything */}
          <CelebrationOverlay />
          <ToastHost />
          <ConfirmHost />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
});
