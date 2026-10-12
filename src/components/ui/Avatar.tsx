import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createAvatar } from '@dicebear/core';
import { create as createLorelei, meta as loreleiMeta, schema as loreleiSchema } from '@dicebear/lorelei';
import type { Options } from '@dicebear/lorelei';
import type { Style } from '@dicebear/core';
import { SvgXml } from 'react-native-svg';
import { Colors } from '@/theme/tokens';
import { logError } from '@/utils/logger';

const BRAND_BACKGROUNDS = ['d9ff3f', '8b7cff', '29c7e8', 'ff7aa8', 'ff9f6b'];
const LORELEI_STYLE: Style<Options> = {
  create: createLorelei,
  meta: loreleiMeta,
  schema: loreleiSchema,
};
const svgCache = new Map<string, string>();

interface AvatarProps {
  seed: string;
  size: number;
}

function getAvatarSvg(seed: string): string {
  const key = `lorelei:${seed}`;
  const cached = svgCache.get(key);
  if (cached) return cached;
  const svg = createAvatar(LORELEI_STYLE, {
    seed,
    backgroundColor: BRAND_BACKGROUNDS,
    backgroundType: ['solid'],
  }).toString();
  if (svgCache.size >= 100) svgCache.clear();
  svgCache.set(key, svg);
  return svg;
}

function AvatarComponent({ seed, size }: AvatarProps) {
  const svg = useMemo(() => {
    try {
      return getAvatarSvg(seed);
    } catch (error) {
      logError('Avatar.generate', error);
      return null;
    }
  }, [seed]);

  return (
    <View
      accessible
      accessibilityLabel="Profile avatar"
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {svg ? (
        <SvgXml xml={svg} width={size - 4} height={size - 4} />
      ) : (
        <View style={[styles.fallback, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}>
          <Feather name="user" size={Math.round(size * 0.46)} color={Colors.textMuted} />
        </View>
      )}
    </View>
  );
}

export const Avatar = memo(AvatarComponent);

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
});
