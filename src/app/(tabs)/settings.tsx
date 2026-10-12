import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radii, SpringConfig, tintedFill } from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { showToast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { cancelTaskNotification, ensurePermission } from '@/services/notifications';
import { useNotificationStatus } from '@/store/useNotificationStatus';
import { haptic } from '@/utils/feedback';
import { achievementsHref } from '@/utils/routes';
import { reportError } from '@/utils/errors';

// ── Animated Toggle Switch ────────────────────────────────────────────────────
interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel: string;
  shakeRef?: React.MutableRefObject<() => void>;
}

function ToggleSwitch({ value, onValueChange, accessibilityLabel, shakeRef }: ToggleSwitchProps) {
  const progress = useSharedValue(value ? 1 : 0);
  const shakeX = useSharedValue(0);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [Colors.surfaceHigh, Colors.lime + 'CC'],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(progress.value * 22, SpringConfig) }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [Colors.textFaint, Colors.lime],
    ),
  }));

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  React.useEffect(() => {
    // Reanimated SharedValue — intentionally mutable, not React state
    // eslint-disable-next-line react-hooks/immutability
    progress.value = withSpring(value ? 1 : 0, SpringConfig);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Expose shake function via ref
  React.useEffect(() => {
    if (shakeRef) {
      shakeRef.current = () => {
        shakeX.value = withSequence(
          withTiming(5, { duration: 50 }),
          withTiming(-5, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(-5, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        );
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePress() {
    haptic.selection();
    onValueChange(!value);
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={styles.toggleHitArea}
    >
      <Animated.View style={wrapStyle}>
        <Animated.View style={[styles.toggleTrack, trackStyle]}>
          <Animated.View style={[styles.toggleThumb, thumbStyle]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ── Animated chips reveal — fixed: no hard-coded height ──────────────────────
interface OffsetChipsProps {
  visible: boolean;
  reminderOffsetMin: 0 | 10 | 60;
  onSelect: (v: 0 | 10 | 60) => void;
}

type OffsetOption = { label: string; value: 0 | 10 | 60 };
const OFFSET_OPTIONS: OffsetOption[] = [
  { label: 'At due time',    value: 0 },
  { label: '10 min before',  value: 10 },
  { label: '1 hour before',  value: 60 },
];

function OffsetChips({ visible, reminderOffsetMin, onSelect }: OffsetChipsProps) {
  if (!visible) return null;
  return (
    // FadeInDown / FadeOut on the wrapper; LinearTransition on the card handles reflow
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(180)}>
      <View style={styles.chipRow}>
        {OFFSET_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={reminderOffsetMin === opt.value}
            onPress={() => onSelect(opt.value)}
            color={Colors.lime}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ── Notification capability banner ────────────────────────────────────────────
function NotifCapabilityBanner() {
  const reason = useNotificationStatus((s) => s.reason);
  if (!reason) return null;

  const isPermission = reason === 'permission_denied';
  const icon: React.ComponentProps<typeof Feather>['name'] = isPermission ? 'alert-triangle' : 'info';
  const msg = isPermission
    ? 'Notification permission is off.'
    : "Reminders can't be scheduled on this device or app build.";

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(180)}
      style={styles.capabilityBanner}
    >
      <Feather name={icon} size={13} color={Colors.warning} style={{ marginTop: 1 }} />
      <AppText variant="caption" color={Colors.warning} style={styles.bannerText}>
        {msg}
      </AppText>
      {isPermission && (
        <TouchableOpacity
          onPress={() => {
            void Linking.openSettings().catch((error: unknown) => reportError(error, {
              context: 'settings.openNotificationSettings',
              userMessage: "Couldn't open system settings",
            }));
          }}
          accessibilityLabel="Open system settings"
          accessibilityRole="button"
        >
          <AppText variant="caption" color={Colors.lime} style={styles.bannerAction}>
            Open settings
          </AppText>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Section helpers ───────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  // LinearTransition lets the card resize smoothly when chips appear/disappear
  return (
    <Animated.View style={styles.card} layout={LinearTransition.springify().damping(18).stiffness(200)}>
      {children}
    </Animated.View>
  );
}

function CardRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.cardRow}>{children}</View>;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText variant="label" color={Colors.textFaint} style={styles.sectionLabel}>
      {label.toUpperCase()}
    </AppText>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const {
    userName,
    notificationsEnabled,
    reminderOffsetMin,
    celebrationsEnabled,
    hapticsEnabled,
    setUserName,
    setNotificationsEnabled,
    setReminderOffset,
    setCelebrationsEnabled,
    setHapticsEnabled,
  } = useSettingsStore();

  const { tasks, clearCompleted, resetAll } = useTaskStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const remindersShakeRef = useRef<() => void>(() => {});

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const completedCount = tasks.filter((t) => t.completed).length;

  // Achievements unlock count from settings store
  const achievementsUnlocked = useSettingsStore((s) => s.achievementsUnlocked);

  async function handleRemindersToggle(enabled: boolean) {
    if (enabled) {
      // Optimistically enable, then check permission
      await setNotificationsEnabled(true);
      const granted = await ensurePermission();
      if (!granted) {
        // Revert and shake
        await setNotificationsEnabled(false);
        remindersShakeRef.current();
        haptic.warning();
      }
    } else {
      await setNotificationsEnabled(false);
    }
  }

  async function handleSaveName() {    setSavingName(true);
    const trimmed = nameInput.trim() || 'Friend';
    await setUserName(trimmed);
    setSavingName(false);
    setEditingName(false);
    showToast('Name saved', { type: 'success' });
  }

  async function handleClearCompleted() {
    if (completedCount === 0) return;
    const ok = await confirm({
      title: 'Clear completed tasks?',
      message: `${completedCount} completed task${completedCount === 1 ? '' : 's'} will be permanently removed.`,
      confirmLabel: 'Clear',
      destructive: true,
    });
    if (!ok) return;
    haptic.medium();
    const clearing = clearCompleted();
    showToast(`${completedCount} task${completedCount === 1 ? '' : 's'} cleared`, { type: 'success' });
    await clearing;
  }

  async function handleResetAll() {
    const ok = await confirm({
      title: 'Reset all data?',
      message: "All tasks, custom categories, notifications and settings will be erased. This can't be undone.",
      confirmLabel: 'Reset everything',
      destructive: true,
    });
    if (!ok) return;
    haptic.medium();
    for (const t of tasks) {
      await cancelTaskNotification(t);
    }
    await resetAll();
    showToast('App reset', { type: 'info' });
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <AppText variant="h2" style={styles.title}>Settings</AppText>

        {/* Profile */}
        <SectionLabel label="Profile" />
        <Card>
          <CardRow>
            <AppText variant="label" color={Colors.textMuted} style={styles.rowLabel}>
              Name
            </AppText>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  maxLength={40}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                  accessibilityLabel="Your name"
                  placeholderTextColor={Colors.textFaint}
                />
                <TouchableOpacity
                  style={styles.savePill}
                  onPress={handleSaveName}
                  disabled={savingName}
                  accessibilityLabel="Save name"
                  accessibilityRole="button"
                >
                  <AppText variant="caption" color={Colors.onAccent}>Save</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setNameInput(userName);
                  setEditingName(true);
                }}
                style={styles.nameDisplay}
                accessibilityLabel="Edit name"
                accessibilityRole="button"
              >
                <AppText variant="body" color={Colors.text}>{userName}</AppText>
                <AppText variant="caption" color={Colors.lime}>Edit</AppText>
              </TouchableOpacity>
            )}
          </CardRow>
        </Card>

        {/* Rewards */}
        <SectionLabel label="Rewards" />
        <Card>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push(achievementsHref)}
            accessibilityLabel="View achievements"
            accessibilityRole="button"
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navIconTile, { backgroundColor: tintedFill(Colors.lime) }]}>
                <Feather name="award" size={16} color={Colors.lime} />
              </View>
              <AppText variant="label" color={Colors.text}>Achievements</AppText>
            </View>
            <View style={styles.navRowRight}>
              <AppText variant="caption" color={Colors.textMuted}>
                {achievementsUnlocked} of 6 unlocked
              </AppText>
              <Feather name="chevron-right" size={16} color={Colors.textFaint} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Feedback */}
        <SectionLabel label="Feedback" />
        <Card>
          <CardRow>
            <AppText variant="label" color={Colors.text}>Celebrations</AppText>
            <ToggleSwitch
              value={celebrationsEnabled}
              onValueChange={setCelebrationsEnabled}
              accessibilityLabel="Enable celebrations"
            />
          </CardRow>
          <View style={styles.divider} />
          <CardRow>
            <AppText variant="label" color={Colors.text}>Haptic feedback</AppText>
            <ToggleSwitch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              accessibilityLabel="Enable haptic feedback"
            />
          </CardRow>
        </Card>

        {/* Notifications */}
        <SectionLabel label="Notifications" />
        <Card>
          <CardRow>
            <AppText variant="label" color={Colors.text}>Reminders</AppText>
            <ToggleSwitch
              value={notificationsEnabled}
              onValueChange={handleRemindersToggle}
              accessibilityLabel="Enable reminders"
              shakeRef={remindersShakeRef}
            />
          </CardRow>

          {/* Animated timing chips — no fixed height, wraps naturally */}
          <OffsetChips
            visible={notificationsEnabled}
            reminderOffsetMin={reminderOffsetMin}
            onSelect={setReminderOffset}
          />

          {/* Capability-based banner — shown only when something failed */}
          <NotifCapabilityBanner />

          {!notificationsEnabled && (
            <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(180)}>
              <AppText variant="caption" color={Colors.textFaint} style={styles.notifHint}>
                Enable to receive reminders for upcoming tasks
              </AppText>
            </Animated.View>
          )}
        </Card>

        {/* Data */}
        <SectionLabel label="Data" />
        <Card>
          <TouchableOpacity
            style={[styles.dataRow, completedCount === 0 && styles.dataRowDisabled]}
            onPress={handleClearCompleted}
            disabled={completedCount === 0}
            accessibilityLabel="Clear completed tasks"
            accessibilityRole="button"
          >
            <AppText
              variant="label"
              color={completedCount > 0 ? Colors.text : Colors.textFaint}
            >
              Clear completed tasks
            </AppText>
            <AppText variant="caption" color={Colors.textFaint}>
              {completedCount} completed
            </AppText>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.dataRow}
            onPress={handleResetAll}
            accessibilityLabel="Reset all data"
            accessibilityRole="button"
          >
            <AppText variant="label" color={Colors.danger}>Reset all data</AppText>
            <AppText variant="caption" color={Colors.textFaint}>Cannot be undone</AppText>
          </TouchableOpacity>
        </Card>

        {/* About */}
        <SectionLabel label="About" />
        <AppText
          variant="caption"
          color={Colors.textMuted}
          style={styles.aboutLine}
        >
          Taskly {appVersion} by Gauciv
        </AppText>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const TOGGLE_WIDTH = 50;
const TOGGLE_HEIGHT = 28;
const THUMB_SIZE = 22;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.s4,
    paddingBottom: 80,
  },
  title: {
    marginBottom: Spacing.s4,
  },
  sectionLabel: {
    marginBottom: Spacing.s2,
    marginTop: Spacing.s4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.s2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowLabel: {
    flex: 1,
  },
  nameEditRow: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  nameInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    borderBottomWidth: 1.5,
    borderColor: Colors.lime,
    paddingVertical: 4,
  },
  savePill: {
    backgroundColor: Colors.lime,
    borderRadius: Radii.chip,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameDisplay: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleHitArea: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_HEIGHT / 2,
    paddingHorizontal: 3,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: Colors.bg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
    rowGap: Spacing.s2,
    paddingTop: Spacing.s2,
  },
  notifHint: {
    marginTop: 4,
  },
  capabilityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.warning + '24',
    borderRadius: Radii.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  bannerText: {
    flex: 1,
    lineHeight: 18,
  },
  bannerAction: {
    fontFamily: 'Poppins_600SemiBold',
    flexShrink: 0,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  navRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataRow: {
    minHeight: 44,
    justifyContent: 'center',
    gap: 2,
  },
  dataRowDisabled: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  aboutLine: {
    textAlign: 'center',
    marginTop: Spacing.s2,
    marginBottom: Spacing.s2,
  },
});
