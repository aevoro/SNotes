export type LessonType = 'Лекция' | 'Практика' | 'Лабораторная';
export type WeekType = 1 | 2 | 'both';

export interface Lesson {
  id: string;
  subject: string;
  room?: string;
  teacher?: string;
  dayOfWeek: number;
  weekType: WeekType;
  type: LessonType;
  startTime: string;
  endTime: string;
  time?: string;
}

export interface LessonStyleConfig {
  label: LessonType;
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
  if (cleanHex.length !== 6) return `rgba(2, 132, 199, ${alpha})`;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getLessonStyleConfig = (type: LessonType, customColor?: string): LessonStyleConfig => {
  const defaultColors: Record<LessonType, string> = {
    'Лекция': '#0284c7',
    'Практика': '#d97706',
    'Лабораторная': '#c026d3',
  };

  const baseHex = customColor || defaultColors[type] || '#0284c7';

  return {
    label: type,
    bgDark: hexToRgba(baseHex, 0.16),
    bgLight: hexToRgba(baseHex, 0.12),
    textDark: baseHex,
    textLight: baseHex,
    border: baseHex,
    badgeBgDark: hexToRgba(baseHex, 0.28),
    badgeBgLight: hexToRgba(baseHex, 0.2),
  };
};

export const LESSON_COLORS: Record<LessonType, LessonStyleConfig> = {
  'Лекция': getLessonStyleConfig('Лекция', '#0284c7'),
  'Практика': getLessonStyleConfig('Практика', '#d97706'),
  'Лабораторная': getLessonStyleConfig('Лабораторная', '#c026d3'),
};
