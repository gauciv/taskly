import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

interface ErrorScreenProps {
  message?: string;
  detail?: string; // shown only in __DEV__
  onRetry?: () => void;
  onReset?: () => void;
}

export function ErrorScreen({ message, detail, onRetry, onReset }: ErrorScreenProps) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon tile */}
        <View style={[styles.iconTile, { backgroundColor: tintedFill(Colors.danger) }]}>
          <Feather name="alert-triangle" size={36} color={Colors.danger} />
        </View>

        <AppText variant="h2" style={styles.title}>Something went wrong</AppText>
        <AppText variant="body" color={Colors.textMuted} style={styles.subtitle}>
          {message ?? 'The app encountered an unexpected error.'}
        </AppText>

        {__DEV__ && !!detail && (
          <View style={styles.devBox}>
            <AppText variant="caption" color={Colors.textFaint} style={styles.devText}>
              {detail}
            </AppText>
          </View>
        )}

        {onRetry && (
          <Button
            label="Try again"
            onPress={onRetry}
            fullWidth
            style={styles.btn}
          />
        )}
        {onReset && (
          <Button
            label="Reset app data"
            variant="danger"
            onPress={onReset}
            fullWidth
            style={styles.btn}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s8,
    gap: Spacing.s3,
  },
  iconTile: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s2,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  devBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    padding: Spacing.s3,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    marginTop: Spacing.s2,
  },
  devText: {
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
  btn: {
    marginTop: Spacing.s2,
  },
});
