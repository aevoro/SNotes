import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import {
  InitialScreenType,
  LessonTimeSlot,
  COLOR_PALETTE,
  DEFAULT_LESSON_COLORS,
  STANDARD_CATEGORIES,
} from '../../src/types/config';
import { calculateEndTime } from '../../src/utils/scheduleUtils';
import { checkGitHubUpdate, getInstalledAppVersion, UpdateInfo } from '../../src/services/updateService';
import { requestNotificationPermissions } from '../../src/services/notificationService';
import { CupertinoIcon, CupertinoIconName } from '../../src/components/CupertinoIcon';

type SettingsCategory = 'appearance' | 'schedule' | 'notifications' | 'about' | null;

export default function SettingsScreen() {
  const { theme, setMode, isScheduleEditable, toggleScheduleEditable } = useAppTheme();
  const { config, updateConfig, updateInitialScreen } = useConfig();
  const currentAppVersion = getInstalledAppVersion();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(null);

  // Time slot editing
  const [editingSlots, setEditingSlots] = useState<LessonTimeSlot[]>(config.timeSlots || []);
  const [durationInput, setDurationInput] = useState(
    (config.defaultDurationMinutes || 60).toString()
  );

  // New category creation
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Update check
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);

  const handleDurationChange = (newDurStr: string) => {
    setDurationInput(newDurStr);
    const dur = parseInt(newDurStr, 10) || 60;
    const updated = editingSlots.map((slot) => ({
      ...slot,
      endTime: calculateEndTime(slot.startTime, dur) || slot.endTime,
    }));
    setEditingSlots(updated);
  };

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
    const next = [...editingSlots, newSlot];
    setEditingSlots(next);
    updateConfig({ timeSlots: next });
  };

  const handleDeleteSlot = (index: number) => {
    const filtered = editingSlots.filter((_, i) => i !== index);
    const renumbered = filtered.map((slot, i) => ({
      ...slot,
      lessonNumber: i + 1,
    }));
    setEditingSlots(renumbered);
    updateConfig({ timeSlots: renumbered });
  };

  const handleSaveDuration = async () => {
    const dur = parseInt(durationInput, 10) || 60;
    await updateConfig({
      defaultDurationMinutes: dur,
      timeSlots: editingSlots,
    });
  };

  const handleSelectColor = async (category: string, color: string) => {
    const current = config.customLessonColors || DEFAULT_LESSON_COLORS;
    await updateConfig({
      customLessonColors: {
        ...current,
        [category]: color,
      },
    });
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setIsAddCategoryOpen(false);
      return;
    }
    const currentList = config.eventCategories || STANDARD_CATEGORIES;
    if (!currentList.includes(trimmed)) {
      const nextList = [...currentList, trimmed];
      await updateConfig({ eventCategories: nextList });
    }
    setNewCategoryName('');
    setIsAddCategoryOpen(false);
  };

  const handleToggleNotifications = async () => {
    const nextVal = !config.notificationsEnabled;
    if (nextVal) {
      await requestNotificationPermissions();
    }
    await updateConfig({ notificationsEnabled: nextVal });
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg(null);
    try {
      const res = await checkGitHubUpdate(currentAppVersion, config.githubRepo || 'aevoro/SNotes');
      if (res.hasUpdate) {
        setUpdateInfo(res);
        setIsUpdateModalOpen(true);
      } else if (res.error) {
        setUpdateStatusMsg(res.error);
      } else {
        setUpdateStatusMsg('Установлена последняя версия');
      }
    } catch {
      setUpdateStatusMsg('Ошибка связи с сервером');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const categories = [
    {
      id: 'appearance' as SettingsCategory,
      title: 'Внешний вид',
      subtitle: theme.mode === 'dark' ? 'Тёмная' : 'Светлая',
      icon: 'palette' as CupertinoIconName,
    },
    {
      id: 'schedule' as SettingsCategory,
      title: 'Расписание и события',
      subtitle: `Слотов: ${editingSlots.length} • Категорий: ${(config.eventCategories || STANDARD_CATEGORIES).length}`,
      icon: 'calendar' as CupertinoIconName,
    },
    {
      id: 'notifications' as SettingsCategory,
      title: 'Уведомления',
      subtitle: config.notificationsEnabled ? 'Включены' : 'Отключены',
      icon: 'bell' as CupertinoIconName,
    },
    {
      id: 'about' as SettingsCategory,
      title: 'О приложении',
      subtitle: `Версия v${currentAppVersion}`,
      icon: 'info' as CupertinoIconName,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {activeCategory === null ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Настройки</Text>

          <View style={styles.categoryCardsList}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.7}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryCard,
                  { backgroundColor: theme.cardSolid, borderColor: theme.border },
                ]}
                accessibilityRole="button"
                accessibilityLabel={cat.title}>
                <View style={[styles.categoryIconCircle, { backgroundColor: theme.pillBg }]}>
                  <CupertinoIcon name={cat.icon} size={20} color={theme.accent} />
                </View>

                <View style={styles.categoryCardInfo}>
                  <Text style={[styles.categoryCardTitle, { color: theme.textPrimary }]}>
                    {cat.title}
                  </Text>
                  <Text style={[styles.categoryCardDesc, { color: theme.textSecondary }]}>
                    {cat.subtitle}
                  </Text>
                </View>

                <CupertinoIcon name="chevron" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.detailHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => setActiveCategory(null)}
              style={styles.backButton}
              accessibilityRole="button">
              <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '700' }}>← Категории</Text>
            </TouchableOpacity>
            <Text style={[styles.detailHeaderTitle, { color: theme.textPrimary }]}>
              {categories.find((c) => c.id === activeCategory)?.title}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
            {/* 1. ВНЕШНИЙ ВИД */}
            {activeCategory === 'appearance' && (
              <View>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Тема оформления</Text>
                <View style={styles.themeOptionsRow}>
                  <TouchableOpacity
                    onPress={() => setMode('dark')}
                    style={[
                      styles.themeOption,
                      { borderColor: theme.mode === 'dark' ? theme.accent : theme.border, backgroundColor: theme.surfaceSolid },
                      theme.mode === 'dark' && { backgroundColor: theme.pillBg },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: theme.mode === 'dark' }}>
                    <CupertinoIcon name="moon" size={20} color={theme.mode === 'dark' ? theme.accent : theme.textPrimary} />
                    <Text style={[styles.themeOptionText, { color: theme.textPrimary }]}>Тёмная</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMode('light')}
                    style={[
                      styles.themeOption,
                      { borderColor: theme.mode === 'light' ? theme.accent : theme.border, backgroundColor: theme.surfaceSolid },
                      theme.mode === 'light' && { backgroundColor: theme.pillBg },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: theme.mode === 'light' }}>
                    <CupertinoIcon name="sun" size={20} color={theme.mode === 'light' ? theme.accent : theme.textPrimary} />
                    <Text style={[styles.themeOptionText, { color: theme.textPrimary }]}>Светлая</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 16 }]}>
                  Начальный экран при запуске
                </Text>
                <View style={styles.initialScreenRow}>
                  {[
                    { key: 'Notes', label: 'Заметки и Задачи' },
                    { key: 'Schedule', label: 'Расписание' },
                    { key: 'Calendar', label: 'Календарь' },
                    { key: 'Settings', label: 'Настройки' },
                  ].map((item) => {
                    const isSel = config.initialScreen === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => updateInitialScreen(item.key as InitialScreenType)}
                        style={[
                          styles.initialScreenBtn,
                          { borderColor: theme.border, backgroundColor: theme.surfaceSolid },
                          isSel && { backgroundColor: theme.pillBg, borderColor: theme.accent },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSel }}>
                        <Text
                          style={[
                            styles.initialScreenText,
                            { color: isSel ? theme.accent : theme.textSecondary },
                            isSel && { fontWeight: '700' },
                          ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 2. РАСПИСАНИЕ И СОБЫТИЯ */}
            {activeCategory === 'schedule' && (
              <View>
                {/* Clean Apple switch row without repetitive subtitles */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={toggleScheduleEditable}
                  style={[
                    styles.cleanSettingRow,
                    { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                  ]}>
                  <Text style={[styles.settingRowTitle, { color: theme.textPrimary }]}>
                    Режим редактирования
                  </Text>
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

                {/* Duration */}
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 16 }]}>
                  Длительность по умолчанию (минут)
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <TextInput
                    keyboardType="number-pad"
                    value={durationInput}
                    onChangeText={handleDurationChange}
                    onBlur={handleSaveDuration}
                    style={[
                      styles.configInput,
                      { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border, flex: 1 },
                    ]}
                    accessibilityLabel="Длительность события по умолчанию"
                  />
                  <TouchableOpacity
                    onPress={handleSaveDuration}
                    style={[styles.smallBtn, { backgroundColor: theme.accent }]}>
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Сохранить</Text>
                  </TouchableOpacity>
                </View>

                {/* Slots */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                    Сетка звонков ({editingSlots.length} из 8)
                  </Text>
                  {editingSlots.length < 8 && (
                    <TouchableOpacity onPress={handleAddSlot} hitSlop={6}>
                      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>+ Добавить слот</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {editingSlots.length === 0 ? (
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 14 }}>
                    Слотов нет. Нажмите «+ Добавить слот» выше
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
                          placeholderTextColor={theme.textMuted}
                          style={[
                            styles.slotTimeInput,
                            { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border },
                          ]}
                        />
                        <Text style={{ color: theme.textSecondary }}>➔</Text>
                        <View
                          style={[
                            styles.slotCalcTimeBadge,
                            { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                          ]}>
                          <Text style={[styles.slotCalcTimeText, { color: theme.accent }]}>
                            {endCalc || '—'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteSlot(idx)}
                          hitSlop={8}
                          style={{ padding: 4 }}>
                          <CupertinoIcon name="close" size={16} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}

                {/* Categories & Colors */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                    Категории событий и цвета
                  </Text>
                  <TouchableOpacity onPress={() => setIsAddCategoryOpen(true)} hitSlop={6}>
                    <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>+ Свой тип</Text>
                  </TouchableOpacity>
                </View>

                {(config.eventCategories || STANDARD_CATEGORIES).map((catName) => {
                  const current = config.customLessonColors?.[catName] || DEFAULT_LESSON_COLORS[catName] || '#0a84ff';
                  return (
                    <View key={catName} style={styles.colorConfigBlock}>
                      <View style={styles.colorConfigHeader}>
                        <Text style={[styles.colorTypeTitle, { color: theme.textPrimary }]}>{catName}</Text>
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
                              onPress={() => handleSelectColor(catName, c)}
                              style={[
                                styles.colorCircleWrapper,
                                isChosen && { borderColor: theme.mode === 'dark' ? '#ffffff' : theme.textPrimary },
                              ]}>
                              <View style={[styles.colorCircleInner, { backgroundColor: c }]} />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })}

                {/* Индикаторы в календаре */}
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 22 }]}>
                  Индикаторы в календаре
                </Text>

                {/* Event Marker Color */}
                <View style={styles.colorConfigBlock}>
                  <View style={styles.colorConfigHeader}>
                    <Text style={[styles.colorTypeTitle, { color: theme.textPrimary }]}>
                      Маркер событий
                    </Text>
                    <View
                      style={[
                        styles.currentColorBadge,
                        { backgroundColor: config.calendarEventMarkerColor || '#0a84ff' },
                      ]}>
                      <Text style={styles.currentColorHex}>
                        {config.calendarEventMarkerColor || '#0a84ff'}
                      </Text>
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteScrollContent}>
                    {COLOR_PALETTE.map((hex) => {
                      const isSel = (config.calendarEventMarkerColor || '#0a84ff') === hex;
                      return (
                        <TouchableOpacity
                          key={`ev-${hex}`}
                          onPress={() => updateConfig({ calendarEventMarkerColor: hex })}
                          style={[
                            styles.colorCircleWrapper,
                            isSel && { borderColor: theme.mode === 'dark' ? '#ffffff' : theme.textPrimary },
                          ]}>
                          <View style={[styles.colorCircleInner, { backgroundColor: hex }]} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Deadline Marker Color */}
                <View style={[styles.colorConfigBlock, { marginTop: 12 }]}>
                  <View style={styles.colorConfigHeader}>
                    <Text style={[styles.colorTypeTitle, { color: theme.textPrimary }]}>
                      Маркер дедлайнов задач
                    </Text>
                    <View
                      style={[
                        styles.currentColorBadge,
                        { backgroundColor: config.calendarDeadlineMarkerColor || '#ff453a' },
                      ]}>
                      <Text style={styles.currentColorHex}>
                        {config.calendarDeadlineMarkerColor || '#ff453a'}
                      </Text>
                    </View>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteScrollContent}>
                    {COLOR_PALETTE.map((hex) => {
                      const isSel = (config.calendarDeadlineMarkerColor || '#ff453a') === hex;
                      return (
                        <TouchableOpacity
                          key={`dl-${hex}`}
                          onPress={() => updateConfig({ calendarDeadlineMarkerColor: hex })}
                          style={[
                            styles.colorCircleWrapper,
                            isSel && { borderColor: theme.mode === 'dark' ? '#ffffff' : theme.textPrimary },
                          ]}>
                          <View style={[styles.colorCircleInner, { backgroundColor: hex }]} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* 3. УВЕДОМЛЕНИЯ */}
            {activeCategory === 'notifications' && (
              <View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleToggleNotifications}
                  style={[
                    styles.cleanSettingRow,
                    { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                  ]}>
                  <Text style={[styles.settingRowTitle, { color: theme.textPrimary }]}>
                    Уведомления о событиях
                  </Text>
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

                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 16 }]}>
                  Время напоминания до начала
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[5, 10, 15, 30].map((mins) => {
                    const isSel = (config.notificationLeadMinutes || 10) === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => updateConfig({ notificationLeadMinutes: mins })}
                        style={[
                          styles.initialScreenBtn,
                          { borderColor: theme.border, backgroundColor: theme.surfaceSolid },
                          isSel && { backgroundColor: theme.pillBg, borderColor: theme.accent },
                        ]}>
                        <Text style={{ fontSize: 13, color: isSel ? theme.accent : theme.textSecondary, fontWeight: isSel ? '700' : 'normal' }}>
                          За {mins} мин.
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 4. О ПРИЛОЖЕНИИ */}
            {activeCategory === 'about' && (
              <View>
                {/* Clean version row without redundant 'Проверка релизов на GitHub' subtitle */}
                <View
                  style={[
                    styles.cleanSettingRow,
                    { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                  ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.settingRowTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
                      Текущая версия
                    </Text>
                    <View style={[styles.versionPill, { backgroundColor: theme.pillBg, borderColor: theme.accent }]}>
                      <Text style={[styles.versionPillText, { color: theme.accent }]}>v{currentAppVersion}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    disabled={isCheckingUpdate}
                    onPress={handleCheckForUpdates}
                    style={[styles.smallBtn, { backgroundColor: theme.accent }]}
                    accessibilityRole="button">
                    {isCheckingUpdate ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Проверить</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Show status text ONLY if user initiated a check and there is actual feedback */}
                {updateStatusMsg ? (
                  <Text style={[styles.statusFeedbackText, { color: theme.accent }]}>
                    {updateStatusMsg}
                  </Text>
                ) : null}

                <View style={[styles.aboutCard, { backgroundColor: theme.surfaceSolid, borderColor: theme.border, marginTop: 14 }]}>
                  <Text style={[styles.aboutTitle, { color: theme.textPrimary }]}>SNotes v{currentAppVersion}</Text>
                  <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                    Универсальный инструмент для заметок, структурированных задач и гибкого расписания событий в стилистике Cupertino Glass.
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://github.com/aevoro/SNotes')}
                    style={[styles.repoLinkBtn, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                      Открыть репозиторий на GitHub ➔
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Modal to add custom event category */}
      <Modal visible={isAddCategoryOpen} transparent animationType="fade" onRequestClose={() => setIsAddCategoryOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsAddCategoryOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Новый тип события</Text>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Название категории</Text>
            <TextInput
              autoFocus
              placeholder="Например: Проект, Хобби, Дедлайн..."
              placeholderTextColor={theme.textMuted}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              onSubmitEditing={handleAddCategory}
              style={[
                styles.configInput,
                { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border },
              ]}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setIsAddCategoryOpen(false)}
                style={[styles.smallBtn, { flex: 1, backgroundColor: theme.surfaceSolid, borderWidth: 1, borderColor: theme.border }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCategory}
                style={[styles.smallBtn, { flex: 1, backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Available Update Modal Sheet */}
      <Modal visible={isUpdateModalOpen} transparent animationType="fade" onRequestClose={() => setIsUpdateModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsUpdateModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <CupertinoIcon name="download" size={32} color={theme.accent} />
              <Text style={[styles.modalTitle, { color: theme.textPrimary, marginTop: 8, marginBottom: 4 }]}>
                Доступно обновление
              </Text>
              <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '700' }}>
                v{updateInfo?.latestVersion} (сейчас v{currentAppVersion})
              </Text>
            </View>

            {updateInfo?.publishedAt ? (
              <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
                Опубликовано: {updateInfo.publishedAt}
              </Text>
            ) : null}

            {updateInfo?.releaseNotes ? (
              <ScrollView style={[styles.releaseNotesScroll, { backgroundColor: theme.surfaceSolid }]}>
                <Text style={[styles.releaseNotesText, { color: theme.textPrimary }]}>
                  {updateInfo.releaseNotes}
                </Text>
              </ScrollView>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setIsUpdateModalOpen(false)}
                style={[styles.smallBtn, { flex: 1, backgroundColor: theme.surfaceSolid, borderWidth: 1, borderColor: theme.border }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Позже</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (updateInfo?.downloadUrl) Linking.openURL(updateInfo.downloadUrl);
                  setIsUpdateModalOpen(false);
                }}
                style={[styles.smallBtn, { flex: 1.4, backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Скачать APK</Text>
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
  scrollContent: { padding: 18, paddingBottom: 120 },
  pageTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, marginBottom: 16 },
  categoryCardsList: { gap: 10 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryCardInfo: { flex: 1 },
  categoryCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  categoryCardDesc: { fontSize: 12 },
  detailHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { paddingVertical: 6, paddingRight: 10 },
  detailHeaderTitle: { fontSize: 16, fontWeight: '700' },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  themeOptionsRow: { flexDirection: 'row', gap: 10 },
  themeOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
  },
  themeOptionText: { fontSize: 13, fontWeight: '600' },
  initialScreenRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  initialScreenBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialScreenText: { fontSize: 12, fontWeight: '600' },
  cleanSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  settingRowTitle: { fontSize: 15, fontWeight: '600' },
  statusFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 6,
    marginBottom: 8,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
  },
  configInput: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  slotNumberText: { width: 28, fontSize: 13, fontWeight: '700' },
  slotTimeInput: {
    width: 75,
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  slotCalcTimeBadge: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  slotCalcTimeText: { fontSize: 13, fontWeight: '700' },
  colorConfigBlock: { marginBottom: 10 },
  colorConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorTypeTitle: { fontSize: 13, fontWeight: '600' },
  currentColorBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  currentColorHex: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  paletteScroll: { overflow: 'visible', marginHorizontal: -2 },
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
  colorCircleInner: { width: 20, height: 20, borderRadius: 10 },
  versionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  versionPillText: { fontSize: 11, fontWeight: '700' },
  aboutCard: { padding: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  aboutTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  aboutText: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  repoLinkBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  releaseNotesScroll: { maxHeight: 140, padding: 12, borderRadius: 12, marginVertical: 8 },
  releaseNotesText: { fontSize: 12.5, lineHeight: 18 },
});
