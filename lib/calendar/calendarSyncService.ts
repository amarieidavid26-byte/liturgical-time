import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Meeting } from '../types';

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
