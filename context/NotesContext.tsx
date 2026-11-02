import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../src/types';
import { AppFolder } from '../src/types/folders';
import { useFolders } from './FoldersContext';
import { CupertinoIconName } from '../src/components/CupertinoIcon';

interface NotesContextValue {
  notes: Note[];
  folders: AppFolder[];
  selectedFolderId: string | 'all' | null;
  setSelectedFolderId: (id: string | 'all' | null) => void;
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
  saveNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  togglePinNote: (noteId: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

const STORAGE_NOTES = '@snotes_items';

const NotesContext = createContext<NotesContextValue | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    folders,
    createFolder,
    updateFolder,
    deleteFolder: deleteFolderFromContext,
    togglePinFolder,
  } = useFolders();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | null>('all');

  useEffect(() => {
    (async () => {
      try {
        const rawNotes = await AsyncStorage.getItem(STORAGE_NOTES);
        if (rawNotes) setNotes(JSON.parse(rawNotes));
      } catch (e) {
        console.error('Ошибка загрузки заметок:', e);
      }
    })();
  }, []);

  const deleteFolder = async (folderId: string) => {
    await deleteFolderFromContext(folderId);
    setNotes((prev) =>
      prev.map((n) => (n.folderId === folderId ? { ...n, folderId: null } : n))
    );
    if (selectedFolderId === folderId) setSelectedFolderId('all');
  };

  const saveNote = async (
    noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const now = Date.now();
    let updatedList: Note[] = [];

    setNotes((prevNotes) => {
      if (noteData.id) {
        updatedList = prevNotes.map((n) =>
          n.id === noteData.id ? { ...n, ...noteData, updatedAt: now } : n
        );
      } else {
        const newNote: Note = {
          id: now.toString(),
          title: noteData.title,
          content: noteData.content,
          folderId: noteData.folderId ?? null,
          createdAt: now,
          updatedAt: now,
          isPinned: noteData.isPinned ?? false,
        };
        updatedList = [newNote, ...prevNotes];
      }
      return updatedList;
    });

    await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(updatedList));
  };

  const togglePinNote = async (noteId: string) => {
    let updatedList: Note[] = [];
    setNotes((prev) => {
      updatedList = prev.map((n) =>
        n.id === noteId ? { ...n, isPinned: !n.isPinned, updatedAt: Date.now() } : n
      );
      return updatedList;
    });
    await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(updatedList));
  };

  const deleteNote = async (noteId: string) => {
    let updatedList: Note[] = [];
    setNotes((prev) => {
      updatedList = prev.filter((n) => n.id !== noteId);
      return updatedList;
    });
    await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(updatedList));
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        folders,
        selectedFolderId,
        setSelectedFolderId,
        createFolder,
        updateFolder,
        deleteFolder,
        togglePinFolder,
        saveNote,
        togglePinNote,
        deleteNote,
      }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
};
