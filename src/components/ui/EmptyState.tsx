import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, TabBar } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface EmptyStateProps {
  icon?: FeatherIconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCluster}>
        <View style={styles.iconBg}>
          <Feather name={icon} size={36} color={Colors.textFaint} />
        </View>
        <View style={[styles.iconDot, styles.dot1]}>
          <Feather name="star" size={12} color={Colors.lime} />
        </View>
        <View style={[styles.iconDot, styles.dot2]}>
          <Feather name="circle" size={8} color={Colors.purple} />
        </View>
      </View>
      <AppText variant="h2" color={Colors.text} style={styles.title}>{title}</AppText>
      {subtitle ? <AppText variant="body" color={Colors.textMuted} style={styles.subtitle}>{subtitle}</AppText> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.s8,
    paddingBottom: TabBar.height + Spacing.s6,
  },
  iconCluster: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s6,
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot1: { top: 2, right: 2 },
  dot2: { bottom: 4, left: 2 },
  title: { textAlign: 'center', lineHeight: 28 },
  subtitle: { marginTop: Spacing.s2, maxWidth: 280, textAlign: 'center', lineHeight: 20 },
  action: { alignSelf: 'center', minWidth: 200, marginTop: Spacing.s6 },
});
