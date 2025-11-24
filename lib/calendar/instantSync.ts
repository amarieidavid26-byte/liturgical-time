import { Meeting } from '../types';
import { CalendarSyncService } from './calendarSyncService';
import { getCalendarSyncEnabled } from '../utils/storage';
import { getAllMeetings } from '../database/sqlite';
import useAppStore from '../store/appStore';
import * as Calendar from 'expo-calendar';

let debouncedSyncTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 500;

export const instantPushMeeting = async (meeting: Meeting, operation: 'create' | 'update' | 'delete'): Promise<string | null> => {
  const syncEnabled = await getCalendarSyncEnabled();
  if (!syncEnabled) {
    console.log('Calendar sync disabled, skipping instant push');
    return null;
  }

  if (meeting.sourceOfTruth === 'external' || meeting.externalEventId) {
    console.log('Skipping instant push for external meeting:', meeting.title);
    return null;
  }

  if (debouncedSyncTimer) {
    clearTimeout(debouncedSyncTimer);
  }

  return new Promise((resolve) => {
    debouncedSyncTimer = setTimeout(async () => {
      try {
        console.log(`⚡ Instant push: ${operation} meeting "${meeting.title}"`);
        
        if (operation === 'delete') {
          if (meeting.calendarEventId) {
            await Calendar.deleteEventAsync(meeting.calendarEventId);
            console.log('⚡ Deleted from calendar:', meeting.calendarEventId);
          }
          resolve(null);
        } else {
          const eventId = await CalendarSyncService.instantPushToCalendar(meeting);
          if (eventId) {
            console.log('⚡ Instant push complete. Event ID:', eventId);
          }
          resolve(eventId);
        }
        
      } catch (error) {
        console.error('Instant push error:', error);
        resolve(null);
      }
    }, DEBOUNCE_DELAY);
  });
};

export const triggerManualSync = async (): Promise<boolean> => {
  try {
    const syncEnabled = await getCalendarSyncEnabled();
    if (!syncEnabled) {
      console.log('Calendar sync disabled, skipping manual sync');
      return false;
    }
    
    console.log('⚡ Manual sync starting...');
    
    const { setSyncStatus } = useAppStore.getState();
    setSyncStatus({ 
      isSyncing: true, 
      lastSyncAt: null,
      lastSyncSuccess: false,
      error: null,
      importedCount: 0,
      updatedCount: 0,
      deletedCount: 0
    });
    
    const { imported, skipped } = await CalendarSyncService.instantPullFromCalendar();
    const { updated, deleted } = await CalendarSyncService.syncExternalChanges();
    
    const { setMeetings } = useAppStore.getState();
    const meetings = await getAllMeetings();
    setMeetings(meetings);
    
    setSyncStatus({
      isSyncing: false,
      lastSyncAt: new Date().toISOString(),
      lastSyncSuccess: true,
      error: null,
      importedCount: imported,
      updatedCount: updated,
      deletedCount: deleted
    });
    
    console.log(`⚡ Manual sync complete: ${imported} imported, ${updated} updated, ${deleted} deleted`);
    return true;
  } catch (error) {
    console.error('Manual sync error:', error);
    const { setSyncStatus } = useAppStore.getState();
    setSyncStatus({ 
      isSyncing: false,
      lastSyncAt: new Date().toISOString(),
      lastSyncSuccess: false,
      error: error instanceof Error ? error.message : 'Sync failed',
      importedCount: 0,
      updatedCount: 0,
      deletedCount: 0
    });
    return false;
  }
};
