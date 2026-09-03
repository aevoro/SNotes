import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodoItem, TodoFolder } from '../src/types/todo';

interface TodoContextValue {
  todos: TodoItem[];
  folders: TodoFolder[];
  selectedFolderId: string | 'all' | null;
  setSelectedFolderId: (id: string | 'all' | null) => void;
  createFolder: (name: string, color?: string) => Promise<TodoFolder>;
  deleteFolder: (folderId: string) => Promise<void>;
  saveTodo: (todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  toggleCompleteTodo: (todoId: string) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
}

const STORAGE_TODOS = '@snotes_todo_items';
const STORAGE_FOLDERS = '@snotes_todo_folders';

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [folders, setFolders] = useState<TodoFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | null>('all');

  useEffect(() => {
    (async () => {
      try {
        const [rawTodos, rawFolders] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TODOS),
          AsyncStorage.getItem(STORAGE_FOLDERS),
        ]);
        if (rawTodos) setTodos(JSON.parse(rawTodos));
        if (rawFolders) setFolders(JSON.parse(rawFolders));
      } catch (e) {
        console.error('Ошибка загрузки задач:', e);
      }
    })();
  }, []);

  const createFolder = async (name: string, color?: string): Promise<TodoFolder> => {
    const newFolder: TodoFolder = {
      id: Date.now().toString(),
      name: name.trim(),
      color: color || '#8774e1',
      createdAt: Date.now(),
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    setSelectedFolderId(newFolder.id);
    await AsyncStorage.setItem(STORAGE_FOLDERS, JSON.stringify(updated));
    return newFolder;
  };

  const deleteFolder = async (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    const updatedTodos = todos.map((t) =>
      t.folderId === folderId ? { ...t, folderId: null } : t
    );
    setFolders(updatedFolders);
    setTodos(updatedTodos);
    if (selectedFolderId === folderId) setSelectedFolderId('all');

    await Promise.all([
      AsyncStorage.setItem(STORAGE_FOLDERS, JSON.stringify(updatedFolders)),
      AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updatedTodos)),
    ]);
  };

  const saveTodo = async (
    todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const now = Date.now();
    let updated: TodoItem[];

    if (todoData.id) {
      updated = todos.map((t) =>
        t.id === todoData.id
          ? { ...t, ...todoData, updatedAt: now }
          : t
      );
    } else {
      const newTodo: TodoItem = {
        id: now.toString(),
        title: todoData.title,
        description: todoData.description || '',
        isCompleted: todoData.isCompleted ?? false,
        folderId: todoData.folderId ?? null,
        deadline: todoData.deadline ?? null,
        deadlineText: todoData.deadlineText ?? null,
        createdAt: now,
        updatedAt: now,
      };
      updated = [newTodo, ...todos];
    }

    setTodos(updated);
    await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updated));
  };

  const toggleCompleteTodo = async (todoId: string) => {
    const updated = todos.map((t) =>
      t.id === todoId ? { ...t, isCompleted: !t.isCompleted, updatedAt: Date.now() } : t
    );
    setTodos(updated);
    await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updated));
  };

  const deleteTodo = async (todoId: string) => {
    const updated = todos.filter((t) => t.id !== todoId);
    setTodos(updated);
    await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updated));
  };

  return (
    <TodoContext.Provider
      value={{
        todos,
        folders,
        selectedFolderId,
        setSelectedFolderId,
        createFolder,
        deleteFolder,
        saveTodo,
        toggleCompleteTodo,
        deleteTodo,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = () => {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error('useTodo must be used within TodoProvider');
  return ctx;
};
