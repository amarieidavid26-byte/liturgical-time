import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Meeting } from '../types';
import { format, addMonths } from 'date-fns';
import { getAllMeetings, createMeeting, updateMeeting, deleteMeeting } from '../database/sqlite';

const CALENDAR_NAME = 'Timpul Liturgic';

export type CalendarPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface CalendarSyncSettings {
  enabled: boolean;
  calendarId: string | null;
  permissionStatus: CalendarPermissionStatus;
}

export class CalendarSyncService {
  private static instance: CalendarSyncService;
  private static syncInterval: any = null;
  private static orthodoxCalendarId: string | null = null;

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  static async checkPermissions(): Promise<CalendarPermissionStatus> {
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      
      if (status === 'granted') return 'granted';
      if (status === 'denied') return 'denied';
      return 'undetermined';
    } catch (error) {
      console.error('Error checking calendar permissions:', error);
      return 'denied';
    }
  }

  static async getExternalCalendarEvents(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Calendar permissions not granted for import');
        return [];
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      const externalCalendars = calendars.filter(cal => {
        if (cal.title === CALENDAR_NAME) return false;
        
        if (!cal.allowsModifications) return false;
        
        const validSources = [
          'iCloud', 'Google', 'Default', 'Samsung', 'Mi Calendar', 'OnePlus',
          'Local', 'com.android.calendar', 'Outlook', 'Exchange', 'Yahoo',
          'AOL', 'CalDAV', 'Nextcloud', 'ownCloud'
        ];
        
        return validSources.some(src => cal.source?.name?.includes(src)) || 
               (Platform.OS === 'android' && cal.source?.isLocalAccount) ||
               cal.allowsModifications;
      });
      
      console.log(`Found ${externalCalendars.length} external calendars to sync with:`,
        externalCalendars.map(cal => `${cal.title} (${cal.source?.name})`));

      const calendarIds = externalCalendars.map(cal => cal.id);
      if (calendarIds.length === 0) {
        console.log('No external calendars found');
        return [];
      }

      const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
      
      return events.filter(event => 
        !event.allDay && 
        event.title && 
        !event.title.includes('✝️') && 
        !event.title.includes('📿') &&
        !event.title.includes('💼')
      );
    } catch (error) {
      console.error('Error getting external calendar events:', error);
      return [];
    }
  }

  static async getOrCreateOrthodoxCalendar(): Promise<string | null> {
    try {
      if (this.orthodoxCalendarId) return this.orthodoxCalendarId;

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Calendar permissions not granted');
        return null;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      const orthodoxCal = calendars.find(cal => cal.title === CALENDAR_NAME);
      if (orthodoxCal) {
        this.orthodoxCalendarId = orthodoxCal.id;
        console.log('Found existing Orthodox calendar:', orthodoxCal.id);
        return orthodoxCal.id;
      }

      let calendarSource;
      if (Platform.OS === 'ios') {
        const sources = await Calendar.getSourcesAsync();
        calendarSource = sources.find(s => s.name === 'iCloud') || 
                        sources.find(s => s.name === 'Default') || 
                        sources[0];
        
        if (!calendarSource || !calendarSource.id) {
          console.error('No valid calendar source with ID available on iOS');
          return null;
        }
      } else {
        const googleCal = calendars.find(cal => cal.source?.name === 'Google' || cal.source?.type === 'com.google');
        if (googleCal?.source) {
          calendarSource = googleCal.source;
          console.log('Using Google calendar source');
        } else {
          const anyWritableCal = calendars.find(cal => 
            cal.allowsModifications && 
            cal.source?.id
          );
          if (anyWritableCal?.source) {
            calendarSource = anyWritableCal.source;
            console.log('Using calendar source:', anyWritableCal.source.name);
          } else {
            calendarSource = {
              isLocalAccount: true,
              name: 'Local',
              type: 'LOCAL'
            };
            console.log('Using default local source for Android');
          }
        }
      }

      const calendarConfig: any = {
        title: CALENDAR_NAME,
        color: Platform.OS === 'ios' ? '#800020' : '#800020FF',
        entityType: Calendar.EntityTypes.EVENT,
        name: 'timpul_liturgic',
        ownerAccount: Platform.OS === 'android' ? 'liturgical.time@local' : 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      };

      if (calendarSource.id) {
        calendarConfig.sourceId = calendarSource.id;
        calendarConfig.source = calendarSource;
      } else if (Platform.OS === 'android') {
        calendarConfig.source = calendarSource;
      }

      const calendarId = await Calendar.createCalendarAsync(calendarConfig);
      this.orthodoxCalendarId = calendarId;
      console.log('Created new Orthodox calendar:', calendarId);
      return calendarId;
    } catch (error) {
      console.error('Error getting or creating Orthodox calendar:', error);
      return null;
    }
  }

  static async instantPushToCalendar(meeting: Meeting): Promise<string | null> {
    try {
      console.log('⚡ Instant push starting for:', meeting.title);
      
      if (meeting.calendarEventId) {
        try {
          await Calendar.deleteEventAsync(meeting.calendarEventId);
          console.log('Deleted old event:', meeting.calendarEventId);
        } catch (e) {
          console.log('Old event already deleted or not found');
        }
      }
      
      const calendarId = await this.getOrCreateOrthodoxCalendar();
      if (!calendarId) {
        console.error('Could not get calendar ID for instant push');
        return null;
      }

      const event = {
        title: '💼 ' + meeting.title,
        startDate: new Date(`${meeting.date}T${meeting.startTime}`),
        endDate: new Date(`${meeting.date}T${meeting.endTime}`),
        location: meeting.location || '',
        notes: meeting.notes || 'Întâlnire - Timpul Liturgic',
        alarms: [{ relativeOffset: -30 }],
        timeZone: 'Europe/Bucharest',
      };
      
      const eventId = await Calendar.createEventAsync(calendarId, event);
      console.log('⚡ Instant push complete. Event ID:', eventId);
      return eventId;
    } catch (error) {
      console.error('Instant push failed:', error);
      return null;
    }
  }

  static async instantPullFromCalendar(): Promise<{ imported: number; skipped: number }> {
    console.log('⚡ Instant pull starting...');
    
    try {
      const startDate = new Date();
      const endDate = addMonths(startDate, 3);
      
      const externalEvents = await this.getExternalCalendarEvents(startDate, endDate);
      
      if (externalEvents.length === 0) {
        console.log('No external events to import');
        return { imported: 0, skipped: 0 };
      }

      const existingMeetings = await getAllMeetings();
      const existingExternalIds = new Set(
        existingMeetings
          .map(m => m.externalEventId)
          .filter(id => id)
      );
      
      let imported = 0;
      let skipped = 0;
      
      for (const event of externalEvents) {
        if (existingExternalIds.has(event.id)) {
          skipped++;
          continue;
        }
        
        if (event.title.includes(CALENDAR_NAME)) {
          skipped++;
          continue;
        }
        
        const meetingToCreate: Meeting = {
          title: event.title.replace('💼 ', ''),
          date: format(new Date(event.startDate), 'yyyy-MM-dd'),
          startTime: format(new Date(event.startDate), 'HH:mm'),
          endTime: format(new Date(event.endDate), 'HH:mm'),
          location: event.location || '',
          notes: event.notes || `Importat din ${event.calendar?.title || 'Calendar'}`,
          externalEventId: event.id,
          calendarSource: event.calendar?.title || 'External Calendar',
          lastSynced: new Date().toISOString(),
          sourceOfTruth: 'external'
        };
        
        await createMeeting(meetingToCreate);
        imported++;
      }
      
      console.log(`⚡ Instant pull complete: ${imported} imported, ${skipped} skipped`);
      return { imported, skipped };
    } catch (error) {
      console.error('Instant pull failed:', error);
      return { imported: 0, skipped: 0 };
    }
  }

  static async syncExternalChanges(): Promise<{ updated: number; deleted: number }> {
    try {
      const meetings = await getAllMeetings();
      const syncedMeetings = meetings.filter(m => m.externalEventId);
      
      if (syncedMeetings.length === 0) {
        return { updated: 0, deleted: 0 };
      }
      
      let updated = 0;
      let deleted = 0;
      
      for (const meeting of syncedMeetings) {
        if (!meeting.externalEventId || !meeting.id) continue;
        
        try {
          const event = await Calendar.getEventAsync(meeting.externalEventId);
          
          if (!event) {
            await deleteMeeting(meeting.id);
            deleted++;
            console.log('Deleted meeting (removed from external calendar):', meeting.title);
            continue;
          }
          
          const eventDate = format(new Date(event.startDate), 'yyyy-MM-dd');
          const eventStartTime = format(new Date(event.startDate), 'HH:mm');
          const eventEndTime = format(new Date(event.endDate), 'HH:mm');
          const eventTitle = event.title.replace('💼 ', '');
          
          const hasChanges = 
            eventDate !== meeting.date || 
            eventStartTime !== meeting.startTime || 
            eventEndTime !== meeting.endTime ||
            eventTitle !== meeting.title ||
            (event.location || '') !== (meeting.location || '');
          
          if (hasChanges) {
            await updateMeeting({
              ...meeting,
              title: eventTitle,
              date: eventDate,
              startTime: eventStartTime,
              endTime: eventEndTime,
              location: event.location || meeting.location,
              notes: event.notes || meeting.notes,
              lastSynced: new Date().toISOString(),
            });
            updated++;
            console.log('Updated meeting from external calendar:', eventTitle);
          }
        } catch (error) {
          console.log('Could not sync meeting:', meeting.title, error);
        }
      }
      
      console.log(`Sync external changes complete: ${updated} updated, ${deleted} deleted`);
      return { updated, deleted };
    } catch (error) {
      console.error('Sync external changes failed:', error);
      return { updated: 0, deleted: 0 };
    }
  }

  static enableRealTimeSync(callback: () => void): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    console.log('🔄 Real-time sync enabled (every 30 seconds)');
    
    this.syncInterval = setInterval(async () => {
      console.log('🔄 Real-time sync check...');
      
      const { imported } = await this.instantPullFromCalendar();
      const { updated, deleted } = await this.syncExternalChanges();
      
      if (imported > 0 || updated > 0 || deleted > 0) {
        console.log(`✅ Real-time sync: ${imported} new, ${updated} updated, ${deleted} deleted`);
        callback();
      }
    }, 30000);
  }

  static disableRealTimeSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🔄 Real-time sync disabled');
    }
  }
}

