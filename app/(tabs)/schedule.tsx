import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  BackHandler,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { useTodo } from '../../context/TodoContext';
import { loadData, saveData, KEYS } from '../../src/services/storage';
import {
  Lesson,
  LessonType,
  WeekType,
  RecurrenceType,
  getLessonStyleConfig,
  DEFAULT_EVENT_COLORS,
} from '../../src/types/schedule';
import { STANDARD_CATEGORIES } from '../../src/types/config';
import {
  getCurrentDayIndex,
  getCurrentWeekNumber,
  isLessonCurrentlyActive,
} from '../../src/utils/scheduleUtils';
import { scheduleLessonNotifications } from '../../src/services/notificationService';
import { ScrollableWithBar } from '../../src/components/ScrollableWithBar';
import { CupertinoIcon } from '../../src/components/CupertinoIcon';

export type WeekNumber = 1 | 2;

export interface ScheduleStoreV2 {
  weekly: Record<WeekNumber, Record<number, Lesson[]>>;
  calendarEvents: Record<string, Lesson[]>; // YYYY-MM-DD -> Lesson[]
}

const WEEKDAY_LETTERS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS_UPPER = [
  'ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
  'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ',
];

const INITIAL_EMPTY_SCHEDULE: ScheduleStoreV2 = {
  weekly: {
    1: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    2: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  },
  calendarEvents: {},
};

const getStartTimeForSort = (lesson: Lesson): string => {
  if (lesson.startTime) return lesson.startTime;
  if (!lesson.time) return '99:99';
  const match = lesson.time.match(/(\d{1,2}:\d{2})/);
  return match ? match[1].padStart(5, '0') : lesson.time;
};

