import { Meeting } from '../types';
import { format } from 'date-fns';

export interface SyncConflictInfo {
  meeting: Meeting;
  externalEvent: any;
  conflictType: 'time' | 'title' | 'location' | 'multiple';
  appModified: Date;
  externalModified: Date;
  fields: string[];
}

export const detectSyncConflict = (
  meeting: Meeting,
  externalEvent: any
): SyncConflictInfo | null => {
  if (!meeting.externalEventId || meeting.externalEventId !== externalEvent.id) {
    return null;
  }

  if (!meeting.lastSynced) {
    return null;
  }

  const lastSyncTime = new Date(meeting.lastSynced).getTime();
  const appUpdatedTime = meeting.updatedAt ? new Date(meeting.updatedAt).getTime() : 0;
  const externalModifiedTime = externalEvent.lastModifiedDate 
    ? new Date(externalEvent.lastModifiedDate).getTime() 
    : externalEvent.creationDate 
    ? new Date(externalEvent.creationDate).getTime() 
    : 0;

  const appModifiedSinceSync = appUpdatedTime > lastSyncTime;
  const externalModifiedSinceSync = externalModifiedTime > lastSyncTime;

  if (!appModifiedSinceSync || !externalModifiedSinceSync) {
    return null;
  }

  const eventDate = format(new Date(externalEvent.startDate), 'yyyy-MM-dd');
  const eventStartTime = format(new Date(externalEvent.startDate), 'HH:mm');
  const eventEndTime = format(new Date(externalEvent.endDate), 'HH:mm');

  const conflicts: string[] = [];
  
  if (eventDate !== meeting.date || eventStartTime !== meeting.startTime || eventEndTime !== meeting.endTime) {
    conflicts.push('time');
  }
  
  if (externalEvent.title !== meeting.title) {
    conflicts.push('title');
  }
  
  if ((externalEvent.location || '') !== (meeting.location || '')) {
    conflicts.push('location');
  }

  if (conflicts.length === 0) {
    return null;
  }

  const conflictType = conflicts.length > 1 ? 'multiple' : conflicts[0] as 'time' | 'title' | 'location';

  return {
    meeting,
    externalEvent,
    conflictType,
    appModified: new Date(appUpdatedTime),
    externalModified: new Date(externalModifiedTime),
    fields: conflicts,
  };
};

export const resolveConflictWithLatestWins = (
  conflict: SyncConflictInfo
): { useExternal: boolean; winner: 'app' | 'external' } => {
  const appTime = conflict.appModified.getTime();
  const externalTime = conflict.externalModified.getTime();

  if (externalTime > appTime) {
    return { useExternal: true, winner: 'external' };
  } else {
    return { useExternal: false, winner: 'app' };
  }
};

export const applyExternalChanges = (
  meeting: Meeting,
  externalEvent: any
): Meeting => {
  const eventDate = format(new Date(externalEvent.startDate), 'yyyy-MM-dd');
  const eventStartTime = format(new Date(externalEvent.startDate), 'HH:mm');
  const eventEndTime = format(new Date(externalEvent.endDate), 'HH:mm');

  return {
    ...meeting,
    title: externalEvent.title,
    date: eventDate,
    startTime: eventStartTime,
    endTime: eventEndTime,
    location: externalEvent.location || meeting.location,
    notes: externalEvent.notes || meeting.notes,
    lastSynced: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceOfTruth: 'external',
  };
};

export const formatConflictMessage = (conflict: SyncConflictInfo): string => {
  const { fields, appModified, externalModified } = conflict;
  
  const appTime = format(appModified, 'HH:mm');
  const externalTime = format(externalModified, 'HH:mm');
  
  if (fields.length === 1) {
    return `Conflict detected: ${fields[0]} changed in both app (${appTime}) and calendar (${externalTime})`;
  }
  
  return `Multiple conflicts: ${fields.join(', ')} changed in both locations`;
};
