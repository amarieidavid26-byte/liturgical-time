import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Meeting, DeviceCalendarEvent } from '../types';
import { updateMeetingCalendarEventId, getAllMeetings } from '../database/sqlite';
import { getAppCalendarId, saveAppCalendarId } from '../utils/storage';

export const requestCalendarPermissions = async (): Promise<boolean> => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
};

export const getAvailableCalendars = async (): Promise<Calendar.Calendar[]> => {
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
};

export const getOrCreateAppCalendar = async (): Promise<string> => {
  // Check if we have a stored calendar ID
  const storedId = await getAppCalendarId();
  if (storedId) {
    // Verify it still exists on device
    const calendars = await getAvailableCalendars();
    if (calendars.some(c => c.id === storedId)) {
      return storedId;
    }
  }

  // Create a new calendar
  let calendarId: string;

  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    calendarId = await Calendar.createCalendarAsync({
      title: 'Liturgical Time',
      color: '#DAA520',
      entityType: Calendar.EntityTypes.EVENT,
      source: defaultCalendar.source,
      name: 'liturgicalTime',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } else {
    calendarId = await Calendar.createCalendarAsync({
      title: 'Liturgical Time',
      color: '#DAA520',
      entityType: Calendar.EntityTypes.EVENT,
      source: {
        isLocalAccount: true,
        name: 'Liturgical Time',
        type: 'LOCAL' as any,
      },
      name: 'liturgicalTime',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }

  await saveAppCalendarId(calendarId);
  return calendarId;
};

export const exportMeetingToCalendar = async (meeting: Meeting): Promise<string | null> => {
  try {
    const calendarId = await getOrCreateAppCalendar();

    // Build Date objects from meeting date + time strings
    const [year, month, day] = meeting.date.split('-').map(Number);
    const [startH, startM] = meeting.startTime.split(':').map(Number);
    const [endH, endM] = meeting.endTime.split(':').map(Number);

    const startDate = new Date(year, month - 1, day, startH, startM);
    const endDate = new Date(year, month - 1, day, endH, endM);

    const eventDetails: Partial<Calendar.Event> = {
      title: meeting.title,
      startDate,
      endDate,
      location: meeting.location || undefined,
      notes: meeting.notes || undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    let eventId: string;

    if (meeting.calendarEventId) {
      // Try to update existing event
      try {
        await Calendar.updateEventAsync(meeting.calendarEventId, eventDetails);
        eventId = meeting.calendarEventId;
      } catch {
        // Event was deleted externally, create a new one
        eventId = await Calendar.createEventAsync(calendarId, eventDetails);
      }
    } else {
      eventId = await Calendar.createEventAsync(calendarId, eventDetails);
    }

    // Persist the calendarEventId back to SQLite
    if (meeting.id && eventId !== meeting.calendarEventId) {
      await updateMeetingCalendarEventId(meeting.id, eventId);
    }

    return eventId;
  } catch (error) {
    console.warn('Failed to export meeting to calendar:', error);
    return null;
  }
};

export const deleteMeetingFromCalendar = async (calendarEventId: string): Promise<void> => {
  try {
    await Calendar.deleteEventAsync(calendarEventId);
  } catch (error) {
    console.warn('Failed to delete calendar event (may already be deleted):', error);
  }
};

export const importEventsFromCalendar = async (
  startDate: Date,
  endDate: Date
): Promise<DeviceCalendarEvent[]> => {
  try {
    const calendars = await getAvailableCalendars();
    const appCalendarId = await getAppCalendarId();

    // Exclude the app's own calendar to avoid duplicates
    const externalCalendarIds = calendars
      .filter(c => c.id !== appCalendarId)
      .map(c => c.id);

    if (externalCalendarIds.length === 0) return [];

    const events = await Calendar.getEventsAsync(externalCalendarIds, startDate, endDate);

    // Build a lookup for calendar titles
    const calendarTitleMap = new Map(calendars.map(c => [c.id, c.title]));

    return events.map(event => ({
      id: event.id,
      calendarId: event.calendarId,
      title: event.title,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      location: event.location || undefined,
      notes: event.notes || undefined,
      calendarTitle: calendarTitleMap.get(event.calendarId) || undefined,
    }));
  } catch (error) {
    console.warn('Failed to import events from calendar:', error);
    return [];
  }
};

export const syncAllMeetingsToCalendar = async (): Promise<number> => {
  const meetings = await getAllMeetings();
  let synced = 0;

  for (const meeting of meetings) {
    const result = await exportMeetingToCalendar(meeting);
    if (result) synced++;
  }

  return synced;
};
