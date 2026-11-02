import { LessonType, DEFAULT_EVENT_COLORS } from './schedule';

export type InitialScreenType = 'Schedule' | 'Notes' | 'Todo' | 'Calendar' | 'Settings';

export interface LessonTimeSlot {
  lessonNumber: number;
  startTime: string;
  endTime: string;
}

export interface AppConfig {
  initialScreen: InitialScreenType;
  defaultDurationMinutes: number;
  timeSlots: LessonTimeSlot[];
  customLessonColors?: Record<string, string>;
  notificationsEnabled?: boolean;
  notificationLeadMinutes?: number;
  twoWeeksEnabled?: boolean;
  githubRepo?: string;
  eventCategories?: string[];
  calendarEventMarkerColor?: string;
  calendarDeadlineMarkerColor?: string;
}

export const DEFAULT_LESSON_COLORS: Record<string, string> = DEFAULT_EVENT_COLORS;

export const COLOR_PALETTE = [
  '#0a84ff', // Cupertino Blue
  '#0284c7', // Синий
  '#10b981', // Изумрудный
  '#16a34a', // Зеленый
  '#d97706', // Янтарный
  '#f97316', // Оранжевый
  '#dc2626', // Красный
  '#c026d3', // Фиолетовый
  '#ec4899', // Розовый
  '#6366f1', // Индиго
  '#64748b', // Графитовый
];

export const STANDARD_CATEGORIES: string[] = [
  'Учеба',
  'Лекция',
  'Практика',
  'Лабораторная',
  'Встреча',
  'Тренировка',
  'Работа',
  'Личное',
];

export const DEFAULT_CONFIG: AppConfig = {
  initialScreen: 'Schedule',
  defaultDurationMinutes: 60,
  timeSlots: [],
  customLessonColors: DEFAULT_LESSON_COLORS,
  notificationsEnabled: true,
  notificationLeadMinutes: 10,
  twoWeeksEnabled: true,
  githubRepo: 'aevoro/SNotes',
  eventCategories: STANDARD_CATEGORIES,
  calendarEventMarkerColor: '#0a84ff',
  calendarDeadlineMarkerColor: '#ff453a',
};
