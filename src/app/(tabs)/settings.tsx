import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, SpringConfig } from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { showToast } from '@/components/ui/Toast';
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
    progress.value = withSpring(value ? 1 : 0, SpringConfig);
  }, [value, progress]);

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

// ── Section helpers ───────────────────────────────────────────────────────────
type OffsetOption = { label: string; value: 0 | 10 | 60 };
const OFFSET_OPTIONS: OffsetOption[] = [
  { label: 'At due time', value: 0 },
  { label: '10 min before', value: 10 },
  { label: '1 hour before', value: 60 },
];

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

  const { tasks, loadSampleData, clearCompleted, resetAll } = useTaskStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const inputRef = useRef<TextInput>(null);

  async function handleSaveName() {
    setSavingName(true);
    const trimmed = nameInput.trim() || 'Friend';
    await setUserName(trimmed);
    setSavingName(false);
    setEditingName(false);
  }

  async function handleLoadSamples() {
    await loadSampleData();
    showToast('Sample tasks loaded');
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  }

  function handleClearCompleted() {
    const count = tasks.filter((t) => t.completed).length;
    if (count === 0) {
      showToast('No completed tasks to clear');
      return;
    }
    Alert.alert('Clear completed', `Remove ${count} completed task${count === 1 ? '' : 's'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearCompleted();
          showToast('Completed tasks cleared');
        },
      },
    ]);
  }

  function handleResetAll() {
    Alert.alert(
      'Reset all data',
      'This will delete all tasks and reset the app. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            for (const t of tasks) {
              await cancelTaskNotification(t);
            }
            await resetAll();
            showToast('App reset');
          },
        },
      ],
    );
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
          {notificationsEnabled ? (
            <View style={styles.offsetSection}>
              <AppText variant="caption" color={Colors.textMuted} style={styles.remindLabel}>
                Remind me
              </AppText>
              <View style={styles.chipRow}>
                {OFFSET_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={reminderOffsetMin === opt.value}
                    onPress={() => setReminderOffset(opt.value)}
                    color={Colors.lime}
                  />
                ))}
              </View>
            </View>
          ) : (
            <AppText variant="caption" color={Colors.textFaint} style={styles.notifHint}>
              Enable to receive reminders for upcoming tasks
            </AppText>
          )}
          <AppText variant="caption" color={Colors.textFaint} style={styles.notifHint}>
            Reminders require a development build — silently skipped in Expo Go.
          </AppText>
        </Card>

        {/* Data */}
        <SectionLabel label="Data" />
        <Card>
          <TouchableOpacity
            style={styles.dataRow}
            onPress={handleLoadSamples}
            accessibilityLabel="Load sample tasks"
            accessibilityRole="button"
          >
            <AppText variant="label" color={Colors.text}>Load sample tasks</AppText>
            <AppText variant="caption" color={Colors.textFaint}>Add 10 demo tasks</AppText>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.dataRow}
            onPress={handleClearCompleted}
            accessibilityLabel="Clear completed tasks"
            accessibilityRole="button"
          >
            <AppText variant="label" color={Colors.text}>Clear completed tasks</AppText>
            <AppText variant="caption" color={Colors.textFaint}>
              {tasks.filter((t) => t.completed).length} completed
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
        <Card>
          <AppText variant="body" color={Colors.textMuted} style={styles.about}>
            Taskly v1.0 · Mobile Application Development mini project · Built with Expo + SQLite
          </AppText>
        </Card>

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
  offsetSection: {
    marginTop: 4,
  },
  remindLabel: {
    marginBottom: Spacing.s2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
  },
  notifHint: {
    marginTop: 4,
  },
  dataRow: {
    minHeight: 44,
    justifyContent: 'center',
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  about: {
    lineHeight: 20,
  },
});
