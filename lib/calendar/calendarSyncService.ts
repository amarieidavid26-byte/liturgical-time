import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Meeting } from '../types';
import { format, addMonths, parseISO } from 'date-fns';
import { getAllMeetings, createMeeting, updateMeeting, deleteMeeting } from '../database/sqlite';

const CALENDAR_NAME = 'Timpul Liturgic';

export type CalendarPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface CalendarSyncSettings {
  enabled: boolean;
  calendarId: string | null;
  permissionStatus: CalendarPermissionStatus;
}

export const requestCalendarPermissions = async (): Promise<CalendarPermissionStatus> => {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    
    if (status === 'granted') {
      return 'granted';
    } else if (status === 'denied') {
      return 'denied';
    }
    return 'undetermined';
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return 'denied';
  }
};

export const checkCalendarPermissions = async (): Promise<CalendarPermissionStatus> => {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    
    if (status === 'granted') {
      return 'granted';
    } else if (status === 'denied') {
      return 'denied';
    }
    return 'undetermined';
  } catch (error) {
    console.error('Error checking calendar permissions:', error);
    return 'denied';
  }
};

export const getOrCreateCalendar = async (): Promise<string | null> => {
  try {
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Calendar permissions not granted');
      return null;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    const existingCalendar = calendars.find(cal => cal.title === CALENDAR_NAME);
    if (existingCalendar) {
      console.log('Found existing calendar:', existingCalendar.id);
      return existingCalendar.id;
    }

    const defaultCalendarSource = 
      Platform.OS === 'ios'
        ? await getDefaultCalendarSource()
        : { isLocalAccount: true, name: CALENDAR_NAME, type: Calendar.SourceType.LOCAL };

    if (!defaultCalendarSource) {
      console.error('No calendar source available');
      return null;
    }

    const newCalendarId = await Calendar.createCalendarAsync({
      title: CALENDAR_NAME,
      color: '#4169E1',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource.id,
      source: defaultCalendarSource,
      name: CALENDAR_NAME,
      ownerAccount: CALENDAR_NAME,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    console.log('Created new calendar:', newCalendarId);
    return newCalendarId;
  } catch (error) {
    console.error('Error getting or creating calendar:', error);
    return null;
  }
};

async function getDefaultCalendarSource() {
  const sources = await Calendar.getSourcesAsync();
  const defaultSource = sources.find(s => s.name === 'Default') || sources[0];
  return defaultSource;
}

export const createCalendarEvent = async (
  meeting: Meeting,
  calendarId: string
): Promise<string | null> => {
  try {
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Calendar permissions not granted');
      return null;
    }

    const startDate = new Date(`${meeting.date}T${meeting.startTime}`);
    const endDate = new Date(`${meeting.date}T${meeting.endTime}`);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: meeting.title,
      startDate,
      endDate,
      location: meeting.location || undefined,
      notes: meeting.notes || undefined,
      timeZone: 'Europe/Bucharest',
      alarms: [
        { relativeOffset: -60 },
        { relativeOffset: -15 }
      ],
    });

    console.log('Created calendar event:', eventId);
    return eventId;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

export const updateCalendarEvent = async (
  eventId: string,
  meeting: Meeting
): Promise<boolean> => {
  try {
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Calendar permissions not granted');
      return false;
    }

    const startDate = new Date(`${meeting.date}T${meeting.startTime}`);
    const endDate = new Date(`${meeting.date}T${meeting.endTime}`);

    await Calendar.updateEventAsync(eventId, {
      title: meeting.title,
      startDate,
      endDate,
      location: meeting.location || undefined,
      notes: meeting.notes || undefined,
      timeZone: 'Europe/Bucharest',
    });

    console.log('Updated calendar event:', eventId);
    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
};

export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  try {
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Calendar permissions not granted');
      return false;
    }

    await Calendar.deleteEventAsync(eventId);
    console.log('Deleted calendar event:', eventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

export const syncMeetingToCalendar = async (
  meeting: Meeting,
  calendarId: string | null
): Promise<string | null> => {
  if (!calendarId) {
    const newCalendarId = await getOrCreateCalendar();
    if (!newCalendarId) {
      console.error('Failed to get or create calendar');
      return null;
    }
    calendarId = newCalendarId;
  }

  if (meeting.calendarEventId) {
    const updated = await updateCalendarEvent(meeting.calendarEventId, meeting);
    return updated ? meeting.calendarEventId : null;
  } else {
    return await createCalendarEvent(meeting, calendarId);
  }
};

export const deleteMeetingFromCalendar = async (meeting: Meeting): Promise<boolean> => {
  if (!meeting.calendarEventId) {
    return true;
  }
  return await deleteCalendarEvent(meeting.calendarEventId);
};

export const getExternalCalendarEvents = async (
  startDate: Date,
  endDate: Date
): Promise<any[]> => {
  try {
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Calendar permissions not granted for import');
      return [];
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    const externalCalendars = calendars.filter(cal => 
      cal.title !== CALENDAR_NAME && 
      cal.allowsModifications &&
      (cal.source.name === 'iCloud' || 
       cal.source.name === 'Google' || 
       cal.source.name === 'Default' ||
       cal.source.name === 'Local')
    );
    
    if (externalCalendars.length === 0) {
      console.log('No external calendars found');
      return [];
    }

    const calendarIds = externalCalendars.map(cal => cal.id);
    const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
    
    return events.filter(event => 
      !event.allDay && 
      event.title && 
      !event.title.includes('✝️') && 
      !event.title.includes('📿')
    );
  } catch (error) {
    console.error('Error getting external calendar events:', error);
    return [];
  }
};

const checkForDuplicate = (
  newMeeting: { date: string; startTime: string; endTime: string; title: string },
  existingMeetings: Meeting[]
): Meeting | null => {
  for (const existing of existingMeetings) {
    if (existing.date === newMeeting.date) {
      const newStart = newMeeting.startTime;
      const newEnd = newMeeting.endTime;
      const existingStart = existing.startTime;
      const existingEnd = existing.endTime;
      
      const overlap = (newStart < existingEnd && newEnd > existingStart);
      
      if (overlap && existing.title.toLowerCase() === newMeeting.title.toLowerCase()) {
        return existing;
      }
    }
  }
  return null;
};

export const smartImportMeetings = async (): Promise<{ imported: number; skipped: number }> => {
  try {
    const startDate = new Date();
    const endDate = addMonths(startDate, 3);
    
    const externalEvents = await getExternalCalendarEvents(startDate, endDate);
    
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
      
      const newMeeting = {
        title: event.title,
        date: format(new Date(event.startDate), 'yyyy-MM-dd'),
        startTime: format(new Date(event.startDate), 'HH:mm'),
        endTime: format(new Date(event.endDate), 'HH:mm'),
      };
      
      const duplicate = checkForDuplicate(newMeeting, existingMeetings);
      if (duplicate) {
        skipped++;
        continue;
      }
      
      const meetingToCreate: Meeting = {
        ...newMeeting,
        location: event.location || '',
        notes: event.notes || `Importat din ${event.calendar?.title || 'Calendar'}`,
        externalEventId: event.id,
        calendarSource: event.calendar?.title || 'Apple Calendar',
        lastSynced: new Date().toISOString(),
      };
      
      await createMeeting(meetingToCreate);
      imported++;
    }
    
    console.log(`Import complete: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped };
  } catch (error) {
    console.error('Import error:', error);
    return { imported: 0, skipped: 0 };
  }
};

export const updateExternalCalendarEvent = async (meeting: Meeting): Promise<boolean> => {
  if (!meeting.externalEventId) {
    return true;
  }
  
  try {
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Calendar permissions not granted for external update');
      return false;
    }

    const startDate = new Date(`${meeting.date}T${meeting.startTime}`);
    const endDate = new Date(`${meeting.date}T${meeting.endTime}`);

    await Calendar.updateEventAsync(meeting.externalEventId, {
      title: meeting.title,
      startDate,
      endDate,
      location: meeting.location || undefined,
      notes: meeting.notes || undefined,
      timeZone: 'Europe/Bucharest',
    });

    console.log('Updated external calendar event:', meeting.externalEventId);
    return true;
  } catch (error) {
    console.error('Error updating external calendar event:', error);
    return false;
  }
};

export const deleteExternalCalendarEvent = async (meeting: Meeting): Promise<boolean> => {
  if (!meeting.externalEventId) {
    return true;
  }
  
  try {
    const permissionStatus = await checkCalendarPermissions();
    if (permissionStatus !== 'granted') {
      console.log('Calendar permissions not granted for external delete');
      return false;
    }

    await Calendar.deleteEventAsync(meeting.externalEventId);
    console.log('Deleted external calendar event:', meeting.externalEventId);
    return true;
  } catch (error) {
    console.error('Error deleting external calendar event:', error);
    return false;
  }
};

export const syncExternalChanges = async (): Promise<{ updated: number; deleted: number }> => {
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
          continue;
        }
        
        const eventDate = format(new Date(event.startDate), 'yyyy-MM-dd');
        const eventStartTime = format(new Date(event.startDate), 'HH:mm');
        const eventEndTime = format(new Date(event.endDate), 'HH:mm');
        
        const hasChanges = 
          eventDate !== meeting.date || 
          eventStartTime !== meeting.startTime || 
          eventEndTime !== meeting.endTime ||
          event.title !== meeting.title ||
          (event.location || '') !== (meeting.location || '');
        
        if (hasChanges) {
          await updateMeeting({
            ...meeting,
            title: event.title,
            date: eventDate,
            startTime: eventStartTime,
            endTime: eventEndTime,
            location: event.location || meeting.location,
            notes: event.notes || meeting.notes,
            lastSynced: new Date().toISOString(),
          });
          updated++;
        }
      } catch (error) {
        console.log('Could not sync meeting:', meeting.id, error);
      }
    }
    
    console.log(`Sync complete: ${updated} updated, ${deleted} deleted`);
    return { updated, deleted };
  } catch (error) {
    console.error('Sync error:', error);
    return { updated: 0, deleted: 0 };
  }
};
