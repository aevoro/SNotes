import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Platform,
  BackHandler,
  PanResponder,
  ToastAndroid,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTodo } from '../../context/TodoContext';
import { TodoItem } from '../../src/types/todo';
import { ScrollableWithBar } from '../../src/components/ScrollableWithBar';

const MONTHS = [
  { value: 1, name: 'Январь', short: 'Янв' },
  { value: 2, name: 'Февраль', short: 'Фев' },
  { value: 3, name: 'Март', short: 'Мар' },
  { value: 4, name: 'Апрель', short: 'Апр' },
  { value: 5, name: 'Май', short: 'Май' },
  { value: 6, name: 'Июнь', short: 'Июн' },
  { value: 7, name: 'Июль', short: 'Июл' },
  { value: 8, name: 'Август', short: 'Авг' },
  { value: 9, name: 'Сентябрь', short: 'Сен' },
  { value: 10, name: 'Октябрь', short: 'Окт' },
  { value: 11, name: 'Ноябрь', short: 'Ноя' },
  { value: 12, name: 'Декабрь', short: 'Дек' },
];

const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_COUNT = 3;
const WHEEL_CONTAINER_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT; // 132
const WHEEL_PADDING = (WHEEL_CONTAINER_HEIGHT - WHEEL_ITEM_HEIGHT) / 2; // 44

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function getTargetYear(day: number, month: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfToday = new Date(currentYear, now.getMonth(), now.getDate()).getTime();
  const targetDateCurrentYear = new Date(currentYear, month - 1, day).getTime();
  return targetDateCurrentYear < startOfToday ? currentYear + 1 : currentYear;
}

function getDaysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

