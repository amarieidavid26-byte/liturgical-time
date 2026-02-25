// Types for the Orthodox Business Calendar app

export interface Meeting {
  id?: number;
  title: string;
  date: string; // ISO 8601 format
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  location?: string;
  notes?: string;
  calendarEventId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  calendarTitle?: string;
}

export interface ParishSettings {
  parishName: string;
  sundayLiturgyTime: string; // HH:mm format
  saturdayVespersTime?: string;
  weekdayLiturgyTime?: string;
  julianCalendarEnabled: boolean;
}

export interface OrthodoxEvent {
  name: string;
  nameEn?: string;
  date: string; // MM-DD or YYYY-MM-DD
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

export interface CalendarDay {
  dateString: string;
  orthodoxEvents: OrthodoxEvent[];
  meetings: Meeting[];
  conflicts: Conflict[];
  fasting: 'none' | 'regular' | 'strict' | 'lent';
  isJulianDate?: boolean;
  julianDateString?: string;
}

export interface FastingPeriod {
  start: string;
  end: string;
  type: 'lent' | 'regular' | 'strict';
}

export type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface AppState {
  parishSettings: ParishSettings | null;
  meetings: Meeting[];
  selectedDate: string;
  viewMode: ViewMode;
  julianCalendarEnabled: boolean;
  isOnboarded: boolean;
}
