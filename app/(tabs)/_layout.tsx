import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Modal,
  PanResponder,
  useWindowDimensions,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { InitialScreenType, LessonTimeSlot } from '../../src/types/config';
import { calculateEndTime } from '../../src/utils/scheduleUtils';

import NotesScreen from '.';
import ScheduleScreen from './schedule';
import RemindersScreen from './reminders';

const appIcon = require('../../assets/images/snotes_icon.png');

const TABS = [
  { key: 'notes', title: 'Заметки' },
  { key: 'schedule', title: 'Расписание' },
  { key: 'reminders', title: 'To-Do лист' },
];

const ISLAND_WIDTH = 340;
const PADDING = 5;
const INNER_WIDTH = ISLAND_WIDTH - PADDING * 2;
const TAB_WIDTH = INNER_WIDTH / TABS.length;
const SWIPE_THRESHOLD = 60;

export default function TabLayout() {
  const { theme, setMode, isScheduleEditable, toggleScheduleEditable } = useAppTheme();
  const { config, updateConfig, updateInitialScreen } = useConfig();
  const { width: screenWidth } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSlots, setEditingSlots] = useState<LessonTimeSlot[]>([]);
  const [durationInput, setDurationInput] = useState('95');
  const [isConfigEditorOpen, setIsConfigEditorOpen] = useState(false);

  // Анимированное смещение экранов
  const pageTranslateX = useRef(new Animated.Value(0)).current;

  // Инициализация активной вкладки на основе настроек
  useEffect(() => {
    let initialIdx = 0;
    if (config.initialScreen === 'Schedule') initialIdx = 1;
    else if (config.initialScreen === 'Todo') initialIdx = 2;

    setActiveIndex(initialIdx);
    pageTranslateX.setValue(-initialIdx * screenWidth);
  }, [config.initialScreen]);

  useEffect(() => {
    if (config.timeSlots) setEditingSlots(config.timeSlots);
    if (config.defaultDurationMinutes) setDurationInput(config.defaultDurationMinutes.toString());
  }, [config]);

  // Анимированное положение ползунка на таб-баре
  const pillTranslateX = pageTranslateX.interpolate({
    inputRange: [-screenWidth * 2, -screenWidth, 0],
    outputRange: [TAB_WIDTH * 2, TAB_WIDTH, 0],
    extrapolate: 'clamp',
  });

  const goToTab = (index: number) => {
    setActiveIndex(index);
    Animated.spring(pageTranslateX, {
      toValue: -index * screenWidth,
      damping: 22,
      stiffness: 200,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const baseOffset = -activeIndexRef.current * screenWidth;
        let nextOffset = baseOffset + gestureState.dx;

        if (nextOffset > 0) {
          nextOffset = gestureState.dx * 0.25;
        } else if (nextOffset < -2 * screenWidth) {
          const over = nextOffset - (-2 * screenWidth);
          nextOffset = -2 * screenWidth + over * 0.25;
        }

        pageTranslateX.setValue(nextOffset);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentIdx = activeIndexRef.current;

        if (gestureState.dx < -SWIPE_THRESHOLD && currentIdx < 2) {
          goToTab(currentIdx + 1);
        } else if (gestureState.dx > SWIPE_THRESHOLD && currentIdx > 0) {
          goToTab(currentIdx - 1);
        } else {
          goToTab(currentIdx);
        }
      },
    })
  ).current;

  // Динамический перерасчет времени при изменении длительности
  const handleDurationChange = (newDurStr: string) => {
    setDurationInput(newDurStr);
    const dur = parseInt(newDurStr, 10) || 95;
    const updatedSlots = editingSlots.map((slot) => ({
      ...slot,
      endTime: calculateEndTime(slot.startTime, dur) || slot.endTime,
    }));
    setEditingSlots(updatedSlots);
  };

  // Редактирование времени начала пары (время конца пересчитывается автоматически)
  const handleSlotStartTimeChange = (index: number, newStartTime: string) => {
    const dur = parseInt(durationInput, 10) || 95;
    const next = [...editingSlots];
    const calculatedEnd = calculateEndTime(newStartTime, dur);
    next[index] = {
      ...next[index],
      startTime: newStartTime,
      endTime: calculatedEnd || next[index].endTime,
    };
    setEditingSlots(next);
  };

  // Добавление пары (до 8 пар максимум)
  const handleAddSlot = () => {
    if (editingSlots.length >= 8) return;
    const dur = parseInt(durationInput, 10) || 95;
    const nextNum = editingSlots.length + 1;
    let newStart = '08:00';

    if (editingSlots.length > 0) {
      const lastSlot = editingSlots[editingSlots.length - 1];
      const lastEnd = calculateEndTime(lastSlot.startTime, dur) || lastSlot.endTime || '09:35';
      const parts = lastEnd.split(':');
      if (parts.length === 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          const nextStartMins = (h * 60 + m + 15) % (24 * 60);
          const sh = Math.floor(nextStartMins / 60).toString().padStart(2, '0');
          const sm = (nextStartMins % 60).toString().padStart(2, '0');
          newStart = `${sh}:${sm}`;
        }
      }
    }

    const newEnd = calculateEndTime(newStart, dur);
    const newSlot: LessonTimeSlot = {
      lessonNumber: nextNum,
      startTime: newStart,
      endTime: newEnd,
    };
    setEditingSlots([...editingSlots, newSlot]);
  };

  // Удаление пары
  const handleDeleteSlot = (index: number) => {
    const filtered = editingSlots.filter((_, i) => i !== index);
    const renumbered = filtered.map((slot, i) => ({
      ...slot,
      lessonNumber: i + 1,
    }));
    setEditingSlots(renumbered);
  };

  // Сохранение конфигурации
  const handleSaveConfig = async () => {
    const dur = parseInt(durationInput, 10) || 95;
    await updateConfig({
      defaultDurationMinutes: dur,
      timeSlots: editingSlots,
    });
    setIsConfigEditorOpen(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Шапка с отображением иконки приложения */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Image source={appIcon} style={styles.appIconLogo} resizeMode="contain" />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>SNotes</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsSettingsOpen(true)}
          style={styles.settingsBtn}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Контейнер экранов, управляемый жестами */}
      <View style={styles.screensWrapper} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.screensTrack,
            {
              width: screenWidth * 3,
              transform: [{ translateX: pageTranslateX }],
            },
          ]}>
          <View style={{ width: screenWidth, flex: 1 }}>
            <NotesScreen />
          </View>
          <View style={{ width: screenWidth, flex: 1 }}>
            <ScheduleScreen />
          </View>
          <View style={{ width: screenWidth, flex: 1 }}>
            <RemindersScreen />
          </View>
        </Animated.View>
      </View>

      {/* Плавающий таб-бар с ползунком */}
      <View style={styles.floatingContainer} pointerEvents="box-none">
        <View style={[styles.island, { backgroundColor: theme.tabBarBg, borderColor: theme.border }]}>
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width: TAB_WIDTH,
                backgroundColor: theme.pillBg,
                borderColor: theme.accent,
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
          />

          {TABS.map((tab, index) => {
            const isFocused = activeIndex === index;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => goToTab(index)}
                activeOpacity={0.7}
                style={styles.tabItem}>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? theme.accent : theme.textSecondary },
                    isFocused && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Модалка настроек */}
      <Modal
        visible={isSettingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSettingsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsSettingsOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Настройки</Text>

              {/* Тема */}
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Тема</Text>
              <View style={styles.themeOptionsRow}>
                <TouchableOpacity
                  onPress={() => setMode('dark')}
                  style={[
                    styles.themeOption,
                    { borderColor: theme.mode === 'dark' ? theme.accent : theme.border },
                    theme.mode === 'dark' && { backgroundColor: theme.pillBg },
                  ]}>
                  <Text style={{ fontSize: 22 }}>🌙</Text>
                  <Text style={[styles.themeOptionText, { color: theme.textPrimary }]}>Тёмная</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMode('light')}
                  style={[
                    styles.themeOption,
                    { borderColor: theme.mode === 'light' ? theme.accent : theme.border },
                    theme.mode === 'light' && { backgroundColor: theme.pillBg },
                  ]}>
                  <Text style={{ fontSize: 22 }}>☀️</Text>
                  <Text style={[styles.themeOptionText, { color: theme.textPrimary }]}>Светлая</Text>
                </TouchableOpacity>
              </View>

              {/* Основной экран при запуске */}
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Главная страница при запуске</Text>
              <View style={styles.initialScreenRow}>
                {[
                  { key: 'Notes', label: 'Заметки' },
                  { key: 'Schedule', label: 'Расписание' },
                  { key: 'Todo', label: 'To-Do' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => updateInitialScreen(item.key as InitialScreenType)}
                    style={[
                      styles.initialScreenBtn,
                      { borderColor: theme.border },
                      config.initialScreen === item.key && {
                        backgroundColor: theme.pillBg,
                        borderColor: theme.accent,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.initialScreenText,
                        { color: config.initialScreen === item.key ? theme.accent : theme.textSecondary },
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Расписание */}
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 14 }]}>Расписание</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleScheduleEditable}
                style={[
                  styles.settingRow,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', borderColor: theme.border },
                ]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingRowTitle, { color: theme.textPrimary }]}>
                    Режим редактирования
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: theme.textSecondary }]}>
                    Разрешить добавление и удаление пар
                  </Text>
                </View>
                <View
                  style={[
                    styles.switchTrack,
                    { backgroundColor: isScheduleEditable ? theme.accent : '#64748b' },
                  ]}>
                  <View
                    style={[
                      styles.switchThumb,
                      isScheduleEditable ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Сетка пар и длительность */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsConfigEditorOpen(true)}
                style={[
                  styles.settingRow,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', borderColor: theme.border },
                ]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingRowTitle, { color: theme.textPrimary }]}>
                    Конфигуратор расписания ⏱️
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: theme.textSecondary }]}>
                    Длительность: {config.defaultDurationMinutes} мин | Настроено пар: {editingSlots.length}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, color: theme.accent }}>➔</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSettingsOpen(false)}
                style={[styles.closeBtn, { backgroundColor: theme.surface, marginTop: 18 }]}>
                <Text style={[styles.closeBtnText, { color: theme.textPrimary }]}>Готово</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Модалка редактирования звонков/конфига пар */}
      <Modal
        visible={isConfigEditorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsConfigEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsConfigEditorOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border, maxWidth: 360 }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Конфигуратор расписания</Text>

            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Длительность пары (минут)</Text>
            <TextInput
              keyboardType="number-pad"
              value={durationInput}
              onChangeText={handleDurationChange}
              placeholder="95"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.configInput,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
              ]}
            />

            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 12 }]}>
              Список пар ({editingSlots.length} из 8)
            </Text>

            <ScrollView style={{ maxHeight: 220, marginBottom: 10 }}>
              {editingSlots.length === 0 ? (
                <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 14 }}>
                  Список пар пуст. Нажмите «+ Добавить пару» ниже
                </Text>
              ) : (
                editingSlots.map((slot, idx) => {
                  const endCalc = calculateEndTime(slot.startTime, parseInt(durationInput, 10) || 95) || slot.endTime;
                  return (
                    <View key={slot.lessonNumber} style={styles.slotEditRow}>
                      <Text style={[styles.slotNumberText, { color: theme.textPrimary }]}>
                        №{slot.lessonNumber}
                      </Text>
                      <TextInput
                        value={slot.startTime}
                        onChangeText={(val) => handleSlotStartTimeChange(idx, val)}
                        placeholder="08:00"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                          styles.slotTimeInput,
                          { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
                        ]}
                      />
                      <Text style={{ color: theme.textSecondary }}>➔</Text>
                      <View
                        style={[
                          styles.slotCalcTimeBadge,
                          { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#e2e8f0' },
                        ]}>
                        <Text style={[styles.slotCalcTimeText, { color: theme.accent }]}>
                          {endCalc || '—'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteSlot(idx)}
                        hitSlop={8}
                        style={{ padding: 4 }}>
                        <Text style={{ color: '#ef4444', fontSize: 14 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Кнопка добавления пары до 8 */}
            {editingSlots.length < 8 && (
              <TouchableOpacity
                onPress={handleAddSlot}
                style={[styles.addSlotBtn, { borderColor: theme.accent, backgroundColor: theme.pillBg }]}>
                <Text style={[styles.addSlotBtnText, { color: theme.accent }]}>
                  + Добавить пару ({editingSlots.length + 1}-я)
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setIsConfigEditorOpen(false)}
                style={[styles.closeBtn, { flex: 1, backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveConfig}
                style={[styles.closeBtn, { flex: 1, backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appIconLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsBtn: {
    padding: 6,
  },
  screensWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  screensTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  island: {
    position: 'relative',
    width: ISLAND_WIDTH,
    flexDirection: 'row',
    borderRadius: 26,
    padding: PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
  },
  slidingPill: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    bottom: PADDING,
    borderRadius: 21,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 10,
    zIndex: 10,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  initialScreenRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  initialScreenBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  initialScreenText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  settingRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingRowDesc: {
    fontSize: 11,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  configInput: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  slotEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  slotNumberText: {
    width: 28,
    fontSize: 13,
    fontWeight: '700',
  },
  slotTimeInput: {
    width: 75,
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  slotCalcTimeBadge: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotCalcTimeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addSlotBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSlotBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
