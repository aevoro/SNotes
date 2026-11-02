import { AppFolder } from './folders';

export type NoteFolder = AppFolder;

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}
