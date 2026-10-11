import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runMigrations } from '@/db/migrations';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { usePoppins } from '@/hooks/useFonts';
import { ToastHost } from '@/components/ui/Toast';
import { ConfirmHost } from '@/components/ui/ConfirmDialog';
import { Colors } from '@/theme/tokens';
import {
  addNotificationTapListener,
  checkLastNotificationResponse,
  resyncAll,
} from '@/services/notifications';
import { taskDetailsHref } from '@/utils/routes';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { fontsLoaded } = usePoppins();
  const [dbReady, setDbReady] = useState(false);
  const hydrateTask = useTaskStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const tasks = useTaskStore((s) => s.tasks);

  useEffect(() => {
    async function init() {
      try {
        await runMigrations();
        await Promise.all([hydrateTask(), hydrateSettings()]);
        await resyncAll(useTaskStore.getState().tasks);
        // Deep-link from cold start tap
        await checkLastNotificationResponse((taskId) => {
          router.push(taskDetailsHref(taskId));
        });
      } catch {
        // continue even if db or notif fails
      } finally {
        setDbReady(true);
      }
    }
    init();
  }, []);

  // Notification tap while app is running
  useEffect(() => {
    const unsub = addNotificationTapListener((taskId) => {
      router.push(taskDetailsHref(taskId));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return null;

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
          </Stack>
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
