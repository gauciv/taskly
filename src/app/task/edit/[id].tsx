import { useLocalSearchParams, router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/theme/tokens';
import { TaskForm } from '@/components/task/TaskForm';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTaskStore } from '@/store/useTaskStore';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === Number(id)));

  if (!task) {
    return (
      <View style={styles.notFound}>
        <AppText variant="title" color={Colors.textMuted}>Task not found</AppText>
        <Button label="Go back" onPress={() => router.back()} variant="ghost" style={styles.btn} />
      </View>
    );
  }

  return <TaskForm task={task} />;
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s3,
  },
  btn: { marginTop: Spacing.s2 },
});
