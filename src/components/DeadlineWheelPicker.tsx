import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 120px

const MONTH_NAMES_SHORT = [
  '01 • Янв',
  '02 • Фев',
  '03 • Мар',
  '04 • Апр',
  '05 • Май',
  '06 • Июн',
  '07 • Июл',
  '08 • Авг',
  '09 • Сен',
  '10 • Окт',
  '11 • Ноя',
  '12 • Дек',
];

interface DeadlineWheelPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  theme: any;
}

export const DeadlineWheelPicker: React.FC<DeadlineWheelPickerProps> = ({
  selectedDate,
  onDateChange,
  theme,
}) => {
  const currentDay = selectedDate.getDate(); // 1..31
  const currentMonth = selectedDate.getMonth(); // 0..11
  const currentYear = selectedDate.getFullYear();

  // Days count in current selected month/year
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);

  // Sync scroll position when selectedDate changes externally
  useEffect(() => {
    const dayIndex = Math.min(currentDay - 1, daysInMonth - 1);
    dayScrollRef.current?.scrollTo({
      y: Math.max(0, dayIndex * ITEM_HEIGHT),
      animated: true,
    });
  }, [currentDay, daysInMonth]);

  useEffect(() => {
    monthScrollRef.current?.scrollTo({
      y: currentMonth * ITEM_HEIGHT,
      animated: true,
    });
  }, [currentMonth]);

  const handleDayScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, daysInMonth - 1));
    const newDay = daysList[clampedIndex];
    if (newDay && newDay !== currentDay) {
      const next = new Date(selectedDate);
      next.setDate(newDay);
      onDateChange(next);
    }
  };

  const handleMonthScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, 11));
    if (clampedIndex !== currentMonth) {
      const next = new Date(selectedDate);
      // Check max days in next month before setting
      const maxDaysInNextMonth = new Date(currentYear, clampedIndex + 1, 0).getDate();
      const safeDay = Math.min(currentDay, maxDaysInNextMonth);
      next.setDate(safeDay);
      next.setMonth(clampedIndex);
      onDateChange(next);
    }
  };

  const selectDay = (day: number) => {
    const next = new Date(selectedDate);
    next.setDate(day);
    onDateChange(next);
  };

  const selectMonth = (monthIdx: number) => {
    const next = new Date(selectedDate);
    const maxDays = new Date(currentYear, monthIdx + 1, 0).getDate();
    next.setDate(Math.min(currentDay, maxDays));
    next.setMonth(monthIdx);
    onDateChange(next);
  };

  const stepDay = (delta: number) => {
    const nextDay = Math.max(1, Math.min(currentDay + delta, daysInMonth));
    selectDay(nextDay);
  };

  const stepMonth = (delta: number) => {
    const nextMonth = Math.max(0, Math.min(currentMonth + delta, 11));
    selectMonth(nextMonth);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
      {/* Column Headers */}
      <View style={styles.headerLabelsRow}>
        <View style={styles.headerLabelCol}>
          <Text style={[styles.headerLabelText, { color: theme.textSecondary }]}>ДЕНЬ (ДД)</Text>
        </View>
        <View style={styles.headerLabelCol}>
          <Text style={[styles.headerLabelText, { color: theme.textSecondary }]}>МЕСЯЦ (ММ)</Text>
        </View>
      </View>

      {/* Main Wheel Area */}
      <View style={styles.wheelArea}>
        {/* Selection Glass Window in the Center */}
        <View
          style={[
            styles.selectionWindow,
            {
              backgroundColor: theme.pillBg,
              borderColor: theme.accent,
            },
          ]}
          pointerEvents="none"
        />

        {/* Day Wheel Column */}
        <View style={styles.wheelColumn}>
          <ScrollView
            ref={dayScrollRef}
            style={styles.wheelScroll}
            contentContainerStyle={styles.scrollContent}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={handleDayScrollEnd}
            onScrollEndDrag={handleDayScrollEnd}
            nestedScrollEnabled>
            {daysList.map((day) => {
              const isSelected = day === currentDay;
              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  activeOpacity={0.7}
                  onPress={() => selectDay(day)}
                  style={styles.wheelItem}>
                  <Text
                    style={[
                      styles.itemText,
                      {
                        color: isSelected ? theme.accent : theme.textMuted,
                        fontWeight: isSelected ? '800' : '500',
                        fontSize: isSelected ? 18 : 14,
                        opacity: isSelected ? 1 : 0.45,
                      },
                    ]}>
                    {day.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Stepper buttons for convenience */}
          <View style={styles.steppersRow}>
            <TouchableOpacity onPress={() => stepDay(-1)} style={styles.stepperArrow} accessibilityLabel="Предыдущий день">
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stepDay(1)} style={styles.stepperArrow} accessibilityLabel="Следующий день">
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider separator */}
        <View style={[styles.wheelDivider, { backgroundColor: theme.border }]} />

        {/* Month Wheel Column */}
        <View style={styles.wheelColumn}>
          <ScrollView
            ref={monthScrollRef}
            style={styles.wheelScroll}
            contentContainerStyle={styles.scrollContent}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={handleMonthScrollEnd}
            onScrollEndDrag={handleMonthScrollEnd}
            nestedScrollEnabled>
            {MONTH_NAMES_SHORT.map((name, idx) => {
              const isSelected = idx === currentMonth;
              return (
                <TouchableOpacity
                  key={`month-${idx}`}
                  activeOpacity={0.7}
                  onPress={() => selectMonth(idx)}
                  style={styles.wheelItem}>
                  <Text
                    style={[
                      styles.itemText,
                      {
                        color: isSelected ? theme.accent : theme.textMuted,
                        fontWeight: isSelected ? '800' : '500',
                        fontSize: isSelected ? 16 : 13.5,
                        opacity: isSelected ? 1 : 0.45,
                      },
                    ]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Stepper buttons for convenience */}
          <View style={styles.steppersRow}>
            <TouchableOpacity onPress={() => stepMonth(-1)} style={styles.stepperArrow} accessibilityLabel="Предыдущий месяц">
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => stepMonth(1)} style={styles.stepperArrow} accessibilityLabel="Следующий месяц">
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Summary Footer Line */}
      <View style={[styles.summaryFooter, { borderTopColor: theme.border }]}>
        <Text style={[styles.summaryDateText, { color: theme.textPrimary }]}>
          {selectedDate.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        <Text style={[styles.summarySubText, { color: '#ff9f0a' }]}>
          • Дедлайн в календаре
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: 6,
    paddingTop: 8,
  },
  headerLabelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headerLabelCol: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabelText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  wheelArea: {
    height: PICKER_HEIGHT,
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
  },
  selectionWindow: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  wheelColumn: {
    flex: 1,
    height: PICKER_HEIGHT,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelScroll: {
    width: '100%',
    height: PICKER_HEIGHT,
    zIndex: 2,
  },
  scrollContent: {
    paddingTop: ITEM_HEIGHT,
    paddingBottom: ITEM_HEIGHT,
    alignItems: 'center',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  itemText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  wheelDivider: {
    width: StyleSheet.hairlineWidth,
    height: PICKER_HEIGHT * 0.7,
    zIndex: 2,
  },
  steppersRow: {
    position: 'absolute',
    right: 6,
    top: 6,
    bottom: 6,
    justifyContent: 'space-between',
    zIndex: 3,
  },
  stepperArrow: {
    padding: 3,
    opacity: 0.6,
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryDateText: {
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  summarySubText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
