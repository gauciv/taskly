import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, TabBar as TabBarTokens, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { useScheduleStore } from '@/store/useScheduleStore';
import { newTaskHref, newTaskWithDueHref } from '@/utils/routes';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface TabItem {
  name: string;
  icon: FeatherIconName;
  label: string;
}

// Four real tabs: Home, Tasks, [+center], Schedule, Settings
const LEFT_TABS: TabItem[] = [
  { name: 'index',    icon: 'home',         label: 'Home' },
  { name: 'tasks',   icon: 'check-square', label: 'Tasks' },
];
const RIGHT_TABS: TabItem[] = [
  { name: 'schedule', icon: 'calendar',   label: 'Schedule' },
  { name: 'settings', icon: 'settings',   label: 'Settings' },
];

interface TabBarProps {
  state: { index: number; routes: { name: string; key: string }[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptors?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insets?: any;
}

function TabButton({
  tab,
  routeIndex,
  isActive,
  state,
  navigation,
}: {
  tab: TabItem;
  routeIndex: number;
  isActive: boolean;
  state: TabBarProps['state'];
  navigation: TabBarProps['navigation'];
}) {
  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={() => {
        const event = navigation.emit({
          type: 'tabPress',
          target: state.routes[routeIndex]?.name,
          canPreventDefault: true,
        });
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
        size={22}
        color={isActive ? Colors.lime : Colors.textFaint}
      />
      <AppText
        variant="caption"
        style={[styles.tabLabel, { color: isActive ? Colors.lime : Colors.textFaint }]}
      >
        {tab.label}
      </AppText>
      {isActive && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

function CenterAddButton({ isScheduleActive }: { isScheduleActive: boolean }) {
  const scale = useSharedValue(1);
  const iconRotate = useSharedValue(0);
  const selectedDayMs = useScheduleStore((s) => s.selectedDayMs);

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 18, stiffness: 300, mass: 0.8 }, () => {
      scale.value = withSpring(1, { damping: 18, stiffness: 220 });
    });
    iconRotate.value = withSpring(90, { damping: 18, stiffness: 220 }, () => {
      iconRotate.value = withSpring(0, { damping: 18, stiffness: 220 });
    });
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    if (isScheduleActive) {
      // Prefill due date with selected day at 09:00
      const d = new Date(selectedDayMs);
      d.setHours(9, 0, 0, 0);
      router.push(newTaskWithDueHref(d.getTime()));
    } else {
      router.push(newTaskHref);
    }
  }, [selectedDayMs, isScheduleActive]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotate.value}deg` }],
  }));

  return (
    <View style={styles.centerSlot}>
      {/* Ring (notch) behind the circle */}
      <View style={styles.centerRing}>
        <Animated.View style={outerStyle}>
          <TouchableOpacity
            onPress={handlePress}
            style={styles.centerBtn}
            accessibilityRole="button"
            accessibilityLabel="Add new task"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={iconStyle}>
              <Feather name="plus" size={30} color={Colors.onAccent} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const barHeight = TabBarTokens.height + insets.bottom;

  // Map route names to indices in state.routes
  const routeNameToIndex = Object.fromEntries(
    state.routes.map((r, i) => [r.name, i])
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, height: barHeight }]}>
      {/* Left two tabs */}
      {LEFT_TABS.map((tab) => {
        const idx = routeNameToIndex[tab.name] ?? 0;
        return (
          <TabButton
            key={tab.name}
            tab={tab}
            routeIndex={idx}
            isActive={state.index === idx}
            state={state}
            navigation={navigation}
          />
        );
      })}

      {/* Center raised + button (not a tab) */}
      <CenterAddButton isScheduleActive={state.routes[state.index]?.name === 'schedule'} />

      {/* Right two tabs */}
      {RIGHT_TABS.map((tab) => {
        const idx = routeNameToIndex[tab.name] ?? 0;
        return (
          <TabButton
            key={tab.name}
            tab={tab}
            routeIndex={idx}
            isActive={state.index === idx}
            state={state}
            navigation={navigation}
          />
        );
      })}
    </View>
  );
}

const CENTER_SIZE = 64;
const CENTER_RING = 6;
const CENTER_PROTRUDE = 24; // how far above bar top edge the center of the button sits

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: TabBarTokens.topRadius,
    borderTopRightRadius: TabBarTokens.topRadius,
    paddingTop: 12,
    paddingHorizontal: Spacing.s2,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 14,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lime,
  },
  // Center slot takes flex:1 but the button protrudes above the bar
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    // We push the button up so it protrudes
    marginTop: -(CENTER_PROTRUDE + CENTER_RING),
    height: CENTER_SIZE + CENTER_PROTRUDE + CENTER_RING,
    justifyContent: 'flex-start',
  },
  // The ring creates the "cut-out" halo effect
  centerRing: {
    width: CENTER_SIZE + CENTER_RING * 2,
    height: CENTER_SIZE + CENTER_RING * 2,
    borderRadius: (CENTER_SIZE + CENTER_RING * 2) / 2,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 10 },
      ios: {
        shadowColor: Colors.lime,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
    }),
  },
});
