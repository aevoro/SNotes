import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useNotes } from '../../context/NotesContext';
import { useTodo } from '../../context/TodoContext';
import { useFolders } from '../../context/FoldersContext';
import { Note } from '../../src/types/notes';
import { TodoItem } from '../../src/types/todo';
import { AppFolder, FOLDER_COLORS, FOLDER_ICONS } from '../../src/types/folders';
import { CupertinoIcon, CupertinoIconName } from '../../src/components/CupertinoIcon';
import { ScrollableWithBar } from '../../src/components/ScrollableWithBar';

type HubSegment = 'all' | 'notes' | 'todos';

interface NoteCardItemProps {
  item: Note;
  theme: any;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function NoteCardItem({ item, theme, onOpen, onTogglePin, onDelete }: NoteCardItemProps) {
  const dateStr = new Date(item.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardSolid,
          borderColor: item.isPinned ? theme.accent : theme.border,
          borderWidth: item.isPinned ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}>
      <TouchableOpacity
        style={styles.cardMain}
        activeOpacity={0.7}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Заметка: ${item.title}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CupertinoIcon name="document" size={15} color={theme.accent} />
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isPinned && <CupertinoIcon name="pin-filled" size={12} color={theme.accent} />}
        </View>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{dateStr}</Text>
      </TouchableOpacity>

      <View style={styles.cardRight}>
        <TouchableOpacity
          hitSlop={8}
          onPress={onTogglePin}
          style={styles.pinBtn}
          accessibilityLabel="Закрепить заметку"
          accessibilityRole="button">
          <CupertinoIcon
            name={item.isPinned ? 'pin-filled' : 'pin'}
            size={15}
            color={item.isPinned ? theme.accent : theme.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          onPress={onDelete}
          style={styles.deleteBtn}
          accessibilityLabel="Удалить заметку"
          accessibilityRole="button">
          <CupertinoIcon name="close" size={14} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getDeadlineBadge(
  deadline: string | number | null | undefined,
  isCompleted: boolean,
  theme: any
) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));

  let label = '';
  let isUrgent = false;

  if (diffDays < 0) {
    label = `Просрочено (${Math.abs(diffDays)} дн.)`;
    isUrgent = true;
  } else if (diffDays === 0) {
    label = 'Сегодня';
    isUrgent = true;
  } else if (diffDays === 1) {
    label = 'Завтра';
  } else {
    label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  return (
    <View
      style={[
        styles.deadlineBadge,
        {
          backgroundColor: isCompleted ? theme.surfaceSolid : isUrgent ? '#ff453a20' : '#ff9f0a20',
          borderColor: isCompleted ? theme.border : isUrgent ? '#ff453a' : '#ff9f0a',
        },
      ]}>
      <CupertinoIcon
        name="calendar"
        size={11}
        color={isCompleted ? theme.textMuted : isUrgent ? '#ff453a' : '#ff9f0a'}
        style={{ marginRight: 4 }}
      />
      <Text
        style={[
          styles.deadlineBadgeText,
          { color: isCompleted ? theme.textMuted : isUrgent ? '#ff453a' : '#ff9f0a' },
        ]}>
        {label}
      </Text>
    </View>
  );
}

