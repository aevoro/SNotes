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
import { useNotes } from '../../context/NotesContext';
import { loadData, saveData, KEYS } from '../../src/services/storage';
import { Lesson } from '../../src/types/schedule';
import { TodoItem } from '../../src/types/todo';
import { SYSTEM_CALENDAR_FOLDER_ID } from '../../src/types/folders';
import { getCurrentWeekNumber } from '../../src/utils/scheduleUtils';
import { CupertinoIcon } from '../../src/components/CupertinoIcon';
import { ScheduleStoreV2 } from './schedule';

const WEEKDAY_LETTERS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
const DAYS_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_UPPER = [
  'ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
  'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ',
];
const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const formatDateKey = (year: number, month: number, day: number): string => {
  const m = (month + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export default function CalendarScreen() {
  const { theme } = useAppTheme();
  const { config } = useConfig();
  const { todos, toggleCompleteTodo, saveTodo, deleteTodo } = useTodo();
  const { notes, saveNote, deleteNote } = useNotes();

  const now = new Date();
  const [calYear, setCalYear] = useState<number>(now.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate());

  const [scheduleData, setScheduleData] = useState<ScheduleStoreV2>({
    weekly: {
      1: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      2: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    },
    calendarEvents: {},
  });

  // Modal for Day Details (opened upon clicking a date)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'event' | 'todo' | 'note'>('event');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddTime, setQuickAddTime] = useState('10:00 - 11:30');
  const [quickNoteContent, setQuickNoteContent] = useState('');

  const eventMarkerColor = config.calendarEventMarkerColor || '#0a84ff';
  const deadlineMarkerColor = config.calendarDeadlineMarkerColor || '#ff453a';

  const refreshSchedule = async () => {
    const raw = await loadData<any>(KEYS.SCHEDULE, null);
    if (raw) {
      if (raw.weekly && raw.calendarEvents) {
        setScheduleData(raw);
      }
    }
  };

  useEffect(() => {
    refreshSchedule();
    const interval = setInterval(refreshSchedule, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isDayModalOpen) return;
    const onBackPress = () => {
      if (isQuickAddOpen) {
        setIsQuickAddOpen(false);
        return true;
      }
      setIsDayModalOpen(false);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isDayModalOpen, isQuickAddOpen]);

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(calYear, calMonth + 1, 0).getDate();
  }, [calYear, calMonth]);

  const firstDayOfWeek = useMemo(() => {
    const rawDay = new Date(calYear, calMonth, 1).getDay();
    return rawDay === 0 ? 6 : rawDay - 1; // 0: Mon, 6: Sun
  }, [calYear, calMonth]);

  // Mathematically strict table weeks: exactly 7 cells per row
  const calendarWeeks = useMemo(() => {
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [firstDayOfWeek, daysInMonth]);

  const changeMonth = (direction: -1 | 1) => {
    let nextMonth = calMonth + direction;
    let nextYear = calYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setCalYear(nextYear);
    setCalMonth(nextMonth);
    setSelectedDay(1);
  };

  const jumpToToday = () => {
    const today = new Date();
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const selectedDateKey = useMemo(() => {
    return formatDateKey(calYear, calMonth, selectedDay);
  }, [calYear, calMonth, selectedDay]);

  const selectedDateObj = useMemo(() => {
    return new Date(calYear, calMonth, selectedDay);
  }, [calYear, calMonth, selectedDay]);

  // Only specific calendar events (NOT the weekly recurring schedule pairs!)
  const getCalendarEventsForDay = (day: number): Lesson[] => {
    const key = formatDateKey(calYear, calMonth, day);
    return scheduleData.calendarEvents[key] || [];
  };

  // Weekly classes/pairs on this day (for modal details only)
  const getWeeklyLessonsForDay = (day: number): Lesson[] => {
    const date = new Date(calYear, calMonth, day);
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const weekNum = getCurrentWeekNumber(date);
    return scheduleData.weekly[weekNum]?.[dayOfWeek] || [];
  };

  // Task deadlines on this day
  const getTodosForDay = (day: number): TodoItem[] => {
    return todos.filter((t) => {
      if (!t.deadline) return false;
      const tDate = new Date(t.deadline);
      if (isNaN(tDate.getTime())) return false;
      return (
        tDate.getFullYear() === calYear &&
        tDate.getMonth() === calMonth &&
        tDate.getDate() === day
      );
    });
  };

  // Notes in Calendar folder created on this day
  const getCalendarNotesForDay = (day: number) => {
    return notes.filter((n) => {
      if (n.folderId !== SYSTEM_CALENDAR_FOLDER_ID) return false;
      if (n.id.startsWith('ev-')) return false;
      const nDate = new Date(n.createdAt);
      return (
        nDate.getFullYear() === calYear &&
        nDate.getMonth() === calMonth &&
        nDate.getDate() === day
      );
    });
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    setIsDayModalOpen(true);
  };

  const selectedDaySingleEvents = useMemo(() => {
    return getCalendarEventsForDay(selectedDay);
  }, [calYear, calMonth, selectedDay, scheduleData]);

  const selectedDayWeeklyLessons = useMemo(() => {
    return getWeeklyLessonsForDay(selectedDay);
  }, [calYear, calMonth, selectedDay, scheduleData]);

  const selectedDayTodos = useMemo(() => {
    return getTodosForDay(selectedDay);
  }, [calYear, calMonth, selectedDay, todos]);

  const selectedDayNotes = useMemo(() => {
    return getCalendarNotesForDay(selectedDay);
  }, [calYear, calMonth, selectedDay, notes]);

  const handleDeleteTodo = async (todoId: string) => {
    await deleteTodo(todoId);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const list = scheduleData.calendarEvents[selectedDateKey] || [];
    const nextList = list.filter((e) => e.id !== eventId);
    const nextSchedule: ScheduleStoreV2 = {
      ...scheduleData,
      calendarEvents: {
        ...scheduleData.calendarEvents,
        [selectedDateKey]: nextList,
      },
    };
    setScheduleData(nextSchedule);
    await saveData(KEYS.SCHEDULE, nextSchedule);

    const mirror = notes.find((n) => n.id === `ev-${eventId}`);
    if (mirror) {
      await deleteNote(mirror.id);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
  };

  const handleSaveQuickItem = async () => {
    const trimmed = quickAddTitle.trim();
    if (!trimmed) {
      setIsQuickAddOpen(false);
      return;
    }

    if (quickAddType === 'todo') {
      const targetDate = new Date(calYear, calMonth, selectedDay, 18, 0, 0);
      await saveTodo({
        title: trimmed,
        description: '',
        isCompleted: false,
        folderId: SYSTEM_CALENDAR_FOLDER_ID,
        deadline: targetDate.getTime(),
      });
    } else if (quickAddType === 'note') {
      await saveNote({
        title: trimmed,
        content: quickNoteContent.trim() || `Заметка на дату ${selectedDateKey}`,
        folderId: SYSTEM_CALENDAR_FOLDER_ID,
        isPinned: false,
      });
    } else {
      const newLessonId = Date.now().toString();
      const newLesson: Lesson = {
        id: newLessonId,
        subject: trimmed,
        startTime: quickAddTime.trim().split('-')[0]?.trim() || '10:00',
        time: quickAddTime.trim() || '10:00 - 11:30',
        room: '—',
        type: 'Встреча',
        recurrence: 'once',
        date: selectedDateKey,
      };
      const nextSchedule: ScheduleStoreV2 = {
        ...scheduleData,
        calendarEvents: {
          ...scheduleData.calendarEvents,
          [selectedDateKey]: [...(scheduleData.calendarEvents[selectedDateKey] || []), newLesson],
        },
      };
      setScheduleData(nextSchedule);
      await saveData(KEYS.SCHEDULE, nextSchedule);

      // Mirror as note into the system Calendar folder
      await saveNote({
        id: `ev-${newLessonId}`,
        title: `${trimmed} (${quickAddTime.trim() || '10:00'})`,
        content: `Событие календаря на ${selectedDateKey}`,
        folderId: SYSTEM_CALENDAR_FOLDER_ID,
        isPinned: false,
      });
    }

    setQuickAddTitle('');
    setQuickNoteContent('');
    setIsQuickAddOpen(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Centered Calendar Card matching Screenshot */}
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={[styles.calendarCard, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
          {/* Header Row: Month Name, Nav Arrows & Today */}
          <View style={styles.headerRow}>
            <Text style={[styles.monthTitleText, { color: theme.textPrimary }]}>
              {MONTHS_UPPER[calMonth]} {calYear}
            </Text>

            <View style={styles.headerNavControls}>
              <TouchableOpacity
                onPress={() => changeMonth(-1)}
                style={[styles.navBtn, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}
                accessibilityLabel="Предыдущий месяц"
                accessibilityRole="button">
                <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>◀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={jumpToToday}
                style={[styles.todayBtn, { backgroundColor: theme.pillBg, borderColor: theme.border }]}
                accessibilityRole="button">
                <Text style={[styles.todayBtnText, { color: theme.accent }]}>Сегодня</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => changeMonth(1)}
                style={[styles.navBtn, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}
                accessibilityLabel="Следующий месяц"
                accessibilityRole="button">
                <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Table: Weekday Letters Row (П В С Ч П С В) */}
          <View style={styles.tableRow}>
            {WEEKDAY_LETTERS.map((letter, i) => (
              <View key={`wk-${i}`} style={styles.tableCell}>
                <Text style={[styles.weekdayColText, { color: theme.textSecondary }]}>
                  {letter}
                </Text>
              </View>
            ))}
          </View>

          {/* Table: Weeks & Days Grid (Strict 7 columns) */}
          <View style={styles.gridTable}>
            {calendarWeeks.map((week, wIdx) => (
              <View key={`week-${wIdx}`} style={styles.tableRow}>
                {week.map((day, dIdx) => {
                  if (day === null) {
                    return <View key={`empty-${wIdx}-${dIdx}`} style={styles.tableCell} />;
                  }

                  const isSelected =
                    selectedDay === day &&
                    calMonth === selectedDateObj.getMonth() &&
                    calYear === selectedDateObj.getFullYear();

                  const isTodayDay =
                    day === now.getDate() &&
                    calMonth === now.getMonth() &&
                    calYear === now.getFullYear();

                  const hasCalendarEvent =
                    getCalendarEventsForDay(day).length > 0 ||
                    getCalendarNotesForDay(day).length > 0;
                  const hasDeadline = getTodosForDay(day).length > 0;

                  return (
                    <View key={`day-${day}`} style={styles.tableCell}>
                      <TouchableOpacity
                        onPress={() => handleSelectDay(day)}
                        activeOpacity={0.7}
                        style={styles.cellTouchable}
                        accessibilityRole="button"
                        accessibilityLabel={`${day} ${MONTHS_GENITIVE[calMonth]}`}>
                        <View
                          style={[
                            styles.dayCircle,
                            isSelected && { backgroundColor: theme.accent },
                            isTodayDay && !isSelected && { borderWidth: 2, borderColor: theme.accent },
                          ]}>
                          <Text
                            style={[
                              styles.dayText,
                              { color: theme.textPrimary },
                              isSelected && { color: '#ffffff', fontWeight: '800' },
                              isTodayDay && !isSelected && { color: theme.accent, fontWeight: '700' },
                            ]}>
                            {day}
                          </Text>
                        </View>

                        {/* Event & Deadline Dots Indicator Row */}
                        <View style={styles.dotsRow}>
                          {hasCalendarEvent && (
                            <View
                              style={[
                                styles.dot,
                                { backgroundColor: isSelected ? '#ffffff' : eventMarkerColor },
                              ]}
                            />
                          )}
                          {hasDeadline && (
                            <View
                              style={[
                                styles.dot,
                                { backgroundColor: isSelected ? '#ffffff' : deadlineMarkerColor },
                              ]}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Indicator Legend & Day Summary Banner */}
          <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: eventMarkerColor }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>Событие</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: deadlineMarkerColor }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>Дедлайн</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsDayModalOpen(true)}
              style={[styles.openModalBtn, { backgroundColor: theme.pillBg, borderColor: theme.border }]}
              accessibilityRole="button">
              <Text style={[styles.openModalBtnText, { color: theme.accent }]}>
                {selectedDay} {MONTHS_GENITIVE[calMonth]} • Открыть день
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal: Full Day Details & Action Sheet */}
      <Modal visible={isDayModalOpen} transparent animationType="fade" onRequestClose={() => setIsDayModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsDayModalOpen(false)}
          />

          <View style={[styles.modalSheet, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalDateTitle, { color: theme.textPrimary }]}>
                  {selectedDay} {MONTHS_GENITIVE[calMonth]} {calYear}
                </Text>
                <Text style={[styles.modalDaySub, { color: theme.textSecondary }]}>
                  {DAYS_FULL[selectedDateObj.getDay()]}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsDayModalOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button">
                <CupertinoIcon name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 360, flexGrow: 0 }}
              contentContainerStyle={{ paddingVertical: 4, flexGrow: 0, justifyContent: 'flex-start' }}
              showsVerticalScrollIndicator={true}
              bounces={false}>
              {/* Tasks Section (Deadlines) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <View style={[styles.legendDot, { backgroundColor: deadlineMarkerColor }]} />
                <Text style={[styles.sectionHeader, { color: deadlineMarkerColor, marginBottom: 0 }]}>
                  Дедлайны задач ({selectedDayTodos.length})
                </Text>
              </View>
              {selectedDayTodos.length === 0 ? (
                <Text style={[styles.emptySectionText, { color: theme.textMuted }]}>
                  Нет задач с дедлайном на эту дату
                </Text>
              ) : (
                selectedDayTodos.map((todo) => (
                  <View
                    key={todo.id}
                    style={[styles.itemRow, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
                    <TouchableOpacity
                      onPress={() => toggleCompleteTodo(todo.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: todo.isCompleted }}>
                      <View
                        style={[
                          styles.taskCheckbox,
                          { borderColor: todo.isCompleted ? theme.accent : deadlineMarkerColor },
                          todo.isCompleted && { backgroundColor: theme.accent },
                        ]}>
                        {todo.isCompleted && <CupertinoIcon name="checkmark" size={12} color="#ffffff" />}
                      </View>
                      <Text
                        style={[
                          styles.itemTitle,
                          { color: theme.textPrimary },
                          todo.isCompleted && { textDecorationLine: 'line-through', color: theme.textMuted },
                        ]}
                        numberOfLines={1}>
                        {todo.title}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteTodo(todo.id)}
                      style={styles.deleteRowBtn}
                      accessibilityLabel="Удалить задачу"
                      accessibilityRole="button">
                      <CupertinoIcon name="close" size={13} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Single Calendar Events Section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 6 }}>
                <View style={[styles.legendDot, { backgroundColor: eventMarkerColor }]} />
                <Text style={[styles.sectionHeader, { color: eventMarkerColor, marginBottom: 0 }]}>
                  События календаря ({selectedDaySingleEvents.length})
                </Text>
              </View>
              {selectedDaySingleEvents.length === 0 ? (
                <Text style={[styles.emptySectionText, { color: theme.textMuted }]}>
                  Нет персональных событий на этот день
                </Text>
              ) : (
                selectedDaySingleEvents.map((ev) => (
                  <View
                    key={ev.id}
                    style={[styles.itemRow, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
                    <CupertinoIcon name="calendar" size={15} color={eventMarkerColor} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.itemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {ev.subject}
                      </Text>
                      <Text style={[styles.itemSub, { color: theme.textSecondary }]} numberOfLines={1}>
                        {ev.time} {ev.room && ev.room !== '—' ? `• ${ev.room}` : ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteEvent(ev.id)}
                      style={styles.deleteRowBtn}
                      accessibilityLabel="Удалить событие"
                      accessibilityRole="button">
                      <CupertinoIcon name="close" size={13} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Notes in Calendar Folder Section */}
              {selectedDayNotes.length > 0 && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 6 }}>
                    <CupertinoIcon name="document" size={13} color={theme.accent} />
                    <Text style={[styles.sectionHeader, { color: theme.accent, marginBottom: 0 }]}>
                      Заметки календаря ({selectedDayNotes.length})
                    </Text>
                  </View>
                  {selectedDayNotes.map((note) => (
                    <View
                      key={note.id}
                      style={[styles.itemRow, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
                      <CupertinoIcon name="document" size={14} color={theme.accent} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={[styles.itemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                          {note.title}
                        </Text>
                        {note.content ? (
                          <Text style={[styles.itemSub, { color: theme.textSecondary }]} numberOfLines={1}>
                            {note.content}
                          </Text>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleDeleteNote(note.id)}
                        style={styles.deleteRowBtn}
                        accessibilityLabel="Удалить заметку"
                        accessibilityRole="button">
                        <CupertinoIcon name="close" size={13} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              {/* Weekly Classes / Routine (for reference) */}
              {selectedDayWeeklyLessons.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: theme.textSecondary, marginTop: 14 }]}>
                    Расписание пар ({selectedDayWeeklyLessons.length})
                  </Text>
                  {selectedDayWeeklyLessons.map((ev) => (
                    <View
                      key={ev.id}
                      style={[styles.itemRow, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
                      <CupertinoIcon name="clock" size={14} color={theme.textMuted} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={[styles.itemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                          {ev.subject}
                        </Text>
                        <Text style={[styles.itemSub, { color: theme.textSecondary }]}>
                          {ev.time} {ev.room && ev.room !== '—' ? `• ${ev.room}` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            {/* Quick Add Form / Toggle */}
            {isQuickAddOpen ? (
              <View style={[styles.quickAddCard, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
                <View style={styles.quickAddTypeSelector}>
                  <TouchableOpacity
                    onPress={() => setQuickAddType('event')}
                    style={[
                      styles.quickTypeBtn,
                      quickAddType === 'event' && { backgroundColor: eventMarkerColor },
                    ]}>
                    <Text
                      style={[
                        styles.quickTypeBtnText,
                        { color: quickAddType === 'event' ? '#ffffff' : theme.textSecondary },
                      ]}>
                      + Событие
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setQuickAddType('todo')}
                    style={[
                      styles.quickTypeBtn,
                      quickAddType === 'todo' && { backgroundColor: deadlineMarkerColor },
                    ]}>
                    <Text
                      style={[
                        styles.quickTypeBtnText,
                        { color: quickAddType === 'todo' ? '#ffffff' : theme.textSecondary },
                      ]}>
                      + Дедлайн
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setQuickAddType('note')}
                    style={[
                      styles.quickTypeBtn,
                      quickAddType === 'note' && { backgroundColor: theme.accent },
                    ]}>
                    <Text
                      style={[
                        styles.quickTypeBtnText,
                        { color: quickAddType === 'note' ? '#ffffff' : theme.textSecondary },
                      ]}>
                      + Заметка
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder={
                    quickAddType === 'event'
                      ? 'Название события...'
                      : quickAddType === 'todo'
                      ? 'Текст задачи с дедлайном...'
                      : 'Заголовок заметки...'
                  }
                  placeholderTextColor={theme.textMuted}
                  value={quickAddTitle}
                  onChangeText={setQuickAddTitle}
                  style={[styles.quickInput, { backgroundColor: theme.cardSolid, color: theme.textPrimary, borderColor: theme.border }]}
                />

                {quickAddType === 'event' && (
                  <TextInput
                    placeholder="Время: 10:00 - 11:30"
                    placeholderTextColor={theme.textMuted}
                    value={quickAddTime}
                    onChangeText={setQuickAddTime}
                    style={[styles.quickInput, { backgroundColor: theme.cardSolid, color: theme.textPrimary, borderColor: theme.border }]}
                  />
                )}

                {quickAddType === 'note' && (
                  <TextInput
                    placeholder="Текст заметки..."
                    placeholderTextColor={theme.textMuted}
                    value={quickNoteContent}
                    onChangeText={setQuickNoteContent}
                    multiline
                    style={[
                      styles.quickInput,
                      { height: 60, textAlignVertical: 'top', backgroundColor: theme.cardSolid, color: theme.textPrimary, borderColor: theme.border },
                    ]}
                  />
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={() => setIsQuickAddOpen(false)}
                    style={[styles.quickActionBtn, { backgroundColor: theme.cardSolid, borderColor: theme.border, borderWidth: 1 }]}>
                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600' }}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveQuickItem}
                    style={[
                      styles.quickActionBtn,
                      {
                        backgroundColor:
                          quickAddType === 'event'
                            ? eventMarkerColor
                            : quickAddType === 'todo'
                            ? deadlineMarkerColor
                            : theme.accent,
                      },
                    ]}>
                    <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>Добавить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsQuickAddOpen(true)}
                style={[styles.addTriggerBtn, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}
                accessibilityRole="button">
                <CupertinoIcon name="add" size={16} color={theme.accent} style={{ marginRight: 6 }} />
                <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>
                  Добавить событие, задачу или заметку
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 85 : 95,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 26,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  monthTitleText: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Strict Table Layout
  tableRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableCell: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  weekdayColText: {
    textAlign: 'center',
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  gridTable: {
    width: '100%',
    marginTop: 2,
  },
  cellTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dotsRow: {
    height: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Card Footer with Legend and Action Button
  cardFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  openModalBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  openModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Day Details Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    zIndex: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalDateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalDaySub: {
    fontSize: 13,
    marginTop: 3,
  },
  closeBtn: {
    padding: 6,
  },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptySectionText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
    paddingLeft: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  deleteRowBtn: {
    padding: 6,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },

  addTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  quickAddCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  quickAddTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickTypeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickTypeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
