import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Colors, Spacing, Radii, SpringConfig } from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { showToast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { cancelTaskNotification } from '@/services/notifications';

// ── Animated Toggle Switch ────────────────────────────────────────────────────
interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel: string;
}

function ToggleSwitch({ value, onValueChange, accessibilityLabel }: ToggleSwitchProps) {
  const progress = useSharedValue(value ? 1 : 0);

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

  // Keep progress in sync with external value
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    progress.value = withSpring(value ? 1 : 0, SpringConfig);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handlePress() {
    try { Haptics.selectionAsync(); } catch {}
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
      <Animated.View style={[styles.toggleTrack, trackStyle]}>
        <Animated.View style={[styles.toggleThumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

// ── Animated chips reveal ─────────────────────────────────────────────────────
interface OffsetChipsProps {
  visible: boolean;
  reminderOffsetMin: 0 | 10 | 60;
  onSelect: (v: 0 | 10 | 60) => void;
}

type OffsetOption = { label: string; value: 0 | 10 | 60 };
const OFFSET_OPTIONS: OffsetOption[] = [
  { label: 'At due time', value: 0 },
  { label: '10 min before', value: 10 },
  { label: '1 hour before', value: 60 },
];

function OffsetChips({ visible, reminderOffsetMin, onSelect }: OffsetChipsProps) {
  const heightAnim = useSharedValue(visible ? 1 : 0);
  const opacityAnim = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    heightAnim.value = withTiming(visible ? 1 : 0, { duration: 250 });
    opacityAnim.value = withTiming(visible ? 1 : 0, { duration: 200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    maxHeight: heightAnim.value * 72,
    opacity: opacityAnim.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={containerStyle}>
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

// ── Section helpers ───────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
    setUserName,
    setNotificationsEnabled,
    setReminderOffset,
  } = useSettingsStore();

  const { tasks, clearCompleted, resetAll } = useTaskStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const completedCount = tasks.filter((t) => t.completed).length;

  async function handleSaveName() {
    setSavingName(true);
    const trimmed = nameInput.trim() || 'Friend';
    await setUserName(trimmed);
    setSavingName(false);
    setEditingName(false);
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
    await clearCompleted();
    showToast('Completed tasks cleared');
  }

  async function handleResetAll() {
    const ok = await confirm({
      title: 'Reset all data?',
      message: "All tasks, custom categories, notifications and settings will be erased. This can't be undone.",
      confirmLabel: 'Reset everything',
      destructive: true,
    });
    if (!ok) return;
    for (const t of tasks) {
      await cancelTaskNotification(t);
    }
    await resetAll();
    showToast('App reset');
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

        {/* Notifications */}
        <SectionLabel label="Notifications" />
        <Card>
          <CardRow>
            <AppText variant="label" color={Colors.text}>Reminders</AppText>
            <ToggleSwitch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              accessibilityLabel="Enable reminders"
            />
          </CardRow>

          {/* Animated timing chips — visible only when toggle is on */}
          <OffsetChips
            visible={notificationsEnabled}
            reminderOffsetMin={reminderOffsetMin}
            onSelect={setReminderOffset}
          />

          {!notificationsEnabled && (
            <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(180)}>
              <AppText variant="caption" color={Colors.textFaint} style={styles.notifHint}>
                Enable to receive reminders for upcoming tasks
              </AppText>
            </Animated.View>
          )}
          <AppText variant="caption" color={Colors.textFaint} style={styles.notifHint}>
            Reminders require a development build — silently skipped in Expo Go.
          </AppText>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
    paddingTop: Spacing.s2,
  },
  notifHint: {
    marginTop: 4,
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
