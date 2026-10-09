// Design tokens — single source of truth for all colors, typography, spacing, and shape
export const Colors = {
  bg: '#08080A',
  surface: '#131316',
  surfaceAlt: '#1B1B1F',
  surfaceHigh: '#25252A',
  border: '#2A2A30',

  text: '#FFFFFF',
  textMuted: '#9A9AA3',
  textFaint: '#62626B',

  lime: '#D9FF3F',
  purple: '#8B7CFF',
  cyan: '#29C7E8',
  pink: '#FF7AA8',
  orange: '#FF9F6B',

  success: '#5BD98C',
  warning: '#FFC24B',
  danger: '#FF5C5C',
  onAccent: '#0B0B0D',

  priority: {
    low: '#5BD98C',
    medium: '#FFC24B',
    high: '#FF5C5C',
  },
} as const;

// Tinted fill: accent at ~18% opacity
export function tintedFill(hex: string): string {
  return hex + '2E';
}

export const Typography = {
  h1: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export const Spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 28,
  s8: 32,
  screenH: 20,  // horizontal screen padding
  sectionGap: 24,
} as const;

export const Radii = {
  card: 24,
  taskCard: 20,
  chip: 999,
  input: 16,
  tabBar: 28,
} as const;

export const TabBar = {
  height: 72,
  topRadius: 28,
} as const;

export const SpringConfig = {
  damping: 18,
  stiffness: 220,
  mass: 0.9,
} as const;

export const TouchTarget = 44;
