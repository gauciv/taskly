import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/tokens';

export default function EditTask() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Edit Task</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  t: { color: Colors.text },
});
