import { parseISO, parse, isBefore, isAfter, isSameMinute } from 'date-fns';
import { Meeting, OrthodoxEvent, Conflict, ParishSettings } from '../types';
import { getOrthodoxEventsForDate, isSunday } from './orthodoxCalendar';

export const detectConflicts = (
  meeting: Meeting,
  parishSettings: ParishSettings | null
): Conflict | null => {
  if (!parishSettings) return null;

  const meetingDate = parseISO(meeting.date);
  const orthodoxEvents = getOrthodoxEventsForDate(meetingDate);
  
  for (const event of orthodoxEvents) {
    if (event.liturgyRequired) {
      const conflict = checkLiturgyConflict(meeting, event, parishSettings);
      if (conflict) return conflict;
    }
  }
  
  if (isSunday(meetingDate)) {
    const conflict = checkSundayConflict(meeting, parishSettings);
    if (conflict) return conflict;
  }
  
  return null;
};

const checkLiturgyConflict = (
  meeting: Meeting,
  event: OrthodoxEvent,
  parishSettings: ParishSettings
): Conflict | null => {
  const liturgyTime = event.level === 'great' || event.level === 'major'
    ? parishSettings.sundayLiturgyTime
    : parishSettings.weekdayLiturgyTime || parishSettings.sundayLiturgyTime;

  const meetingStartTime = parse(meeting.startTime, 'HH:mm', new Date());
  const meetingEndTime = parse(meeting.endTime, 'HH:mm', new Date());
  const liturgyStartTime = parse(liturgyTime, 'HH:mm', new Date());
  
  const liturgyDuration = event.level === 'great' || event.level === 'major' ? 120 : 90;
  const liturgyEndTime = new Date(liturgyStartTime.getTime() + liturgyDuration * 60000);

  const hasConflict =
    (isAfter(meetingStartTime, liturgyStartTime) || isSameMinute(meetingStartTime, liturgyStartTime)) &&
    isBefore(meetingStartTime, liturgyEndTime) ||
    (isAfter(meetingEndTime, liturgyStartTime) && 
    (isBefore(meetingEndTime, liturgyEndTime) || isSameMinute(meetingEndTime, liturgyEndTime))) ||
    (isBefore(meetingStartTime, liturgyStartTime) && isAfter(meetingEndTime, liturgyEndTime));

  if (hasConflict) {
    const severity = event.level === 'great' ? 'high' : event.level === 'major' ? 'medium' : 'low';
    const conflictType = event.level === 'great' 
      ? 'great_feast' 
      : event.level === 'major' 
      ? 'major_feast' 
      : 'weekday_liturgy';

    return {
      meeting,
      orthodoxEvent: event,
      conflictType,
      severity,
      message: `Meeting conflicts with ${event.nameEn || event.name} Divine Liturgy at ${liturgyTime}`,
    };
  }

  return null;
};

const checkSundayConflict = (
  meeting: Meeting,
  parishSettings: ParishSettings
): Conflict | null => {
  const meetingStartTime = parse(meeting.startTime, 'HH:mm', new Date());
  const meetingEndTime = parse(meeting.endTime, 'HH:mm', new Date());
  const liturgyStartTime = parse(parishSettings.sundayLiturgyTime, 'HH:mm', new Date());
  
  const liturgyEndTime = new Date(liturgyStartTime.getTime() + 120 * 60000);

  const hasConflict =
    (isAfter(meetingStartTime, liturgyStartTime) || isSameMinute(meetingStartTime, liturgyStartTime)) &&
    isBefore(meetingStartTime, liturgyEndTime) ||
    (isAfter(meetingEndTime, liturgyStartTime) && 
    (isBefore(meetingEndTime, liturgyEndTime) || isSameMinute(meetingEndTime, liturgyEndTime))) ||
    (isBefore(meetingStartTime, liturgyStartTime) && isAfter(meetingEndTime, liturgyEndTime));

  if (hasConflict) {
    return {
      meeting,
      orthodoxEvent: {
        name: 'Duminică',
        nameEn: 'Sunday',
        date: meeting.date,
        moveable: false,
        liturgyRequired: true,
        level: 'regular',
      },
      conflictType: 'sunday',
      severity: 'high',
      message: `Meeting conflicts with Sunday Divine Liturgy at ${parishSettings.sundayLiturgyTime}`,
    };
  }

  return null;
};

export const getAllConflicts = (
  meetings: Meeting[],
  parishSettings: ParishSettings | null
): Conflict[] => {
  if (!parishSettings) return [];

  const conflicts: Conflict[] = [];
  
  for (const meeting of meetings) {
    const conflict = detectConflicts(meeting, parishSettings);
    if (conflict) {
      conflicts.push(conflict);
    }
  }
  
  return conflicts;
};
