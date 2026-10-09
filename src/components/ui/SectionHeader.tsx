import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  onSeeMore?: () => void;
}

export function SectionHeader({ title, onSeeMore }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="h2" color={Colors.text}>
        {title}
      </AppText>
      {onSeeMore && (
        <TouchableOpacity onPress={onSeeMore} hitSlop={8}>
          <AppText variant="label" color={Colors.textMuted}>
            See More
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    marginBottom: Spacing.s3,
  },
});
