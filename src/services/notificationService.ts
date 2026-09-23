import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ScheduleStore, WeekNumber } from '../../app/(tabs)/schedule';
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

// Планирование пуш-уведомлений о занятиях на ближайшие дни
export const scheduleLessonNotifications = async (
  schedule: ScheduleStore,
  leadMinutes: number = 10,
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

    const currentWeekNum = twoWeeksEnabled ? getCurrentWeekNumber() : 1;
    const now = new Date();

    // Планируем уведомления на текущую неделю (дни 0..5, Пн-Сб)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);

      const jsDay = targetDate.getDay(); // 0 = Вс, 1 = Пн ... 6 = Сб
      if (jsDay === 0) continue; // Воскресенье пропускаем

      const dayIdx = jsDay - 1; // 0..5
      const dayLessons = schedule[currentWeekNum]?.[dayIdx] || [];

      for (const lesson of dayLessons) {
        if (!lesson.time) continue;
        const matches = lesson.time.match(/(\d{1,2}):(\d{2})/);
        if (!matches) continue;

        const startHour = parseInt(matches[1], 10);
        const startMin = parseInt(matches[2], 10);

        const notificationTime = new Date(targetDate);
        notificationTime.setHours(startHour, startMin, 0, 0);
        notificationTime.setMinutes(notificationTime.getMinutes() - leadMinutes);

        // Если время уже прошло в прошлом, не планируем
        if (notificationTime.getTime() <= Date.now()) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 Следующее занятие: ${lesson.subject}`,
            body: `${lesson.time} | Ауд. ${lesson.room || '—'} (${lesson.type})`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: notificationTime,
          },
        });
      }
    }
  } catch (error) {
    console.error('Ошибка планирования уведомлений о занятиях:', error);
  }
};