const sortLessons = (lessons: Lesson[]): Lesson[] => {
  return [...lessons].sort((a, b) => getStartTimeForSort(a).localeCompare(getStartTimeForSort(b)));
};

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export default function ScheduleScreen() {
  const { theme, isScheduleEditable } = useAppTheme();
  const { config } = useConfig();
  const { todos, toggleCompleteTodo } = useTodo();

  const [scheduleData, setScheduleData] = useState<ScheduleStoreV2>(INITIAL_EMPTY_SCHEDULE);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const numberOfWeek: WeekNumber = useMemo(() => getCurrentWeekNumber(selectedDate), [selectedDate]);

  const [, setTick] = useState<number>(Date.now());

  // Event creation / editing state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [eventType, setEventType] = useState<string>('Учеба');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('weekly');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [isCustomTypeOpen, setIsCustomTypeOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const onBackPress = () => {
      setIsModalOpen(false);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isModalOpen]);

  // Load and migrate existing schedule data
  useEffect(() => {
    (async () => {
      const raw = await loadData<any>(KEYS.SCHEDULE, null);
      if (raw) {
        if (raw.weekly && raw.calendarEvents) {
          setScheduleData(raw);
        } else if (raw[1] || raw[2]) {
          const migrated: ScheduleStoreV2 = {
            weekly: {
              1: raw[1] || { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
              2: raw[2] || { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
            },
            calendarEvents: {},
          };
          setScheduleData(migrated);
          await saveData(KEYS.SCHEDULE, migrated);
        }
      }
    })();
  }, []);

  // Update schedule notifications on change
  useEffect(() => {
    if (config.notificationsEnabled) {
      scheduleLessonNotifications(scheduleData.weekly, !!config.notificationsEnabled, !!config.twoWeeksEnabled);
    }
  }, [scheduleData, config.notificationsEnabled, config.twoWeeksEnabled]);

  // Selected date calculations
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const activeDayIndex = useMemo(() => {
    const day = selectedDate.getDay();
    return day === 0 ? 6 : day - 1;
  }, [selectedDate]);

  // Dates for the currently visible 7-day week
  const weekDays = useMemo(() => {
    const monday = getMondayOfWeek(selectedDate);
    const list: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      list.push(day);
    }
    return list;
  }, [selectedDate]);

  const currentMonthName = useMemo(() => {
    return MONTHS_UPPER[selectedDate.getMonth()];
  }, [selectedDate]);

  // Combined daily events (recurring + specific date)
  const currentDayEvents = useMemo(() => {
    const weeklyLessons = scheduleData.weekly[numberOfWeek]?.[activeDayIndex] || [];
    const calendarLessons = scheduleData.calendarEvents[selectedDateKey] || [];
    return sortLessons([...weeklyLessons, ...calendarLessons]);
  }, [scheduleData, numberOfWeek, activeDayIndex, selectedDateKey]);

  const changeWeek = (direction: -1 | 1) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + direction * 7);
    setSelectedDate(next);
  };

  const jumpToToday = () => {
    setSelectedDate(new Date());
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const hasEventsOnDate = (date: Date) => {
    const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const weekNum = getCurrentWeekNumber(date);
    const dateKey = formatDateKey(date);
    const hasWeekly = (scheduleData.weekly[weekNum]?.[dayIdx] || []).length > 0;
    const hasSingle = (scheduleData.calendarEvents[dateKey] || []).length > 0;
    const hasTodo = todos.some((t) => {
      if (!t.deadline) return false;
      const td = new Date(t.deadline);
      return isSameDay(td, date);
    });
    return hasWeekly || hasSingle || hasTodo;
  };

  const dayTodos = useMemo(() => {
    return todos.filter((t) => {
      if (!t.deadline) return false;
      const td = new Date(t.deadline);
      return isSameDay(td, selectedDate);
    });
  }, [todos, selectedDate]);

  const openCreateModal = () => {
    setEditingLessonId(null);
    setSubject('');
    setTime('09:00 - 10:35');
    setRoom('');
    setEventType('Учеба');
    setRecurrence('weekly');
    setIsCustomTypeOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (lesson: Lesson) => {
    if (!isScheduleEditable) return;
    setEditingLessonId(lesson.id);
    setSubject(lesson.subject);
    setTime(lesson.time || '');
    setRoom(lesson.room || '');
    setEventType(lesson.type);
    setRecurrence(lesson.recurrence || 'weekly');
    setIsCustomTypeOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      setIsModalOpen(false);
      return;
    }

    const finalType = isCustomTypeOpen && customTypeInput.trim()
      ? customTypeInput.trim()
      : eventType;

    const matches = time.match(/(\d{1,2}:\d{2})/);
    const parsedStart = matches ? matches[1] : undefined;

    const nextSchedule: ScheduleStoreV2 = {
      weekly: {
        1: { ...scheduleData.weekly[1] },
        2: { ...scheduleData.weekly[2] },
      },
      calendarEvents: { ...scheduleData.calendarEvents },
    };

    if (editingLessonId) {
      [1, 2].forEach((w) => {
        Object.keys(nextSchedule.weekly[w as WeekNumber]).forEach((dIdx) => {
          nextSchedule.weekly[w as WeekNumber][+dIdx] = nextSchedule.weekly[w as WeekNumber][+dIdx].filter(
            (l) => l.id !== editingLessonId
          );
        });
      });
      Object.keys(nextSchedule.calendarEvents).forEach((k) => {
        nextSchedule.calendarEvents[k] = nextSchedule.calendarEvents[k].filter(
          (l) => l.id !== editingLessonId
        );
      });
    }

    const newEvent: Lesson = {
      id: editingLessonId || Date.now().toString(),
      subject: trimmedSubject,
      time: time.trim() || '09:00 - 10:00',
      room: room.trim() || '—',
      type: finalType,
      startTime: parsedStart || '09:00',
      recurrence,
      date: recurrence === 'once' ? selectedDateKey : undefined,
    };

    if (recurrence === 'once') {
      const curList = nextSchedule.calendarEvents[selectedDateKey] || [];
      nextSchedule.calendarEvents[selectedDateKey] = sortLessons([...curList, newEvent]);
    } else {
      const targetWeeks: WeekNumber[] =
        recurrence === 'week1' ? [1] : recurrence === 'week2' ? [2] : [1, 2];

      targetWeeks.forEach((w) => {
        const cur = nextSchedule.weekly[w][activeDayIndex] || [];
        nextSchedule.weekly[w][activeDayIndex] = sortLessons([...cur, newEvent]);
      });
    }

    setScheduleData(nextSchedule);
    await saveData(KEYS.SCHEDULE, nextSchedule);
    setIsModalOpen(false);
  };

  const handleDeleteEvent = async (id: string) => {
    const nextSchedule: ScheduleStoreV2 = {
      weekly: {
        1: { ...scheduleData.weekly[1] },
        2: { ...scheduleData.weekly[2] },
      },
      calendarEvents: { ...scheduleData.calendarEvents },
    };

    [1, 2].forEach((w) => {
      Object.keys(nextSchedule.weekly[w as WeekNumber]).forEach((dIdx) => {
        nextSchedule.weekly[w as WeekNumber][+dIdx] = nextSchedule.weekly[w as WeekNumber][+dIdx].filter(
          (l) => l.id !== id
        );
      });
    });

    Object.keys(nextSchedule.calendarEvents).forEach((k) => {
      nextSchedule.calendarEvents[k] = nextSchedule.calendarEvents[k].filter((l) => l.id !== id);
    });

    setScheduleData(nextSchedule);
    await saveData(KEYS.SCHEDULE, nextSchedule);
    if (isModalOpen && editingLessonId === id) setIsModalOpen(false);
  };

  const availableCategories = config.eventCategories || STANDARD_CATEGORIES;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Cupertino Top Header with Month in Caps & Week Navigation */}
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.topBarLeft}>
          <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>
            {currentMonthName} {selectedDate.getFullYear()}
          </Text>
        </View>

        <View style={styles.topBarNav}>
          <TouchableOpacity
            onPress={() => changeWeek(-1)}
            style={[styles.navArrowBtn, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}
            accessibilityLabel="Предыдущая неделя"
            accessibilityRole="button">
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={jumpToToday}
            style={[styles.todayBadgeBtn, { backgroundColor: theme.pillBg, borderColor: theme.border }]}
            accessibilityRole="button">
            <Text style={[styles.todayBadgeText, { color: theme.accent }]}>Сегодня</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => changeWeek(1)}
            style={[styles.navArrowBtn, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}
            accessibilityLabel="Следующая неделя"
            accessibilityRole="button">
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1 ROW WEEK STRIP (Стильные центрированные капсулы дней) */}
      <View style={[styles.weekStripContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.weekStripContent}>
          {weekDays.map((d, idx) => {
            const isSelected = isSameDay(d, selectedDate);
            const isTodayDay = isToday(d);
            const letter = WEEKDAY_LETTERS[idx];

            return (
              <TouchableOpacity
                key={`day-${idx}`}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.7}
                style={[
                  styles.dayCapsule,
                  { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                  isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
                  isTodayDay && !isSelected && { borderWidth: 1.5, borderColor: theme.accent },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${letter}, ${d.getDate()}`}>
                <Text
                  style={[
                    styles.capsuleLetter,
                    { color: theme.textSecondary },
                    isSelected && { color: '#ffffff', opacity: 0.85 },
                    isTodayDay && !isSelected && { color: theme.accent },
                  ]}>
                  {letter}
                </Text>
                <Text
                  style={[
                    styles.capsuleNumber,
                    { color: theme.textPrimary },
                    isSelected && { color: '#ffffff', fontWeight: '800' },
                    isTodayDay && !isSelected && { color: theme.accent, fontWeight: '700' },
                  ]}>
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Events List for Selected Day */}
      <ScrollView contentContainerStyle={styles.scheduleScroll} showsVerticalScrollIndicator={true}>
        <View style={styles.dayHeaderRow}>
          <Text style={[styles.dayHeaderTitle, { color: theme.textPrimary }]}>
            {DAYS_FULL[activeDayIndex]}, {selectedDate.getDate()} {MONTHS_UPPER[selectedDate.getMonth()].toLowerCase()}
          </Text>
          <Text style={[styles.dayEventCount, { color: theme.textSecondary }]}>
            {currentDayEvents.length} событий • {dayTodos.length} дедлайнов
          </Text>
        </View>

        {/* Deadlines on this day */}
        {dayTodos.length > 0 && (
          <View style={styles.deadlinesBlock}>
            <Text style={[styles.deadlinesTitle, { color: '#ff9f0a' }]}>
              Дедлайны на этот день ({dayTodos.length})
            </Text>
            {dayTodos.map((todo) => (
              <TouchableOpacity
                key={todo.id}
                onPress={() => toggleCompleteTodo(todo.id)}
                style={[styles.deadlineCard, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: todo.isCompleted }}>
                <View
                  style={[
                    styles.deadlineCheckbox,
                    { borderColor: todo.isCompleted ? theme.accent : '#ff9f0a' },
                    todo.isCompleted && { backgroundColor: theme.accent },
                  ]}>
                  {todo.isCompleted && <CupertinoIcon name="checkmark" size={11} color="#ffffff" />}
                </View>
                <Text
                  style={[
                    styles.deadlineCardTitle,
                    { color: theme.textPrimary },
                    todo.isCompleted && { textDecorationLine: 'line-through', color: theme.textMuted },
                  ]}
                  numberOfLines={1}>
                  {todo.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {currentDayEvents.length === 0 && dayTodos.length === 0 ? (
          <View style={styles.emptyCard}>
            <CupertinoIcon name="calendar" size={38} color={theme.textMuted} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              На этот день ничего не запланировано
            </Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Нажмите «+», чтобы добавить занятие, тренировку или встречу
            </Text>
          </View>
        ) : (
          currentDayEvents.map((lesson) => {
            const isActive = isLessonCurrentlyActive(lesson.time || '', selectedDate);
            const catColor = config.customLessonColors?.[lesson.type] || DEFAULT_EVENT_COLORS[lesson.type] || '#0a84ff';
            const styleConfig = getLessonStyleConfig(lesson.type, catColor);

            return (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => openEditModal(lesson)}
                activeOpacity={isScheduleEditable ? 0.7 : 1}
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: theme.cardSolid,
                    borderColor: isActive ? theme.accent : theme.border,
                    borderWidth: isActive ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
                accessibilityRole="button">
                <View style={[styles.categoryIndicator, { backgroundColor: styleConfig.color }]} />

                <View style={styles.eventContent}>
                  <View style={styles.eventTopRow}>
                    <Text style={[styles.eventTimeText, { color: isActive ? theme.accent : theme.textSecondary }]}>
                      {lesson.time}
                      {isActive && ' • ИДЕТ СЕЙЧАС'}
                    </Text>

                    <View style={[styles.typeBadge, { backgroundColor: `${styleConfig.color}20` }]}>
                      <Text style={[styles.typeBadgeText, { color: styleConfig.color }]}>
                        {lesson.type}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.eventSubject, { color: theme.textPrimary }]} numberOfLines={2}>
                    {lesson.subject}
                  </Text>

                  {lesson.room && lesson.room !== '—' && (
                    <View style={styles.eventRoomRow}>
                      <CupertinoIcon name="home" size={13} color={theme.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.eventRoomText, { color: theme.textSecondary }]}>
                        {lesson.room}
                      </Text>
                    </View>
                  )}
                </View>

                {isScheduleEditable && (
                  <TouchableOpacity
                    onPress={() => handleDeleteEvent(lesson.id)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                    accessibilityLabel="Удалить событие"
                    accessibilityRole="button">
                    <CupertinoIcon name="close" size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      {isScheduleEditable && (
        <TouchableOpacity
          onPress={openCreateModal}
          style={[styles.fab, { backgroundColor: theme.accent }]}
          activeOpacity={0.85}
          accessibilityLabel="Добавить событие в расписание"
          accessibilityRole="button">
          <CupertinoIcon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Modal for Add / Edit Event */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsModalOpen(false)}
          />
          <View style={[styles.createSheet, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editingLessonId ? 'Редактировать событие' : 'Новое событие'}
            </Text>

            <ScrollableWithBar
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 4 }}
              indicatorColor={theme.accent}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Название / Предмет</Text>
              <TextInput
                placeholder="Например: Высшая математика, Тренировка..."
                placeholderTextColor={theme.textMuted}
                value={subject}
                onChangeText={setSubject}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border },
                ]}
                accessibilityLabel="Название события"
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Время проведения</Text>
              <TextInput
                placeholder="09:00 - 10:35"
                placeholderTextColor={theme.textMuted}
                value={time}
                onChangeText={setTime}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border },
                ]}
                accessibilityLabel="Время события"
              />

              {config.timeSlots && config.timeSlots.length > 0 && (
                <View style={styles.quickSlotsRow}>
                  {config.timeSlots.map((slot, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setTime(`${slot.startTime} - ${slot.endTime}`)}
                      style={[styles.quickSlotChip, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}
                      accessibilityRole="button">
                      <Text style={[styles.quickSlotText, { color: theme.accent }]}>
                        {i + 1} пара ({slot.startTime})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Кабинет / Место / Ссылка</Text>
              <TextInput
                placeholder="Ауд. 314, Корпус 1, Дистанционно..."
                placeholderTextColor={theme.textMuted}
                value={room}
                onChangeText={setRoom}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border },
                ]}
                accessibilityLabel="Место проведения события"
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Тип события / Категория</Text>
              <View style={styles.categoriesWrap}>
                {availableCategories.map((catName) => {
                  const isSelected = eventType === catName && !isCustomTypeOpen;
                  const catColor = config.customLessonColors?.[catName] || DEFAULT_EVENT_COLORS[catName] || '#0a84ff';
                  return (
                    <TouchableOpacity
                      key={catName}
                      onPress={() => {
                        setEventType(catName);
                        setIsCustomTypeOpen(false);
                      }}
                      style={[
                        styles.categoryChip,
                        { borderColor: theme.border, backgroundColor: theme.surfaceSolid },
                        isSelected && { borderColor: catColor, backgroundColor: `${catColor}25` },
                      ]}
                      accessibilityRole="button">
                      <View style={[styles.catChipDot, { backgroundColor: catColor }]} />
                      <Text
                        style={[
                          styles.catChipText,
                          { color: isSelected ? catColor : theme.textSecondary },
                          isSelected && { fontWeight: '700' },
                        ]}>
                        {catName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 10 }]}>Повторяемость</Text>
              <View style={styles.recurrenceRow}>
                {[
                  { key: 'weekly', label: 'Каждую неделю' },
                  { key: 'week1', label: '1-я неделя' },
                  { key: 'week2', label: '2-я неделя' },
                  { key: 'once', label: 'Только на эту дату' },
                ].map((rec) => {
                  const isSelected = recurrence === rec.key;
                  return (
                    <TouchableOpacity
                      key={rec.key}
                      onPress={() => setRecurrence(rec.key as RecurrenceType)}
                      style={[
                        styles.recurrenceChip,
                        { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                        isSelected && { backgroundColor: theme.accent, borderColor: theme.accent },
                      ]}
                      accessibilityRole="button">
                      <Text
                        style={[
                          styles.recurrenceChipText,
                          { color: isSelected ? '#ffffff' : theme.textSecondary },
                          isSelected && { fontWeight: '700' },
                        ]}>
                        {rec.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollableWithBar>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surfaceSolid, borderWidth: 1, borderColor: theme.border }]}
                accessibilityRole="button">
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEvent}
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}
                accessibilityRole="button">
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {editingLessonId ? 'Сохранить' : 'Создать'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthLabel: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  topBarNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  todayBadgeText: { fontSize: 11.5, fontWeight: '700' },

  // Week strip 1 row (Capsules)
  weekStripContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekStripContent: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCapsule: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  capsuleLetter: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  capsuleNumber: {
    fontSize: 15.5,
    fontWeight: '700',
  },

  scheduleScroll: { padding: 16, paddingBottom: 110 },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayHeaderTitle: { fontSize: 14, fontWeight: '700' },
  dayEventCount: { fontSize: 12 },
  deadlinesBlock: {
    marginBottom: 14,
  },
  deadlinesTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deadlineCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deadlineCardTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  emptySub: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIndicator: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: { flex: 1 },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTimeText: { fontSize: 12, fontWeight: '700' },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 10.5, fontWeight: '700' },
  eventSubject: { fontSize: 14.5, fontWeight: '600', marginBottom: 3 },
  eventRoomRow: { flexDirection: 'row', alignItems: 'center' },
  eventRoomText: { fontSize: 12 },
  deleteBtn: { padding: 6, marginLeft: 6 },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 76 : 84,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9,
  },

  modalBackdrop: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  createSheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    zIndex: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickSlotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  quickSlotChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickSlotText: { fontSize: 11, fontWeight: '600' },
  categoriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catChipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  catChipText: { fontSize: 12 },
  recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  recurrenceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recurrenceChipText: { fontSize: 11.5 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
