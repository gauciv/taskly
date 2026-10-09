import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/theme/tokens';

interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scroll?: boolean;
}

export function Screen({ children, style, edges = ['top', 'left', 'right'] }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      <StatusBar style="light" />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
