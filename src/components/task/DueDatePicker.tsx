import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Switch, TouchableOpacity } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, startOfDay, addDays } from 'date-fns';
import { Colors, Spacing } from '@/theme/tokens';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';

interface DueDatePickerProps {
  dueAt: number | null;
  dueHasTime: boolean;
  onChange: (dueAt: number | null, dueHasTime: boolean) => void;
}

type QuickOption = 'today' | 'tomorrow' | 'pick' | 'none';

function todayMs() { return startOfDay(new Date()).getTime(); }
function tomorrowMs() { return startOfDay(addDays(new Date(), 1)).getTime(); }

function getQuickOption(dueAt: number | null): QuickOption | null {
  if (dueAt === null) return 'none';
  const ds = startOfDay(new Date(dueAt)).getTime();
  if (ds === todayMs()) return 'today';
  if (ds === tomorrowMs()) return 'tomorrow';
  return 'pick';
}

export function DueDatePicker({ dueAt, dueHasTime, onChange }: DueDatePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const quick = getQuickOption(dueAt);

  function setQuick(opt: QuickOption) {
    if (opt === 'none') { onChange(null, false); return; }
    if (opt === 'today') { onChange(todayMs(), dueHasTime); return; }
    if (opt === 'tomorrow') { onChange(tomorrowMs(), dueHasTime); return; }
    if (opt === 'pick') {
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: new Date(dueAt ?? Date.now()),
          mode: 'date',
          onChange: (_, date) => {
            if (date) onChange(startOfDay(date).getTime(), dueHasTime);
          },
        });
      } else {
        setShowDatePicker(true);
      }
    }
  }

  function handleTimeToggle(enabled: boolean) {
    if (!enabled) {
      onChange(dueAt ? startOfDay(new Date(dueAt)).getTime() : null, false);
      setShowTimePicker(false);
    } else {
      const base = dueAt ?? Date.now();
      const d = new Date(base);
      d.setHours(9, 0, 0, 0);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: d,
          mode: 'time',
          is24Hour: false,
          onChange: (_, t) => {
            if (t) {
              const base2 = new Date(dueAt ?? Date.now());
              base2.setHours(t.getHours(), t.getMinutes(), 0, 0);
              onChange(base2.getTime(), true);
            }
          },
        });
      } else {
        onChange(d.getTime(), true);
        setShowTimePicker(true);
      }
    }
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip label="Today"     selected={quick === 'today'}    onPress={() => setQuick('today')} />
        <Chip label="Tomorrow"  selected={quick === 'tomorrow'} onPress={() => setQuick('tomorrow')} />
        <Chip label="Pick date" selected={quick === 'pick'}     onPress={() => setQuick('pick')} icon="calendar" />
        <Chip label="No date"   selected={quick === 'none'}     onPress={() => setQuick('none')} />
      </ScrollView>

      {dueAt !== null && quick === 'pick' && (
        <AppText variant="caption" color={Colors.textMuted} style={styles.dateLabel}>
          {format(new Date(dueAt), 'EEE, MMM d yyyy')}
        </AppText>
      )}

      {/* iOS inline date picker */}
      {showDatePicker && Platform.OS === 'ios' && (
        <DateTimePicker
          value={new Date(dueAt ?? todayMs())}
          mode="date"
          display="inline"
          themeVariant="dark"
          onChange={(_, date) => {
            if (date) onChange(startOfDay(date).getTime(), dueHasTime);
            setShowDatePicker(false);
          }}
          style={styles.picker}
        />
      )}

      {dueAt !== null && (
        <View style={styles.timeRow}>
          <AppText variant="label" color={Colors.textMuted}>Add time</AppText>
          <Switch
            value={dueHasTime}
            onValueChange={handleTimeToggle}
            trackColor={{ false: Colors.border, true: Colors.lime + '88' }}
            thumbColor={dueHasTime ? Colors.lime : Colors.textFaint}
          />
        </View>
      )}

      {dueAt !== null && dueHasTime && showTimePicker && Platform.OS === 'ios' && (
        <DateTimePicker
          value={new Date(dueAt)}
          mode="time"
          display="spinner"
          themeVariant="dark"
          onChange={(_, t) => {
            if (t) {
              const d = new Date(dueAt);
              d.setHours(t.getHours(), t.getMinutes(), 0, 0);
              onChange(d.getTime(), true);
            }
            setShowTimePicker(false);
          }}
          style={styles.picker}
        />
      )}

      {dueAt !== null && dueHasTime && Platform.OS === 'android' && (
        <TouchableOpacity
          style={styles.timeBtn}
          onPress={() => {
            DateTimePickerAndroid.open({
              value: new Date(dueAt),
              mode: 'time',
              is24Hour: false,
              onChange: (_, t) => {
                if (t) {
                  const d = new Date(dueAt);
                  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
                  onChange(d.getTime(), true);
                }
              },
            });
          }}
        >
          <AppText variant="label" color={Colors.lime}>
            {format(new Date(dueAt), 'hh:mm a')} (tap to change)
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: Spacing.s2,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s2,
  },
  dateLabel: {
    paddingHorizontal: Spacing.screenH,
    marginTop: 4,
  },
  picker: {
    marginHorizontal: Spacing.screenH,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.s2,
  },
  timeBtn: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: Spacing.s2,
  },
});
