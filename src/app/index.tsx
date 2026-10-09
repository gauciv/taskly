import { Redirect } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function Index() {
  const onboarded = useSettingsStore((s) => s.onboarded);
  if (onboarded) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/welcome" />;
}
