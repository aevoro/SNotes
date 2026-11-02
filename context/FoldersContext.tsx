import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppFolder,
  FOLDER_COLORS,
  SYSTEM_CALENDAR_FOLDER,
  SYSTEM_CALENDAR_FOLDER_ID,
} from '../src/types/folders';
import { CupertinoIconName } from '../src/components/CupertinoIcon';

interface FoldersContextValue {
  folders: AppFolder[];
  createFolder: (
    name: string,
    color?: string,
    icon?: CupertinoIconName,
    parentId?: string | null
  ) => Promise<AppFolder>;
  updateFolder: (
    folderId: string,
    updates: Partial<Omit<AppFolder, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  togglePinFolder: (folderId: string) => Promise<void>;
  getFolderById: (folderId: string | null) => AppFolder | undefined;
  getFolderPath: (folderId: string | null) => AppFolder[];
}

const STORAGE_APP_FOLDERS = '@snotes_app_folders';
const LEGACY_NOTE_FOLDERS = '@snotes_folders';
const LEGACY_TODO_FOLDERS = '@snotes_todo_folders';
const STORAGE_NOTES = '@snotes_items';
const STORAGE_TODOS = '@snotes_todo_items';

const FoldersContext = createContext<FoldersContextValue | undefined>(undefined);

const ensureSystemFolder = (list: AppFolder[]): AppFolder[] => {
  if (!list.some((f) => f.id === SYSTEM_CALENDAR_FOLDER_ID)) {
    return [...list, SYSTEM_CALENDAR_FOLDER];
  }
  return list;
};

export const FoldersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<AppFolder[]>([SYSTEM_CALENDAR_FOLDER]);

  useEffect(() => {
    (async () => {
      try {
        const rawAppFolders = await AsyncStorage.getItem(STORAGE_APP_FOLDERS);
        if (rawAppFolders) {
          const parsed = JSON.parse(rawAppFolders);
          setFolders(ensureSystemFolder(parsed));
        } else {
          // Automatic migration from legacy folders
          const [rawNoteFolders, rawTodoFolders] = await Promise.all([
            AsyncStorage.getItem(LEGACY_NOTE_FOLDERS),
            AsyncStorage.getItem(LEGACY_TODO_FOLDERS),
          ]);
          const noteFolders: any[] = rawNoteFolders ? JSON.parse(rawNoteFolders) : [];
          const todoFolders: any[] = rawTodoFolders ? JSON.parse(rawTodoFolders) : [];

          const mergedMap = new Map<string, AppFolder>();
          noteFolders.forEach((f) => {
            mergedMap.set(f.id, {
              id: f.id,
              name: f.name,
              color: f.color || FOLDER_COLORS[0],
              icon: (f.icon as CupertinoIconName) || 'folder',
              parentId: f.parentId || null,
              createdAt: f.createdAt || Date.now(),
              isPinned: f.isPinned || false,
            });
          });
          todoFolders.forEach((f) => {
            if (!mergedMap.has(f.id)) {
              mergedMap.set(f.id, {
                id: f.id,
                name: f.name,
                color: f.color || FOLDER_COLORS[1],
                icon: (f.icon as CupertinoIconName) || 'folder',
                parentId: f.parentId || null,
                createdAt: f.createdAt || Date.now(),
                isPinned: f.isPinned || false,
              });
            }
          });

          const merged = ensureSystemFolder(Array.from(mergedMap.values()));
          setFolders(merged);
          await AsyncStorage.setItem(STORAGE_APP_FOLDERS, JSON.stringify(merged));
        }
      } catch (e) {
        console.error('Ошибка загрузки папок:', e);
      }
    })();
  }, []);

  const persist = async (next: AppFolder[]) => {
    const safeNext = ensureSystemFolder(next);
    setFolders(safeNext);
    await AsyncStorage.setItem(STORAGE_APP_FOLDERS, JSON.stringify(safeNext));
  };

  const createFolder = async (
    name: string,
    color?: string,
    icon?: CupertinoIconName,
    parentId?: string | null
  ): Promise<AppFolder> => {
    const newFolder: AppFolder = {
      id: Date.now().toString(),
      name: name.trim(),
      color: color || FOLDER_COLORS[0],
      icon: icon || 'folder',
      parentId: parentId || null,
      createdAt: Date.now(),
      isPinned: false,
    };
    const updated = [newFolder, ...folders.filter((f) => f.id !== SYSTEM_CALENDAR_FOLDER_ID), SYSTEM_CALENDAR_FOLDER];
    await persist(updated);
    return newFolder;
  };

  const updateFolder = async (
    folderId: string,
    updates: Partial<Omit<AppFolder, 'id' | 'createdAt'>>
  ) => {
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, ...updates } : f
    );
    await persist(updated);
  };

  const deleteFolder = async (folderId: string) => {
    if (folderId === SYSTEM_CALENDAR_FOLDER_ID) {
      // System folder cannot be deleted
      return;
    }

    // Find folder and all descendants
    const idsToDelete = new Set<string>([folderId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
          idsToDelete.add(f.id);
          changed = true;
        }
      }
    }

    const updatedFolders = folders.filter((f) => !idsToDelete.has(f.id));
    await persist(updatedFolders);

    // Unassign notes and tasks
    try {
      const [rawNotes, rawTodos] = await Promise.all([
        AsyncStorage.getItem(STORAGE_NOTES),
        AsyncStorage.getItem(STORAGE_TODOS),
      ]);
      if (rawNotes) {
        const notes = JSON.parse(rawNotes);
        const nextNotes = notes.map((n: any) =>
          idsToDelete.has(n.folderId) ? { ...n, folderId: null } : n
        );
        await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(nextNotes));
      }
      if (rawTodos) {
        const todos = JSON.parse(rawTodos);
        const nextTodos = todos.map((t: any) =>
          idsToDelete.has(t.folderId) ? { ...t, folderId: null } : t
        );
        await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(nextTodos));
      }
    } catch (e) {
      console.error('Ошибка очистки папок в заметках/задачах:', e);
    }
  };

  const togglePinFolder = async (folderId: string) => {
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, isPinned: !f.isPinned } : f
    );
    await persist(updated);
  };

  const getFolderById = useCallback(
    (folderId: string | null) => {
      if (!folderId) return undefined;
      return folders.find((f) => f.id === folderId);
    },
    [folders]
  );

  const getFolderPath = useCallback(
    (folderId: string | null): AppFolder[] => {
      if (!folderId) return [];
      const path: AppFolder[] = [];
      let currentId: string | null = folderId;
      const visited = new Set<string>();

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const f = folders.find((item) => item.id === currentId);
        if (!f) break;
        path.unshift(f);
        currentId = f.parentId || null;
      }
      return path;
    },
    [folders]
  );

  return (
    <FoldersContext.Provider
      value={{
        folders,
        createFolder,
        updateFolder,
        deleteFolder,
        togglePinFolder,
        getFolderById,
        getFolderPath,
      }}>
      {children}
    </FoldersContext.Provider>
  );
};

export const useFolders = () => {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error('useFolders must be used within a FoldersProvider');
  }
  return context;
};
