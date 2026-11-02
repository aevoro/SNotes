import { CupertinoIconName } from '../components/CupertinoIcon';

export interface AppFolder {
  id: string;
  name: string;
  color?: string;
  icon?: CupertinoIconName;
  parentId?: string | null;
  createdAt: number;
  isPinned?: boolean;
  isSystem?: boolean;
}

export const SYSTEM_CALENDAR_FOLDER_ID = '__system_calendar__';

export const SYSTEM_CALENDAR_FOLDER: AppFolder = {
  id: SYSTEM_CALENDAR_FOLDER_ID,
  name: 'Календарь',
  color: '#0a84ff',
  icon: 'calendar',
  parentId: null,
  createdAt: 0,
  isPinned: false,
  isSystem: true,
};

export const FOLDER_ICONS: { name: CupertinoIconName; label: string }[] = [
  { name: 'folder', label: 'Папка' },
  { name: 'book', label: 'Учеба' },
  { name: 'briefcase', label: 'Работа' },
  { name: 'home', label: 'Дом' },
  { name: 'sport', label: 'Спорт' },
  { name: 'star', label: 'Важное' },
  { name: 'code', label: 'Код' },
  { name: 'heart', label: 'Личное' },
  { name: 'cart', label: 'Покупки' },
  { name: 'bulb', label: 'Идеи' },
];

export const FOLDER_COLORS = [
  '#0a84ff', // Синий
  '#30d158', // Зеленый
  '#ff9f0a', // Оранжевый
  '#ff453a', // Красный
  '#bf5af2', // Фиолетовый
  '#64d2ff', // Голубой
  '#ffd60a', // Желтый
  '#8e8e93', // Серый
];
