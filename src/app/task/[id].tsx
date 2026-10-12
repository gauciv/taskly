import { useLocalSearchParams, router } from 'expo-router';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Colors, Spacing, Radii, tintedFill, withAlpha } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { confirm } from '@/components/ui/ConfirmDialog';
import { taskEditHref } from '@/utils/routes';
import { formatDueTime, formatSpan, getDueStatus } from '@/utils/dueStatus';
import { haptic } from '@/utils/feedback';
import { Priority, Task } from '@/types';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

function getReminderLabel(offsetMin: number): string {
  if (offsetMin === 0) return 'At due time';
  if (offsetMin === 10) return '10 minutes before';
  return '1 hour before';
}

function relativeActivity(timestamp: number, now: number): string {
  const diff = now - timestamp;
  return diff < 60_000 ? 'Just now' : `${formatSpan(diff)} ago`;
}

function ActivityEntry({
  icon,
  color,
  title,
  timestamp,
  now,
  last,
}: {
  icon: FeatherIconName;
  color: string;
  title: string;
  timestamp: number;
  now: number;
  last: boolean;
}) {
  return (
    <View style={styles.activityEntry}>
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: color }]} />
        {!last && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityTitleRow}>
          <Feather name={icon} size={14} color={color} />
          <AppText variant="label" color={Colors.text}>{title}</AppText>
        </View>
        <AppText variant="caption" color={Colors.textMuted}>
          {format(new Date(timestamp), 'EEE, MMM d · h:mm a')} · {relativeActivity(timestamp, now)}
        </AppText>
      </View>
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
  color = Colors.textMuted,
}: {
  icon: FeatherIconName;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeading}>
        <Feather name={icon} size={18} color={color} />
        <AppText variant="caption" color={Colors.textMuted}>{label}</AppText>
      </View>
      <AppText variant="label" color={Colors.text} style={styles.infoValue}>{value}</AppText>
    </View>
  );
}

