import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  BackHandler,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { loadData, saveData, KEYS } from '../../src/services/storage';
import { LessonType, WeekType, getLessonStyleConfig } from '../../src/types/schedule';
import {
  getCurrentDayIndex,
  getCurrentWeekNumber,
  isLessonCurrentlyActive,
} from '../../src/utils/scheduleUtils';
import { scheduleLessonNotifications } from '../../src/services/notificationService';
import { ScrollableWithBar } from '../../src/components/ScrollableWithBar';

export type WeekNumber = 1 | 2;

export interface Lesson {
  id: string;
  time: string;
  subject: string;
  type: LessonType;
  room: string;
  startTime?: string;
}

export type ScheduleStore = Record<WeekNumber, Record<number, Lesson[]>>;

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const LESSON_TYPES: LessonType[] = ['Лекция', 'Практика', 'Лабораторная'];

const EMPTY_SCHEDULE: ScheduleStore = {
  1: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] },
  2: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] },
};

// Функция извлечения времени для сортировки (например из "08:00 - 09:35" -> "08:00")
const getStartTimeForSort = (lesson: Lesson): string => {
  if (lesson.startTime) return lesson.startTime;
  if (!lesson.time) return '99:99';
  const match = lesson.time.match(/(\d{1,2}:\d{2})/);
  return match ? match[1].padStart(5, '0') : lesson.time;
};

// Сортировка списка занятий по времени
const sortLessons = (lessons: Lesson[]): Lesson[] => {
  return [...lessons].sort((a, b) => getStartTimeForSort(a).localeCompare(getStartTimeForSort(b)));
};