interface TodoCardItemProps {
  item: TodoItem;
  theme: any;
  onOpen: () => void;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function TodoCardItem({ item, theme, onOpen, onToggleComplete, onTogglePin, onDelete }: TodoCardItemProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardSolid,
          borderColor: item.isPinned ? theme.accent : theme.border,
          borderWidth: item.isPinned ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}>
      <TouchableOpacity
        onPress={onToggleComplete}
        hitSlop={8}
        style={[
          styles.checkbox,
          { borderColor: item.isCompleted ? theme.accent : theme.border },
          item.isCompleted && { backgroundColor: theme.accent },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isCompleted }}>
        {item.isCompleted && <CupertinoIcon name="checkmark" size={13} color="#ffffff" />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cardMain}
        activeOpacity={0.7}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Задача: ${item.title}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[
              styles.title,
              { color: theme.textPrimary },
              item.isCompleted && { textDecorationLine: 'line-through', color: theme.textSecondary },
            ]}
            numberOfLines={1}>
            {item.title}
          </Text>
          {item.isPinned && <CupertinoIcon name="pin-filled" size={12} color={theme.accent} />}
        </View>
        {item.description ? (
          <Text numberOfLines={1} style={[styles.todoDesc, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
        ) : null}

        {item.deadline ? (
          <View style={{ marginTop: 4 }}>
            {getDeadlineBadge(item.deadline, item.isCompleted, theme)}
          </View>
        ) : null}
      </TouchableOpacity>

      <View style={styles.cardRight}>
        <TouchableOpacity
          hitSlop={8}
          onPress={onTogglePin}
          style={styles.pinBtn}
          accessibilityLabel="Закрепить задачу"
          accessibilityRole="button">
          <CupertinoIcon
            name={item.isPinned ? 'pin-filled' : 'pin'}
            size={15}
            color={item.isPinned ? theme.accent : theme.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={8}
          onPress={onDelete}
          style={styles.deleteBtn}
          accessibilityLabel="Удалить задачу"
          accessibilityRole="button">
          <CupertinoIcon name="close" size={14} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Tree Node for Accordion Folders
interface FolderTreeNodeProps {
  folder: AppFolder;
  allFolders: AppFolder[];
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  notes: Note[];
  todos: TodoItem[];
  activeSegment: HubSegment;
  onOpenNote: (note: Note) => void;
  onOpenTodo: (todo: TodoItem) => void;
  onTogglePinNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onToggleCompleteTodo: (id: string) => void;
  onTogglePinTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onAddSubfolder: (parentId: string) => void;
  onAddItemToFolder: (folder: AppFolder) => void;
  onEditFolder: (folder: AppFolder) => void;
  onDeleteFolder: (folder: AppFolder) => void;
  onTogglePinFolder: (id: string) => void;
  theme: any;
}

function FolderTreeNode({
  folder,
  allFolders,
  depth,
  expandedIds,
  onToggleExpand,
  notes,
  todos,
  activeSegment,
  onOpenNote,
  onOpenTodo,
  onTogglePinNote,
  onDeleteNote,
  onToggleCompleteTodo,
  onTogglePinTodo,
  onDeleteTodo,
  onAddSubfolder,
  onAddItemToFolder,
  onEditFolder,
  onDeleteFolder,
  onTogglePinFolder,
  theme,
}: FolderTreeNodeProps) {
  const isExpanded = expandedIds.has(folder.id);
  const folderAccent = folder.color || theme.accent;

  // Subfolders of this folder
  const subFolders = useMemo(() => {
    return allFolders
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [allFolders, folder.id]);

  // Notes and Todos directly in this folder
  const folderNotes = useMemo(() => {
    return notes.filter((n) => n.folderId === folder.id);
  }, [notes, folder.id]);

  const folderTodos = useMemo(() => {
    return todos.filter((t) => t.folderId === folder.id);
  }, [todos, folder.id]);

  const countBadgeText = useMemo(() => {
    if (activeSegment === 'notes') return `${folderNotes.length}`;
    if (activeSegment === 'todos') return `${folderTodos.length}`;
    return `${folderNotes.length} • ${folderTodos.length}`;
  }, [activeSegment, folderNotes.length, folderTodos.length]);

  return (
    <View style={[styles.treeNodeContainer, depth > 0 && { marginLeft: 14 }]}>
      {/* Folder Header Row */}
      <View
        style={[
          styles.accordionHeaderCard,
          {
            backgroundColor: theme.cardSolid,
            borderColor: folder.isPinned ? folderAccent : theme.border,
            borderWidth: folder.isPinned ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}>
        {/* Accordion Expand Trigger (Left Part) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onToggleExpand(folder.id)}
          style={styles.accordionHeaderMain}
          accessibilityRole="button">
          {/* Chevron Indicator */}
          <View style={styles.chevronWrapper}>
            <CupertinoIcon
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={14}
              color={folderAccent}
            />
          </View>

          {/* Folder Icon Badge */}
          <View style={[styles.folderIconBadge, { backgroundColor: `${folderAccent}22` }]}>
            <CupertinoIcon
              name={folder.icon || 'folder'}
              size={15}
              color={folderAccent}
            />
          </View>

          {/* Title & Pin Indicator */}
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.folderTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
                {folder.name}
              </Text>
              {folder.isPinned && (
                <CupertinoIcon name="pin-filled" size={11} color={folderAccent} />
              )}
            </View>
          </View>

          {/* Counter Badge */}
          <View style={[styles.compactCountBadge, { backgroundColor: theme.surfaceSolid }]}>
            <Text style={[styles.compactCountText, { color: theme.textSecondary }]}>
              {countBadgeText}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons: Add Item (Pencil), Add Subfolder (+), Edit, Pin, Delete */}
        <View style={styles.folderActionsRow}>
          {/* Pencil button: Add note/task directly into this folder */}
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => onAddItemToFolder(folder)}
            onLongPress={() => onAddItemToFolder(folder)}
            style={styles.iconBtn}
            accessibilityLabel={`Добавить в папку «${folder.name}»`}
            accessibilityRole="button">
            <CupertinoIcon name="pencil" size={14} color={folderAccent} />
          </TouchableOpacity>

          {!folder.isSystem && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => onAddSubfolder(folder.id)}
              style={styles.iconBtn}
              accessibilityLabel="Создать подпапку"
              accessibilityRole="button">
              <CupertinoIcon name="add" size={15} color={folderAccent} />
            </TouchableOpacity>
          )}

          {!folder.isSystem && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => onEditFolder(folder)}
              style={styles.iconBtn}
              accessibilityLabel="Редактировать папку"
              accessibilityRole="button">
              <CupertinoIcon name="edit" size={13} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => onTogglePinFolder(folder.id)}
            style={styles.iconBtn}
            accessibilityLabel="Закрепить папку"
            accessibilityRole="button">
            <CupertinoIcon
              name={folder.isPinned ? 'pin-filled' : 'pin'}
              size={13}
              color={folder.isPinned ? folderAccent : theme.textMuted}
            />
          </TouchableOpacity>

          {!folder.isSystem && (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => onDeleteFolder(folder)}
              style={styles.iconBtn}
              accessibilityLabel="Удалить папку"
              accessibilityRole="button">
              <CupertinoIcon name="close" size={13} color={theme.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Expanded Folder Content (In-place Accordion) */}
      {isExpanded && (
        <View style={[styles.expandedContent, { borderLeftColor: `${folderAccent}40` }]}>
          {/* Subfolders Tree */}
          {subFolders.map((sub) => (
            <FolderTreeNode
              key={sub.id}
              folder={sub}
              allFolders={allFolders}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              notes={notes}
              todos={todos}
              activeSegment={activeSegment}
              onOpenNote={onOpenNote}
              onOpenTodo={onOpenTodo}
              onTogglePinNote={onTogglePinNote}
              onDeleteNote={onDeleteNote}
              onToggleCompleteTodo={onToggleCompleteTodo}
              onTogglePinTodo={onTogglePinTodo}
              onDeleteTodo={onDeleteTodo}
              onAddSubfolder={onAddSubfolder}
              onAddItemToFolder={onAddItemToFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              onTogglePinFolder={onTogglePinFolder}
              theme={theme}
            />
          ))}

          {/* Notes inside this folder */}
          {activeSegment !== 'todos' &&
            folderNotes.map((n) => (
              <NoteCardItem
                key={n.id}
                item={n}
                theme={theme}
                onOpen={() => onOpenNote(n)}
                onTogglePin={() => onTogglePinNote(n.id)}
                onDelete={() => onDeleteNote(n.id)}
              />
            ))}

          {/* Todos inside this folder */}
          {activeSegment !== 'notes' &&
            folderTodos.map((t) => (
              <TodoCardItem
                key={t.id}
                item={t}
                theme={theme}
                onOpen={() => onOpenTodo(t)}
                onToggleComplete={() => onToggleCompleteTodo(t.id)}
                onTogglePin={() => onTogglePinTodo(t.id)}
                onDelete={() => onDeleteTodo(t.id)}
              />
            ))}

          {subFolders.length === 0 && folderNotes.length === 0 && folderTodos.length === 0 && (
            <View style={styles.emptyFolderHintRow}>
              <Text style={[styles.emptyFolderHintText, { color: theme.textMuted }]}>
                В этой папке пока пусто
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function NotesHubScreen() {
  const { theme } = useAppTheme();
  const { notes, saveNote, togglePinNote, deleteNote } = useNotes();
  const { todos, saveTodo, togglePinTodo, toggleCompleteTodo, deleteTodo } = useTodo();
  const { folders, createFolder, updateFolder, deleteFolder, togglePinFolder } = useFolders();

  const [activeSegment, setActiveSegment] = useState<HubSegment>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // FAB Menu state
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  // Folder modal state (Create / Edit)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<AppFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderColorInput, setFolderColorInput] = useState(FOLDER_COLORS[0]);
  const [folderIconInput, setFolderIconInput] = useState<CupertinoIconName>('folder');
  const [folderParentId, setFolderParentId] = useState<string | null>(null);

  // Note View/Edit state
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteFolderId, setNoteFolderId] = useState<string | null>(null);

  // Todo View/Edit state
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDesc, setTodoDesc] = useState('');
  const [todoFolderId, setTodoFolderId] = useState<string | null>(null);
  const [hasTodoDeadline, setHasTodoDeadline] = useState(false);
  const [todoDeadlineDate, setTodoDeadlineDate] = useState<Date>(() => new Date());

  // Quick choice dialog state for creating an item directly inside a folder
  const [folderActionTarget, setFolderActionTarget] = useState<AppFolder | null>(null);

  // Android back button handling
  useEffect(() => {
    const onBackPress = () => {
      if (folderActionTarget) {
        setFolderActionTarget(null);
        return true;
      }
      if (isFabMenuOpen) {
        setIsFabMenuOpen(false);
        return true;
      }
      if (isFolderModalOpen) {
        setIsFolderModalOpen(false);
        return true;
      }
      if (activeNote || isCreateNoteOpen) {
        setActiveNote(null);
        setIsCreateNoteOpen(false);
        return true;
      }
      if (isTodoModalOpen) {
        setIsTodoModalOpen(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isFabMenuOpen, isFolderModalOpen, activeNote, isCreateNoteOpen, isTodoModalOpen, folderActionTarget]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Root level folders (parentId === null)
  const rootFolders = useMemo(() => {
    return folders
      .filter((f) => !f.parentId)
      .sort((a, b) => {
        // System folder (Календарь) has lowest priority, placed at the very bottom!
        if (a.isSystem && !b.isSystem) return 1;
        if (!a.isSystem && b.isSystem) return -1;
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [folders]);

  const existingFolderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

  // Unassigned items (no folder or folder was deleted)
  const unassignedNotes = useMemo(() => {
    return notes
      .filter((n) => !n.folderId || !existingFolderIds.has(n.folderId))
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, existingFolderIds]);

  const unassignedTodos = useMemo(() => {
    return todos
      .filter((t) => !t.folderId || !existingFolderIds.has(t.folderId))
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return b.updatedAt - a.updatedAt;
      });
  }, [todos, existingFolderIds]);

  // Folder Actions
  const openCreateFolder = (parentId: string | null = null) => {
    setEditingFolder(null);
    setFolderNameInput('');
    setFolderColorInput(FOLDER_COLORS[0]);
    setFolderIconInput('folder');
    setFolderParentId(parentId);
    setIsFolderModalOpen(true);
  };

  const openEditFolder = (f: AppFolder) => {
    setEditingFolder(f);
    setFolderNameInput(f.name);
    setFolderColorInput(f.color || FOLDER_COLORS[0]);
    setFolderIconInput(f.icon || 'folder');
    setFolderParentId(f.parentId || null);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = async () => {
    const trimmed = folderNameInput.trim();
    if (!trimmed) {
      setIsFolderModalOpen(false);
      return;
    }

    if (editingFolder) {
      await updateFolder(editingFolder.id, {
        name: trimmed,
        color: folderColorInput,
        icon: folderIconInput,
        parentId: folderParentId,
      });
    } else {
      await createFolder(trimmed, folderColorInput, folderIconInput, folderParentId);
      if (folderParentId) {
        setExpandedIds((prev) => new Set(prev).add(folderParentId));
      }
    }

    setIsFolderModalOpen(false);
  };

  const handleDeleteFolderConfirm = async (f: AppFolder) => {
    await deleteFolder(f.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(f.id);
      return next;
    });
  };

  // Note Actions
  const openNewNote = (initialFolderId: string | null = null) => {
    setActiveNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteFolderId(initialFolderId);
    setIsCreateNoteOpen(true);
  };

  const openEditNote = (note: Note) => {
    setActiveNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteFolderId(note.folderId);
  };

  const handleSaveNote = async () => {
    const trimmed = noteTitle.trim();
    if (!trimmed && !noteContent.trim()) {
      setActiveNote(null);
      setIsCreateNoteOpen(false);
      return;
    }

    await saveNote({
      id: activeNote ? activeNote.id : undefined,
      title: trimmed || 'Без названия',
      content: noteContent,
      folderId: noteFolderId,
      isPinned: activeNote ? activeNote.isPinned : false,
    });

    if (noteFolderId) {
      setExpandedIds((prev) => new Set(prev).add(noteFolderId));
    }
    if (activeSegment === 'todos') {
      setActiveSegment('notes');
    }

    setActiveNote(null);
    setIsCreateNoteOpen(false);
  };

  const handleDeleteNoteConfirm = (noteId: string) => {
    deleteNote(noteId);
  };

  // Todo Actions
  const openNewTodo = (initialFolderId: string | null = null) => {
    setActiveTodo(null);
    setTodoTitle('');
    setTodoDesc('');
    setTodoFolderId(initialFolderId);
    setHasTodoDeadline(false);
    setTodoDeadlineDate(new Date());
    setIsTodoModalOpen(true);
  };

  // Add Item to Folder (Pencil Button Action)
  const handleAddItemToFolder = (folder: AppFolder) => {
    if (activeSegment === 'notes') {
      setExpandedIds((prev) => new Set(prev).add(folder.id));
      openNewNote(folder.id);
      return;
    }
    if (activeSegment === 'todos') {
      setExpandedIds((prev) => new Set(prev).add(folder.id));
      openNewTodo(folder.id);
      return;
    }
    // In "all" segment: show quick choice dialog (Note vs Task)
    setFolderActionTarget(folder);
  };

  const openEditTodo = (todo: TodoItem) => {
    setActiveTodo(todo);
    setTodoTitle(todo.title);
    setTodoDesc(todo.description || '');
    setTodoFolderId(todo.folderId);
    if (todo.deadline) {
      setHasTodoDeadline(true);
      setTodoDeadlineDate(new Date(todo.deadline));
    } else {
      setHasTodoDeadline(false);
      setTodoDeadlineDate(new Date());
    }
    setIsTodoModalOpen(true);
  };

  const handleSaveTodo = async () => {
    const trimmed = todoTitle.trim();
    if (!trimmed) {
      setIsTodoModalOpen(false);
      return;
    }

    await saveTodo({
      id: activeTodo ? activeTodo.id : undefined,
      title: trimmed,
      description: todoDesc.trim(),
      folderId: todoFolderId,
      deadline: hasTodoDeadline ? todoDeadlineDate.getTime() : null,
      isCompleted: activeTodo ? activeTodo.isCompleted : false,
      isPinned: activeTodo ? activeTodo.isPinned : false,
    });

    if (todoFolderId) {
      setExpandedIds((prev) => new Set(prev).add(todoFolderId));
    }
    if (activeSegment === 'notes') {
      setActiveSegment('todos');
    }

    setIsTodoModalOpen(false);
  };

  const isAllEmpty = notes.length === 0 && todos.length === 0 && folders.length === 0;

  const showUnassignedSection =
    activeSegment === 'notes'
      ? unassignedNotes.length > 0
      : activeSegment === 'todos'
      ? unassignedTodos.length > 0
      : unassignedNotes.length > 0 || unassignedTodos.length > 0;

  const unassignedCountText = useMemo(() => {
    if (activeSegment === 'notes') return `${unassignedNotes.length}`;
    if (activeSegment === 'todos') return `${unassignedTodos.length}`;
    return `${unassignedNotes.length} • ${unassignedTodos.length}`;
  }, [activeSegment, unassignedNotes.length, unassignedTodos.length]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Bar with Cupertino Segmented Control */}
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.segmentedControl, { backgroundColor: theme.surfaceSolid, borderColor: theme.border }]}>
          {(['all', 'notes', 'todos'] as HubSegment[]).map((seg) => {
            const isSel = activeSegment === seg;
            const label = seg === 'all' ? 'Все' : seg === 'notes' ? 'Заметки' : 'Задачи';
            return (
              <TouchableOpacity
                key={seg}
                onPress={() => setActiveSegment(seg)}
                style={[styles.segmentBtn, isSel && { backgroundColor: theme.accent }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSel }}>
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: isSel ? '#ffffff' : theme.textSecondary },
                    isSel && { fontWeight: '700' },
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={true}>
        {isAllEmpty ? (
          <View style={styles.emptyCenter}>
            <CupertinoIcon name="layers" size={44} color={theme.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Пространство пусто</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Нажмите «+» внизу экрана, чтобы создать первую заметку, задачу или папку
            </Text>
          </View>
        ) : (
          <>
            {/* Accordion Folders Tree */}
            {rootFolders.length > 0 && (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  Папки и проекты ({rootFolders.length})
                </Text>
                {rootFolders.map((root) => (
                  <FolderTreeNode
                    key={root.id}
                    folder={root}
                    allFolders={folders}
                    depth={0}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    notes={notes}
                    todos={todos}
                    activeSegment={activeSegment}
                    onOpenNote={openEditNote}
                    onOpenTodo={openEditTodo}
                    onTogglePinNote={togglePinNote}
                    onDeleteNote={handleDeleteNoteConfirm}
                    onToggleCompleteTodo={toggleCompleteTodo}
                    onTogglePinTodo={togglePinTodo}
                    onDeleteTodo={deleteTodo}
                    onAddSubfolder={openCreateFolder}
                    onAddItemToFolder={handleAddItemToFolder}
                    onEditFolder={openEditFolder}
                    onDeleteFolder={handleDeleteFolderConfirm}
                    onTogglePinFolder={togglePinFolder}
                    theme={theme}
                  />
                ))}
              </View>
            )}

            {/* Unassigned Section */}
            {showUnassignedSection && (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  Без папки ({unassignedCountText})
                </Text>

                {activeSegment !== 'todos' &&
                  unassignedNotes.map((note) => (
                    <NoteCardItem
                      key={note.id}
                      item={note}
                      theme={theme}
                      onOpen={() => openEditNote(note)}
                      onTogglePin={() => togglePinNote(note.id)}
                      onDelete={() => handleDeleteNoteConfirm(note.id)}
                    />
                  ))}

                {activeSegment !== 'notes' &&
                  unassignedTodos.map((todo) => (
                    <TodoCardItem
                      key={todo.id}
                      item={todo}
                      theme={theme}
                      onOpen={() => openEditTodo(todo)}
                      onToggleComplete={() => toggleCompleteTodo(todo.id)}
                      onTogglePin={() => togglePinTodo(todo.id)}
                      onDelete={() => deleteTodo(todo.id)}
                    />
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) & Mini Menu */}
      {isFabMenuOpen && (
        <View style={styles.fabBackdrop} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={() => setIsFabMenuOpen(false)}>
            <View style={styles.fabBackdropDismiss} />
          </TouchableWithoutFeedback>

          <View
            style={[styles.fabMenuCard, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}
            pointerEvents="auto">
            <TouchableOpacity
              onPress={() => {
                setIsFabMenuOpen(false);
                openNewNote();
              }}
              activeOpacity={0.65}
              style={styles.fabMenuItem}
              accessibilityRole="button">
              <CupertinoIcon name="document" size={17} color={theme.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.fabMenuText, { color: theme.textPrimary }]}>Новая заметка</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              onPress={() => {
                setIsFabMenuOpen(false);
                openNewTodo();
              }}
              activeOpacity={0.65}
              style={styles.fabMenuItem}
              accessibilityRole="button">
              <CupertinoIcon name="checkmark" size={17} color={theme.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.fabMenuText, { color: theme.textPrimary }]}>Новая задача</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              onPress={() => {
                setIsFabMenuOpen(false);
                openCreateFolder(null);
              }}
              activeOpacity={0.65}
              style={styles.fabMenuItem}
              accessibilityRole="button">
              <CupertinoIcon name="folder" size={17} color={theme.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.fabMenuText, { color: theme.textPrimary }]}>Новая папка</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        activeOpacity={0.85}
        onPress={() => setIsFabMenuOpen((prev) => !prev)}
        accessibilityLabel="Создать"
        accessibilityRole="button">
        <CupertinoIcon name={isFabMenuOpen ? 'close' : 'add'} size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Modal: Note View & Edit Screen */}
      <Modal visible={!!activeNote || isCreateNoteOpen} animationType="slide" onRequestClose={handleSaveNote}>
        <View style={[styles.modalScreen, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleSaveNote} style={styles.backBtn} accessibilityRole="button">
              <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '600' }}>← Готово</Text>
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>
              {activeNote ? 'Заметка' : 'Новая заметка'}
            </Text>
            <TouchableOpacity onPress={handleSaveNote} style={styles.saveHeaderBtn} accessibilityRole="button">
              <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Сохранить</Text>
            </TouchableOpacity>
          </View>

          {/* Folder Selector for Note */}
          <View style={[styles.folderChipRow, { backgroundColor: theme.surfaceSolid, borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabelSmall, { color: theme.textSecondary }]}>Папка:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => setNoteFolderId(null)}
                style={[
                  styles.folderChip,
                  { borderColor: theme.border, backgroundColor: theme.cardSolid },
                  noteFolderId === null && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                accessibilityRole="button">
                <Text style={{ fontSize: 11.5, color: noteFolderId === null ? '#ffffff' : theme.textSecondary }}>
                  Без папки
                </Text>
              </TouchableOpacity>

              {folders.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setNoteFolderId(f.id)}
                  style={[
                    styles.folderChip,
                    { borderColor: theme.border, backgroundColor: theme.cardSolid },
                    noteFolderId === f.id && { backgroundColor: f.color || theme.accent, borderColor: f.color || theme.accent },
                  ]}
                  accessibilityRole="button">
                  <Text style={{ fontSize: 11.5, color: noteFolderId === f.id ? '#ffffff' : theme.textSecondary }}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.noteContentScroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Заголовок</Text>
            <TextInput
              placeholder="Название заметки"
              placeholderTextColor={theme.textMuted}
              value={noteTitle}
              onChangeText={setNoteTitle}
              style={[styles.noteTitleInput, { color: theme.textPrimary }]}
              accessibilityLabel="Заголовок заметки"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 12 }]}>Текст заметки</Text>
            <TextInput
              placeholder="Начните писать..."
              placeholderTextColor={theme.textMuted}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              style={[styles.noteContentInput, { color: theme.textPrimary }]}
              accessibilityLabel="Содержимое заметки"
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Todo View / Edit */}
      <Modal visible={isTodoModalOpen} transparent animationType="fade" onRequestClose={() => setIsTodoModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsTodoModalOpen(false)}
          />
          <View style={[styles.createSheet, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
            <Text style={[styles.modalSheetTitle, { color: theme.textPrimary }]}>
              {activeTodo ? 'Редактировать задачу' : 'Новая задача'}
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Что нужно сделать?</Text>
            <TextInput
              autoFocus
              placeholder="Название задачи..."
              placeholderTextColor={theme.textMuted}
              value={todoTitle}
              onChangeText={setTodoTitle}
              style={[styles.modalInput, { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border }]}
              accessibilityLabel="Название задачи"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Описание / Детали</Text>
            <TextInput
              placeholder="Комментарий..."
              placeholderTextColor={theme.textMuted}
              value={todoDesc}
              onChangeText={setTodoDesc}
              multiline
              numberOfLines={3}
              style={[styles.modalTextarea, { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border }]}
              accessibilityLabel="Описание задачи"
            />

            {/* Folder selection for Todo */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Папка</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setTodoFolderId(null)}
                style={[
                  styles.folderChip,
                  { borderColor: theme.border, backgroundColor: theme.surfaceSolid },
                  todoFolderId === null && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                accessibilityRole="button">
                <Text style={{ fontSize: 11.5, color: todoFolderId === null ? '#ffffff' : theme.textSecondary }}>
                  Без папки
                </Text>
              </TouchableOpacity>
              {folders.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setTodoFolderId(f.id)}
                  style={[
                    styles.folderChip,
                    { borderColor: theme.border, backgroundColor: theme.surfaceSolid },
                    todoFolderId === f.id && { backgroundColor: f.color || theme.accent, borderColor: f.color || theme.accent },
                  ]}
                  accessibilityRole="button">
                  <Text style={{ fontSize: 11.5, color: todoFolderId === f.id ? '#ffffff' : theme.textSecondary }}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Deadline Configuration */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                  Дедлайн в календаре
                </Text>
                <TouchableOpacity
                  onPress={() => setHasTodoDeadline((prev) => !prev)}
                  style={[
                    styles.deadlineToggleBtn,
                    {
                      backgroundColor: hasTodoDeadline ? '#ff9f0a' : theme.surfaceSolid,
                      borderColor: hasTodoDeadline ? '#ff9f0a' : theme.border,
                    },
                  ]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: hasTodoDeadline }}>
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: hasTodoDeadline ? '#ffffff' : theme.textSecondary,
                    }}>
                    {hasTodoDeadline ? 'Дедлайн включен' : '+ Добавить дедлайн'}
                  </Text>
                </TouchableOpacity>
              </View>

              {hasTodoDeadline && (
                <View
                  style={[
                    styles.deadlineContainer,
                    { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                  ]}>
                  {/* Quick Chips */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {[
                      { label: 'Сегодня', offset: 0 },
                      { label: 'Завтра', offset: 1 },
                      { label: '+3 дня', offset: 3 },
                      { label: '+7 дней', offset: 7 },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.label}
                        onPress={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + chip.offset);
                          setTodoDeadlineDate(d);
                        }}
                        style={[
                          styles.quickDateChip,
                          { backgroundColor: theme.cardSolid, borderColor: theme.border },
                        ]}>
                        <Text style={{ fontSize: 11.5, color: theme.accent, fontWeight: '600' }}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Stepper Date Row */}
                  <View style={styles.stepperDateRow}>
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(todoDeadlineDate);
                        d.setDate(d.getDate() - 1);
                        setTodoDeadlineDate(d);
                      }}
                      style={[styles.stepperBtn, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
                      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>◀</Text>
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.textPrimary }}>
                        {todoDeadlineDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#ff9f0a', fontWeight: '600', marginTop: 1 }}>
                        Появится в календаре на эту дату
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(todoDeadlineDate);
                        d.setDate(d.getDate() + 1);
                        setTodoDeadlineDate(d);
                      }}
                      style={[styles.stepperBtn, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
                      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>▶</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsTodoModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surfaceSolid, borderWidth: 1, borderColor: theme.border }]}
                accessibilityRole="button">
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveTodo}
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}
                accessibilityRole="button">
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Create / Edit Folder with Icon Picker & Color Tags */}
      <Modal visible={isFolderModalOpen} transparent animationType="fade" onRequestClose={() => setIsFolderModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={() => setIsFolderModalOpen(false)}
          />
          <View style={[styles.createSheet, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
            <Text style={[styles.modalSheetTitle, { color: theme.textPrimary }]}>
              {editingFolder ? 'Редактировать папку' : 'Новая папка'}
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Название папки</Text>
            <TextInput
              autoFocus
              placeholder="Учеба, Работа, Личное..."
              placeholderTextColor={theme.textMuted}
              value={folderNameInput}
              onChangeText={setFolderNameInput}
              style={[styles.modalInput, { backgroundColor: theme.surfaceSolid, color: theme.textPrimary, borderColor: theme.border }]}
              accessibilityLabel="Название папки"
            />

            {/* Vector Icon Picker */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 4 }]}>Иконка папки</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {FOLDER_ICONS.map((ic) => {
                const isSelected = folderIconInput === ic.name;
                return (
                  <TouchableOpacity
                    key={ic.name}
                    onPress={() => setFolderIconInput(ic.name)}
                    style={[
                      styles.iconPickCell,
                      { borderColor: theme.border, backgroundColor: theme.surfaceSolid },
                      isSelected && { borderColor: folderColorInput, backgroundColor: `${folderColorInput}25` },
                    ]}
                    accessibilityRole="button">
                    <CupertinoIcon
                      name={ic.name}
                      size={18}
                      color={isSelected ? folderColorInput : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.iconPickLabel,
                        { color: isSelected ? folderColorInput : theme.textSecondary },
                      ]}>
                      {ic.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Apple Color Palette */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Цветовая метка</Text>
            <View style={styles.colorPaletteRow}>
              {FOLDER_COLORS.map((col) => {
                const isSelected = folderColorInput === col;
                return (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setFolderColorInput(col)}
                    activeOpacity={0.7}
                    style={[
                      styles.colorCircleOuter,
                      isSelected && { borderColor: theme.mode === 'dark' ? '#ffffff' : theme.textPrimary },
                    ]}>
                    <View style={[styles.colorCircleInner, { backgroundColor: col }]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsFolderModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.surfaceSolid, borderWidth: 1, borderColor: theme.border }]}
                accessibilityRole="button">
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveFolder}
                style={[styles.modalBtn, { backgroundColor: folderColorInput || theme.accent }]}
                accessibilityRole="button">
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {editingFolder ? 'Сохранить' : 'Создать'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Quick Create in Folder (Choice between Note & Task) */}
      <Modal
        visible={!!folderActionTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderActionTarget(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setFolderActionTarget(null)}>
            <View style={styles.fabBackdropDismiss} />
          </TouchableWithoutFeedback>

          {folderActionTarget && (
            <View
              style={[
                styles.quickActionModalCard,
                { backgroundColor: theme.cardSolid, borderColor: theme.border },
              ]}>
              <View style={styles.quickActionHeader}>
                <View
                  style={[
                    styles.folderIconBadge,
                    {
                      backgroundColor: `${folderActionTarget.color || theme.accent}22`,
                      marginRight: 10,
                    },
                  ]}>
                  <CupertinoIcon
                    name={folderActionTarget.icon || 'folder'}
                    size={16}
                    color={folderActionTarget.color || theme.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.quickActionFolderTitle, { color: theme.textPrimary }]}
                    numberOfLines={1}>
                    {folderActionTarget.name}
                  </Text>
                  <Text style={[styles.quickActionSub, { color: theme.textSecondary }]}>
                    Создать запись в этой папке
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 14, gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.quickActionOptionBtn,
                    { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const targetId = folderActionTarget.id;
                    setFolderActionTarget(null);
                    setExpandedIds((prev) => new Set(prev).add(targetId));
                    openNewNote(targetId);
                  }}
                  accessibilityLabel="Создать новую заметку в этой папке"
                  accessibilityRole="button">
                  <View style={[styles.quickActionIconCircle, { backgroundColor: `${theme.accent}22` }]}>
                    <CupertinoIcon name="document" size={18} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quickActionOptionTitle, { color: theme.textPrimary }]}>
                      Новая заметка
                    </Text>
                    <Text style={[styles.quickActionOptionDesc, { color: theme.textMuted }]}>
                      Текстовая запись в папку «{folderActionTarget.name}»
                    </Text>
                  </View>
                  <CupertinoIcon name="chevron-right" size={14} color={theme.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickActionOptionBtn,
                    { backgroundColor: theme.surfaceSolid, borderColor: theme.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const targetId = folderActionTarget.id;
                    setFolderActionTarget(null);
                    setExpandedIds((prev) => new Set(prev).add(targetId));
                    openNewTodo(targetId);
                  }}
                  accessibilityLabel="Создать новую задачу в этой папке"
                  accessibilityRole="button">
                  <View style={[styles.quickActionIconCircle, { backgroundColor: '#34c75922' }]}>
                    <CupertinoIcon name="checkmark" size={18} color="#34c759" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.quickActionOptionTitle, { color: theme.textPrimary }]}>
                      Новая задача
                    </Text>
                    <Text style={[styles.quickActionOptionDesc, { color: theme.textMuted }]}>
                      Дело с дедлайном в папку «{folderActionTarget.name}»
                    </Text>
                  </View>
                  <CupertinoIcon name="chevron-right" size={14} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.quickActionCancelBtn, { borderColor: theme.border, marginTop: 14 }]}
                onPress={() => setFolderActionTarget(null)}
                accessibilityLabel="Отмена"
                accessibilityRole="button">
                <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 14 }}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentBtnText: {
    fontSize: 13,
  },
  scrollList: { padding: 16, paddingBottom: 110 },
  sectionWrap: { marginBottom: 20 },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Tree Accordion Card
  treeNodeContainer: { marginBottom: 6 },
  accordionHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  accordionHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronWrapper: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  folderIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderTitleText: { fontSize: 14, fontWeight: '600' },
  compactCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  compactCountText: { fontSize: 11, fontWeight: '600' },
  folderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: { padding: 4 },
  expandedContent: {
    borderLeftWidth: 1.5,
    paddingLeft: 8,
    paddingTop: 6,
  },
  emptyFolderHintRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  emptyFolderHintText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Note & Todo Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardMain: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '600', marginBottom: 2 },
  date: { fontSize: 11 },
  todoDesc: { fontSize: 12, marginTop: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  // FAB Menu
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 76 : 84,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 25,
    zIndex: 1001,
  },
  fabBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'web' ? 136 : 144,
    paddingRight: 20,
  },
  fabBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fabMenuCard: {
    position: 'relative',
    zIndex: 1000,
    elevation: 20,
    borderRadius: 16,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    minWidth: 175,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fabMenuText: { fontSize: 14, fontWeight: '600' },
  menuDivider: { height: StyleSheet.hairlineWidth },

  // Full Screen Note Modal
  modalScreen: { flex: 1 },
  modalHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '700' },
  backBtn: { paddingVertical: 8, paddingRight: 10 },
  saveHeaderBtn: { paddingVertical: 8, paddingLeft: 10 },
  folderChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabelSmall: { fontSize: 12, fontWeight: '600', marginRight: 8 },
  folderChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 6,
  },
  noteContentScroll: { padding: 20 },
  noteTitleInput: { fontSize: 20, fontWeight: '700', paddingVertical: 4 },
  noteContentInput: { fontSize: 15, lineHeight: 22, minHeight: 250, paddingVertical: 4 },

  // Popups & Modal Sheets
  modalBackdrop: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropTouchable: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  createSheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    zIndex: 10,
  },
  modalSheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalTextarea: {
    minHeight: 70,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 10,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconPickCell: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
    minWidth: 54,
  },
  iconPickLabel: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  colorCircleOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleInner: { width: 22, height: 22, borderRadius: 11 },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  deadlineBadgeText: { fontSize: 11, fontWeight: '700' },
  deadlineToggleBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deadlineContainer: {
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  quickDateChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepperDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Quick Action Modal (Folder Pencil Button)
  quickActionModalCard: {
    width: '88%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 1000,
  },
  quickActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionFolderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickActionSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  quickActionOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickActionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickActionOptionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickActionOptionDesc: {
    fontSize: 11.5,
  },
  quickActionCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
