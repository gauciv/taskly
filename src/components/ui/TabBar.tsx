import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, TabBar as TabBarTokens } from '@/theme/tokens';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface TabItem {
  name: string;
  icon: FeatherIconName;
  label: string;
}

const TABS: TabItem[] = [
  { name: 'index',    icon: 'home',         label: 'Home' },
  { name: 'tasks',    icon: 'check-square', label: 'Tasks' },
  { name: 'schedule', icon: 'calendar',     label: 'Schedule' },
  { name: 'settings', icon: 'settings',     label: 'Settings' },
];

interface TabBarProps {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void; emit: (e: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean } };
}

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((tab, index) => {
        const isActive = state.index === index;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: state.routes[index]?.name, canPreventDefault: true });
              if (!isActive && !event.defaultPrevented) {
                try { Haptics.selectionAsync(); } catch {}
                navigation.navigate(tab.name);
              }
            }}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Feather
              name={tab.icon}
              size={24}
              color={isActive ? Colors.lime : Colors.textFaint}
            />
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: TabBarTokens.topRadius,
    borderTopRightRadius: TabBarTokens.topRadius,
    paddingTop: 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lime,
  },
});
