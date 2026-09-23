import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  BackHandler,
  PanResponder,
  ToastAndroid,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useNotes } from '../../context/NotesContext';
import { Note } from '../../src/types/notes';

interface NoteCardItemProps {
  item: Note;
  theme: any;
  hasFolders: boolean;
  folderName: string;
  isDraggable: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onDragStart: (item: Note, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
}

function NoteCardItem({
  item,
  theme,
  hasFolders,
  folderName,
  isDraggable,
  onOpen,
  onTogglePin,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: NoteCardItemProps) {
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

  const dateStr = new Date(item.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });

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

      <View style={styles.cardMain}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isPinned && <Text style={{ fontSize: 13 }}>📌</Text>}
        </View>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{dateStr}</Text>
      </View>

      <View style={styles.cardRight}>
        <TouchableOpacity hitSlop={10} onPress={onTogglePin} style={styles.pinBtn}>
          <Text style={{ fontSize: 15, opacity: item.isPinned ? 1 : 0.4 }}>📌</Text>
        </TouchableOpacity>

        {hasFolders && item.folderId && (
          <View style={[styles.badge, { backgroundColor: theme.pillBg }]}>
            <Text style={[styles.badgeText, { color: theme.accent }]}>{folderName}</Text>
          </View>
        )}

        <TouchableOpacity onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
          <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function NotesScreen() {
  const { theme } = useAppTheme();
  const {
    notes,
    folders,
    createFolder,
    deleteFolder,
    togglePinFolder,
    saveNote,
    togglePinNote,
    deleteNote,
  } = useNotes();

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Drag and Drop заметок в папки
  const [draggingNote, setDraggingNote] = useState<Note | null>(null);
  const draggingNoteRef = useRef<Note | null>(null);
  draggingNoteRef.current = draggingNote;

  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const hoveredFolderIdRef = useRef<string | null>(null);
  hoveredFolderIdRef.current = hoveredFolderId;

  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const folderBoundsRef = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const folderRefs = useRef<Record<string, any>>({});

  // Модалка создания папки
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Модалка создания заметки
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newNoteFolderId, setNewNoteFolderId] = useState<string | null>(null);

