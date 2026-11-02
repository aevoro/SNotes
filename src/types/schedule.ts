export type StandardEventType =
  | 'Учеба'
  | 'Лекция'
  | 'Практика'
  | 'Лабораторная'
  | 'Встреча'
  | 'Тренировка'
  | 'Работа'
  | 'Личное';

export type LessonType = StandardEventType | string;
export type WeekType = 1 | 2 | 'both';
export type RecurrenceType = 'weekly' | 'week1' | 'week2' | 'once';

export interface Lesson {
  id: string;
  subject: string;
  room?: string;
  teacher?: string;
  dayOfWeek?: number;
  weekType?: WeekType;
  recurrence?: RecurrenceType;
  date?: string; // YYYY-MM-DD for single-day calendar events
  type: LessonType;
  startTime?: string;
  endTime?: string;
  time?: string;
  color?: string;
  notes?: string;
}

export interface LessonStyleConfig {
  label: string;
  color: string;
  bgDark: string;
  bgLight: string;
  textDark: string;
  textLight: string;
  border: string;
  badgeBgDark: string;
  badgeBgLight: string;
}

export const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return `rgba(10, 132, 255, ${alpha})`;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const DEFAULT_EVENT_COLORS: Record<string, string> = {
  Учеба: '#0a84ff', // Cupertino Blue
  Лекция: '#0284c7', // Sky Blue
  Практика: '#d97706', // Amber
  Лабораторная: '#c026d3', // Fuchsia
  Встреча: '#10b981', // Emerald
  Тренировка: '#f97316', // Orange
  Работа: '#6366f1', // Indigo
  Личное: '#ec4899', // Pink
};

export const getLessonStyleConfig = (type: string, customColor?: string): LessonStyleConfig => {
  const baseHex = customColor || DEFAULT_EVENT_COLORS[type] || '#0a84ff';

  return {
    label: type,
    color: baseHex,
    bgDark: hexToRgba(baseHex, 0.16),
    bgLight: hexToRgba(baseHex, 0.12),
    textDark: baseHex,
    textLight: baseHex,
    border: baseHex,
    badgeBgDark: hexToRgba(baseHex, 0.28),
    badgeBgLight: hexToRgba(baseHex, 0.2),
  };
};
