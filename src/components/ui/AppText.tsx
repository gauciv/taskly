import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/theme/tokens';

type Variant = 'h1' | 'h2' | 'title' | 'body' | 'label' | 'caption';

const fontMap: Record<Variant, string> = {
  h1: 'Poppins_700Bold',
  h2: 'Poppins_600SemiBold',
  title: 'Poppins_600SemiBold',
  body: 'Poppins_400Regular',
  label: 'Poppins_500Medium',
  caption: 'Poppins_500Medium',
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({ variant = 'body', color, style, ...props }: AppTextProps) {
  const base = Typography[variant];
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={[
        styles.base,
        { ...base, fontFamily: fontMap[variant] },
        color ? { color } : undefined,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: Colors.text,
  },
});
