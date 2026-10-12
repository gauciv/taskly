import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radii, Spacing, Typography } from '@/theme/tokens';
import { AppText } from './AppText';
import type { WeeklyActivity, StreakResult } from '@/store/selectors';
import { achievementsHref } from '@/utils/routes';
import { useMotionPrefs } from '@/hooks/useMotionPrefs';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 72;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CHART_HEIGHT = 72;

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
      <Svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 72 72">
        <Circle cx={36} cy={36} r={RING_RADIUS} stroke={Colors.purple + '40'} strokeWidth={RING_STROKE} fill="none" />
        {!freeDay && (
          <AnimatedCircle
            cx={36}
            cy={36}
            r={RING_RADIUS}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={ringProps}
            strokeLinecap="round"
            rotation="-90"
            origin="36, 36"
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringLabel]}>
        {freeDay ? (
          <AppText variant="label" color={Colors.textFaint}>–</AppText>
        ) : allDone ? (
          <Feather name="check" size={26} color={Colors.success} />
        ) : (
          <AppText variant="title" color={Colors.text} style={styles.ringText}>{done}/{total}</AppText>
        )}
      </View>
    </View>
  );
}

interface Props {
  data: WeeklyActivity;
  streak: StreakResult;
  hasTasks: boolean;
}

export function ProgressHero({ data, streak, hasTasks }: Props) {
  const systemReduceMotion = !!useReducedMotion();
  const { reduceMotion: appReduceMotion } = useMotionPrefs();
  const reduceMotion = systemReduceMotion || appReduceMotion;
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [rightWidth, setRightWidth] = useState(0);
  const handlePointPress = useCallback((_item: lineDataItem, index: number) => {
    setSelectedDayIdx((current) => current === index ? null : index);
  }, []);

  const chartData = useMemo<lineDataItem[]>(() => data.days.map((day, index) => ({
    value: day.count,
    label: day.label,
    labelTextStyle: {
      color: index === data.days.length - 1 ? Colors.lime : Colors.textFaint,
      fontFamily: 'Poppins_500Medium',
      fontSize: 10,
    },
    hideDataPoint: index !== data.days.length - 1 && index !== selectedDayIdx,
    dataPointColor: index === data.days.length - 1 ? Colors.lime : Colors.purple + '99',
    customDataPoint: (point: lineDataItem, pointIndex: number) => {
      const isToday = pointIndex === data.days.length - 1;
      const color = isToday ? Colors.lime : Colors.purple + '99';
      return (
        <Pressable
          onPress={() => point.onPress?.(point, pointIndex)}
          accessibilityRole="button"
          accessibilityLabel={`${point.label ?? 'Day'}: ${point.value ?? 0} completed`}
          style={[styles.pointHalo, { backgroundColor: color + '33' }]}
        >
          <View style={[styles.pointDot, { backgroundColor: color }]} />
        </Pressable>
      );
    },
    onPress: (_point: lineDataItem, pointIndex: number) => handlePointPress(_point, pointIndex),
  })), [data.days, handlePointPress, selectedDayIdx]);

  if (!hasTasks) return null;

  const maxCount = Math.max(0, ...data.days.map((day) => day.count));
  const delta = data.total - data.previousTotal;
  const deltaLabel = delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : '–';
  const deltaColor = delta > 0 ? Colors.success : delta < 0 ? Colors.danger : Colors.textMuted;
  const selectedDay = selectedDayIdx === null ? null : data.days[selectedDayIdx];
  const weekday = selectedDay ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(selectedDay.dayMs).getDay()] : '';
  const plotWidth = Math.max(0, rightWidth - 8);
  const pointSpacing = Math.max(1, (plotWidth - 14) / 6);
  const countsKey = data.days.map((day) => `${day.dayMs}:${day.count}`).join('|');

  function handleRightLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    setRightWidth((current) => current === width ? current : width);
  }

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
        <View style={styles.right} onLayout={handleRightLayout}>
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
          <View style={styles.chartContainer}>
            {rightWidth > 8 && maxCount === 0 ? (
              <View style={[styles.emptyChart, { width: plotWidth }]}>
                <Svg width={plotWidth} height={42}>
                  <Line x1={6} y1={21} x2={Math.max(6, plotWidth - 6)} y2={21} stroke={Colors.border} strokeWidth={1} strokeDasharray="4 4" />
                </Svg>
                <AppText variant="caption" color={Colors.textMuted} style={styles.trendCaption}>Complete a task to see your trend</AppText>
              </View>
            ) : rightWidth > 8 ? (
              <View style={{ width: plotWidth }}>
                <LineChart
                  key={countsKey}
                  data={chartData}
                  width={plotWidth}
                  parentWidth={plotWidth}
                  height={54}
                  xAxisLabelsHeight={16}
                  xAxisLabelTextStyle={styles.xLabel}
                  xAxisThickness={0}
                  yAxisThickness={0}
                  hideAxesAndRules
                  hideYAxisText
                  hideOrigin
                  hideRules
                  noOfSections={3}
                  maxValue={Math.max(maxCount, 3)}
                  initialSpacing={7}
                  endSpacing={7}
                  spacing={pointSpacing}
                  curved
                  areaChart
                  color={Colors.lime}
                  thickness={3}
                  startFillColor={Colors.lime}
                  endFillColor={Colors.lime}
                  startOpacity={0.35}
                  endOpacity={0}
                  gradientDirection="vertical"
                  isAnimated={!reduceMotion}
                  animateOnDataChange={false}
                  animationDuration={600}
                  dataPointsColor={Colors.lime}
                  dataPointsRadius={5}
                  dataPointsWidth={14}
                  dataPointsHeight={14}
                  disableScroll
                  onBackgroundPress={() => setSelectedDayIdx(null)}
                />
              </View>
            ) : null}
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
  headlineRow: { flexDirection: 'row', alignItems: 'baseline' },
  headlineInner: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.s2 },
  bigNum: { ...Typography.h1, fontSize: 32, lineHeight: 38 },
  chartContainer: { height: CHART_HEIGHT, overflow: 'hidden', justifyContent: 'center' },
  emptyChart: { height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  trendCaption: { textAlign: 'center', marginTop: 2 },
  pointHalo: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pointDot: { width: 10, height: 10, borderRadius: 5 },
  xLabel: { color: Colors.textFaint, fontFamily: 'Poppins_500Medium', fontSize: 10, lineHeight: 14 },
});
