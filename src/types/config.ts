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
}

export const DEFAULT_CONFIG: AppConfig = {
  initialScreen: 'Schedule',
  defaultDurationMinutes: 85,
  timeSlots: [],
};
