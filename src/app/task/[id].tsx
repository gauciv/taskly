import { useLocalSearchParams, router } from 'expo-router';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { showToast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { taskEditHref } from '@/utils/routes';
import { getDueStatus } from '@/utils/dueStatus';
import { haptic } from '@/utils/feedback';
import { Priority } from '@/types';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

function getReminderLabel(offsetMs: number): string {
  if (offsetMs === 0) return 'At due time';
  const min = offsetMs / 60000;
  if (min < 60) return `${min} minutes before`;
  return `${Math.round(min / 60)} hour before`;
}


export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const task = useTaskStore((s) => s.tasks.find((t) => t.id === Number(id)));
  const categories = useTaskStore((s) => s.categories);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const reminderOffsetMin = useSettingsStore((s) => s.reminderOffsetMin);

  if (!task) {
    return (
      <View style={styles.notFound}>
        <AppText variant="title" color={Colors.textMuted}>This task no longer exists</AppText>
        <Button label="Go back" onPress={() => router.back()} variant="ghost" style={styles.btn} />
      </View>
    );
  }

  // Narrowed reference — TS needs this to see `task` as non-undefined inside async callbacks
  const t = task;
  const category = t.categoryId ? categories.find((c) => c.id === t.categoryId) : undefined;
  const status = getDueStatus(t);
  const catColor = category?.color ?? Colors.purple;

  async function handleToggle() {
    haptic.light();
    toggleComplete(t.id);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete this task?',
      message: `"${t.title}" will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    haptic.medium();    const snapshot = await deleteTask(t.id);
    router.back();
    if (snapshot) {
      showToast('Task deleted', { label: 'Undo', onPress: () => restoreTask(snapshot) });
    }
  }

  const reminderLabel = (() => {
    if (!notificationsEnabled || !t.dueAt) return 'Off';
    return getReminderLabel(reminderOffsetMin * 60000);
  })();

  const priorityLabel = t.priority === Priority.High ? 'High'
    : t.priority === Priority.Medium ? 'Medium' : 'Low';
  const priorityColor = t.priority === Priority.High ? Colors.danger
    : t.priority === Priority.Medium ? Colors.warning : Colors.success;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.s2 }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Back" />
        <AppText variant="title">Task Details</AppText>
        <IconButton
          icon="edit-2"
          onPress={() => router.push(taskEditHref(t.id))}
          accessibilityLabel="Edit task"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Hero card */}
        <Animated.View
          entering={FadeInDown.duration(220)}
          style={[styles.heroCard, {
            backgroundColor: tintedFill(catColor),
            borderColor: catColor + '44',
          }]}
        >
          {/* Category pill */}
          <View style={[styles.catPill, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
            {category?.icon && (
              <Feather name={category.icon as FeatherIconName} size={13} color={catColor} />
            )}
            <AppText variant="caption" color={catColor}>
              {category?.name ?? 'Uncategorized'}
            </AppText>
          </View>

          {/* Title */}
          <AppText variant="h2" style={styles.heroTitle} selectable>
            {t.title}
          </AppText>

          {/* Status chips row */}
          <View style={styles.chipsRow}>
            <View style={[styles.statusChip, { backgroundColor: status.tone + '22', borderColor: status.tone + '55' }]}>
              <AppText variant="caption" color={status.tone}>{status.label}</AppText>
            </View>
            <PriorityBadge priority={t.priority} />
          </View>
        </Animated.View>

        {/* Primary action */}
        <Animated.View entering={FadeInDown.delay(40).duration(220)} style={styles.actionRow}>
          <Button
            label={t.completed ? 'Mark as not completed' : 'Mark as completed'}
            variant={t.completed ? 'secondary' : 'primary'}
            onPress={handleToggle}
            fullWidth
          />
        </Animated.View>

        {/* Info grid */}
        <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.infoGrid}>
          {/* Due */}
          <View style={styles.infoCard}>
            <Feather name="calendar" size={16} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textMuted}>Due</AppText>
            {t.dueAt ? (
              <>
                <AppText variant="label" color={Colors.text} style={styles.infoValue}>
                  {t.dueHasTime
                    ? format(new Date(t.dueAt), 'EEE, MMM d · h:mm a')
                    : format(new Date(t.dueAt), 'EEE, MMM d')}
                </AppText>
                <AppText variant="caption" color={Colors.textFaint}>
                  {status.detail}
                </AppText>
              </>
            ) : (
              <AppText variant="label" color={Colors.textFaint}>No due date</AppText>
            )}
          </View>

          {/* Reminder */}
          <View style={styles.infoCard}>
            <Feather name="bell" size={16} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textMuted}>Reminder</AppText>
            <AppText variant="label" color={Colors.text} style={styles.infoValue}>
              {reminderLabel}
            </AppText>
          </View>

          {/* Priority */}
          <View style={styles.infoCard}>
            <Feather name="flag" size={16} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textMuted}>Priority</AppText>
            <View style={styles.priorityRow}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <AppText variant="label" color={Colors.text}>{priorityLabel}</AppText>
            </View>
          </View>

          {/* Category */}
          <View style={styles.infoCard}>
            <Feather name="tag" size={16} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textMuted}>Category</AppText>
            <AppText variant="label" color={Colors.text} style={styles.infoValue}>
              {category?.name ?? 'Uncategorized'}
            </AppText>
          </View>

          {/* Created */}
          <View style={styles.infoCard}>
            <Feather name="clock" size={16} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textMuted}>Created</AppText>
            <AppText variant="label" color={Colors.text} style={styles.infoValue}>
              {format(new Date(t.createdAt), 'MMM d, yyyy · h:mm a')}
            </AppText>
          </View>

          {/* Completed at */}
          {t.completed && t.completedAt && (
            <View style={styles.infoCard}>
              <Feather name="check-circle" size={16} color={Colors.success} />
              <AppText variant="caption" color={Colors.textMuted}>Completed</AppText>
              <AppText variant="label" color={Colors.text} style={styles.infoValue}>
                {format(new Date(t.completedAt), 'MMM d, yyyy · h:mm a')}
              </AppText>
            </View>
          )}
        </Animated.View>

        {/* Notes */}
        <Animated.View entering={FadeInDown.delay(120).duration(220)} style={styles.notesCard}>
          <AppText variant="label" color={Colors.textMuted} style={styles.notesLabel}>Notes</AppText>
          {t.notes ? (
            <AppText variant="body" color={Colors.text} selectable style={styles.notesText}>
              {t.notes}
            </AppText>
          ) : (
            <AppText variant="body" color={Colors.textFaint} style={styles.notesEmpty}>
              No notes added
            </AppText>
          )}
        </Animated.View>

        {/* Delete */}
        <Animated.View entering={FadeInDown.delay(160).duration(220)} style={styles.deleteRow}>
          <Button
            label="Delete task"
            variant="danger"
            onPress={handleDelete}
            fullWidth
          />
        </Animated.View>

        <View style={{ height: 32 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  notFound: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s3,
  },
  btn: { marginTop: Spacing.s2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingBottom: Spacing.s3,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  scroll: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.s4,
  },
  heroCard: {
    borderRadius: Radii.card,
    padding: Spacing.s5,
    borderWidth: 1,
    gap: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.chip,
    borderWidth: 1,
  },
  heroTitle: {
    lineHeight: 30,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.s2,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.chip,
    borderWidth: 1,
  },
  actionRow: {
    marginBottom: Spacing.s4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s3,
    marginBottom: Spacing.s4,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    padding: Spacing.s3,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoValue: {
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notesCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.s4,
    gap: Spacing.s2,
  },
  notesLabel: {
    fontFamily: 'Poppins_600SemiBold',
  },
  notesText: {
    lineHeight: 22,
  },
  notesEmpty: {
    fontStyle: 'italic',
  },
  deleteRow: {
    marginBottom: Spacing.s4,
  },
});
