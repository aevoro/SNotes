import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note, NoteFolder } from '../src/types';

interface NotesContextValue {
  notes: Note[];
  folders: NoteFolder[];
  selectedFolderId: string | 'all' | null;
  setSelectedFolderId: (id: string | 'all' | null) => void;
  createFolder: (name: string, color?: string) => Promise<NoteFolder>;
  deleteFolder: (folderId: string) => Promise<void>;
  togglePinFolder: (folderId: string) => Promise<void>;
  saveNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  togglePinNote: (noteId: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

const STORAGE_NOTES = '@snotes_items';
const STORAGE_FOLDERS = '@snotes_folders';

const NotesContext = createContext<NotesContextValue | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | null>('all');

  useEffect(() => {
    (async () => {
      try {
        const [rawNotes, rawFolders] = await Promise.all([
          AsyncStorage.getItem(STORAGE_NOTES),
          AsyncStorage.getItem(STORAGE_FOLDERS),
        ]);
        if (rawNotes) setNotes(JSON.parse(rawNotes));
        if (rawFolders) setFolders(JSON.parse(rawFolders));
      } catch (e) {
        console.error('Ошибка загрузки заметок:', e);
      }
    })();
  }, []);

  const createFolder = async (name: string, color?: string): Promise<NoteFolder> => {
    const newFolder: NoteFolder = {
      id: Date.now().toString(),
      name: name.trim(),
      color: color || '#0284C7',
      createdAt: Date.now(),
      isPinned: false,
    };
    const updated = [newFolder, ...folders];
    setFolders(updated);
    setSelectedFolderId(newFolder.id);
    await AsyncStorage.setItem(STORAGE_FOLDERS, JSON.stringify(updated));
    return newFolder;
  };

  const deleteFolder = async (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    const updatedNotes = notes.map((n) =>
      n.folderId === folderId ? { ...n, folderId: null } : n
    );
    setFolders(updatedFolders);
    setNotes(updatedNotes);
    if (selectedFolderId === folderId) setSelectedFolderId('all');

    await Promise.all([
      AsyncStorage.setItem(STORAGE_FOLDERS, JSON.stringify(updatedFolders)),
      AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(updatedNotes)),
    ]);
  };

  const togglePinFolder = async (folderId: string) => {
    const updated = folders.map((f) =>
      f.id === folderId ? { ...f, isPinned: !f.isPinned } : f
    );
    setFolders(updated);
    await AsyncStorage.setItem(STORAGE_FOLDERS, JSON.stringify(updated));
  };

  const saveNote = async (
    noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const now = Date.now();
    let updated: Note[];

    if (noteData.id) {
      updated = notes.map((n) =>
        n.id === noteData.id
          ? { ...n, ...noteData, updatedAt: now }
          : n
      );
    } else {
      const newNote: Note = {
        id: now.toString(),
        title: noteData.title,
        content: noteData.content,
        folderId: noteData.folderId,
        createdAt: now,
        updatedAt: now,
        isPinned: noteData.isPinned ?? false,
      };
      updated = [newNote, ...notes];
    }

    setNotes(updated);
    await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(updated));
  };

  const togglePinNote = async (noteId: string) => {
    const updated = notes.map((n) =>
      n.id === noteId ? { ...n, isPinned: !n.isPinned, updatedAt: Date.now() } : n
    );
    setNotes(updated);
    await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(updated));
  };

  const deleteNote = async (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    await AsyncStorage.setItem(STORAGE_NOTES, JSON.stringify(updated));
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        folders,
        selectedFolderId,
        setSelectedFolderId,
        createFolder,
        deleteFolder,
        togglePinFolder,
        saveNote,
        togglePinNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
};
