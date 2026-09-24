import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ScheduleStore, Lesson } from '../../app/(tabs)/schedule';
import { getCurrentWeekNumber } from '../utils/scheduleUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Уведомления о занятиях',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
        sound: 'default',
        enableVibrate: true,
        showBadge: false,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.error('Ошибка запроса разрешений на уведомления:', error);
    return false;
  }
};

// Извлечение часов и минут начала и окончания занятия
interface LessonTimeParsed {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

const parseTimes = (timeStr: string): LessonTimeParsed | null => {
  if (!timeStr) return null;
  const matches = timeStr.match(/(\d{1,2}):(\d{2})/g);
  if (!matches || matches.length === 0) return null;

  const [sh, sm] = matches[0].split(':').map((v) => parseInt(v, 10));
  if (isNaN(sh) || isNaN(sm)) return null;

  let eh = sh;
  let em = sm + 60;

  if (matches.length > 1) {
    const [h, m] = matches[1].split(':').map((v) => parseInt(v, 10));
    if (!isNaN(h) && !isNaN(m)) {
      eh = h;
      em = m;
    }
  } else {
    eh = Math.floor((sh * 60 + sm + 60) / 60) % 24;
    em = (sh * 60 + sm + 60) % 60;
  }

  return { startHour: sh, startMin: sm, endHour: eh, endMin: em };
};

// Планирование пуш-уведомлений о занятиях на ближайшие дни
export const scheduleLessonNotifications = async (
  schedule: ScheduleStore,
  enabled: boolean = true,
  twoWeeksEnabled: boolean = true
): Promise<void> => {
  if (Platform.OS === 'web' || !enabled) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
    return;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const nowMs = now.getTime();

    // Планируем уведомления на 7 дней вперед
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);

      const jsDay = targetDate.getDay(); // 0 = Вс, 1 = Пн ... 6 = Сб
      if (jsDay === 0) continue; // Воскресенье пропускаем

      const dayIdx = jsDay - 1; // 0..5
      const weekNumForDay = twoWeeksEnabled ? getCurrentWeekNumber(targetDate) : 1;
      const dayLessons = schedule[weekNumForDay]?.[dayIdx] || [];
      if (!dayLessons.length) continue;

      // Парсим и сортируем занятия дня по времени начала
      const parsedLessons = dayLessons
        .map((l) => ({ lesson: l, times: parseTimes(l.time) }))
        .filter((item): item is { lesson: Lesson; times: LessonTimeParsed } => item.times !== null)
        .sort((a, b) => (a.times.startHour * 60 + a.times.startMin) - (b.times.startHour * 60 + b.times.startMin));

      for (let i = 0; i < parsedLessons.length; i++) {
        const { lesson, times } = parsedLessons[i];

        const lessonStartTime = new Date(targetDate);
        lessonStartTime.setHours(times.startHour, times.startMin, 0, 0);

        // Если само занятие уже закончилось или началось (для сегодняшнего дня)
        if (lessonStartTime.getTime() <= nowMs) continue;

        let notifDate = new Date(targetDate);

        if (i === 0) {
          // Первое событие за день: за 5 минут до начала
          notifDate.setHours(times.startHour, times.startMin - 5, 0, 0);
        } else {
          // Последующие события: при завершении предыдущего события
          const prevTimes = parsedLessons[i - 1].times;
          const prevEndTime = new Date(targetDate);
          prevEndTime.setHours(prevTimes.endHour, prevTimes.endMin, 0, 0);

          const breakMinutes = (lessonStartTime.getTime() - prevEndTime.getTime()) / 60000;

          // Если перерыв между занятиями до 45 минут, уведомляем в момент окончания предыдущего
          if (breakMinutes > 0 && breakMinutes <= 45) {
            notifDate = new Date(prevEndTime);
          } else {
            // При большом перерыве (> 45 мин) или накладке - за 5 минут до начала
            notifDate.setHours(times.startHour, times.startMin - 5, 0, 0);
          }
        }

        // Если время уведомления уже наступило, но занятие еще не началось
        // (например, пользователь открыл приложение за 2 минуты до начала первого события):
        // отправляем уведомление сразу (через 2 секунды)
        if (notifDate.getTime() <= nowMs) {
          notifDate = new Date(nowMs + 2000);
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 Следующее занятие: ${lesson.subject}`,
            body: `${lesson.time} | Ауд. ${lesson.room || '—'} (${lesson.type})`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: notifDate,
            channelId: 'default',
          },
        });
      }
    }
  } catch (error) {
    console.error('Ошибка планирования уведомлений о занятиях:', error);
  }
};
