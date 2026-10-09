import { useLocalSearchParams } from 'expo-router';
import { TaskForm } from '@/components/task/TaskForm';

export default function NewTaskScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; due?: string }>();
  const prefillCategoryId = params.categoryId ? Number(params.categoryId) : null;
  const prefillDue = params.due ? Number(params.due) : null;

  return (
    <TaskForm
      prefillCategoryId={prefillCategoryId}
      prefillDue={prefillDue}
    />
  );
}
