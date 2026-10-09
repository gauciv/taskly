import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/ui/TabBar';
import { Colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
