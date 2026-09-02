import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { loadData, saveData, KEYS } from '../../src/services/storage';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  tag: string;
}

export default function NotesScreen() {
  const { theme } = useAppTheme();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [search, setSearch] = useState('');

  // Модалка создания
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('');

  // Просмотр / редактирование
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadData<NoteItem[]>(KEYS.NOTES, []).then(setNotes);
  }, []);

  const handleCreateNote = async () => {
    if (!newTitle.trim()) return;

    const today = new Date();
    const dateFormatted = `${today.getDate()} ${today.toLocaleDateString('ru-RU', { month: 'short' })}`;

    const newNote: NoteItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      content: newContent.trim(),
      date: dateFormatted,
      tag: newTag.trim() || 'Общее',
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    await saveData(KEYS.NOTES, updated);

    setNewTitle('');
    setNewContent('');
    setNewTag('');
    setIsCreateOpen(false);
  };

  const handleOpenNote = (note: NoteItem) => {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleSaveEditedNote = async () => {
    if (!activeNote) return;

    const updated = notes.map((item) =>
      item.id === activeNote.id
        ? { ...item, title: editTitle.trim() || 'Без названия', content: editContent }
        : item
    );

    setNotes(updated);
    await saveData(KEYS.NOTES, updated);
    setActiveNote(null);
  };

  const handleDeleteNote = async (id: string) => {
    const updated = notes.filter((item) => item.id !== id);
    setNotes(updated);
    await saveData(KEYS.NOTES, updated);
    if (activeNote?.id === id) {
      setActiveNote(null);
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Строка поиска */}
      <View style={[styles.searchWrapper, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TextInput
          placeholder="Поиск заметок..."
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

      {/* Список или пустое состояние */}
      {filteredNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon]}>📝</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Заметок пока нет</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            Нажмите на плюс внизу, чтобы добавить первую запись
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => handleOpenNote(item)}>
              <View style={styles.cardMain}>
                <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.date, { color: theme.textSecondary }]}>{item.date}</Text>
              </View>

              <View style={styles.cardRight}>
                <View style={[styles.badge, { backgroundColor: theme.pillBg }]}>
                  <Text style={[styles.badgeText, { color: theme.accent }]}>{item.tag}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteNote(item.id)}
                  hitSlop={10}
                  style={styles.deleteBtn}>
                  <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Кнопка добавления */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        activeOpacity={0.85}
        onPress={() => setIsCreateOpen(true)}>
        <View style={styles.plusContainer}>
          <View style={styles.plusHorizontal} />
          <View style={styles.plusVertical} />
        </View>
      </TouchableOpacity>

      {/* Просмотр и редактирование */}
      <Modal visible={!!activeNote} animationType="slide" onRequestClose={() => setActiveNote(null)}>
        <View style={[styles.modalScreen, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setActiveNote(null)} style={styles.backBtn}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Назад</Text>
            </TouchableOpacity>

            <View style={[styles.badge, { backgroundColor: theme.pillBg }]}>
              <Text style={[styles.badgeText, { color: theme.accent }]}>{activeNote?.tag}</Text>
            </View>

            <TouchableOpacity onPress={handleSaveEditedNote} style={styles.saveHeaderBtn}>
              <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '700' }}>Сохранить</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.noteViewContent}>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Заголовок"
              placeholderTextColor={theme.textSecondary}
              style={[styles.noteTitleInput, { color: theme.textPrimary }]}
            />
            <Text style={[styles.noteMetaDate, { color: theme.textSecondary }]}>
              {activeNote?.date}
            </Text>
            <TextInput
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Начните писать..."
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlignVertical="top"
              style={[styles.noteContentInput, { color: theme.textPrimary }]}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Создание заметки */}
      <Modal visible={isCreateOpen} transparent animationType="fade" onRequestClose={() => setIsCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsCreateOpen(false)}>
          <Pressable style={[styles.createSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Новая заметка</Text>

            <TextInput
              placeholder="Заголовок..."
              placeholderTextColor={theme.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
              style={[
                styles.modalInput,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
              ]}
            />

            <TextInput
              placeholder="Текст заметки..."
              placeholderTextColor={theme.textSecondary}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              numberOfLines={4}
              style={[
                styles.modalTextarea,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
              ]}
            />

            <TextInput
              placeholder="Тег (напр. Учеба, Личное)"
              placeholderTextColor={theme.textSecondary}
              value={newTag}
              onChangeText={setNewTag}
              style={[
                styles.modalInput,
                { backgroundColor: theme.mode === 'dark' ? '#27272a' : '#f1f5f9', color: theme.textPrimary },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsCreateOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateNote}
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Создать</Text>
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
  searchWrapper: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchInput: { height: 42, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: -40 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardMain: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  date: { fontSize: 12 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
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
  modalScreen: { flex: 1 },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  saveHeaderBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  noteViewContent: { padding: 20, flexGrow: 1 },
  noteTitleInput: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  noteMetaDate: { fontSize: 12, marginBottom: 16 },
  noteContentInput: { fontSize: 16, lineHeight: 24, flex: 1, minHeight: 350 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  createSheet: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  modalTextarea: { height: 90, borderRadius: 10, padding: 12, textAlignVertical: 'top', marginBottom: 12, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
