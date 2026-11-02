import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodoItem } from '../src/types/todo';
import { AppFolder } from '../src/types/folders';
import { useFolders } from './FoldersContext';
import { CupertinoIconName } from '../src/components/CupertinoIcon';

interface TodoContextValue {
  todos: TodoItem[];
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
  saveTodo: (
    todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<void>;
  togglePinTodo: (todoId: string) => Promise<void>;
  toggleCompleteTodo: (todoId: string) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
}

const STORAGE_TODOS = '@snotes_todo_items';

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    folders,
    createFolder,
    updateFolder,
    deleteFolder: deleteFolderFromContext,
    togglePinFolder,
  } = useFolders();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | null>('all');

  useEffect(() => {
    (async () => {
      try {
        const rawTodos = await AsyncStorage.getItem(STORAGE_TODOS);
        if (rawTodos) setTodos(JSON.parse(rawTodos));
      } catch (e) {
        console.error('Ошибка загрузки задач:', e);
      }
    })();
  }, []);

  const deleteFolder = async (folderId: string) => {
    await deleteFolderFromContext(folderId);
    setTodos((prev) =>
      prev.map((t) => (t.folderId === folderId ? { ...t, folderId: null } : t))
    );
    if (selectedFolderId === folderId) setSelectedFolderId('all');
  };

  const saveTodo = async (
    todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const now = Date.now();
    let updatedList: TodoItem[] = [];

    setTodos((prevTodos) => {
      if (todoData.id) {
        updatedList = prevTodos.map((t) =>
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
          isPinned: todoData.isPinned ?? false,
        };
        updatedList = [newTodo, ...prevTodos];
      }
      return updatedList;
    });

    await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updatedList));
  };

  const togglePinTodo = async (todoId: string) => {
    let updatedList: TodoItem[] = [];
    setTodos((prev) => {
      updatedList = prev.map((t) =>
        t.id === todoId ? { ...t, isPinned: !t.isPinned, updatedAt: Date.now() } : t
      );
      return updatedList;
    });
    await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updatedList));
  };

  const toggleCompleteTodo = async (todoId: string) => {
    let updatedList: TodoItem[] = [];
    setTodos((prev) => {
      updatedList = prev.map((t) =>
        t.id === todoId ? { ...t, isCompleted: !t.isCompleted, updatedAt: Date.now() } : t
      );
      return updatedList;
    });
    await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updatedList));
  };

  const deleteTodo = async (todoId: string) => {
    let updatedList: TodoItem[] = [];
    setTodos((prev) => {
      updatedList = prev.filter((t) => t.id !== todoId);
      return updatedList;
    });
    await AsyncStorage.setItem(STORAGE_TODOS, JSON.stringify(updatedList));
  };

  return (
    <TodoContext.Provider
      value={{
        todos,
        folders,
        selectedFolderId,
        setSelectedFolderId,
        createFolder,
        updateFolder,
        deleteFolder,
        togglePinFolder,
        saveTodo,
        togglePinTodo,
        toggleCompleteTodo,
        deleteTodo,
      }}>
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
};
