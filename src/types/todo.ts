import { AppFolder } from './folders';

export type TodoFolder = AppFolder;

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  folderId: string | null;
  deadline?: string | number | null;
  deadlineText?: string | null;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}
