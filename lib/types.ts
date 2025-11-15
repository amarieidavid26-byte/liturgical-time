export interface Meeting {
  id?: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  calendarEventId?: string;
  externalEventId?: string;
  calendarSource?: string;
  lastSynced?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParishSettings {
  parishName: string;
  sundayLiturgyTime: string;
  saturdayVespersTime?: string;
  weekdayLiturgyTime?: string;
  julianCalendarEnabled: boolean;
}

export interface OrthodoxEvent {
  name: string;
  nameEn?: string;
  date: string;
  moveable: boolean;
  liturgyRequired: boolean;
  level: 'great' | 'major' | 'minor' | 'regular';
  fasting?: 'none' | 'regular' | 'strict' | 'lent';
}

export interface Conflict {
  meeting: Meeting;
  orthodoxEvent: OrthodoxEvent;
  conflictType: 'sunday' | 'great_feast' | 'major_feast' | 'weekday_liturgy';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export type ViewMode = 'month' | 'week' | 'day' | 'agenda';
