import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Colors, Spacing, Radii, tintedFill } from '@/theme/tokens';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { selectStreak } from '@/store/selectors';
import { ACHIEVEMENTS, type AchievementDef } from '@/services/achievements';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={pbarStyles.track}>
      <View style={[pbarStyles.fill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

const pbarStyles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ── Badge tile ────────────────────────────────────────────────────────────────
interface BadgeTileProps {
  def: AchievementDef;
  unlockedAt: number | undefined;
  progress?: number;
  max?: number;
  index: number;
}

function BadgeTile({ def, unlockedAt, progress, max, index }: BadgeTileProps) {
  const isUnlocked = unlockedAt !== undefined;
  const iconColor = isUnlocked ? def.color : Colors.textFaint;
  const bgColor = isUnlocked ? tintedFill(def.color) : Colors.surfaceAlt;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(220)}
      style={[styles.badgeTile, { opacity: isUnlocked ? 1 : 0.65 }]}
    >
      {/* Icon circle */}
      <View style={[styles.badgeIcon, { backgroundColor: bgColor, borderColor: isUnlocked ? def.color + '44' : Colors.border }]}>
        <Feather name={def.icon as FeatherIconName} size={26} color={iconColor} />
        {!isUnlocked && (
          <View style={styles.lockOverlay}>
            <Feather name="lock" size={11} color={Colors.textFaint} />
          </View>
        )}
      </View>

      <AppText variant="label" color={isUnlocked ? Colors.text : Colors.textMuted} style={styles.badgeTitle} numberOfLines={1}>
        {def.title}
      </AppText>
      <AppText variant="caption" color={Colors.textFaint} style={styles.badgeDesc} numberOfLines={2}>
        {def.description}
      </AppText>

      {isUnlocked ? (
        <AppText variant="caption" color={def.color} style={styles.badgeDate}>
          {format(new Date(unlockedAt), 'MMM d, yyyy')}
        </AppText>
      ) : progress !== undefined && max !== undefined ? (
        <>
          <AppText variant="caption" color={Colors.textFaint} style={styles.badgeDate}>
            {Math.min(progress, max)}/{max}
          </AppText>
          <ProgressBar progress={progress / max} color={def.color} />
        </>
      ) : null}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const achievements = useSettingsStore((s) => s.achievements);
  const achievementsUnlocked = useSettingsStore((s) => s.achievementsUnlocked);
  const tasks = useTaskStore((s) => s.tasks);

  const streak = useMemo(() => selectStreak(tasks, Date.now()), [tasks]);

  const badgeData = useMemo(() =>
    ACHIEVEMENTS.map((def) => {
      const unlockedAt = achievements[def.id];
      const { progress, max } = def.evaluate(tasks, Date.now());
      return { def, unlockedAt, progress, max };
    }),
    [achievements, tasks]
  );

  const total = ACHIEVEMENTS.length;
  const unlocked = achievementsUnlocked;
  const progressPct = unlocked / total;

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        />
        <AppText variant="h2" style={styles.headerTitle}>Achievements</AppText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Summary card */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <AppText variant="h2" color={Colors.text}>{unlocked} of {total}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>badges unlocked</AppText>
            </View>
            {/* Streak info */}
            <View style={styles.streakBlock}>
              <Pressable
                style={styles.streakPill}
                accessibilityLabel={`${streak.current} day streak`}
              >
                <Feather name="zap" size={14} color={Colors.lime} />
                <AppText variant="label" color={Colors.lime}>{streak.current}</AppText>
              </Pressable>
              <AppText variant="caption" color={Colors.textMuted}>current</AppText>
              <AppText variant="caption" color={Colors.textFaint}>best {streak.best}</AppText>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` as `${number}%` }]} />
          </View>
        </Animated.View>

        {/* Badge grid */}
        <View style={styles.grid}>
          {badgeData.map((item, i) => (
            <BadgeTile
              key={item.def.id}
              def={item.def}
              unlockedAt={item.unlockedAt}
              progress={item.progress}
              max={item.max}
              index={i}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s3,
    gap: Spacing.s2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.s3,
  },
  summaryCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.s5,
    gap: Spacing.s3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakBlock: {
    alignItems: 'center',
    gap: 2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lime + '18',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.chip,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.lime,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s3,
  },
  badgeTile: {
    width: '47%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 6,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },
  badgeDesc: {
    textAlign: 'center',
    lineHeight: 16,
  },
  badgeDate: {
    textAlign: 'center',
    marginTop: 2,
  },
});
