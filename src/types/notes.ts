export interface NoteFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
}
