import { Meeting } from '../types';
import { syncMeetingToCalendar, deleteMeetingFromCalendar, updateExternalCalendarEvent, deleteExternalCalendarEvent } from './calendarSyncService';
import { getCalendarId, getCalendarSyncEnabled } from '../utils/storage';
import { CalendarSyncController } from './CalendarSyncController';

let debouncedSyncTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 1000;

export const instantPushMeeting = async (meeting: Meeting, operation: 'create' | 'update' | 'delete'): Promise<void> => {
  const syncEnabled = await getCalendarSyncEnabled();
  if (!syncEnabled) {
    console.log('Calendar sync disabled, skipping instant push');
    return;
  }

  if (debouncedSyncTimer) {
    clearTimeout(debouncedSyncTimer);
  }

  debouncedSyncTimer = setTimeout(async () => {
    try {
      console.log(`⚡ Instant push: ${operation} meeting "${meeting.title}"`);
      
      const calendarId = await getCalendarId();
      
      if (operation === 'delete') {
        if (meeting.calendarEventId) {
          await deleteMeetingFromCalendar(meeting);
          console.log('⚡ Deleted from app calendar');
        }
        if (meeting.externalEventId) {
          await deleteExternalCalendarEvent(meeting);
          console.log('⚡ Deleted from external calendar');
        }
      } else if (operation === 'update') {
        if (meeting.externalEventId) {
          await updateExternalCalendarEvent(meeting);
          console.log('⚡ Updated external calendar');
        }
        
        if (meeting.calendarEventId || calendarId) {
          await syncMeetingToCalendar(meeting, calendarId);
          console.log('⚡ Updated app calendar');
        }
      } else {
        const eventId = await syncMeetingToCalendar(meeting, calendarId);
        if (eventId) {
          meeting.calendarEventId = eventId;
          console.log('⚡ Created in calendar:', eventId);
        }
      }
      
      CalendarSyncController.getInstance().performSync();
      
    } catch (error) {
      console.error('Instant push error:', error);
    }
  }, DEBOUNCE_DELAY);
};

export const triggerManualSync = async (): Promise<boolean> => {
  const syncEnabled = await getCalendarSyncEnabled();
  if (!syncEnabled) {
    console.log('Calendar sync disabled, skipping manual sync');
    return false;
  }
  
  const controller = CalendarSyncController.getInstance();
  if (!controller.isEnabled()) {
    controller.enable();
  }
  
  return controller.manualSync();
};
