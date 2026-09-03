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

export const LESSON_COLORS: Record<LessonType, LessonStyleConfig> = {
  'Лекция': {
    label: 'Лекция',
    bgDark: 'rgba(14, 165, 233, 0.15)',
    bgLight: '#e0f2fe',
    textDark: '#38bdf8',
    textLight: '#0284c7',
    border: '#0284c7',
    badgeBgDark: 'rgba(56, 189, 248, 0.2)',
    badgeBgLight: 'rgba(2, 132, 199, 0.15)',
  },
  'Практика': {
    label: 'Практика',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    bgLight: '#fef3c7',
    textDark: '#fbbf24',
    textLight: '#d97706',
    border: '#d97706',
    badgeBgDark: 'rgba(251, 191, 36, 0.2)',
    badgeBgLight: 'rgba(217, 119, 6, 0.15)',
  },
  'Лабораторная': {
    label: 'Лабораторная',
    bgDark: 'rgba(217, 70, 239, 0.15)',
    bgLight: '#fce7f3',
    textDark: '#f0abfc',
    textLight: '#c026d3',
    border: '#c026d3',
    badgeBgDark: 'rgba(240, 171, 252, 0.2)',
    badgeBgLight: 'rgba(192, 38, 211, 0.15)',
  },
};
