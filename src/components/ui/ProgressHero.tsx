import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
  SharedValue,
  useReducedMotion,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radii, Typography } from '@/theme/tokens';
import { AppText } from './AppText';
import type { WeeklyActivity } from '@/store/selectors';
import type { StreakResult } from '@/store/selectors';
import { achievementsHref } from '@/utils/routes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 84;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const BAR_MAX_HEIGHT = 56;
const BAR_MIN_STUB = 4;

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({
  done,
  total,
  reducedMotion,
}: {
  done: number;
  total: number;
  reducedMotion: boolean;
}) {
  const progress = useSharedValue(0);
  const allDone = total > 0 && done >= total;
  const isFreeDay = total === 0;
  const pct = total === 0 ? 0 : Math.min(1, done / total);

  useEffect(() => {
    const target = pct;
    if (reducedMotion) {
      progress.value = target;
    } else {
      progress.value = withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  const ringColor = allDone ? Colors.success : Colors.lime;
  const trackColor = Colors.purple + '40';

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={trackColor}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {!isFreeDay && (
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        )}
      </Svg>
      <View style={styles.ringCenter}>
        {isFreeDay ? (
          <AppText variant="label" color={Colors.textFaint} style={styles.ringDash}>–</AppText>
        ) : allDone ? (
          <Feather name="check" size={22} color={Colors.success} />
        ) : (
          <AppText variant="title" color={Colors.text} style={styles.ringText}>
            {done}/{total}
          </AppText>
        )}
      </View>
    </View>
  );
}

// ── Mini Bar ──────────────────────────────────────────────────────────────────
function MiniBar({
  count,
  maxCount,
  isToday,
  index,
  label,
  reducedMotion,
  onPress,
  selected,
}: {
  count: number;
  maxCount: number;
  isToday: boolean;
  index: number;
  label: string;
  reducedMotion: boolean;
  onPress: () => void;
  selected: boolean;
}) {
  const heightAnim = useSharedValue(0);
  const effectiveMax = Math.max(maxCount, 3);
  const barH = count === 0 ? BAR_MIN_STUB : Math.max(BAR_MIN_STUB + 2, Math.round((count / effectiveMax) * BAR_MAX_HEIGHT));

  useEffect(() => {
    if (reducedMotion) {
      heightAnim.value = 1;
    } else {
      heightAnim.value = withDelay(
        index * 40,
        withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, maxCount, reducedMotion]);

  // Bar is drawn inside a fixed-height track using absolute positioning from bottom
  const barColor = isToday ? Colors.lime : Colors.purple + '73';
  const selectedColor = isToday ? Colors.lime : Colors.purple;

  return (
    <Pressable
      onPress={onPress}
      style={styles.barCol}
      accessibilityLabel={`${label}: ${count} completed`}
    >
      <View style={styles.barTrack}>
        <AnimatedMiniBar
          heightAnim={heightAnim}
          barH={barH}
          color={selected ? selectedColor : barColor}
        />
      </View>
      <AppText
        variant="caption"
        color={isToday ? Colors.lime : Colors.textFaint}
        style={styles.barLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function AnimatedMiniBar({
  heightAnim,
  barH,
  color,
}: {
  heightAnim: SharedValue<number>;
  barH: number;
  color: string;
}) {
  const animStyle = {
    width: '100%' as const,
    height: barH,
    borderRadius: 8,
    backgroundColor: color,
    transform: [{ scaleY: heightAnim }],
    transformOrigin: 'bottom' as const,
  };

  return <Animated.View style={animStyle} />;
}

// ── ProgressHero ──────────────────────────────────────────────────────────────
interface Props {
  data: WeeklyActivity;
  streak: StreakResult;
  hasTasks: boolean;
}

export function ProgressHero({ data, streak, hasTasks }: Props) {
  const reducedMotion = useReducedMotion();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  if (!hasTasks) return null;

  const maxCount = Math.max(...data.days.map((d) => d.count));

  // Delta pill
  const delta = data.total - data.previousTotal;
  const deltaLabel = delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : '–';
  const deltaColor = delta > 0 ? Colors.success : delta < 0 ? Colors.danger : Colors.textMuted;

  // Headline: selected day or weekly total
  const selectedDay = selectedDayIdx !== null ? data.days[selectedDayIdx] : null;
  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function handleBarPress(idx: number) {
    setSelectedDayIdx((prev) => (prev === idx ? null : idx));
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(60).duration(220)}
      style={styles.card}
    >
      {/* Row layout */}
      <View style={styles.row}>
        {/* Left: progress ring */}
        <View style={styles.leftZone}>
          <ProgressRing
            done={data.todayDone}
            total={data.todayTotal}
            reducedMotion={!!reducedMotion}
          />
          <AppText
            variant="caption"
            color={data.todayTotal > 0 && data.todayDone >= data.todayTotal ? Colors.success : Colors.textMuted}
            style={styles.todayCaption}
          >
            {data.todayTotal > 0 && data.todayDone >= data.todayTotal ? 'All done' : 'Today'}
          </AppText>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Right: week summary + mini bars */}
        <View style={styles.rightZone}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <AppText variant="caption" color={Colors.textMuted}>This week</AppText>
              <View style={[styles.deltaPill, { backgroundColor: deltaColor + '22' }]}>
                <AppText variant="caption" color={deltaColor} style={styles.deltaText}>
                  {deltaLabel}
                </AppText>
              </View>
            </View>
            {/* Streak pill — shown when streak >= 1 */}
            {streak.current >= 1 && (
              <Pressable
                onPress={() => router.push(achievementsHref)}
                accessibilityLabel={`${streak.current} day streak`}
                style={styles.streakPill}
              >
                <Feather name="zap" size={11} color={Colors.lime} />
                <AppText variant="caption" color={Colors.lime} style={styles.streakText}>
                  {streak.current}
                </AppText>
              </Pressable>
            )}
          </View>

          {/* Headline */}
          <View style={styles.headlineRow}>
            {selectedDay ? (
              <Animated.View style={styles.headlineInner}>
                <AppText variant="h1" color={Colors.text} style={styles.bigNum}>
                  {selectedDay.count}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted} style={styles.headlineSub}>
                  · {weekDayNames[new Date(selectedDay.dayMs).getDay()]}
                </AppText>
              </Animated.View>
            ) : (
              <View style={styles.headlineInner}>
                <AppText variant="h1" color={Colors.text} style={styles.bigNum}>
                  {data.total}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted} style={styles.headlineSub}>
                  completed
                </AppText>
              </View>
            )}
          </View>

          {/* Mini bar chart */}
          <View style={styles.barChart}>
            {data.days.map((day, i) => (
              <MiniBar
                key={day.dayMs}
                count={day.count}
                maxCount={maxCount}
                isToday={i === 6}
                index={i}
                label={day.label}
                reducedMotion={!!reducedMotion}
                onPress={() => handleBarPress(i)}
                selected={selectedDayIdx === i}
              />
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.s4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.sectionGap,
    maxHeight: 168,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.s4,
    flex: 1,
  },
  leftZone: {
    width: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    ...Typography.title,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  ringDash: {
    ...Typography.title,
  },
  todayCaption: {
    ...Typography.caption,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
    alignSelf: 'stretch',
  },
  rightZone: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  deltaText: {
    ...Typography.caption,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.lime + '18',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  streakText: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headlineInner: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bigNum: {
    ...Typography.h1,
    fontSize: 32,
    lineHeight: 38,
  },
  headlineSub: {
    ...Typography.caption,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 20,
    gap: 3,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 10,
    lineHeight: 14,
  },
});
