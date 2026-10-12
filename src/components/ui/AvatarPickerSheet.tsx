import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { AppText } from './AppText';
import { Button } from './Button';
import { haptic } from '@/utils/feedback';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';
import { Colors, Radii, Spacing, withAlpha } from '@/theme/tokens';

const CURATED_SEEDS = [
  'Sunny', 'Pixel', 'Maple', 'Comet', 'Bubbles', 'Ninja',
  'Waffle', 'Echo', 'Mochi', 'Zephyr', 'Clover', 'Orbit',
];

interface AvatarPickerSheetProps {
  initialSeed: string;
  onClose: () => void;
  onSave: (seed: string) => Promise<void>;
}

function createRandomSeed(): string {
  return `Shuffle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AvatarPickerSheet({ initialSeed, onClose, onSave }: AvatarPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotionPrefs();
  const [seed, setSeed] = useState(initialSeed);
  const [saving, setSaving] = useState(false);
  const translateY = useSharedValue(640);
  const backdropOpacity = useSharedValue(0);
  const closing = useRef(false);

  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 22, stiffness: 260 });
    backdropOpacity.value = withTiming(1, { duration: reduceMotion ? 100 : 180 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  function close() {
    if (closing.current || saving) return;
    closing.current = true;
    // Reanimated SharedValues intentionally change in response to this user action.
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(640, { duration: reduceMotion ? 100 : 180 });
    // eslint-disable-next-line react-hooks/immutability
    backdropOpacity.value = withTiming(0, { duration: reduceMotion ? 100 : 180 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }

  async function save() {
    setSaving(true);
    haptic.selection();
    try {
      await onSave(seed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      transparent
      animationType="none"
      visible
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.s4 }, sheetStyle]}>
          <View style={styles.handle} />
          <View style={styles.headingRow}>
            <AppText variant="title">Choose your avatar</AppText>
            <Pressable onPress={close} hitSlop={8} accessibilityLabel="Close avatar picker">
              <Feather name="x" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Avatar seed={seed} size={96} />
            <Pressable
              style={styles.shuffleButton}
              onPress={() => {
                haptic.selection();
                setSeed(createRandomSeed());
              }}
              accessibilityRole="button"
              accessibilityLabel="Shuffle avatar"
            >
              <Feather name="shuffle" size={15} color={Colors.text} />
              <AppText variant="label" color={Colors.text}>Shuffle</AppText>
            </Pressable>
            <View style={styles.seedGrid}>
              {CURATED_SEEDS.map((curatedSeed) => {
                const selected = seed === curatedSeed;
                return (
                  <Pressable
                    key={curatedSeed}
                    style={[styles.seedTile, selected && styles.seedTileSelected]}
                    onPress={() => {
                      haptic.selection();
                      setSeed(curatedSeed);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Choose ${curatedSeed} avatar`}
                  >
                    <Avatar seed={curatedSeed} size={36} />
                    <AppText variant="caption" color={selected ? Colors.lime : Colors.textMuted} style={styles.seedText}>
                      {curatedSeed}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Button label="Save" fullWidth loading={saving} onPress={save} haptic={false} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(Colors.bg, 0.66),
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: Spacing.s3,
    paddingHorizontal: Spacing.s4,
    gap: Spacing.s3,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textFaint,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: Spacing.s3,
    paddingBottom: Spacing.s2,
  },
  shuffleButton: {
    minHeight: 44,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.s4,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  seedGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.s2,
  },
  seedTile: {
    width: '24%',
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    backgroundColor: Colors.surfaceAlt,
  },
  seedTileSelected: {
    borderColor: Colors.lime,
  },
  seedText: {
    fontSize: 10,
    lineHeight: 13,
  },
});
