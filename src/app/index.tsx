import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Taskly</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080A', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
});
