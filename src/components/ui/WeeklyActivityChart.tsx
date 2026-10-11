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
} from 'react-native-reanimated';
import { Colors, Spacing, Radii, Typography } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import type { WeeklyActivity } from '@/store/selectors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BAR_WIDTH = 22;
const BAR_RADIUS = 8;
const CHART_HEIGHT = 96;
const BAR_MIN_STUB = 6;
const RING_SIZE = 64;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface Props {
  data: WeeklyActivity;
  hasTasks: boolean;
}

function Bar({
  count,
  maxCount,
  label,
  isToday,
  index,
}: {
  count: number;
  maxCount: number;
  label: string;
  isToday: boolean;
  index: number;
}) {
  const [selected, setSelected] = useState(false);
  const heightPct = useSharedValue(0);

  const targetPct = maxCount === 0 ? 0 : count / maxCount;
  const barH = Math.max(BAR_MIN_STUB, Math.round(targetPct * (CHART_HEIGHT - 20)));

  useEffect(() => {
    heightPct.value = withDelay(
      index * 40,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, maxCount]);

  return (
    <Pressable
      onPress={() => setSelected((s) => !s)}
      style={styles.barCol}
      accessibilityLabel={`${label}: ${count} completed`}
    >
      {selected && count > 0 && (
        <View style={styles.tooltip}>
          <AppText variant="caption" color={Colors.onAccent} style={styles.tooltipText}>
            {count}
          </AppText>
        </View>
      )}
      <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
        <AnimatedBar
          heightAnim={heightPct}
          barH={barH}
          isToday={isToday}
          selected={selected}
        />
      </View>
      <AppText variant="caption" color={isToday ? Colors.lime : Colors.textFaint} style={styles.barLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function AnimatedBar({
  heightAnim,
  barH,
  isToday,
  selected,
}: {
  heightAnim: SharedValue<number>;
  barH: number;
  isToday: boolean;
  selected: boolean;
}) {
  // We use a wrapper that scales vertically from bottom
  const color = isToday ? Colors.lime : Colors.purple + '73';
  const selectedColor = isToday ? Colors.lime : Colors.purple;

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: BAR_WIDTH,
          height: barH,
          borderRadius: BAR_RADIUS,
          backgroundColor: selected ? selectedColor : color,
          transform: [{ scaleY: heightAnim }],
          transformOrigin: 'bottom',
        },
      ]}
    />
  );
}

function ProgressRing({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const progress = useSharedValue(0);
  const pct = total === 0 ? 0 : Math.min(1, done / total);

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  const isEmpty = total === 0;

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* Track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={Colors.surfaceHigh}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* Fill */}
        {!isEmpty && (
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={Colors.lime}
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
        {isEmpty ? (
          <AppText variant="label" color={Colors.textFaint} style={styles.ringDash}>–</AppText>
        ) : (
          <AppText variant="caption" color={Colors.text} style={styles.ringText}>
            {done}/{total}
          </AppText>
        )}
      </View>
    </View>
  );
}

export function WeeklyActivityChart({ data, hasTasks }: Props) {
  const prevDataRef = useRef(data);

  // Track when data changes to replay animation
  useEffect(() => {
    prevDataRef.current = data;
  }, [data]);

  if (!hasTasks) return null;

  const isEmpty = data.total === 0;
  const maxCount = Math.max(...data.days.map((d) => d.count), 1);

  const delta = data.total - data.previousTotal;
  const deltaLabel = delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : '– 0';
  const deltaColor = delta > 0 ? Colors.success : delta < 0 ? Colors.danger : Colors.textMuted;

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(220)} style={styles.card}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <AppText variant="caption" color={Colors.textMuted}>This week</AppText>
          <View style={styles.totalRow}>
            <AppText variant="h1" color={Colors.text} style={styles.totalNum}>
              {data.total}
            </AppText>
            <View style={[styles.deltaPill, { backgroundColor: deltaColor + '22' }]}>
              <AppText variant="caption" color={deltaColor} style={styles.deltaText}>
                {deltaLabel}
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.topRight}>
          <ProgressRing done={data.todayDone} total={data.todayTotal} />
          <AppText variant="caption" color={Colors.textMuted} style={styles.todayLabel}>
            Today
          </AppText>
        </View>
      </View>

      {/* Bar chart */}
      {isEmpty ? (
        <View style={styles.emptyChart}>
          {data.days.map((day, i) => (
            <View key={day.dayMs} style={styles.barCol}>
              <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: BAR_WIDTH,
                      height: BAR_MIN_STUB,
                      borderRadius: BAR_RADIUS,
                      backgroundColor: Colors.surfaceHigh,
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" color={Colors.textFaint} style={styles.barLabel}>
                {day.label}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.barChart}>
          {data.days.map((day, i) => (
            <Bar
              key={day.dayMs}
              count={day.count}
              maxCount={maxCount}
              label={day.label}
              isToday={i === 6}
              index={i}
            />
          ))}
        </View>
      )}

      {isEmpty && (
        <AppText variant="caption" color={Colors.textFaint} style={styles.emptyCaption}>
          Complete a task to see your progress
        </AppText>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.s4 + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.sectionGap,
    gap: Spacing.s4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topLeft: {
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
  },
  totalNum: {
    ...Typography.h1,
  },
  deltaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deltaText: {
    ...Typography.caption,
  },
  topRight: {
    alignItems: 'center',
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
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },
  ringDash: {
    ...Typography.title,
  },
  todayLabel: {
    ...Typography.caption,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  emptyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barCol: {
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    // height/color/borderRadius set inline
  },
  barLabel: {
    ...Typography.caption,
  },
  tooltip: {
    backgroundColor: Colors.lime,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  tooltipText: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyCaption: {
    textAlign: 'center',
    marginTop: -Spacing.s2,
  },
});
