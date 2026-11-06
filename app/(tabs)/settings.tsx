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
import { useFolders } from '../../context/FoldersContext';
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

export default function SettingsScreen() {
  const { theme, setMode, isScheduleEditable, toggleScheduleEditable } = useAppTheme();
  const { config, updateConfig, updateInitialScreen } = useConfig();
  const { folders, deleteFolder } = useFolders();
  const currentAppVersion = getInstalledAppVersion();

  // Accordion state: multiple sections can be open simultaneously
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['appearance'])
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Color picker sub-items expansion state (only one open at a time to stay clean)
  const [expandedColorCat, setExpandedColorCat] = useState<string | null>(null);
  const [expandedMarkerColor, setExpandedMarkerColor] = useState<'event' | 'deadline' | null>(null);

  const toggleColorCat = (catName: string) => {
    setExpandedColorCat((prev) => (prev === catName ? null : catName));
  };

  const toggleMarkerColor = (type: 'event' | 'deadline') => {
    setExpandedMarkerColor((prev) => (prev === type ? null : type));
  };

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

  const handleDeleteCategory = async (catToDelete: string) => {
    const currentList = config.eventCategories || STANDARD_CATEGORIES;
    if (currentList.length <= 1) return;
    const nextList = currentList.filter((c) => c !== catToDelete);
    await updateConfig({ eventCategories: nextList });
    if (expandedColorCat === catToDelete) {
      setExpandedColorCat(null);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Настройки</Text>

        <View style={styles.accordionList}>
          {/* 1. ВНЕШНИЙ ВИД */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('appearance')}
              style={[
                styles.categoryCard,
                { backgroundColor: theme.cardSolid, borderColor: theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Внешний вид">
              <View style={[styles.categoryIconCircle, { backgroundColor: theme.pillBg }]}>
                <CupertinoIcon name="palette" size={20} color={theme.accent} />
              </View>

              <View style={styles.categoryCardInfo}>
                <Text style={[styles.categoryCardTitle, { color: theme.textPrimary }]}>
                  Внешний вид
                </Text>
                <Text style={[styles.categoryCardDesc, { color: theme.textSecondary }]}>
                  {theme.mode === 'dark' ? 'Тёмная тема' : 'Светлая тема'} • Экран: {config.initialScreen}
                </Text>
              </View>

              <CupertinoIcon
                name={expandedSections.has('appearance') ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {expandedSections.has('appearance') && (
              <View style={[styles.sectionBody, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
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
          </View>

          {/* 2. РАСПИСАНИЕ И СОБЫТИЯ */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('schedule')}
              style={[
                styles.categoryCard,
                { backgroundColor: theme.cardSolid, borderColor: theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Расписание и события">
              <View style={[styles.categoryIconCircle, { backgroundColor: theme.pillBg }]}>
                <CupertinoIcon name="calendar" size={20} color={theme.accent} />
              </View>

              <View style={styles.categoryCardInfo}>
                <Text style={[styles.categoryCardTitle, { color: theme.textPrimary }]}>
                  Расписание и события
                </Text>
                <Text style={[styles.categoryCardDesc, { color: theme.textSecondary }]}>
                  Слотов: {editingSlots.length} • Типов: {(config.eventCategories || STANDARD_CATEGORIES).length}
                </Text>
              </View>

              <CupertinoIcon
                name={expandedSections.has('schedule') ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {expandedSections.has('schedule') && (
              <View style={[styles.sectionBody, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
                {/* Режим редактирования */}
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

                {/* Длительность */}
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 14 }]}>
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

                {/* Сетка звонков */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
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
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 14, fontStyle: 'italic' }}>
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

                {/* Категории событий и цвета (спрятаны в подпункты + возможность удаления) */}
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
                  const isExpanded = expandedColorCat === catName;
                  const categoriesList = config.eventCategories || STANDARD_CATEGORIES;
                  const canDelete = categoriesList.length > 1;

                  return (
                    <View
                      key={catName}
                      style={[
                        styles.subItemCard,
                        { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                      ]}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleColorCat(catName)}
                        style={styles.subItemHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={[styles.colorCircleInner, { backgroundColor: current }]} />
                          <Text style={[styles.subItemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                            {catName}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.currentColorBadge, { backgroundColor: current }]}>
                            <Text style={styles.currentColorHex}>{current}</Text>
                          </View>
                          <CupertinoIcon
                            name={isExpanded ? 'chevron-down' : 'chevron-right'}
                            size={14}
                            color={theme.textMuted}
                          />
                          {canDelete && (
                            <TouchableOpacity
                              onPress={() => handleDeleteCategory(catName)}
                              hitSlop={8}
                              style={{ padding: 4, marginLeft: 2 }}>
                              <CupertinoIcon name="trash" size={15} color={theme.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Скрытый выбор цвета в подпункте */}
                      {isExpanded && (
                        <View style={[styles.colorPickerSubItem, { borderTopColor: theme.border }]}>
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
                      )}
                    </View>
                  );
                })}

                {/* Индикаторы в календаре (спрятаны в подпункты) */}
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 18, marginBottom: 8 }]}>
                  Индикаторы в календаре
                </Text>

                {/* Маркер событий */}
                <View style={[styles.subItemCard, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleMarkerColor('event')}
                    style={styles.subItemHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={[
                          styles.colorCircleInner,
                          { backgroundColor: config.calendarEventMarkerColor || '#0a84ff' },
                        ]}
                      />
                      <Text style={[styles.subItemTitle, { color: theme.textPrimary }]}>
                        Маркер событий
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={[
                          styles.currentColorBadge,
                          { backgroundColor: config.calendarEventMarkerColor || '#0a84ff' },
                        ]}>
                        <Text style={styles.currentColorHex}>
                          {config.calendarEventMarkerColor || '#0a84ff'}
                        </Text>
                      </View>
                      <CupertinoIcon
                        name={expandedMarkerColor === 'event' ? 'chevron-down' : 'chevron-right'}
                        size={14}
                        color={theme.textMuted}
                      />
                    </View>
                  </TouchableOpacity>

                  {expandedMarkerColor === 'event' && (
                    <View style={[styles.colorPickerSubItem, { borderTopColor: theme.border }]}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.paletteScrollContent}>
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
                  )}
                </View>

                {/* Маркер дедлайнов задач */}
                <View style={[styles.subItemCard, { backgroundColor: theme.surfaceSolid, borderColor: theme.border, marginTop: 6 }]}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleMarkerColor('deadline')}
                    style={styles.subItemHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={[
                          styles.colorCircleInner,
                          { backgroundColor: config.calendarDeadlineMarkerColor || '#ff453a' },
                        ]}
                      />
                      <Text style={[styles.subItemTitle, { color: theme.textPrimary }]}>
                        Маркер дедлайнов задач
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={[
                          styles.currentColorBadge,
                          { backgroundColor: config.calendarDeadlineMarkerColor || '#ff453a' },
                        ]}>
                        <Text style={styles.currentColorHex}>
                          {config.calendarDeadlineMarkerColor || '#ff453a'}
                        </Text>
                      </View>
                      <CupertinoIcon
                        name={expandedMarkerColor === 'deadline' ? 'chevron-down' : 'chevron-right'}
                        size={14}
                        color={theme.textMuted}
                      />
                    </View>
                  </TouchableOpacity>

                  {expandedMarkerColor === 'deadline' && (
                    <View style={[styles.colorPickerSubItem, { borderTopColor: theme.border }]}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.paletteScrollContent}>
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
                  )}
                </View>
              </View>
            )}
          </View>

          {/* 3. ПАПКИ И КАТЕГОРИИ ЗАДАЧ (Удаление типов папок и задач) */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('folders')}
              style={[
                styles.categoryCard,
                { backgroundColor: theme.cardSolid, borderColor: theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Папки заметок и задач">
              <View style={[styles.categoryIconCircle, { backgroundColor: theme.pillBg }]}>
                <CupertinoIcon name="folder" size={20} color={theme.accent} />
              </View>

              <View style={styles.categoryCardInfo}>
                <Text style={[styles.categoryCardTitle, { color: theme.textPrimary }]}>
                  Папки заметок и задач
                </Text>
                <Text style={[styles.categoryCardDesc, { color: theme.textSecondary }]}>
                  Всего папок: {folders.length} • Удаление и управление
                </Text>
              </View>

              <CupertinoIcon
                name={expandedSections.has('folders') ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {expandedSections.has('folders') && (
              <View style={[styles.sectionBody, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  Список папок ({folders.length})
                </Text>

                {folders.length === 0 ? (
                  <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic', marginVertical: 8 }}>
                    Папок пока нет
                  </Text>
                ) : (
                  folders.map((folder) => {
                    return (
                      <View
                        key={folder.id}
                        style={[
                          styles.subItemCard,
                          { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                        ]}>
                        <View style={styles.subItemHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <CupertinoIcon
                              name={folder.icon || 'folder'}
                              size={18}
                              color={folder.color || theme.accent}
                            />
                            <Text style={[styles.subItemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                              {folder.name}
                            </Text>
                          </View>

                          {folder.isSystem ? (
                            <View style={[styles.systemBadge, { backgroundColor: theme.pillBg }]}>
                              <Text style={[styles.systemBadgeText, { color: theme.accent }]}>Системная</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleDeleteFolder(folder.id)}
                              hitSlop={8}
                              style={{ padding: 4 }}
                              accessibilityLabel={`Удалить папку ${folder.name}`}>
                              <CupertinoIcon name="trash" size={16} color={theme.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>

          {/* 4. УВЕДОМЛЕНИЯ */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('notifications')}
              style={[
                styles.categoryCard,
                { backgroundColor: theme.cardSolid, borderColor: theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Уведомления">
              <View style={[styles.categoryIconCircle, { backgroundColor: theme.pillBg }]}>
                <CupertinoIcon name="bell" size={20} color={theme.accent} />
              </View>

              <View style={styles.categoryCardInfo}>
                <Text style={[styles.categoryCardTitle, { color: theme.textPrimary }]}>
                  Уведомления
                </Text>
                <Text style={[styles.categoryCardDesc, { color: theme.textSecondary }]}>
                  {config.notificationsEnabled ? 'Включены' : 'Отключены'}
                </Text>
              </View>

              <CupertinoIcon
                name={expandedSections.has('notifications') ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {expandedSections.has('notifications') && (
              <View style={[styles.sectionBody, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
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

                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 14 }]}>
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
          </View>

          {/* 5. О ПРИЛОЖЕНИИ */}
          <View style={styles.accordionSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleSection('about')}
              style={[
                styles.categoryCard,
                { backgroundColor: theme.cardSolid, borderColor: theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="О приложении">
              <View style={[styles.categoryIconCircle, { backgroundColor: theme.pillBg }]}>
                <CupertinoIcon name="info" size={20} color={theme.accent} />
              </View>

              <View style={styles.categoryCardInfo}>
                <Text style={[styles.categoryCardTitle, { color: theme.textPrimary }]}>
                  О приложении
                </Text>
                <Text style={[styles.categoryCardDesc, { color: theme.textSecondary }]}>
                  Версия v{currentAppVersion}
                </Text>
              </View>

              <CupertinoIcon
                name={expandedSections.has('about') ? 'chevron-down' : 'chevron-right'}
                size={18}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {expandedSections.has('about') && (
              <View style={[styles.sectionBody, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
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

                {updateStatusMsg ? (
                  <Text style={[styles.statusFeedbackText, { color: theme.accent }]}>
                    {updateStatusMsg}
                  </Text>
                ) : null}

                <View style={[styles.aboutCard, { backgroundColor: theme.surfaceSolid, borderColor: theme.border, marginTop: 12 }]}>
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
          </View>
        </View>
      </ScrollView>

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
  accordionList: { gap: 12 },
  accordionSection: {
    borderRadius: 16,
  },
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
  sectionBody: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
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
  subItemCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
    overflow: 'hidden',
  },
  subItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subItemTitle: { fontSize: 13.5, fontWeight: '600' },
  colorPickerSubItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  currentColorBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  currentColorHex: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  paletteScroll: { overflow: 'visible', marginHorizontal: -2 },
  paletteScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
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
  systemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  systemBadgeText: { fontSize: 11, fontWeight: '700' },
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
