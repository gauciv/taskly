import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { haptic } from '@/utils/feedback';
import { logError } from '@/utils/logger';
import { router } from 'expo-router';
import { Task, TaskInput, Priority } from '@/types';
import { Colors, Spacing, Radii } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Button, type ButtonStatus } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { CategoryPicker } from './CategoryPicker';
import { PriorityPicker } from './PriorityPicker';
import { DueDatePicker } from './DueDatePicker';
import { useTaskStore } from '@/store/useTaskStore';
import { showToast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { getDueStatus } from '@/utils/dueStatus';

const TITLE_MAX = 80;
const TITLE_WARN = 70;

interface TaskFormProps {
  task?: Task;
  prefillCategoryId?: number | null;
  prefillDue?: number | null;
}

export function TaskForm({ task, prefillCategoryId, prefillDue }: TaskFormProps) {
  const isEdit = !!task;
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(
    task?.categoryId ?? prefillCategoryId ?? null
  );
  const [priority, setPriority] = useState<Priority>(task?.priority ?? Priority.Medium);
  const [dueAt, setDueAt] = useState<number | null>(task?.dueAt ?? prefillDue ?? null);
  const [dueHasTime, setDueHasTime] = useState(task?.dueHasTime ?? false);
  const [titleError, setTitleError] = useState('');
  const [saveStatus, setSaveStatus] = useState<ButtonStatus>('idle');
  // isPastDue stored as state, updated in handleDueChange (not at render time)
  const [isPastDue, setIsPastDue] = useState(false);
  // Track whether we've warned about past-due so haptic fires only once per change
  const pastDueWarnedRef = useRef(false);
  const titleRef = useRef<TextInput>(null);

  const titleShakeX = useSharedValue(0);
  const saveShakeX = useSharedValue(0);

  // Past-due warning: warn once when dueAt + hasTime is in the past
  // Computed lazily in handleDueChange to avoid impure render calls

  function shakeField(shakeVal: SharedValue<number>) {
    shakeVal.value = withSequence(
      withTiming(6,  { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6,  { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0,  { duration: 50 }),
    );
  }

  function handleDueChange(at: number | null, hasTime: boolean) {
    setDueAt(at);
    setDueHasTime(hasTime);
    // Fire past-due warning haptic once per new selection that is already past
    const nowMs = Date.now();
    const nowPastDue = getDueStatus({ dueAt: at, dueHasTime: hasTime, completed: false }, nowMs).kind === 'overdue';
    const wasPastDue = getDueStatus({ dueAt, dueHasTime, completed: false }, nowMs).kind === 'overdue';
    if (nowPastDue && !wasPastDue) {
      haptic.warning();
    }
    setIsPastDue(nowPastDue);
    pastDueWarnedRef.current = nowPastDue;
  }

  const titleShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: titleShakeX.value }],
  }));

  const saveShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: saveShakeX.value }],
  }));

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Title is required');
      haptic.error();
      shakeField(titleShakeX);
      titleRef.current?.focus();
      return;
    }
    if (trimmed.length > TITLE_MAX) {
      setTitleError('Max 80 characters');
      haptic.error();
      shakeField(titleShakeX);
      return;
    }
    setSaveStatus('loading');
    try {
      const input: TaskInput = {
        title: trimmed,
        notes: notes.trim(),
        categoryId,
        priority,
        dueAt,
        dueHasTime,
      };
      let succeeded = false;
      if (isEdit && task) {
        await updateTask(task.id, input);
        succeeded = true;
      } else {
        const id = await addTask(input);
        succeeded = id !== null;
      }

      if (succeeded) {
        setSaveStatus('success');
        haptic.success();
        showToast(isEdit ? 'Task updated' : 'Task added', { type: 'success' });
        // Give the success animation a moment before closing
        setTimeout(() => router.back(), 450);
      } else {
        // addTask returned null (error already reported inside store)
        setSaveStatus('error');
        haptic.error();
        shakeField(saveShakeX);
        setTimeout(() => setSaveStatus('idle'), 1500);
      }
    } catch (error) {
      logError('TaskForm.save', error);
      setSaveStatus('error');
      haptic.error();
      shakeField(saveShakeX);
      setTimeout(() => setSaveStatus('idle'), 1500);
    }
  }

  async function handleDelete() {
    if (!task) return;
    const ok = await confirm({
      title: 'Delete this task?',
      message: `"${task.title}" will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    haptic.medium();
    const snapshot = await deleteTask(task.id);
    router.back();
    if (snapshot) {
      showToast('Task deleted', {
        label: 'Undo',
        onPress: () => restoreTask(snapshot),
      });
    }
  }

  const titleLen = title.length;
  const counterColor = titleLen >= TITLE_MAX ? Colors.danger : titleLen >= TITLE_WARN ? Colors.warning : Colors.textFaint;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="x"
          onPress={() => router.back()}
          accessibilityLabel="Close"
        />
        <AppText variant="title">{isEdit ? 'Edit Task' : 'New Task'}</AppText>
        {isEdit ? (
          <IconButton
            icon="trash-2"
            onPress={handleDelete}
            accessibilityLabel="Delete task"
            color={Colors.danger}
          />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.section}>
          <Animated.View style={titleShakeStyle}>
            <TextInput
              ref={titleRef}
              style={[
                styles.titleInput,
                titleError ? styles.titleInputError : null,
              ]}
              placeholder="What needs to be done?"
              placeholderTextColor={Colors.textFaint}
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                setTitleError('');
              }}
              autoFocus={!isEdit}
              returnKeyType="next"
              maxLength={TITLE_MAX}
              accessibilityLabel="Task title"
            />
          </Animated.View>
          <View style={styles.titleMeta}>
            {titleError ? (
              <AppText variant="caption" color={Colors.danger} style={styles.fieldError}>
                {titleError}
              </AppText>
            ) : <View style={styles.fieldErrorPlaceholder} />}
            <AppText variant="caption" color={counterColor} style={styles.charCount}>
              {titleLen}/{TITLE_MAX}
            </AppText>
          </View>
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <AppText variant="label" color={Colors.textMuted} style={styles.label}>Category</AppText>
          <CategoryPicker selectedId={categoryId} onSelect={setCategoryId} />
        </View>

        {/* Priority */}
        <View style={styles.fieldGroup}>
          <AppText variant="label" color={Colors.textMuted} style={styles.label}>Priority</AppText>
          <PriorityPicker value={priority} onChange={setPriority} />
        </View>

        {/* Due date */}
        <View style={styles.fieldGroup}>
          <AppText variant="label" color={Colors.textMuted} style={styles.label}>Due date</AppText>
          <DueDatePicker dueAt={dueAt} dueHasTime={dueHasTime} onChange={handleDueChange} />
          {isPastDue && (
            <AppText variant="caption" color={Colors.warning} style={styles.pastDueHint}>
              This time has already passed
            </AppText>
          )}
        </View>

        {/* Notes */}
        <View style={[styles.fieldGroup, styles.notesGroup]}>
          <AppText variant="label" color={Colors.textMuted} style={styles.label}>Notes</AppText>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes..."
            placeholderTextColor={Colors.textFaint}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Task notes"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Save button */}
      <View style={styles.footer}>
        <Animated.View style={[styles.saveWrap, saveShakeStyle]}>
          <Button
            label={isEdit ? 'Save Changes' : 'Save Task'}
            onPress={handleSave}
            disabled={saveStatus === 'loading'}
            status={saveStatus}
            fullWidth
            size="lg"
          />
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.s4,
    paddingBottom: Spacing.s3,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  section: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.s4,
  },
  titleInput: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.text,
    borderBottomWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.s2,
  },
  titleInputError: {
    borderColor: Colors.danger,
  },
  titleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  fieldError: {},
  fieldErrorPlaceholder: { flex: 1 },
  charCount: {
    textAlign: 'right',
    flexShrink: 0,
  },
  pastDueHint: {
    marginTop: 6,
    paddingHorizontal: Spacing.screenH,
  },
  fieldGroup: {
    marginTop: Spacing.s5,
    gap: Spacing.s2,
  },
  label: {
    paddingHorizontal: Spacing.screenH,
    fontFamily: 'Poppins_600SemiBold',
  },
  notesGroup: {
    paddingHorizontal: Spacing.screenH,
  },
  notesInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    padding: Spacing.s3,
    color: Colors.text,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s4,
    borderTopWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  saveWrap: {
    width: '100%',
  },
});
