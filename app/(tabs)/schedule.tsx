import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { loadData, saveData, KEYS } from '../../src/services/storage';

export type WeekNumber = 1 | 2;
export type LessonType = 'Лекция' | 'Практика' | 'Лабораторная';

export interface Lesson {
  id: string;
  time: string;
  subject: string;
  type: LessonType;
  room: string;
}

export type ScheduleStore = Record<WeekNumber, Record<number, Lesson[]>>;

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const LESSON_TYPES: LessonType[] = ['Лекция', 'Практика', 'Лабораторная'];

// Полностью пустая структура для обеих недель
const EMPTY_SCHEDULE: ScheduleStore = {
  1: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] },
  2: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] },
};

export default function ScheduleScreen() {
  const { theme, isScheduleEditable } = useAppTheme();
  const [schedule, setSchedule] = useState<ScheduleStore>(EMPTY_SCHEDULE);
  const [numberOfWeek, setNumberOfWeek] = useState<WeekNumber>(1);
  const [selectedDay, setSelectedDay] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('Лекция');

  useEffect(() => {
    loadData<ScheduleStore>(KEYS.SCHEDULE, EMPTY_SCHEDULE).then((loaded) => {
      if (loaded && loaded[1] && loaded[2]) {
        setSchedule(loaded);
      } else {
        setSchedule(EMPTY_SCHEDULE);
      }
    });
  }, []);

  const handleAddLesson = async () => {
    if (!subject.trim()) return;

    const newLesson: Lesson = {
      id: Date.now().toString(),
      subject: subject.trim(),
      time: time.trim() || 'Пара',
      room: room.trim() || '—',
      type: lessonType,
    };

    const currentDayLessons = schedule[numberOfWeek]?.[selectedDay] || [];
    const updated: ScheduleStore = {
      ...schedule,
      [numberOfWeek]: {
        ...(schedule[numberOfWeek] || {}),
        [selectedDay]: [...currentDayLessons, newLesson],
      },
    };

    setSchedule(updated);
    await saveData(KEYS.SCHEDULE, updated);

    setSubject('');
    setTime('');
    setRoom('');
    setIsModalOpen(false);
  };

  const handleDeleteLesson = async (id: string) => {
    const currentDayLessons = schedule[numberOfWeek]?.[selectedDay] || [];
    const updated: ScheduleStore = {
      ...schedule,
      [numberOfWeek]: {
        ...schedule[numberOfWeek],
        [selectedDay]: currentDayLessons.filter((l) => l.id !== id),
      },
    };

    setSchedule(updated);
    await saveData(KEYS.SCHEDULE, updated);
  };

  const currentLessons = schedule[numberOfWeek]?.[selectedDay] || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 1-я неделя / 2-я неделя */}
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
            1-я неделя
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
            2-я неделя
          </Text>
        </TouchableOpacity>
      </View>

      {/* Дни недели */}
      <View style={[styles.daysRow, { backgroundColor: theme.surface }]}>
        {DAYS.map((day, index) => {
          const isActive = selectedDay === index;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(index)}
              style={[
                styles.dayTab,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9' },
                isActive && { backgroundColor: theme.accent },
              ]}>
              <Text
                style={[
                  styles.dayTabText,
                  { color: isActive ? '#ffffff' : theme.textSecondary },
                ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Список занятий */}
      <ScrollView contentContainerStyle={styles.list}>
        {currentLessons.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎓</Text>
            <Text style={[styles.emptyText, { color: theme.textPrimary, fontWeight: '700', fontSize: 16 }]}>
              Пар нет
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              {isScheduleEditable
                ? 'Нажмите на плюс внизу, чтобы добавить занятие'
                : 'Включите режим редактирования в настройках ⚙️, чтобы составить расписание'}
            </Text>
          </View>
        ) : (
          currentLessons.map((item) => (
            <View
              key={item.id}
              style={[
                styles.lessonCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}>
              <View style={[styles.timeBlock, { borderRightColor: theme.border }]}>
                <Text style={[styles.timeText, { color: theme.textPrimary }]}>{item.time}</Text>
                <View style={[styles.typeBadge, { backgroundColor: theme.pillBg }]}>
                  <Text style={[styles.typeText, { color: theme.accent }]}>{item.type}</Text>
                </View>
              </View>

              <View style={styles.infoBlock}>
                <Text style={[styles.subjectText, { color: theme.textPrimary }]}>{item.subject}</Text>
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
            </View>
          ))
        )}
      </ScrollView>

      {/* Кнопка добавления */}
      {isScheduleEditable && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          activeOpacity={0.85}
          onPress={() => setIsModalOpen(true)}>
          <View style={styles.plusContainer}>
            <View style={styles.plusHorizontal} />
            <View style={styles.plusVertical} />
          </View>
        </TouchableOpacity>
      )}

      {/* Модалка добавления пары */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsModalOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Пара ({numberOfWeek}-я неделя, {DAYS[selectedDay]})
            </Text>

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

            <TextInput
              placeholder="Время (напр. 08:30 - 10:05)"
              placeholderTextColor={theme.textSecondary}
              value={time}
              onChangeText={setTime}
              style={[
                styles.modalInput,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
              ]}
            />

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

            <View style={styles.typeSelectorRow}>
              {LESSON_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setLessonType(t)}
                  style={[
                    styles.typeSelectorBtn,
                    { borderColor: theme.border },
                    lessonType === t && { backgroundColor: theme.pillBg, borderColor: theme.accent },
                  ]}>
                  <Text
                    style={[
                      styles.typeSelectorText,
                      { color: lessonType === t ? theme.accent : theme.textSecondary },
                    ]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddLesson}
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekToggleContainer: { flexDirection: 'row', padding: 12, gap: 12, borderBottomWidth: 1 },
  weekButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  weekButtonText: { fontSize: 14, fontWeight: '600' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  dayTab: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  dayTabText: { fontWeight: '700', fontSize: 13 },
  list: { padding: 16, paddingBottom: 100 },
  empty: { marginTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16 },
  lessonCard: { flexDirection: 'row', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  timeBlock: { width: 105, borderRightWidth: 1, paddingRight: 10 },
  timeText: { fontSize: 12.5, fontWeight: '700', marginBottom: 6 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  typeText: { fontSize: 11, fontWeight: '700' },
  infoBlock: { flex: 1, paddingLeft: 12, justifyContent: 'center' },
  subjectText: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  roomText: { fontSize: 13 },
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
  modalSheet: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  typeSelectorRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  typeSelectorBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  typeSelectorText: { fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
