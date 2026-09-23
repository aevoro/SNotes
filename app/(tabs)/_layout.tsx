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
  BackHandler,
  ToastAndroid,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import {
  InitialScreenType,
  LessonTimeSlot,
  COLOR_PALETTE,
  DEFAULT_LESSON_COLORS,
} from '../../src/types/config';
import { LessonType } from '../../src/types/schedule';
import { calculateEndTime } from '../../src/utils/scheduleUtils';
import { checkGitHubUpdate, UpdateInfo } from '../../src/services/updateService';
import { requestNotificationPermissions } from '../../src/services/notificationService';

import NotesScreen from '.';
import ScheduleScreen from './schedule';
import RemindersScreen from './reminders';

const appIcon = require('../../assets/images/snotes_icon.png');
const CURRENT_APP_VERSION = '1.0.1';

const TABS = [
  { key: 'notes', title: 'Заметки' },
  { key: 'schedule', title: 'Расписание' },
  { key: 'reminders', title: 'Задачи' },
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
  const [durationInput, setDurationInput] = useState('60');
  const [isConfigEditorOpen, setIsConfigEditorOpen] = useState(false);

  // Обновления GitHub
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);

  // Анимированное смещение экранов
  const pageTranslateX = useRef(new Animated.Value(0)).current;

  // Автопроверка обновлений на GitHub при запуске
  useEffect(() => {
    const autoCheckUpdates = async () => {
      try {
        const repo = config.githubRepo || 'aevoro/SNotes';
        const res = await checkGitHubUpdate(CURRENT_APP_VERSION, repo);
        if (res.hasUpdate) {
          setUpdateInfo(res);
          setIsUpdateModalOpen(true);
        }
      } catch {
        // Фоновая проверка не беспокоит пользователя при отсутствии интернета
      }
    };
    autoCheckUpdates();
  }, []);

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

  // Двойной клик назад для выхода
  const lastBackPressTime = useRef<number>(0);

  // Глобальный BackHandler для навигации
  useEffect(() => {
    const onBackPress = () => {
      // 1. Закрытие модалок настроек или обновлений
      if (isUpdateModalOpen) {
        setIsUpdateModalOpen(false);
        return true;
      }
      if (isConfigEditorOpen) {
        setIsConfigEditorOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }

      // 2. Возврат на начальную вкладку, если находимся на другой
      let initialIdx = 0;
      if (config.initialScreen === 'Schedule') initialIdx = 1;
      else if (config.initialScreen === 'Todo') initialIdx = 2;

      if (activeIndexRef.current !== initialIdx) {
        goToTab(initialIdx);
        return true;
      }

      // 3. Защита от случайного выхода: подтверждение повторным нажатием
      const now = Date.now();
      if (now - lastBackPressTime.current < 2000) {
        return false; // Позволить выйти из приложения
      }
      lastBackPressTime.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Нажмите «Назад» еще раз для выхода', ToastAndroid.SHORT);
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isSettingsOpen, isConfigEditorOpen, isUpdateModalOpen, config.initialScreen]);

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
    const dur = parseInt(newDurStr, 10) || 60;
    const updatedSlots = editingSlots.map((slot) => ({
      ...slot,
      endTime: calculateEndTime(slot.startTime, dur) || slot.endTime,
    }));
    setEditingSlots(updatedSlots);
  };

  // Редактирование времени начала слота
  const handleSlotStartTimeChange = (index: number, newStartTime: string) => {
    const dur = parseInt(durationInput, 10) || 60;
    const next = [...editingSlots];
    const calculatedEnd = calculateEndTime(newStartTime, dur);
    next[index] = {
      ...next[index],
      startTime: newStartTime,
      endTime: calculatedEnd || next[index].endTime,
    };
    setEditingSlots(next);
  };

  // Добавление слота (до 8 слотов максимум)
  const handleAddSlot = () => {
    if (editingSlots.length >= 8) return;
    const dur = parseInt(durationInput, 10) || 60;
    const nextNum = editingSlots.length + 1;
    let newStart = '09:00';

    if (editingSlots.length > 0) {
      const lastSlot = editingSlots[editingSlots.length - 1];
      const lastEnd = calculateEndTime(lastSlot.startTime, dur) || lastSlot.endTime || '10:00';
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

  // Удаление слота
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
    const dur = parseInt(durationInput, 10) || 60;
    await updateConfig({
      defaultDurationMinutes: dur,
      timeSlots: editingSlots,
    });
    setIsConfigEditorOpen(false);
  };

  // Выбор цвета для типа занятия
  const handleSelectLessonColor = async (type: LessonType, color: string) => {
    const current = config.customLessonColors || DEFAULT_LESSON_COLORS;
    await updateConfig({
      customLessonColors: {
        ...current,
        [type]: color,
      },
    });
  };

  // Переключение уведомлений
  const handleToggleNotifications = async () => {
    const nextVal = !config.notificationsEnabled;
    if (nextVal) {
      await requestNotificationPermissions();
    }
    await updateConfig({ notificationsEnabled: nextVal });
  };

  // Проверка обновлений
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg(null);
    try {
      const res = await checkGitHubUpdate(CURRENT_APP_VERSION, config.githubRepo || 'aevoro/SNotes');
      if (res.hasUpdate) {
        setUpdateInfo(res);
        setIsUpdateModalOpen(true);
      } else {
        setUpdateStatusMsg('У вас установлена последняя версия!');
      }
    } catch {
      setUpdateStatusMsg('Не удалось связаться с GitHub');
    } finally {
      setIsCheckingUpdate(false);
    }
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
            <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Настройки</Text>

              {/* Тема */}
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Тема оформления</Text>
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
                  { key: 'Todo', label: 'Задачи' },
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

              {/* Кастомизация цветов занятий */}
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 14 }]}>
                Цвета занятий в расписании
              </Text>
              {(['Лекция', 'Практика', 'Лабораторная'] as LessonType[]).map((type) => {
                const current = config.customLessonColors?.[type] || DEFAULT_LESSON_COLORS[type];
                return (
                  <View key={type} style={styles.colorConfigBlock}>
                    <View style={styles.colorConfigHeader}>
                      <Text style={[styles.colorTypeTitle, { color: theme.textPrimary }]}>{type}</Text>
                      <View style={[styles.currentColorBadge, { backgroundColor: current }]}>
                        <Text style={styles.currentColorHex}>{current}</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.paletteScrollContent}
                      style={styles.paletteScroll}>
                      {COLOR_PALETTE.map((c) => {
                        const isChosen = current.toLowerCase() === c.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={c}
                            activeOpacity={0.7}
                            onPress={() => handleSelectLessonColor(type, c)}
                            style={[
                              styles.colorCircleWrapper,
                              isChosen && {
                                borderColor: theme.mode === 'dark' ? '#ffffff' : theme.textPrimary,
                              },
                            ]}>
                            <View style={[styles.colorCircleInner, { backgroundColor: c }]} />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })}

              {/* Уведомления */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleNotifications}
                style={[
                  styles.settingRow,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', borderColor: theme.border, marginTop: 14 },
                ]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingRowTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                    Уведомления
                  </Text>
                </View>
                <View
                  style={[
                    styles.switchTrack,
                    { backgroundColor: config.notificationsEnabled ? theme.accent : '#64748b' },
                  ]}>
                  <View
                    style={[
                      styles.switchThumb,
                      config.notificationsEnabled ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {config.notificationsEnabled && (
                <View style={styles.leadMinutesRow}>
                  {[5, 10, 15, 30].map((mins) => {
                    const isSel = (config.notificationLeadMinutes || 10) === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => updateConfig({ notificationLeadMinutes: mins })}
                        style={[
                          styles.leadMinuteChip,
                          { borderColor: theme.border },
                          isSel && { backgroundColor: theme.pillBg, borderColor: theme.accent },
                        ]}>
                        <Text style={{ fontSize: 11.5, color: isSel ? theme.accent : theme.textSecondary }}>
                          За {mins} мин
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

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
                    Разрешить добавление и удаление занятий
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

              {/* Сетка занятий и звонки */}
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
                    Длительность: {config.defaultDurationMinutes} мин | Слотов: {editingSlots.length}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, color: theme.accent }}>➔</Text>
              </TouchableOpacity>

              {/* Разделение на недели */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => updateConfig({ twoWeeksEnabled: config.twoWeeksEnabled !== false ? false : true })}
                style={[
                  styles.settingRow,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', borderColor: theme.border },
                ]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.settingRowTitle, { color: theme.textPrimary }]}>
                    Разделение на недели
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: theme.textSecondary }]}>
                    {config.twoWeeksEnabled !== false ? 'Включено (1-я и 2-я неделя)' : 'Выключено (одна неделя)'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.switchTrack,
                    { backgroundColor: config.twoWeeksEnabled !== false ? theme.accent : '#64748b' },
                  ]}>
                  <View
                    style={[
                      styles.switchThumb,
                      config.twoWeeksEnabled !== false ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Обновления приложения */}
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 14 }]}>
                Обновления (GitHub)
              </Text>
              <View
                style={[
                  styles.settingRow,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', borderColor: theme.border },
                ]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingRowTitle, { color: theme.textPrimary }]}>
                    Версия: v{CURRENT_APP_VERSION}
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: theme.textSecondary }]}>
                    {updateStatusMsg || 'Проверка новых релизов с сохранением данных'}
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={isCheckingUpdate}
                  onPress={handleCheckForUpdates}
                  style={[styles.checkUpdateBtn, { backgroundColor: theme.accent }]}>
                  {isCheckingUpdate ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Проверить</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsSettingsOpen(false)}
                style={[styles.closeBtn, { backgroundColor: theme.surface, marginTop: 18 }]}>
                <Text style={[styles.closeBtnText, { color: theme.textPrimary }]}>Готово</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Модалка найденного обновления */}
      <Modal
        visible={isUpdateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUpdateModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsUpdateModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border, maxWidth: 360 }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Доступно обновление! 🚀</Text>
            <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
              Версия v{updateInfo?.latestVersion} (сейчас v{CURRENT_APP_VERSION})
            </Text>

            {updateInfo?.publishedAt ? (
              <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
                Опубликовано: {updateInfo.publishedAt}
              </Text>
            ) : null}

            {updateInfo?.releaseNotes ? (
              <ScrollView style={styles.releaseNotesScroll}>
                <Text style={[styles.releaseNotesText, { color: theme.textPrimary }]}>
                  {updateInfo.releaseNotes}
                </Text>
              </ScrollView>
            ) : null}

            <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginVertical: 8 }}>
              При установке новой версии все ваши заметки, расписание и настройки сохранятся.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => setIsUpdateModalOpen(false)}
                style={[styles.closeBtn, { flex: 1, backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Позже</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (updateInfo?.downloadUrl) {
                    Linking.openURL(updateInfo.downloadUrl);
                  }
                  setIsUpdateModalOpen(false);
                }}
                style={[styles.closeBtn, { flex: 1.4, backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Скачать APK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка конфигуратора расписания */}
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

            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Длительность занятия (минут)</Text>
            <TextInput
              keyboardType="number-pad"
              value={durationInput}
              onChangeText={handleDurationChange}
              placeholder="60"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.configInput,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
              ]}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 0 }]}>
                Список слотов времени ({editingSlots.length} из 8)
              </Text>
              {editingSlots.length > 0 && (
                <TouchableOpacity onPress={() => setEditingSlots([])} hitSlop={6}>
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600' }}>Очистить все</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 220, marginBottom: 10 }}>
              {editingSlots.length === 0 ? (
                <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginVertical: 14 }}>
                  Список слотов пуст. Нажмите «+ Добавить слот» ниже
                </Text>
              ) : (
                editingSlots.map((slot, idx) => {
                  const endCalc = calculateEndTime(slot.startTime, parseInt(durationInput, 10) || 60) || slot.endTime;
                  return (
                    <View key={slot.lessonNumber} style={styles.slotEditRow}>
                      <Text style={[styles.slotNumberText, { color: theme.textPrimary }]}>
                        №{slot.lessonNumber}
                      </Text>
                      <TextInput
                        value={slot.startTime}
                        onChangeText={(val) => handleSlotStartTimeChange(idx, val)}
                        placeholder="09:00"
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

            {/* Кнопка добавления слота до 8 */}
            {editingSlots.length < 8 && (
              <TouchableOpacity
                onPress={handleAddSlot}
                style={[styles.addSlotBtn, { borderColor: theme.accent, backgroundColor: theme.pillBg }]}>
                <Text style={[styles.addSlotBtnText, { color: theme.accent }]}>
                  + Добавить слот ({editingSlots.length + 1}-й)
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
    maxWidth: 350,
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
  colorConfigBlock: {
    marginBottom: 10,
  },
  colorConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorTypeTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  currentColorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentColorHex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  paletteScroll: {
    overflow: 'visible',
    marginHorizontal: -2,
  },
  paletteScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '100%',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  colorCircleWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  leadMinutesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  leadMinuteChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  checkUpdateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  releaseNotesScroll: {
    maxHeight: 140,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
  },
  releaseNotesText: {
    fontSize: 12.5,
    lineHeight: 18,
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
