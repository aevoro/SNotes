export interface TodoFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
  isPinned?: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  folderId: string | null;
  deadline?: number | null;
  deadlineText?: string | null;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}