  // Просмотр / редактирование заметки
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  // Обработка жеста / кнопки «Назад»
  useEffect(() => {
    if (activeFolderId === null && !isCreateOpen && !isNewFolderModalOpen && !activeNote) return;

    const onBackPress = () => {
      if (activeNote) {
        setActiveNote(null);
        return true;
      }
      if (isCreateOpen) {
        setIsCreateOpen(false);
        return true;
      }
      if (isNewFolderModalOpen) {
        setIsNewFolderModalOpen(false);
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
  }, [activeFolderId, isCreateOpen, isNewFolderModalOpen, activeNote]);

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const created = await createFolder(trimmed);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
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
      if (window.confirm(`Удалить папку "${folderName}"?\nЗаметки из неё перенесутся в категорию "Общие".`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Удалить папку?',
        `Папка "${folderName}" будет удалена, а ее заметки перенесены в категорию "Общие".`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Удалить', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleCreateNote = async () => {
    if (!newTitle.trim()) return;

    await saveNote({
      title: newTitle.trim(),
      content: newContent.trim(),
      folderId: newNoteFolderId !== null ? newNoteFolderId : activeFolderId,
    });

    setNewTitle('');
    setNewContent('');
    setNewNoteFolderId(null);
    setIsCreateOpen(false);
  };

  const handleOpenNote = (note: Note) => {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFolderId(note.folderId);
  };

  const handleSaveEditedNote = async () => {
    if (!activeNote) return;

    await saveNote({
      id: activeNote.id,
      title: editTitle.trim() || 'Без названия',
      content: editContent,
      folderId: editFolderId,
      isPinned: activeNote.isPinned,
    });

    setActiveNote(null);
  };

  const handleDeleteNoteConfirm = async (id: string) => {
    await deleteNote(id);
    if (activeNote?.id === id) {
      setActiveNote(null);
    }
  };

  // Drag and Drop логика
  const handleDragStart = (item: Note, pageX: number, pageY: number) => {
    setDraggingNote(item);
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
    const noteToMove = draggingNoteRef.current;
    if (targetFolderId && noteToMove) {
      const targetFolder = folders.find((f) => f.id === targetFolderId);
      await saveNote({
        ...noteToMove,
        folderId: targetFolderId,
      });
      if (Platform.OS === 'android' && targetFolder) {
        ToastAndroid.show(`Заметка перемещена в папку "${targetFolder.name}"`, ToastAndroid.SHORT);
      }
    }
    setDraggingNote(null);
    setHoveredFolderId(null);
  };

  // Сортировка папок: сначала закрепленные, затем по времени создания
  const sortedFolders = [...folders].sort((a, b) => {
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const sortNotesList = (list: Note[]) => {
    return [...list].sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  };

  // Если папок нет вообще, показываем все заметки единым списком
  const hasFolders = folders.length > 0;
  const displayNotes = sortNotesList(
    activeFolderId !== null
      ? notes.filter((n) => n.folderId === activeFolderId)
      : !hasFolders
      ? notes
      : notes.filter((n) => n.folderId === null)
  );

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const isEntirelyEmpty = notes.length === 0 && folders.length === 0;

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return 'Общие';
    const match = folders.find((f) => f.id === folderId);
    return match ? match.name : 'Общие';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Верхняя навигация */}
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
          <Text style={[styles.rootHeaderText, { color: theme.textPrimary }]}>Все записи</Text>
          <TouchableOpacity
            onPress={() => setIsNewFolderModalOpen(true)}
            style={[styles.addFolderHeaderBtn, { backgroundColor: theme.pillBg, borderColor: theme.accent }]}>
            <Text style={[styles.addFolderHeaderText, { color: theme.accent }]}>+ Создать папку</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollListContainer} showsVerticalScrollIndicator={false}>
        {/* Пустое состояние, если вообще нет записей и папок */}
        {isEntirelyEmpty ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>📝</Text>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Заметки пусты</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Нажмите на плюс внизу, чтобы добавить первую заметку
            </Text>
          </View>
        ) : (
          <>
            {/* СЕКЦИЯ ПАПОК: Показывается ТОЛЬКО если папки реально созданы */}
            {activeFolderId === null && hasFolders && (
              <View style={styles.foldersSection}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Папки ({sortedFolders.length})</Text>
                <View style={styles.foldersGrid}>
                  {sortedFolders.map((folder) => {
                    const count = notes.filter((n) => n.folderId === folder.id).length;
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
                                {isHovered ? 'Отпустите, чтобы переместить сюда' : `${count} заметок`}
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

            {/* СЕКЦИЯ ЗАМЕТОК */}
            <View style={styles.notesSection}>
              {activeFolderId === null && hasFolders && (
                <View style={styles.unassignedHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    Заметки без папки ({displayNotes.length})
                  </Text>
                  {displayNotes.length > 0 && (
                    <Text style={[styles.dragHintText, { color: theme.textSecondary }]}>
                      Зажмите ⠿ для переноса в папку
                    </Text>
                  )}
                </View>
              )}

              {displayNotes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 38, marginBottom: 10 }}>📝</Text>
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                    {activeFolderId !== null ? 'В этой папке пока нет заметок' : 'Заметки пусты'}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                    Нажмите на плюс внизу, чтобы добавить заметку
                  </Text>
                </View>
              ) : (
                displayNotes.map((item) => {
                  const folderName = getFolderName(item.folderId);
                  const isUnassigned = activeFolderId === null && hasFolders && item.folderId === null;
                  return (
                    <NoteCardItem
                      key={item.id}
                      item={item}
                      theme={theme}
                      hasFolders={hasFolders}
                      folderName={folderName}
                      isDraggable={isUnassigned}
                      onOpen={() => handleOpenNote(item)}
                      onTogglePin={() => togglePinNote(item.id)}
                      onDelete={() => handleDeleteNoteConfirm(item.id)}
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

      {/* Плавающий бейдж при перетаскивании заметки */}
      {draggingNote && (
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
          <Text style={{ fontSize: 20, marginRight: 8 }}>{hoveredFolderId ? '📥' : '📝'}</Text>
          <View style={{ maxWidth: 180 }}>
            <Text style={[styles.floatingDragTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {draggingNote.title}
            </Text>
            <Text style={[styles.floatingDragSub, { color: theme.accent }]}>
              {hoveredFolderId ? 'Отпустите в папку' : 'Перетащите в папку ➔'}
            </Text>
          </View>
        </View>
      )}

      {/* FAB Кнопка добавления заметки */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        activeOpacity={0.85}
        onPress={() => {
          setNewNoteFolderId(activeFolderId);
          setIsCreateOpen(true);
        }}>
        <View style={styles.plusContainer}>
          <View style={styles.plusHorizontal} />
          <View style={styles.plusVertical} />
        </View>
      </TouchableOpacity>

      {/* Просмотр и редактирование заметки */}
      <Modal visible={!!activeNote} animationType="slide" onRequestClose={() => setActiveNote(null)}>
        <View style={[styles.modalScreen, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setActiveNote(null)} style={styles.backBtn}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Назад</Text>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 180 }}>
              <TouchableOpacity
                onPress={() => {
                  const currentIdx = folders.findIndex((f) => f.id === editFolderId);
                  const nextFolder = folders[(currentIdx + 1) % (folders.length + 1)];
                  setEditFolderId(nextFolder ? nextFolder.id : null);
                }}
                style={[styles.badge, { backgroundColor: theme.pillBg }]}>
                <Text style={[styles.badgeText, { color: theme.accent }]}>
                  📁 {getFolderName(editFolderId)}
                </Text>
              </TouchableOpacity>
            </ScrollView>

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
              {activeNote ? new Date(activeNote.createdAt).toLocaleString('ru-RU') : ''}
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
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsCreateOpen(false)}
          />
          <View style={[styles.createSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
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

            {hasFolders && (
              <>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Выберите папку:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  <TouchableOpacity
                    onPress={() => setNewNoteFolderId(null)}
                    style={[
                      styles.folderChip,
                      { borderColor: theme.border },
                      newNoteFolderId === null && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}>
                    <Text style={{ fontSize: 12, color: newNoteFolderId === null ? '#ffffff' : theme.textSecondary }}>
                      Без папки
                    </Text>
                  </TouchableOpacity>
                  {folders.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setNewNoteFolderId(f.id)}
                      style={[
                        styles.folderChip,
                        { borderColor: theme.border },
                        newNoteFolderId === f.id && { backgroundColor: theme.accent, borderColor: theme.accent },
                      ]}>
                      <Text style={{ fontSize: 12, color: newNoteFolderId === f.id ? '#ffffff' : theme.textSecondary }}>
                        📂 {f.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

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
          </View>
        </View>
      </Modal>

      {/* Создание новой папки */}
      <Modal visible={isNewFolderModalOpen} transparent animationType="fade" onRequestClose={() => setIsNewFolderModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsNewFolderModalOpen(false)}
          />
          <View style={[styles.createSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Новая папка заметок</Text>

            <TextInput
              autoFocus
              placeholder="Название папки (напр. Учеба)..."
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
                onPress={() => setIsNewFolderModalOpen(false)}
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
  unassignedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  dragHintText: { fontSize: 11, fontStyle: 'italic' },
  dragGripContainer: {
    paddingRight: 10,
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
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinBtn: { padding: 4 },
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
  modalBackdrop: { flex: 1, position: 'relative', backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  backdropTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  createSheet: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 20, borderWidth: 1, zIndex: 10, position: 'relative' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  modalInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, fontSize: 14 },
  modalTextarea: { height: 90, borderRadius: 10, padding: 12, textAlignVertical: 'top', marginBottom: 12, fontSize: 14 },
  folderChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
