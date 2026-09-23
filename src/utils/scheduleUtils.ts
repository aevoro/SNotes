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

// Получение индекса дня недели для расписания (0 = Пн, 1 = Вт, ..., 5 = Сб)
export const getCurrentDayIndex = (): number => {
  const day = new Date().getDay();
  // 0 - Воскресенье, переводим на Понедельник (0)
  if (day === 0) return 0;
  return day - 1;
};

// Определение текущей недели (1 или 2) с отсчетом от 1 сентября учебного года
// Неделя 1 сентября (с 1 по первое воскресенье сентября) - 1 неделя, затем чередуется 2, 1, 2...
export const getCurrentWeekNumber = (date: Date = new Date()): 1 | 2 => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Январь, ..., 8 = Сентябрь
  const academicYear = month >= 8 ? year : year - 1;
  const sept1 = new Date(academicYear, 8, 1);

  const getMondayOfWeek = (d: Date): Date => {
    const res = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = res.getDay();
    // 0 = Воскресенье, 1 = Понедельник...
    const diffDays = day === 0 ? -6 : 1 - day;
    res.setDate(res.getDate() + diffDays);
    res.setHours(0, 0, 0, 0);
    return res;
  };

  const targetMonday = getMondayOfWeek(date);
  const sept1Monday = getMondayOfWeek(sept1);

  const diffMs = targetMonday.getTime() - sept1Monday.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  // Четные недели от 1 сентября (0, 2, 4...) -> 1 неделя
  // Нечетные недели от 1 сентября (1, 3, 5...) -> 2 неделя
  return Math.abs(diffWeeks) % 2 === 1 ? 2 : 1;
};

// Проверка, идет ли занятие прямо сейчас
export const isLessonCurrentlyActive = (timeString: string): boolean => {
  if (!timeString) return false;

  const matches = timeString.match(/(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})/);
  if (!matches || matches.length < 3) return false;

  const [_, start, end] = matches;
  const [sH, sM] = start.split(':').map((v) => parseInt(v, 10));
  const [eH, eM] = end.split(':').map((v) => parseInt(v, 10));

  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};