function StatusChip({ task, status }: { task: Task; status: ReturnType<typeof getDueStatus> }) {
  const icon: FeatherIconName = task.completed ? 'check-circle'
    : status.kind === 'overdue' ? 'alert-circle'
      : status.kind === 'today' ? 'clock'
        : status.kind === 'upcoming' ? 'calendar'
          : 'minus-circle';
  return (
    <View style={[styles.chip, { backgroundColor: tintedFill(status.tone), borderColor: withAlpha(status.tone, 0.34) }]}>
      <Feather name={icon} size={13} color={status.tone} />
      <AppText variant="caption" color={status.tone}>{status.label}</AppText>
    </View>
  );
}

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const task = useTaskStore((s) => s.tasks.find((entry) => entry.id === Number(id)));
  const categories = useTaskStore((s) => s.categories);
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const reminderOffsetMin = useSettingsStore((s) => s.reminderOffsetMin);

  if (!task) {
    return (
      <View style={styles.notFound}>
        <View style={styles.notFoundIcon}><Feather name="inbox" size={28} color={Colors.textMuted} /></View>
        <AppText variant="title" color={Colors.textMuted}>This task no longer exists</AppText>
        <Button label="Go back" onPress={() => router.back()} variant="ghost" style={styles.backButton} />
      </View>
    );
  }

  const t = task;
  const category = t.categoryId !== null ? categories.find((entry) => entry.id === t.categoryId) : undefined;
  const status = getDueStatus(t);
  const accent = t.completed ? Colors.success : (category?.color ?? Colors.textMuted);
  const priorityLabel = t.priority === Priority.High ? 'High'
    : t.priority === Priority.Medium ? 'Medium' : 'Low';
  const priorityColor = t.priority === Priority.High ? Colors.danger
    : t.priority === Priority.Medium ? Colors.warning : Colors.success;
  const reminderLabel = !t.dueAt || !notificationsEnabled ? 'Off' : getReminderLabel(reminderOffsetMin);
  const reminderReason = !t.dueAt ? 'No due date' : !notificationsEnabled ? 'Notifications are disabled' : null;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const events = [
    { key: 'created', icon: 'plus-circle' as const, color: Colors.purple, title: 'Created', time: t.createdAt },
    ...(t.updatedAt - t.createdAt > 60_000 ? [{ key: 'updated', icon: 'edit-2' as const, color: Colors.textMuted, title: 'Updated', time: t.updatedAt }] : []),
    ...(t.completed && t.completedAt !== null ? [{ key: 'completed', icon: 'check-circle' as const, color: Colors.success, title: 'Completed', time: t.completedAt }] : []),
  ];

  function handleToggle() {
    void toggleComplete(t.id);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete this task?',
      message: `"${t.title}" will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    haptic.medium();
    const snapshot = await deleteTask(t.id);
    if (snapshot) router.back();
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.s2 }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Back" />
        <AppText variant="title">Task Details</AppText>
        <IconButton icon="edit-2" onPress={() => router.push(taskEditHref(t.id))} accessibilityLabel="Edit task" />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View entering={FadeIn.duration(200)} style={[styles.heroCard, { backgroundColor: withAlpha(accent, 0.16), borderColor: withAlpha(accent, 0.4) }]}>
          <View style={styles.heroTop}>
            <View style={[styles.categoryPill, { backgroundColor: withAlpha(accent, 0.14), borderColor: withAlpha(accent, 0.3) }]}>
              {category ? <Feather name={category.icon as FeatherIconName} size={13} color={accent} /> : <Feather name="tag" size={13} color={accent} />}
              <AppText variant="caption" color={accent}>{category?.name ?? 'Uncategorized'}</AppText>
            </View>
            {t.completed && (
              <View style={styles.completedBadge}>
                <Feather name="check" size={13} color={Colors.success} />
                <AppText variant="caption" color={Colors.success}>Completed</AppText>
              </View>
            )}
          </View>
          <AppText variant="h2" selectable style={[styles.title, t.completed && styles.titleCompleted]}>{t.title}</AppText>
          <View style={styles.chipRow}>
            <StatusChip task={t} status={status} />
            <View style={[styles.chip, { backgroundColor: tintedFill(priorityColor), borderColor: withAlpha(priorityColor, 0.34) }]}>
              <Feather name="flag" size={13} color={priorityColor} />
              <AppText variant="caption" color={priorityColor}>{priorityLabel} priority</AppText>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(220)} style={[styles.dueCard, status.kind === 'overdue' && styles.overdueDueCard, t.completed && styles.completedDueCard]}>
          <View style={[styles.dueAccent, { backgroundColor: t.completed ? Colors.success : status.kind === 'overdue' ? Colors.danger : accent }]} />
          <View style={styles.dueMain}>
            <View style={styles.dueLeft}>
              <AppText variant="title" color={Colors.text}>{t.dueAt !== null ? format(new Date(t.dueAt), 'EEE, MMM d') : 'No due date'}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>{t.dueAt !== null ? formatDueTime(t) : 'Set a due date when editing'}</AppText>
            </View>
            <AppText variant="label" color={status.tone} style={styles.dueDetail}>{status.detail}</AppText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.infoRow}>
          <InfoCard icon="flag" label="Priority" value={priorityLabel} color={priorityColor} />
          <InfoCard icon={category?.icon as FeatherIconName ?? 'tag'} label="Category" value={category?.name ?? 'Uncategorized'} color={category?.color ?? Colors.textMuted} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(220)} style={[styles.card, styles.reminderRow]}>
          <Feather name="bell" size={18} color={reminderReason ? Colors.textMuted : Colors.lime} />
          <View style={styles.reminderText}>
            <AppText variant="caption" color={Colors.textMuted}>Reminder</AppText>
            <AppText variant="label" color={reminderReason ? Colors.textMuted : Colors.text}>{reminderLabel}</AppText>
          </View>
          {reminderReason && <AppText variant="caption" color={Colors.textFaint} style={styles.reason}>{reminderReason}</AppText>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(220)} style={styles.card}>
          <AppText variant="label" color={Colors.textMuted}>Notes</AppText>
          {t.notes ? <AppText variant="body" color={Colors.text} selectable style={styles.notesText}>{t.notes}</AppText> : <AppText variant="body" color={Colors.textFaint} style={styles.notesEmpty}>No notes added</AppText>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(220)} style={[styles.card, styles.activityCard]}>
          <AppText variant="label" color={Colors.textMuted}>Activity</AppText>
          <View style={styles.timeline}>
            {events.map((event, index) => (
              <ActivityEntry key={event.key} icon={event.icon} color={event.color} title={event.title} timestamp={event.time} now={now} last={index === events.length - 1} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.s4 }]}>
        <IconButton icon="trash-2" onPress={handleDelete} accessibilityLabel="Delete task" color={Colors.danger} bgColor={Colors.surface} buttonSize={52} borderColor={Colors.danger} borderWidth={1} />
        <Button
          label={t.completed ? 'Mark as not completed' : 'Mark as completed'}
          variant={t.completed ? 'secondary' : 'primary'}
          onPress={handleToggle}
          size="lg"
          fullWidth
          haptic={false}
          style={styles.completeButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  notFound: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.s8, gap: Spacing.s3 },
  notFoundIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.s2 },
  backButton: { marginTop: Spacing.s2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.screenH, paddingBottom: Spacing.s3, borderBottomWidth: 1, borderColor: Colors.border },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: Spacing.s4, paddingBottom: Spacing.s6, gap: Spacing.s3 },
  heroCard: { borderRadius: Radii.card, padding: Spacing.s5, borderWidth: 1, gap: Spacing.s3 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.s2 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.chip, borderWidth: 1, maxWidth: '75%' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: withAlpha(Colors.success, 0.14), paddingHorizontal: 9, paddingVertical: 6, borderRadius: Radii.chip },
  title: { fontSize: 22, lineHeight: 30 },
  titleCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.chip, borderWidth: 1 },
  dueCard: { minHeight: 88, flexDirection: 'row', overflow: 'hidden', backgroundColor: Colors.surfaceAlt, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  overdueDueCard: { backgroundColor: withAlpha(Colors.danger, 0.1), borderColor: withAlpha(Colors.danger, 0.35) },
  completedDueCard: { backgroundColor: withAlpha(Colors.success, 0.1), borderColor: withAlpha(Colors.success, 0.35) },
  dueAccent: { width: 3 },
  dueMain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.s3, padding: Spacing.s4 },
  dueLeft: { flex: 1, gap: 4 },
  dueDetail: { flex: 1, textAlign: 'right' },
  infoRow: { flexDirection: 'row', gap: Spacing.s3 },
  infoCard: { flex: 1, minHeight: 92, backgroundColor: Colors.surfaceAlt, borderRadius: Radii.input, borderWidth: 1, borderColor: Colors.border, padding: Spacing.s3, justifyContent: 'space-between', gap: Spacing.s2 },
  infoHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoValue: { flexShrink: 1 },
  card: { backgroundColor: Colors.surfaceAlt, borderRadius: Radii.input, borderWidth: 1, borderColor: Colors.border, padding: Spacing.s4, gap: Spacing.s2 },
  reminderRow: { flexDirection: 'row', alignItems: 'center' },
  reminderText: { flex: 1, gap: 2 },
  reason: { textAlign: 'right', maxWidth: 115 },
  notesText: { lineHeight: 22 },
  notesEmpty: { fontStyle: 'italic' },
  activityCard: { gap: Spacing.s4 },
  timeline: { gap: Spacing.s2 },
  activityEntry: { minHeight: 48, flexDirection: 'row', gap: Spacing.s3 },
  timelineCol: { width: 16, alignItems: 'center' },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  timelineLine: { flex: 1, width: 1, backgroundColor: Colors.border, marginTop: 3 },
  activityContent: { flex: 1, gap: 2, paddingBottom: Spacing.s2 },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3, paddingHorizontal: Spacing.s4, paddingTop: Spacing.s4, borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg },
  completeButton: { flex: 1 },
});
