import React, { useState } from 'react';
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
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTodo } from '../../context/TodoContext';
import { TodoItem } from '../../src/types/todo';

export default function RemindersScreen() {
  const { theme } = useAppTheme();
  const {
    todos,
    folders,
    createFolder,
    deleteFolder,
    saveTodo,
    toggleCompleteTodo,
    deleteTodo,
  } = useTodo();

  const [search, setSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Модалка создания папки
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Модалка создания/редактирования задачи
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [deadlineText, setDeadlineText] = useState('');

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
      if (window.confirm(`Удалить папку задач "${folderName}"?\nЗадачи из неё перенесутся в "Все".`)) {
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
    setDeadlineText('');
    setIsModalOpen(true);
  };

  const openEditModal = (todo: TodoItem) => {
    setActiveTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || '');
    setTargetFolderId(todo.folderId);
    setDeadlineText(
      todo.deadlineText || (todo.deadline ? new Date(todo.deadline).toLocaleDateString('ru-RU') : '')
    );
    setIsModalOpen(true);
  };

  const handleSaveTodo = async () => {
    if (!title.trim()) return;

    let deadlineTs: number | null = null;
    const trimmedDl = deadlineText.trim();

    if (trimmedDl) {
      const lower = trimmedDl.toLowerCase();
      if (lower.includes('сегодня')) {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        deadlineTs = d.getTime();
      } else if (lower.includes('завтра')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(23, 59, 59, 999);
        deadlineTs = d.getTime();
      } else {
        // Парсинг формата ДД.ММ.ГГГГ (напр. 03.09.2026)
        const dotParts = trimmedDl.split('.');
        if (dotParts.length >= 2) {
          const day = parseInt(dotParts[0], 10);
          const month = parseInt(dotParts[1], 10) - 1;
          const year = dotParts.length === 3 ? parseInt(dotParts[2], 10) : new Date().getFullYear();
          if (!isNaN(day) && !isNaN(month)) {
            const d = new Date(year, month, day, 23, 59, 59);
            deadlineTs = d.getTime();
          }
        } else {
          const parsed = Date.parse(trimmedDl);
          if (!isNaN(parsed)) {
            deadlineTs = parsed;
          }
        }
      }
    }

    await saveTodo({
      id: activeTodo?.id,
      title: title.trim(),
      description: description.trim(),
      folderId: targetFolderId !== null ? targetFolderId : activeFolderId,
      deadline: deadlineTs,
      deadlineText: trimmedDl || null,
      isCompleted: activeTodo?.isCompleted ?? false,
    });

    setIsModalOpen(false);
  };

  const setQuickDeadline = (type: 'today' | 'tomorrow' | 'week') => {
    const d = new Date();
    if (type === 'today') {
      setDeadlineText('Сегодня');
    } else if (type === 'tomorrow') {
      setDeadlineText('Завтра');
    } else if (type === 'week') {
      d.setDate(d.getDate() + 7);
      setDeadlineText(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
    }
  };

  const filteredTodos = todos.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeFolderId !== null) {
      return t.folderId === activeFolderId;
    }
    return true;
  });

  const rootTodos = search.trim()
    ? filteredTodos
    : todos.filter((t) => t.folderId === null);

  const activeFolder = folders.find((item) => item.id === activeFolderId);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Поиск */}
      <View style={[styles.searchWrapper, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TextInput
          placeholder="Поиск задач..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9',
              color: theme.textPrimary,
            },
          ]}
        />
      </View>

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

      <ScrollView contentContainerStyle={styles.scrollListContainer} showsVerticalScrollIndicator={false}>
        {/* КОРНЕВОЙ РЕЖИМ: Отображение Папок карточками вместе с задачами */}
        {activeFolderId === null && !search.trim() && (
          <View style={styles.foldersSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Папки задач ({folders.length})</Text>
            {folders.length === 0 ? (
              <Text style={[styles.emptySectionText, { color: theme.textSecondary }]}>
                Папок задач пока нет. Нажмите «+ Создать папку» выше
              </Text>
            ) : (
              <View style={styles.foldersGrid}>
                {folders.map((folder) => {
                  const count = todos.filter((t) => t.folderId === folder.id).length;
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      activeOpacity={0.7}
                      onPress={() => setActiveFolderId(folder.id)}
                      style={[
                        styles.folderCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}>
                      <View style={styles.folderCardLeft}>
                        <Text style={{ fontSize: 24, marginRight: 10 }}>📂</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.folderCardName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {folder.name}
                          </Text>
                          <Text style={[styles.folderCardCount, { color: theme.textSecondary }]}>
                            {count} задач
                          </Text>
                        </View>
                      </View>

                      <View style={styles.folderCardRight}>
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={() => handleDeleteFolderConfirm(folder.id, folder.name)}
                          style={styles.folderDeleteIconBtn}>
                          <Text style={{ fontSize: 16 }}>🗑️</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.accent, fontSize: 16, marginLeft: 4 }}>➔</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* СЕКЦИЯ ЗАДАЧ */}
        <View style={styles.notesSection}>
          {activeFolderId === null && !search.trim() && (
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 16 }]}>
              Задачи без папки ({rootTodos.length})
            </Text>
          )}

          {(activeFolderId !== null ? filteredTodos : rootTodos).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🎯</Text>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Задач не найдено</Text>
              <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                {activeFolderId !== null
                  ? 'В этой папке пока нет задач. Нажмите на плюс внизу, чтобы добавить.'
                  : 'Нажмите на плюс внизу, чтобы добавить новую задачу'}
              </Text>
            </View>
          ) : (
            (activeFolderId !== null ? filteredTodos : rootTodos).map((item) => {
              const folderName = getFolderName(item.folderId);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => openEditModal(item)}>
                  <TouchableOpacity
                    onPress={() => toggleCompleteTodo(item.id)}
                    hitSlop={8}
                    style={[
                      styles.checkbox,
                      { borderColor: theme.border },
                      item.isCompleted && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}>
                    {item.isCompleted && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>

                  <View style={styles.textContainer}>
                    <Text
                      style={[
                        styles.title,
                        { color: theme.textPrimary },
                        item.isCompleted && { textDecorationLine: 'line-through', color: theme.textSecondary },
                      ]}>
                      {item.title}
                    </Text>

                    {item.description ? (
                      <Text
                        numberOfLines={2}
                        style={[styles.desc, { color: theme.textSecondary }]}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                      {folderName && (
                        <View style={[styles.folderBadge, { backgroundColor: theme.pillBg }]}>
                          <Text style={[styles.folderBadgeText, { color: theme.accent }]}>📂 {folderName}</Text>
                        </View>
                      )}
                      {renderDeadlineBadge(item)}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => deleteTodo(item.id)}
                    hitSlop={10}
                    style={styles.deleteBtn}>
                    <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

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
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {activeTodo ? 'Редактировать задачу' : 'Новая задача'}
              </Text>

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

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Дедлайн (время / дата):</Text>
              <View style={styles.quickDeadlineRow}>
                <TouchableOpacity
                  onPress={() => setQuickDeadline('today')}
                  style={[styles.quickDeadlineChip, { backgroundColor: theme.pillBg, borderColor: theme.accent }]}>
                  <Text style={[styles.quickDeadlineText, { color: theme.accent }]}>Сегодня</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuickDeadline('tomorrow')}
                  style={[styles.quickDeadlineChip, { backgroundColor: theme.pillBg, borderColor: theme.accent }]}>
                  <Text style={[styles.quickDeadlineText, { color: theme.accent }]}>Завтра</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuickDeadline('week')}
                  style={[styles.quickDeadlineChip, { backgroundColor: theme.pillBg, borderColor: theme.accent }]}>
                  <Text style={[styles.quickDeadlineText, { color: theme.accent }]}>Через неделю</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Дедлайн (напр. 18:00, Завтра в 15:00, 03.09.2026)..."
                placeholderTextColor={theme.textSecondary}
                value={deadlineText}
                onChangeText={setDeadlineText}
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
                ]}
              />

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
            </ScrollView>
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
  searchWrapper: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { height: 40, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
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
  foldersSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  emptySectionText: { fontSize: 13, fontStyle: 'italic' },
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
  folderDeleteIconBtn: { padding: 4 },
  notesSection: {},
  emptyState: { alignItems: 'center', paddingHorizontal: 32, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
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
  modalBackdrop: { flex: 1, position: 'relative', backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  backdropTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  createSheet: { width: '100%', maxWidth: 360, maxHeight: 540, borderRadius: 20, padding: 20, borderWidth: 1, zIndex: 10, position: 'relative' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  modalInput: { height: 42, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  modalTextarea: { height: 75, borderRadius: 10, padding: 12, textAlignVertical: 'top', marginBottom: 12, fontSize: 14 },
  quickDeadlineRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  quickDeadlineChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  quickDeadlineText: { fontSize: 11.5, fontWeight: '600' },
  folderChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