interface TodoCardItemProps {
  item: TodoItem;
  theme: any;
  hasFolders: boolean;
  folderName: string | null;
  isDraggable: boolean;
  renderDeadlineBadge: (item: TodoItem) => React.ReactNode;
  onOpen: () => void;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onDragStart: (item: TodoItem, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
}

function TodoCardItem({
  item,
  theme,
  hasFolders,
  folderName,
  isDraggable,
  renderDeadlineBadge,
  onOpen,
  onToggleComplete,
  onTogglePin,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: TodoCardItemProps) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onDragStart(item, evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderMove: (evt) => {
        onDragMove(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        onDragEnd();
      },
      onPanResponderTerminate: () => {
        onDragEnd();
      },
    })
  ).current;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: item.isPinned ? theme.accent : theme.border,
          borderWidth: item.isPinned ? 1.5 : 1,
        },
      ]}
      activeOpacity={0.7}
      onPress={onOpen}>
      {isDraggable && (
        <View {...panResponder.panHandlers} style={styles.dragGripContainer}>
          <Text style={[styles.dragGripIcon, { color: theme.textSecondary }]}>⠿</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={onToggleComplete}
        hitSlop={8}
        style={[
          styles.checkbox,
          { borderColor: theme.border },
          item.isCompleted && { backgroundColor: theme.accent, borderColor: theme.accent },
        ]}>
        {item.isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.textContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[
              styles.title,
              { color: theme.textPrimary },
              item.isCompleted && { textDecorationLine: 'line-through', color: theme.textSecondary },
            ]}>
            {item.title}
          </Text>
          {item.isPinned && <Text style={{ fontSize: 13 }}>📌</Text>}
        </View>

        {item.description ? (
          <Text numberOfLines={2} style={[styles.desc, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {hasFolders && folderName && (
            <View style={[styles.folderBadge, { backgroundColor: theme.pillBg }]}>
              <Text style={[styles.folderBadgeText, { color: theme.accent }]}>📂 {folderName}</Text>
            </View>
          )}
          {renderDeadlineBadge(item)}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TouchableOpacity hitSlop={8} onPress={onTogglePin} style={styles.pinBtn}>
          <Text style={{ fontSize: 15, opacity: item.isPinned ? 1 : 0.4 }}>📌</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
          <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function RemindersScreen() {
  const { theme } = useAppTheme();
  const {
    todos,
    folders,
    createFolder,
    deleteFolder,
    togglePinFolder,
    saveTodo,
    togglePinTodo,
    toggleCompleteTodo,
    deleteTodo,
  } = useTodo();

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Drag and Drop задач в папки
  const [draggingTodo, setDraggingTodo] = useState<TodoItem | null>(null);
  const draggingTodoRef = useRef<TodoItem | null>(null);
  draggingTodoRef.current = draggingTodo;

  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const hoveredFolderIdRef = useRef<string | null>(null);
  hoveredFolderIdRef.current = hoveredFolderId;

  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const folderBoundsRef = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const folderRefs = useRef<Record<string, any>>({});

  // Модалка создания папки
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Модалка создания/редактирования задачи
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  // Дедлайн: выбор барабаном (день и месяц) как в часах/будильнике
  const [hasDeadline, setHasDeadline] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(1);

  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);

  const targetYear = getTargetYear(selectedDay, selectedMonth);
  const maxDays = getDaysInMonth(selectedMonth, targetYear);
  const daysList = useMemo(() => Array.from({ length: maxDays }, (_, i) => i + 1), [maxDays]);

  const scrollToWheelPositions = (d: number, m: number, animated: boolean = false) => {
    setTimeout(() => {
      dayScrollRef.current?.scrollTo({ y: Math.max(0, (d - 1) * WHEEL_ITEM_HEIGHT), animated });
      monthScrollRef.current?.scrollTo({ y: Math.max(0, (m - 1) * WHEEL_ITEM_HEIGHT), animated });
    }, 80);
  };

  const handleSelectMonth = (m: number) => {
    setSelectedMonth(m);
    const yr = getTargetYear(selectedDay, m);
    const daysInNewMonth = getDaysInMonth(m, yr);
    if (selectedDay > daysInNewMonth) {
      setSelectedDay(daysInNewMonth);
      dayScrollRef.current?.scrollTo({ y: (daysInNewMonth - 1) * WHEEL_ITEM_HEIGHT, animated: true });
    }
  };

  const onDayScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(daysList.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT)));
    const d = daysList[idx];
    if (d && d !== selectedDay) {
      setSelectedDay(d);
    }
  };

  const onMonthScrollEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(MONTHS.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT)));
    const m = MONTHS[idx]?.value;
    if (m && m !== selectedMonth) {
      handleSelectMonth(m);
    }
  };

  // Обработка жеста / кнопки «Назад»
  useEffect(() => {
    if (activeFolderId === null && !isModalOpen && !isFolderModalOpen) return;

    const onBackPress = () => {
      if (isModalOpen) {
        setIsModalOpen(false);
        return true;
      }
      if (isFolderModalOpen) {
        setIsFolderModalOpen(false);
        return true;
      }
      if (activeFolderId !== null) {
        setActiveFolderId(null);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeFolderId, isModalOpen, isFolderModalOpen]);

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const created = await createFolder(trimmed);
    setNewFolderName('');
    setIsFolderModalOpen(false);
    setActiveFolderId(created.id);
  };

  const handleDeleteFolderConfirm = (folderId: string, folderName: string) => {
    const doDelete = async () => {
      await deleteFolder(folderId);
      if (activeFolderId === folderId) {
        setActiveFolderId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Удалить папку задач "${folderName}"?\nЗадачи из неё перенесутся в категорию "Все".`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Удалить папку?',
        `Папка "${folderName}" будет удалена, а ее задачи перенесены в категорию "Все".`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Удалить', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const openCreateModal = () => {
    setActiveTodo(null);
    setTitle('');
    setDescription('');
    setTargetFolderId(activeFolderId);
    setHasDeadline(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = tomorrow.getDate();
    const m = tomorrow.getMonth() + 1;
    setSelectedDay(d);
    setSelectedMonth(m);
    setIsModalOpen(true);
    scrollToWheelPositions(d, m, false);
  };

  const openEditModal = (todo: TodoItem) => {
    setActiveTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || '');
    setTargetFolderId(todo.folderId);
    if (todo.deadline) {
      setHasDeadline(true);
      const d = new Date(todo.deadline);
      const dDay = d.getDate();
      const dMonth = d.getMonth() + 1;
      setSelectedDay(dDay);
      setSelectedMonth(dMonth);
      scrollToWheelPositions(dDay, dMonth, false);
    } else {
      setHasDeadline(false);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const d = tomorrow.getDate();
      const m = tomorrow.getMonth() + 1;
      setSelectedDay(d);
      setSelectedMonth(m);
    }
    setIsModalOpen(true);
  };

  const toggleDeadline = () => {
    const next = !hasDeadline;
    setHasDeadline(next);
    if (next) {
      scrollToWheelPositions(selectedDay, selectedMonth, false);
    }
  };

  const handleSaveTodo = async () => {
    if (!title.trim()) return;

    let deadlineTs: number | null = null;
    let deadlineStr: string | null = null;

    if (hasDeadline) {
      const yr = getTargetYear(selectedDay, selectedMonth);
      const d = new Date(yr, selectedMonth - 1, selectedDay, 23, 59, 59, 999);
      deadlineTs = d.getTime();
      deadlineStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    await saveTodo({
      id: activeTodo?.id,
      title: title.trim(),
      description: description.trim(),
      folderId: targetFolderId !== null ? targetFolderId : activeFolderId,
      deadline: deadlineTs,
      deadlineText: deadlineStr,
      isCompleted: activeTodo?.isCompleted ?? false,
      isPinned: activeTodo?.isPinned,
    });

    setIsModalOpen(false);
  };

  // Drag and Drop логика
  const handleDragStart = (item: TodoItem, pageX: number, pageY: number) => {
    setDraggingTodo(item);
    setDragPos({ x: pageX, y: pageY });
    const bounds: Record<string, { x: number; y: number; width: number; height: number }> = {};
    folders.forEach((f) => {
      folderRefs.current[f.id]?.measureInWindow((x: number, y: number, width: number, height: number) => {
        bounds[f.id] = { x, y, width, height };
      });
    });
    folderBoundsRef.current = bounds;
  };

  const handleDragMove = (pageX: number, pageY: number) => {
    setDragPos({ x: pageX, y: pageY });
    let hitId: string | null = null;
    const bounds = folderBoundsRef.current;
    for (const id in bounds) {
      const b = bounds[id];
      if (b && pageX >= b.x && pageX <= b.x + b.width && pageY >= b.y && pageY <= b.y + b.height) {
        hitId = id;
        break;
      }
    }
    setHoveredFolderId(hitId);
  };

  const handleDragEnd = async () => {
    const targetFolderId = hoveredFolderIdRef.current;
    const todoToMove = draggingTodoRef.current;
    if (targetFolderId && todoToMove) {
      const targetFolder = folders.find((f) => f.id === targetFolderId);
      await saveTodo({
        ...todoToMove,
        folderId: targetFolderId,
      });
      if (Platform.OS === 'android' && targetFolder) {
        ToastAndroid.show(`Задача перемещена в папку "${targetFolder.name}"`, ToastAndroid.SHORT);
      }
    }
    setDraggingTodo(null);
    setHoveredFolderId(null);
  };

  // Сортировка папок
  const sortedFolders = [...folders].sort((a, b) => {
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const sortTodoList = (list: TodoItem[]) => {
    return [...list].sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  };

  const hasFolders = folders.length > 0;
  const displayTodos = sortTodoList(
    activeFolderId !== null
      ? todos.filter((t) => t.folderId === activeFolderId)
      : !hasFolders
      ? todos
      : todos.filter((t) => t.folderId === null)
  );

  const activeFolder = folders.find((item) => item.id === activeFolderId);
  const isEntirelyEmpty = todos.length === 0 && folders.length === 0;

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return null;
    const f = folders.find((item) => item.id === folderId);
    return f ? f.name : null;
  };

  const renderDeadlineBadge = (item: TodoItem) => {
    const textToShow =
      item.deadlineText ||
      (item.deadline ? new Date(item.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : null);

    if (!textToShow) return null;

    const isOverdue = item.deadline ? item.deadline < Date.now() : false;

    return (
      <View
        style={[
          styles.deadlineBadge,
          { backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : theme.pillBg },
        ]}>
        <Text
          style={[
            styles.deadlineText,
            { color: isOverdue ? '#ef4444' : theme.accent },
          ]}>
          {isOverdue ? `⚠️ ${textToShow}` : `⏳ ${textToShow}`}
        </Text>
      </View>
    );
  };

  const computedDeadline = useMemo(() => {
    if (!hasDeadline) return null;
    const now = new Date();
    const yr = getTargetYear(selectedDay, selectedMonth);
    const target = new Date(yr, selectedMonth - 1, selectedDay, 23, 59, 59, 999);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(yr, selectedMonth - 1, selectedDay).getTime();
    const diffDays = Math.round((startOfTarget - startOfToday) / (24 * 3600 * 1000));

    const dateStr = target.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return { target, diffDays, dateStr };
  }, [hasDeadline, selectedDay, selectedMonth]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Шапка вложенности папки */}
      {activeFolderId !== null ? (
        <View style={[styles.folderHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => setActiveFolderId(null)}
            style={styles.backFolderBtn}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>← Назад к папкам</Text>
          </TouchableOpacity>
          <Text style={[styles.folderTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
            📂 {activeFolder ? activeFolder.name : 'Папка'}
          </Text>
          {activeFolder && (
            <TouchableOpacity
              onPress={() => handleDeleteFolderConfirm(activeFolder.id, activeFolder.name)}
              style={styles.deleteFolderHeaderBtn}>
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Удалить 🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[styles.rootHeaderRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.rootHeaderText, { color: theme.textPrimary }]}>Все задачи</Text>
          <TouchableOpacity
            onPress={() => setIsFolderModalOpen(true)}
            style={[styles.addFolderHeaderBtn, { backgroundColor: theme.pillBg, borderColor: theme.accent }]}>
            <Text style={[styles.addFolderHeaderText, { color: theme.accent }]}>+ Создать папку</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollListContainer} showsVerticalScrollIndicator={true}>
        {/* Пустое состояние, если вообще нет задач и папок */}
        {isEntirelyEmpty ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🎯</Text>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Список задач пуст</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Нажмите на плюс внизу, чтобы добавить новую задачу
            </Text>
          </View>
        ) : (
          <>
            {/* СЕКЦИЯ ПАПОК: Показывается ТОЛЬКО если папки реально созданы */}
            {activeFolderId === null && hasFolders && (
              <View style={styles.foldersSection}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Папки задач ({sortedFolders.length})</Text>
                <View style={styles.foldersGrid}>
                  {sortedFolders.map((folder) => {
                    const count = todos.filter((t) => t.folderId === folder.id).length;
                    const isHovered = hoveredFolderId === folder.id;
                    return (
                      <View
                        key={folder.id}
                        collapsable={false}
                        ref={(el) => {
                          if (el) folderRefs.current[folder.id] = el;
                        }}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setActiveFolderId(folder.id)}
                          style={[
                            styles.folderCard,
                            {
                              backgroundColor: isHovered ? theme.pillBg : theme.card,
                              borderColor: isHovered ? theme.accent : folder.isPinned ? theme.accent : theme.border,
                              borderWidth: isHovered ? 2 : folder.isPinned ? 1.5 : 1,
                            },
                          ]}>
                          <View style={styles.folderCardLeft}>
                            <Text style={{ fontSize: 24, marginRight: 10 }}>{isHovered ? '📥' : '📂'}</Text>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.folderCardName, { color: theme.textPrimary }]} numberOfLines={1}>
                                  {folder.name}
                                </Text>
                                {folder.isPinned && <Text style={{ fontSize: 13 }}>📌</Text>}
                              </View>
                              <Text
                                style={[
                                  styles.folderCardCount,
                                  { color: isHovered ? theme.accent : theme.textSecondary, fontWeight: isHovered ? '700' : 'normal' },
                                ]}>
                                {isHovered ? 'Отпустите, чтобы переместить сюда' : `${count} задач`}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.folderCardRight}>
                            <TouchableOpacity
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              onPress={() => togglePinFolder(folder.id)}
                              style={styles.folderIconBtn}>
                              <Text style={{ fontSize: 15, opacity: folder.isPinned ? 1 : 0.4 }}>📌</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              onPress={() => handleDeleteFolderConfirm(folder.id, folder.name)}
                              style={styles.folderIconBtn}>
                              <Text style={{ fontSize: 16 }}>🗑️</Text>
                            </TouchableOpacity>
                            <Text style={{ color: theme.accent, fontSize: 16, marginLeft: 2 }}>➔</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* СЕКЦИЯ ЗАДАЧ */}
            <View style={styles.notesSection}>
              {activeFolderId === null && hasFolders && (
                <View style={styles.unassignedHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    Задачи без папки ({displayTodos.length})
                  </Text>
                  {displayTodos.length > 0 && (
                    <Text style={[styles.dragHintText, { color: theme.textSecondary }]}>
                      Зажмите ⠿ для переноса в папку
                    </Text>
                  )}
                </View>
              )}

              {displayTodos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 38, marginBottom: 10 }}>🎯</Text>
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                    {activeFolderId !== null ? 'В этой папке пока нет задач' : 'Список задач пуст'}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                    Нажмите на плюс внизу, чтобы добавить новую задачу
                  </Text>
                </View>
              ) : (
                displayTodos.map((item) => {
                  const folderName = getFolderName(item.folderId);
                  const isUnassigned = activeFolderId === null && hasFolders && item.folderId === null;
                  return (
                    <TodoCardItem
                      key={item.id}
                      item={item}
                      theme={theme}
                      hasFolders={hasFolders}
                      folderName={folderName}
                      isDraggable={isUnassigned}
                      renderDeadlineBadge={renderDeadlineBadge}
                      onOpen={() => openEditModal(item)}
                      onToggleComplete={() => toggleCompleteTodo(item.id)}
                      onTogglePin={() => togglePinTodo(item.id)}
                      onDelete={() => deleteTodo(item.id)}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    />
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Плавающий бейдж при перетаскивании задачи */}
      {draggingTodo && (
        <View
          pointerEvents="none"
          style={[
            styles.floatingDragBadge,
            {
              left: Math.max(10, dragPos.x - 90),
              top: Math.max(20, dragPos.y - 45),
              backgroundColor: theme.card,
              borderColor: hoveredFolderId ? theme.accent : theme.border,
            },
          ]}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>{hoveredFolderId ? '📥' : '🎯'}</Text>
          <View style={{ maxWidth: 180 }}>
            <Text style={[styles.floatingDragTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {draggingTodo.title}
            </Text>
            <Text style={[styles.floatingDragSub, { color: theme.accent }]}>
              {hoveredFolderId ? 'Отпустите в папку' : 'Перетащите в папку ➔'}
            </Text>
          </View>
        </View>
      )}

      {/* FAB Кнопка добавления задачи */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        activeOpacity={0.85}
        onPress={openCreateModal}>
        <View style={styles.plusContainer}>
          <View style={styles.plusHorizontal} />
          <View style={styles.plusVertical} />
        </View>
      </TouchableOpacity>

      {/* Модалка создания/редактирования задачи */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsModalOpen(false)}
          />
          <View style={[styles.createSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {activeTodo ? 'Редактировать задачу' : 'Новая задача'}
            </Text>

            <ScrollableWithBar
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 4 }}
              indicatorColor={theme.accent}
              trackRightOffset={-6}
              trackColor={theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Название задачи</Text>
              <TextInput
                placeholder="Что нужно сделать..."
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Подробности / Описание</Text>
              <TextInput
                placeholder="Детали задачи..."
                placeholderTextColor={theme.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={[
                  styles.modalTextarea,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
                ]}
              />

              {hasFolders && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Выберите папку:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setTargetFolderId(null)}
                      style={[
                        styles.folderChip,
                        { borderColor: theme.border },
                        targetFolderId === null && { backgroundColor: theme.accent, borderColor: theme.accent },
                      ]}>
                      <Text style={{ fontSize: 12, color: targetFolderId === null ? '#ffffff' : theme.textSecondary }}>
                        Без папки
                      </Text>
                    </TouchableOpacity>
                    {folders.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => setTargetFolderId(f.id)}
                        style={[
                          styles.folderChip,
                          { borderColor: theme.border },
                          targetFolderId === f.id && { backgroundColor: theme.accent, borderColor: theme.accent },
                        ]}>
                        <Text style={{ fontSize: 12, color: targetFolderId === f.id ? '#ffffff' : theme.textSecondary }}>
                          📂 {f.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Выбор дедлайна: колесо прокрута / дней от 1 до 365 с синхронизацией даты */}
              <View style={styles.deadlineContainer}>
                <View style={styles.deadlineContainerHeader}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                    Дедлайн задачи
                  </Text>
                  <TouchableOpacity
                    onPress={toggleDeadline}
                    style={[
                      styles.deadlineToggleBtn,
                      {
                        backgroundColor: hasDeadline ? theme.accent : (theme.mode === 'dark' ? '#27272a' : '#f1f5f9'),
                        borderColor: hasDeadline ? theme.accent : theme.border,
                      },
                    ]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: hasDeadline ? '#ffffff' : theme.textSecondary }}>
                      {hasDeadline ? '✓ Дедлайн активен' : '+ Без дедлайна'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {hasDeadline && (
                  <View style={[styles.deadlinePickerCard, { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', borderColor: theme.border }]}>
                    {/* Подписи столбцов */}
                    <View style={styles.wheelHeaderRow}>
                      <Text style={[styles.wheelColLabel, { color: theme.textSecondary }]}>ДЕНЬ</Text>
                      <Text style={[styles.wheelColLabel, { color: theme.textSecondary }]}>МЕСЯЦ</Text>
                    </View>

                    {/* Барабаны прокрутки */}
                    <View style={styles.wheelPickerWrapper}>
                      {/* Селекторная рамка по центру барабанов */}
                      <View
                        pointerEvents="none"
                        style={[
                          styles.wheelCenterHighlight,
                          {
                            top: WHEEL_PADDING,
                            height: WHEEL_ITEM_HEIGHT,
                            backgroundColor: theme.pillBg,
                            borderColor: theme.accent,
                          },
                        ]}
                      />

                      {/* Столбик: ДЕНЬ (01 .. maxDays в зависимости от месяца) */}
                      <View style={styles.wheelColumn}>
                        <ScrollView
                          ref={dayScrollRef}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          snapToInterval={WHEEL_ITEM_HEIGHT}
                          decelerationRate="fast"
                          contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
                          onMomentumScrollEnd={onDayScrollEnd}
                          onScrollEndDrag={onDayScrollEnd}
                          style={{ height: WHEEL_CONTAINER_HEIGHT }}>
                          {daysList.map((d) => {
                            const isSel = selectedDay === d;
                            return (
                              <TouchableOpacity
                                key={d}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setSelectedDay(d);
                                  dayScrollRef.current?.scrollTo({ y: (d - 1) * WHEEL_ITEM_HEIGHT, animated: true });
                                }}
                                style={[styles.wheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
                                <Text
                                  style={[
                                    styles.wheelItemText,
                                    isSel
                                      ? { color: theme.accent, fontWeight: '800', fontSize: 17 }
                                      : { color: theme.textSecondary, opacity: 0.4, fontSize: 14 },
                                  ]}>
                                  {d.toString().padStart(2, '0')}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      <View style={[styles.wheelDivider, { backgroundColor: theme.border }]} />

                      {/* Столбик: МЕСЯЦ (01 .. 12) */}
                      <View style={[styles.wheelColumn, { flex: 1.4 }]}>
                        <ScrollView
                          ref={monthScrollRef}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          snapToInterval={WHEEL_ITEM_HEIGHT}
                          decelerationRate="fast"
                          contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
                          onMomentumScrollEnd={onMonthScrollEnd}
                          onScrollEndDrag={onMonthScrollEnd}
                          style={{ height: WHEEL_CONTAINER_HEIGHT }}>
                          {MONTHS.map((m) => {
                            const isSel = selectedMonth === m.value;
                            return (
                              <TouchableOpacity
                                key={m.value}
                                activeOpacity={0.7}
                                onPress={() => {
                                  handleSelectMonth(m.value);
                                  monthScrollRef.current?.scrollTo({ y: (m.value - 1) * WHEEL_ITEM_HEIGHT, animated: true });
                                }}
                                style={[styles.wheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
                                <Text
                                  style={[
                                    styles.wheelItemText,
                                    isSel
                                      ? { color: theme.accent, fontWeight: '800', fontSize: 15.5 }
                                      : { color: theme.textSecondary, opacity: 0.4, fontSize: 13.5 },
                                  ]}>
                                  {m.value.toString().padStart(2, '0')} • {m.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>

                    {/* Синхронизированный день и дата под выбором */}
                    <View style={[styles.syncDateBadge, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>📅</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.syncDateTitle, { color: theme.accent }]}>
                          Дедлайн: {computedDeadline?.dateStr}
                        </Text>
                        <Text style={[styles.syncDateSub, { color: theme.textSecondary }]}>
                          {computedDeadline?.diffDays === 0
                            ? 'сегодня'
                            : computedDeadline?.diffDays === 1
                            ? 'завтра'
                            : `через ${computedDeadline?.diffDays} ${getDaysWord(computedDeadline?.diffDays || 0)}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollableWithBar>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveTodo}
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {activeTodo ? 'Сохранить' : 'Создать'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка создания новой папки */}
      <Modal visible={isFolderModalOpen} transparent animationType="fade" onRequestClose={() => setIsFolderModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsFolderModalOpen(false)}
          />
          <View style={[styles.createSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Новая папка задач</Text>

            <TextInput
              autoFocus
              placeholder="Название папки (напр. Курсовая)..."
              placeholderTextColor={theme.textSecondary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              onSubmitEditing={handleCreateFolder}
              returnKeyType="done"
              style={[
                styles.modalInput,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsFolderModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateFolder}
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Создать</Text>
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
  rootHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rootHeaderText: { fontSize: 16, fontWeight: '700' },
  addFolderHeaderBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  addFolderHeaderText: { fontSize: 12.5, fontWeight: '700' },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backFolderBtn: { paddingVertical: 4 },
  folderTitleText: { fontSize: 16, fontWeight: '700', flex: 1 },
  deleteFolderHeaderBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  scrollListContainer: { padding: 16, paddingBottom: 100 },
  foldersSection: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  foldersGrid: { gap: 10 },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  folderCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  folderCardName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  folderCardCount: { fontSize: 12 },
  folderCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  folderIconBtn: { padding: 4 },
  notesSection: {},
  emptyState: { alignItems: 'center', paddingHorizontal: 32, marginTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  unassignedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  dragHintText: { fontSize: 11, fontStyle: 'italic' },
  dragGripContainer: {
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragGripIcon: { fontSize: 18, letterSpacing: -2 },
  floatingDragBadge: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingDragTitle: { fontSize: 14, fontWeight: '700' },
  floatingDragSub: { fontSize: 11, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  textContainer: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 12.5, marginBottom: 4, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  folderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  folderBadgeText: { fontSize: 11, fontWeight: '700' },
  deadlineBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  deadlineText: { fontSize: 11, fontWeight: '700' },
  pinBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
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
  modalBackdrop: { flex: 1, position: 'relative', backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  backdropTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  createSheet: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    zIndex: 10,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  modalInput: { height: 42, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  modalTextarea: { height: 70, borderRadius: 10, padding: 12, textAlignVertical: 'top', marginBottom: 12, fontSize: 14 },
  folderChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  deadlineContainer: { marginBottom: 14 },
  deadlineContainerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  deadlineToggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  deadlinePickerCard: { padding: 12, borderRadius: 12, borderWidth: 1 },
  wheelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  wheelColLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  wheelPickerWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  wheelCenterHighlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderWidth: 1.5,
    borderRadius: 10,
    zIndex: 1,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelDivider: {
    width: 1,
    height: 70,
    opacity: 0.5,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  wheelItemText: {
    textAlign: 'center',
  },
  syncDateBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1 },
  syncDateTitle: { fontSize: 12.5, fontWeight: '700' },
  syncDateSub: { fontSize: 11 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
