import { Lesson } from '../types/schedule';
import { LessonTimeSlot } from '../types/config';

export const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  if (!startTime) return '';
  const parts = startTime.split(':');
  if (parts.length < 2) return '';
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return '';

  const totalStart = hours * 60 + minutes;
  const totalEnd = (totalStart + durationMinutes) % (24 * 60);

  const endHours = Math.floor(totalEnd / 60);
  const endMins = totalEnd % 60;

  const hStr = endHours.toString().padStart(2, '0');
  const mStr = endMins.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
};

export const sortLessonsByTime = (lessons: Lesson[]): Lesson[] => {
  return [...lessons].sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export const getLessonsForDay = (
  lessons: Lesson[],
  dayOfWeek: number,
  currentWeek: 1 | 2
): Lesson[] => {
  const filtered = lessons.filter(
    (lesson) =>
      lesson.dayOfWeek === dayOfWeek &&
      (lesson.weekType === 'both' || lesson.weekType === currentWeek)
  );

  return sortLessonsByTime(filtered);
};

export const findSlotNumber = (
  startTime: string,
  timeSlots: LessonTimeSlot[]
): number | null => {
  const match = timeSlots.find((slot) => slot.startTime === startTime);
  return match ? match.lessonNumber : null;
};
