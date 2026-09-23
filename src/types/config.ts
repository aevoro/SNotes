import { LessonType } from './schedule';

export type InitialScreenType = 'Schedule' | 'Notes' | 'Todo';

export interface LessonTimeSlot {
  lessonNumber: number;
  startTime: string;
  endTime: string;
}

export interface AppConfig {
  initialScreen: InitialScreenType;
  defaultDurationMinutes: number;
  timeSlots: LessonTimeSlot[];
  customLessonColors?: Partial<Record<LessonType, string>>;
  notificationsEnabled?: boolean;
  notificationLeadMinutes?: number;
  twoWeeksEnabled?: boolean;
  githubRepo?: string;
}

export const DEFAULT_LESSON_COLORS: Record<LessonType, string> = {
  'Лекция': '#0284c7', // Sky Blue
  'Практика': '#d97706', // Amber / Orange
  'Лабораторная': '#c026d3', // Fuchsia / Purple
};

export const COLOR_PALETTE = [
  '#0284c7', // Синий
  '#0d9488', // Бирюзовый / Изумрудный
  '#16a34a', // Зеленый
  '#d97706', // Оранжевый / Янтарный
  '#dc2626', // Красный
  '#c026d3', // Фиолетовый / Пурпурный
  '#e11d48', // Розовый
  '#4f46e5', // Индиго
  '#475569', // Графитовый
];

export const DEFAULT_CONFIG: AppConfig = {
  initialScreen: 'Schedule',
  defaultDurationMinutes: 60,
  timeSlots: [],
  customLessonColors: DEFAULT_LESSON_COLORS,
  notificationsEnabled: true,
  notificationLeadMinutes: 10,
  twoWeeksEnabled: true,
  githubRepo: 'aevoroo/SNotes',
};
