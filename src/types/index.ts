export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  lastChange: number;
}

export interface ScheduleItem {
  id: string;
  numberOfWeek: 1 | 2;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  timeStart: string;
  timeEnd: string;
  subject: string;
  room: string;
  teacher: string;
}

export interface Reminder {
  id: string;
  title: string;
  triggerDate: string;
  notificationId?: string;
}