export default function ScheduleScreen() {
  const { theme, isScheduleEditable } = useAppTheme();
  const { config } = useConfig();
  const isTwoWeeks = config.twoWeeksEnabled !== false;

  // Автосинхронизация дня недели и номера недели с системным временем устройства
  const [schedule, setSchedule] = useState<ScheduleStore>(EMPTY_SCHEDULE);
  const [numberOfWeek, setNumberOfWeek] = useState<WeekNumber>(getCurrentWeekNumber());
  const [selectedDay, setSelectedDay] = useState<number>(getCurrentDayIndex());

  // Текущее время устройства (обновляется раз в 30 секунд для подсветки текущего занятия)
  const [tick, setTick] = useState<number>(Date.now());

  // Модалка создания / редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('Лекция');
  const [targetWeek, setTargetWeek] = useState<WeekType>(1);

  // Обновление таймера каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // BackHandler для закрытия модалки занятия
  useEffect(() => {
    if (!isModalOpen) return;
    const onBackPress = () => {
      setIsModalOpen(false);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isModalOpen]);

  // Загрузка расписания
  useEffect(() => {
    loadData<ScheduleStore>(KEYS.SCHEDULE, EMPTY_SCHEDULE).then((loaded) => {
      if (loaded && loaded[1] && loaded[2]) {
        const sortedStore: ScheduleStore = { 1: {}, 2: {} };
        [1, 2].forEach((w) => {
          const wNum = w as WeekNumber;
          sortedStore[wNum] = {};
          [0, 1, 2, 3, 4, 5].forEach((d) => {
            sortedStore[wNum][d] = sortLessons(loaded[wNum]?.[d] || []);
          });
        });
        setSchedule(sortedStore);
        // Запланировать уведомления
        if (config.notificationsEnabled) {
          scheduleLessonNotifications(sortedStore, true, isTwoWeeks);
        }
      } else {
        setSchedule(EMPTY_SCHEDULE);
      }
    });
  }, [config.notificationsEnabled, config.twoWeeksEnabled]);

  const activeWeek: WeekNumber = isTwoWeeks ? numberOfWeek : 1;

  const openCreateModal = () => {
    setEditingLessonId(null);
    setSubject('');
    setTime('');
    setRoom('');
    setLessonType('Лекция');
    setTargetWeek(activeWeek);
    setIsModalOpen(true);
  };

  const openEditModal = (lesson: Lesson) => {
    if (!isScheduleEditable) return;
    setEditingLessonId(lesson.id);
    setSubject(lesson.subject);
    setTime(lesson.time);
    setRoom(lesson.room || '');
    setLessonType(lesson.type);
    setTargetWeek(activeWeek);
    setIsModalOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!subject.trim()) return;

    const lessonId = editingLessonId || Date.now().toString();
    const startTimeVal = getStartTimeForSort({ id: '', subject: '', type: 'Лекция', room: '', time: time.trim() });

    const newLesson: Lesson = {
      id: lessonId,
      subject: subject.trim(),
      time: time.trim() || '08:00 - 09:35',
      room: room.trim() || '—',
      type: lessonType,
      startTime: startTimeVal,
    };

    let updated: ScheduleStore = { ...schedule };

    if (editingLessonId) {
      // Обновление существующего занятия
      const currentDayLessons = updated[activeWeek]?.[selectedDay] || [];
      const nextDayLessons = currentDayLessons.map((l) => (l.id === editingLessonId ? newLesson : l));
      updated[activeWeek][selectedDay] = sortLessons(nextDayLessons);
    } else {
      // Добавление новой
      const targetWeeksToAdd: WeekNumber[] = !isTwoWeeks
        ? [1]
        : targetWeek === 'both'
        ? [1, 2]
        : [(targetWeek as WeekNumber)];

      targetWeeksToAdd.forEach((w) => {
        const currentDayLessons = updated[w]?.[selectedDay] || [];
        const nextDayLessons = [...currentDayLessons, newLesson];
        updated[w][selectedDay] = sortLessons(nextDayLessons);
      });
    }

    setSchedule(updated);
    await saveData(KEYS.SCHEDULE, updated);

    // Обновляем запланированные уведомления
    if (config.notificationsEnabled) {
      scheduleLessonNotifications(updated, true, isTwoWeeks);
    }

    setIsModalOpen(false);
  };

  const handleDeleteLesson = async (id: string) => {
    const currentDayLessons = schedule[activeWeek]?.[selectedDay] || [];
    const updated: ScheduleStore = {
      ...schedule,
      [activeWeek]: {
        ...schedule[activeWeek],
        [selectedDay]: currentDayLessons.filter((l) => l.id !== id),
      },
    };

    setSchedule(updated);
    await saveData(KEYS.SCHEDULE, updated);
    if (config.notificationsEnabled) {
      scheduleLessonNotifications(updated, true, isTwoWeeks);
    }
    if (isModalOpen && editingLessonId === id) {
      setIsModalOpen(false);
    }
  };

  const selectTimeSlot = (slot: { startTime: string; endTime: string }) => {
    setTime(`${slot.startTime} - ${slot.endTime}`);
  };

  const currentLessons = schedule[activeWeek]?.[selectedDay] || [];
  const systemTodayIndex = getCurrentDayIndex();
  const systemWeekNum = getCurrentWeekNumber();
  const isViewingToday = selectedDay === systemTodayIndex && (!isTwoWeeks || numberOfWeek === systemWeekNum);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 1-я неделя / 2-я неделя (если включено разделение) */}
      {isTwoWeeks && (
        <View style={[styles.weekToggleContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.weekButton,
              { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9' },
              numberOfWeek === 1 && { backgroundColor: theme.accent },
            ]}
            onPress={() => setNumberOfWeek(1)}>
            <Text
              style={[
                styles.weekButtonText,
                { color: numberOfWeek === 1 ? '#ffffff' : theme.textSecondary },
              ]}>
              1-я неделя {systemWeekNum === 1 ? '• Текущая' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.weekButton,
              { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9' },
              numberOfWeek === 2 && { backgroundColor: theme.accent },
            ]}
            onPress={() => setNumberOfWeek(2)}>
            <Text
              style={[
                styles.weekButtonText,
                { color: numberOfWeek === 2 ? '#ffffff' : theme.textSecondary },
              ]}>
              2-я неделя {systemWeekNum === 2 ? '• Текущая' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Дни недели */}
      <View style={[styles.daysRow, { backgroundColor: theme.surface }]}>
        {DAYS.map((day, index) => {
          const isActive = selectedDay === index;
          const isSystemToday = index === systemTodayIndex;

          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(index)}
              style={[
                styles.dayTab,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9' },
                isActive && { backgroundColor: theme.accent },
                isSystemToday && !isActive && { borderWidth: 1.5, borderColor: theme.accent },
              ]}>
              <Text
                style={[
                  styles.dayTabText,
                  { color: isActive ? '#ffffff' : theme.textSecondary },
                  isSystemToday && !isActive && { color: theme.accent, fontWeight: '700' },
                ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Список занятий */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={true}>
        {currentLessons.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
            <Text style={[styles.emptyText, { color: theme.textPrimary, fontWeight: '700', fontSize: 16 }]}>
              Занятий нет
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              {isScheduleEditable
                ? 'Нажмите на плюс внизу, чтобы добавить занятие'
                : 'Включите режим редактирования в настройках ⚙️, чтобы составить расписание'}
            </Text>
          </View>
        ) : (
          currentLessons.map((item) => {
            // Динамический цвет из настроек пользователя
            const customColor = config.customLessonColors?.[item.type];
            const colorConfig = getLessonStyleConfig(item.type, customColor);

            const cardBg = theme.mode === 'dark' ? colorConfig.bgDark : colorConfig.bgLight;
            const badgeBg = theme.mode === 'dark' ? colorConfig.badgeBgDark : colorConfig.badgeBgLight;
            const textColor = theme.mode === 'dark' ? colorConfig.textDark : colorConfig.textLight;

            // Проверка, идет ли занятие прямо сейчас
            const isCurrentLesson = isViewingToday && isLessonCurrentlyActive(item.time);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={isScheduleEditable ? 0.7 : 1}
                onPress={() => openEditModal(item)}
                style={[
                  styles.lessonCard,
                  {
                    backgroundColor: cardBg,
                    borderLeftColor: colorConfig.border,
                    borderRightColor: isCurrentLesson ? '#ef4444' : theme.border,
                    borderTopColor: isCurrentLesson ? '#ef4444' : theme.border,
                    borderBottomColor: isCurrentLesson ? '#ef4444' : theme.border,
                    borderWidth: isCurrentLesson ? 2 : 1,
                    borderLeftWidth: 6,
                  },
                ]}>
                <View style={[styles.timeBlock, { borderRightColor: theme.border }]}>
                  <Text style={[styles.timeText, { color: theme.textPrimary }]}>{item.time}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.typeText, { color: textColor }]}>{item.type}</Text>
                  </View>
                </View>

                <View style={styles.infoBlock}>
                  <View style={styles.subjectRow}>
                    <Text style={[styles.subjectText, { color: theme.textPrimary }]} numberOfLines={2}>
                      {item.subject}
                    </Text>
                    {isCurrentLesson && (
                      <View style={styles.currentLessonBadge}>
                        <Text style={styles.currentLessonText}>🔴 Идет</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.roomText, { color: theme.textSecondary }]}>Ауд. {item.room}</Text>
                </View>

                {isScheduleEditable && (
                  <TouchableOpacity
                    onPress={() => handleDeleteLesson(item.id)}
                    hitSlop={10}
                    style={styles.deleteBtn}>
                    <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Кнопка добавления */}
      {isScheduleEditable && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          activeOpacity={0.85}
          onPress={openCreateModal}>
          <View style={styles.plusContainer}>
            <View style={styles.plusHorizontal} />
            <View style={styles.plusVertical} />
          </View>
        </TouchableOpacity>
      )}

      {/* Модалка добавления / редактирования занятия */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editingLessonId ? 'Редактировать занятие' : `Новое занятие (${DAYS[selectedDay]})`}
            </Text>

            <ScrollableWithBar
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 4 }}
              indicatorColor={theme.accent}
              trackRightOffset={-6}
              trackColor={theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}>

              {!editingLessonId && isTwoWeeks && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Добавить на неделю:</Text>
                  <View style={styles.targetWeekRow}>
                    <TouchableOpacity
                      onPress={() => setTargetWeek(1)}
                      style={[
                        styles.targetWeekBtn,
                        { borderColor: theme.border },
                        targetWeek === 1 && { backgroundColor: theme.pillBg, borderColor: theme.accent },
                      ]}>
                      <Text style={[styles.targetWeekText, { color: targetWeek === 1 ? theme.accent : theme.textSecondary }]}>
                        1-я неделя
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setTargetWeek(2)}
                      style={[
                        styles.targetWeekBtn,
                        { borderColor: theme.border },
                        targetWeek === 2 && { backgroundColor: theme.pillBg, borderColor: theme.accent },
                      ]}>
                      <Text style={[styles.targetWeekText, { color: targetWeek === 2 ? theme.accent : theme.textSecondary }]}>
                        2-я неделя
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setTargetWeek('both')}
                      style={[
                        styles.targetWeekBtn,
                        { borderColor: theme.border },
                        targetWeek === 'both' && { backgroundColor: theme.pillBg, borderColor: theme.accent },
                      ]}>
                      <Text style={[styles.targetWeekText, { color: targetWeek === 'both' ? theme.accent : theme.textSecondary }]}>
                        Обе недели
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Предмет</Text>
              <TextInput
                placeholder="Название предмета..."
                placeholderTextColor={theme.textSecondary}
                value={subject}
                onChangeText={setSubject}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
                ]}
              />

              {/* Быстрые слоты времени из настроек */}
              {config.timeSlots && config.timeSlots.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Быстрый выбор времени:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickTimeScroll}>
                    {config.timeSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot.lessonNumber}
                        onPress={() => selectTimeSlot(slot)}
                        style={[
                          styles.quickTimeChip,
                          { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#e2e8f0', borderColor: theme.border },
                        ]}>
                        <Text style={[styles.quickTimeText, { color: theme.textPrimary }]}>
                          №{slot.lessonNumber}: {slot.startTime}-{slot.endTime}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Время занятия</Text>
              <TextInput
                placeholder="Время (напр. 09:00 - 10:00)"
                placeholderTextColor={theme.textSecondary}
                value={time}
                onChangeText={setTime}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Аудитория</Text>
              <TextInput
                placeholder="Аудитория (напр. 312-1)"
                placeholderTextColor={theme.textSecondary}
                value={room}
                onChangeText={setRoom}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Тип занятия</Text>
              <View style={styles.typeSelectorRow}>
                {LESSON_TYPES.map((t) => {
                  const isSel = lessonType === t;
                  const customColor = config.customLessonColors?.[t];
                  const col = getLessonStyleConfig(t, customColor);

                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setLessonType(t)}
                      style={[
                        styles.typeSelectorBtn,
                        { borderColor: col.border },
                        isSel && { backgroundColor: theme.mode === 'dark' ? col.bgDark : col.bgLight },
                      ]}>
                      <Text
                        style={[
                          styles.typeSelectorText,
                          { color: isSel ? (theme.mode === 'dark' ? col.textDark : col.textLight) : theme.textSecondary },
                        ]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollableWithBar>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveLesson}
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {editingLessonId ? 'Сохранить' : 'Добавить'}
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
  weekToggleContainer: { flexDirection: 'row', padding: 12, gap: 12, borderBottomWidth: 1 },
  weekButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  weekButtonText: { fontSize: 13.5, fontWeight: '600' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  dayTab: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  dayTabText: { fontWeight: '700', fontSize: 13 },
  list: { padding: 16, paddingBottom: 100 },
  empty: { marginTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16 },
  lessonCard: {
    position: 'relative',
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  currentLessonBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'center',
  },
  currentLessonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ef4444',
  },
  timeBlock: { width: 105, borderRightWidth: 1, paddingRight: 10 },
  timeText: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  typeText: { fontSize: 11, fontWeight: '700' },
  infoBlock: { flex: 1, paddingLeft: 12, justifyContent: 'center' },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  subjectText: { flex: 1, fontSize: 15, fontWeight: '700' },
  roomText: { fontSize: 12.5 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  plusContainer: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  plusHorizontal: { position: 'absolute', width: 18, height: 2.5, backgroundColor: '#ffffff', borderRadius: 2 },
  plusVertical: { position: 'absolute', width: 2.5, height: 18, backgroundColor: '#ffffff', borderRadius: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalSheet: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  targetWeekRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  targetWeekBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  targetWeekText: { fontSize: 11, fontWeight: '600' },
  modalInput: { height: 42, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  quickTimeScroll: { marginBottom: 12, flexDirection: 'row' },
  quickTimeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6, borderWidth: 1 },
  quickTimeText: { fontSize: 11, fontWeight: '600' },
  typeSelectorRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  typeSelectorBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1.5 },
  typeSelectorText: { fontSize: 11.5, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
