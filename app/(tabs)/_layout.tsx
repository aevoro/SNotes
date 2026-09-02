import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Modal,
  Pressable,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

import NotesScreen from './index';
import ScheduleScreen from './schedule';
import RemindersScreen from './reminders';

const TABS = [
  { key: 'notes', title: 'Заметки' },
  { key: 'schedule', title: 'Расписание' },
  { key: 'reminders', title: 'To-Do лист' },
];

const ISLAND_WIDTH = 340;
const PADDING = 5;
const INNER_WIDTH = ISLAND_WIDTH - PADDING * 2;
const TAB_WIDTH = INNER_WIDTH / TABS.length;
const SWIPE_THRESHOLD = 60; // Минимальная дистанция для перелистывания

export default function TabLayout() {
  const { theme, setMode, isScheduleEditable, toggleScheduleEditable } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Анимированное смещение экранов
  const pageTranslateX = useRef(new Animated.Value(0)).current;

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

  // Распознаватель жестов (мышь в браузере и тач на смартфоне)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Перехватываем только горизонтальные движения
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const baseOffset = -activeIndexRef.current * screenWidth;
        let nextOffset = baseOffset + gestureState.dx;

        // Сопротивление на границах первого и последнего экранов
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
          goToTab(currentIdx + 1); // Свайп влево -> следующий экран
        } else if (gestureState.dx > SWIPE_THRESHOLD && currentIdx > 0) {
          goToTab(currentIdx - 1); // Свайп вправо -> предыдущий экран
        } else {
          goToTab(currentIdx); // Возврат на текущий экран
        }
      },
    })
  ).current;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Шапка */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>SNotes</Text>
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

      {/* Модалка настроек темы */}
      {/* Модалка настроек темы и расписания */}
            <Modal
              visible={isSettingsOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsSettingsOpen(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsOpen(false)}>
                <Pressable style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Настройки</Text>

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

                  {/* Пункт управления редактированием расписания */}
                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Расписание</Text>
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

                  <TouchableOpacity
                    onPress={() => setIsSettingsOpen(false)}
                    style={[styles.closeBtn, { backgroundColor: theme.surface, marginTop: 18 }]}>
                    <Text style={[styles.closeBtnText, { color: theme.textPrimary }]}>Готово</Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 10,
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
    marginBottom: 20,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
  },
  themeOptionText: {
    fontSize: 13,
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
});