export const requestCalendarPermissions = () => CalendarSyncService.requestPermissions();
export const checkCalendarPermissions = () => CalendarSyncService.checkPermissions();
export const getOrCreateCalendar = () => CalendarSyncService.getOrCreateOrthodoxCalendar();
export const getExternalCalendarEvents = (start: Date, end: Date) => 
  CalendarSyncService.getExternalCalendarEvents(start, end);
export const smartImportMeetings = () => CalendarSyncService.instantPullFromCalendar();
export const syncExternalChanges = () => CalendarSyncService.syncExternalChanges();

export const createCalendarEvent = async (meeting: Meeting, calendarId: string): Promise<string | null> => {
  return CalendarSyncService.instantPushToCalendar(meeting);
};

export const updateCalendarEvent = async (eventId: string, meeting: Meeting): Promise<boolean> => {
  const newEventId = await CalendarSyncService.instantPushToCalendar(meeting);
  return newEventId !== null;
};

export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  try {
    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

export const syncMeetingToCalendar = async (meeting: Meeting, calendarId: string | null): Promise<string | null> => {
  return CalendarSyncService.instantPushToCalendar(meeting);
};

export const deleteMeetingFromCalendar = async (meeting: Meeting): Promise<boolean> => {
  if (!meeting.calendarEventId) return true;
  return deleteCalendarEvent(meeting.calendarEventId);
};

export const updateExternalCalendarEvent = async (meeting: Meeting): Promise<boolean> => {
  if (!meeting.externalEventId) return true;
  return updateCalendarEvent(meeting.externalEventId, meeting);
};

export const deleteExternalCalendarEvent = async (meeting: Meeting): Promise<boolean> => {
  if (!meeting.externalEventId) return true;
  return deleteCalendarEvent(meeting.externalEventId);
};
