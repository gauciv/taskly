import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { haptic } from '@/utils/feedback';
import { router } from 'expo-router';
import { Task, TaskInput, Priority } from '@/types';
import { Colors, Spacing, Radii } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { CategoryPicker } from './CategoryPicker';
import { PriorityPicker } from './PriorityPicker';
import { DueDatePicker } from './DueDatePicker';
import { useTaskStore } from '@/store/useTaskStore';
import { showToast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';

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
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<TextInput>(null);

  function handleDueChange(at: number | null, hasTime: boolean) {
    setDueAt(at);
    setDueHasTime(hasTime);
  }

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Title is required');
      titleRef.current?.focus();
      return;
    }
    if (trimmed.length > 80) {
      setTitleError('Max 80 characters');
      return;
    }
    setSaving(true);
    try {
      const input: TaskInput = {
        title: trimmed,
        notes: notes.trim(),
        categoryId,
        priority,
        dueAt,
        dueHasTime,
      };
      if (isEdit && task) {
        await updateTask(task.id, input);
        showToast('Task updated');
      } else {
        await addTask(input);
        showToast('Task added');
      }
      haptic.success();
      router.back();
    } finally {
      setSaving(false);
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
          <TextInput
            ref={titleRef}
            style={[styles.titleInput, titleError ? styles.titleInputError : null]}
            placeholder="What needs to be done?"
            placeholderTextColor={Colors.textFaint}
            value={title}
            onChangeText={(v) => { setTitle(v); setTitleError(''); }}
            autoFocus={!isEdit}
            returnKeyType="next"
            maxLength={80}
            accessibilityLabel="Task title"
          />
          {titleError ? (
            <AppText variant="caption" color={Colors.danger} style={styles.fieldError}>
              {titleError}
            </AppText>
          ) : null}
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
        <Button
          label={isEdit ? 'Save Changes' : 'Save Task'}
          onPress={handleSave}
          disabled={!title.trim()}
          loading={saving}
          fullWidth
          size="lg"
        />
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
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.s2,
  },
  titleInputError: {
    borderColor: Colors.danger,
  },
  fieldError: {
    marginTop: 4,
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
});
