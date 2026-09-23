export interface NoteFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  isPinned?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}
