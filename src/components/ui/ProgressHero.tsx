import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radii, Spacing, Typography } from '@/theme/tokens';
import { AppText } from './AppText';
import type { WeeklyActivity, StreakResult } from '@/store/selectors';
import { achievementsHref } from '@/utils/routes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 84;
const RING_STROKE = 8;
const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CHART_HEIGHT = 56;
const MIN_BAR_HEIGHT = 4;

function ProgressRing({ done, total, reduceMotion }: { done: number; total: number; reduceMotion: boolean }) {
  const progress = useSharedValue(0);
  const freeDay = total === 0;
  const allDone = total > 0 && done >= total;
  const fraction = total === 0 ? 0 : Math.min(1, done / total);

  useEffect(() => {
    progress.value = reduceMotion
      ? fraction
      : withTiming(fraction, { duration: 650, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraction, reduceMotion]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));
  const ringColor = freeDay ? Colors.textFaint : allDone ? Colors.success : Colors.lime;

  return (
    <View style={styles.ringBox}>
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 84 84">
        <Circle cx={42} cy={42} r={RING_RADIUS} stroke={Colors.purple + '40'} strokeWidth={RING_STROKE} fill="none" />
        {!freeDay && (
          <AnimatedCircle
            cx={42}
            cy={42}
            r={RING_RADIUS}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={ringProps}
            strokeLinecap="round"
            rotation="-90"
            origin="42, 42"
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringLabel]}>
        {freeDay ? (
          <AppText variant="label" color={Colors.textFaint}>–</AppText>
        ) : allDone ? (
          <Feather name="check" size={28} color={Colors.success} />
        ) : (
          <AppText variant="title" color={Colors.text} style={styles.ringText}>{done}/{total}</AppText>
        )}
      </View>
    </View>
  );
}

function MiniBar({
  count,
  maxCount,
  isToday,
  index,
  label,
  reduceMotion,
  selected,
  onPress,
}: {
  count: number;
  maxCount: number;
  isToday: boolean;
  index: number;
  label: string;
  reduceMotion: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(0);
  const max = Math.max(maxCount, 3);
  const barHeight = count === 0 ? MIN_BAR_HEIGHT : Math.max(MIN_BAR_HEIGHT + 2, Math.round((count / max) * CHART_HEIGHT));

  useEffect(() => {
    progress.value = reduceMotion
      ? 1
      : withDelay(index * 40, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barHeight, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({ height: Math.max(1, barHeight * progress.value) }));
  const color = isToday ? Colors.lime : selected ? Colors.purple : Colors.purple + '73';

  return (
    <Pressable onPress={onPress} style={styles.barCol} accessibilityLabel={`${label}: ${count} completed`}>
      <Animated.View style={[styles.bar, barStyle, { backgroundColor: color }]} />
    </Pressable>
  );
}

interface Props {
  data: WeeklyActivity;
  streak: StreakResult;
  hasTasks: boolean;
}

export function ProgressHero({ data, streak, hasTasks }: Props) {
  const reduceMotion = !!useReducedMotion();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  if (!hasTasks) return null;

  const maxCount = Math.max(0, ...data.days.map((day) => day.count));
  const delta = data.total - data.previousTotal;
  const deltaLabel = delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : '–';
  const deltaColor = delta > 0 ? Colors.success : delta < 0 ? Colors.danger : Colors.textMuted;
  const selectedDay = selectedDayIdx === null ? null : data.days[selectedDayIdx];
  const weekday = selectedDay ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(selectedDay.dayMs).getDay()] : '';

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.left}>
          <ProgressRing done={data.todayDone} total={data.todayTotal} reduceMotion={reduceMotion} />
          <AppText
            variant="caption"
            color={data.todayTotal > 0 && data.todayDone >= data.todayTotal ? Colors.success : Colors.textMuted}
          >
            {data.todayTotal === 0 ? 'Free day' : data.todayDone >= data.todayTotal ? 'All done' : 'Today'}
          </AppText>
        </View>
        <View style={styles.divider} />
        <View style={styles.right}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <AppText variant="caption" color={Colors.textMuted}>This week</AppText>
              <View style={[styles.deltaPill, { backgroundColor: deltaColor + '22' }]}>
                <AppText variant="caption" color={deltaColor}>{deltaLabel}</AppText>
              </View>
            </View>
            {streak.current >= 1 && (
              <Pressable onPress={() => router.push(achievementsHref)} accessibilityLabel={`${streak.current} day streak`} style={styles.streakPill}>
                <Feather name="zap" size={11} color={Colors.lime} />
                <AppText variant="caption" color={Colors.lime}>{streak.current}</AppText>
              </Pressable>
            )}
          </View>
          <View style={styles.headlineRow}>
            <Animated.View key={selectedDay ? `day-${selectedDayIdx}` : 'total'} entering={FadeIn.duration(160)} style={styles.headlineInner}>
              <AppText variant="h1" color={Colors.text} style={styles.bigNum}>{selectedDay ? selectedDay.count : data.total}</AppText>
              <AppText variant="caption" color={Colors.textMuted}>{selectedDay ? `· ${weekday}` : 'completed'}</AppText>
            </Animated.View>
          </View>
          <View style={styles.chart}>
            {data.days.map((day, index) => (
              <MiniBar
                  key={day.dayMs}
                  count={day.count}
                  maxCount={maxCount}
                  isToday={index === data.days.length - 1}
                  index={index}
                  label={day.label}
                  reduceMotion={reduceMotion}
                  selected={selectedDayIdx === index}
                  onPress={() => setSelectedDayIdx((current) => current === index ? null : index)}
                />
            ))}
          </View>
          <View style={styles.labelsRow}>
            {data.days.map((day) => (
              <AppText key={`label-${day.dayMs}`} variant="caption" color={Colors.textFaint} style={styles.barLabel}>{day.label}</AppText>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: Spacing.screenH, marginBottom: Spacing.s6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s4,
    padding: Spacing.s4,
    minHeight: 148,
    flexShrink: 0,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  left: { width: 104, alignItems: 'center', justifyContent: 'center', gap: Spacing.s1, flexShrink: 0 },
  ringBox: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { alignItems: 'center', justifyContent: 'center' },
  ringText: { ...Typography.title, fontSize: 18, lineHeight: 24 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border },
  right: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s2, minWidth: 0 },
  deltaPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radii.chip },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.lime + '18', paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radii.chip },
  headlineRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.s2 },
  bigNum: { ...Typography.h1, fontSize: 32, lineHeight: 38 },
  chart: { height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, height: CHART_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', minHeight: MIN_BAR_HEIGHT, borderRadius: 8 },
  labelsRow: { flexDirection: 'row', gap: 6 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: '500' },
  headlineInner: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.s2 },
});
