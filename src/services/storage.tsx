import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  NOTES: '@student_notes_items',
  SCHEDULE: '@student_schedule_items',
  REMINDERS: '@student_reminders_items',
};

export async function loadData<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Ошибка чтения ключа ${key}:`, error);
    return fallback;
  }
}

export async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Ошибка записи ключа ${key}:`, error);
  }
}
