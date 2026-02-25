// Conflict detection for meetings vs Orthodox events
import { parse, format } from 'date-fns';
import { Meeting, OrthodoxEvent, Conflict, ParishSettings } from '../types';
import { getOrthodoxEventsForDate, isSunday, getLiturgyTime } from './orthodoxCalendar';

// Check if two time ranges overlap
const timeRangesOverlap = (
  start1: string, 
  end1: string, 
  start2: string, 
  end2: string
): boolean => {
  // Convert time strings to minutes for easier comparison
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const start1Min = toMinutes(start1);
  const end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);
  const end2Min = toMinutes(end2);
  
  // Check for overlap
  return start1Min < end2Min && end1Min > start2Min;
};

// Calculate end time for liturgy (typically 2 hours for Sunday, 1.5 hours for weekday)
const calculateLiturgyEndTime = (startTime: string, isSundayLiturgy: boolean): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const durationMinutes = isSundayLiturgy ? 120 : 90; // 2 hours for Sunday, 1.5 for weekday
  
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

// Detect conflicts for a single meeting
export const detectMeetingConflicts = (
  meeting: Meeting,
  parishSettings: ParishSettings
): Conflict[] => {
  const conflicts: Conflict[] = [];
  const meetingDate = parse(meeting.date, 'yyyy-MM-dd', new Date());
  const orthodoxEvents = getOrthodoxEventsForDate(meetingDate);
  
  // Check for Sunday Liturgy conflict
  if (isSunday(meetingDate)) {
    const liturgyStart = parishSettings.sundayLiturgyTime;
    const liturgyEnd = calculateLiturgyEndTime(liturgyStart, true);
    
    if (timeRangesOverlap(meeting.startTime, meeting.endTime, liturgyStart, liturgyEnd)) {
      conflicts.push({
        meeting,
        orthodoxEvent: {
          name: 'Sfânta Liturghie Duminicală',
          nameEn: 'Sunday Divine Liturgy',
          date: meeting.date,
          moveable: false,
          liturgyRequired: true,
          level: 'major'
        },
        conflictType: 'sunday',
        severity: 'high',
        message: `⚠️ CONFLICT: This meeting overlaps with Sunday Divine Liturgy at ${parishSettings.parishName} (${liturgyStart} - ${liturgyEnd})`
      });
    }
  }
  
  // Check for feast day conflicts
  orthodoxEvents.forEach(event => {
    if (event.liturgyRequired) {
      const liturgyStart = parishSettings.sundayLiturgyTime; // Use Sunday time for major feasts
      const liturgyEnd = calculateLiturgyEndTime(liturgyStart, event.level === 'great');
      
      if (timeRangesOverlap(meeting.startTime, meeting.endTime, liturgyStart, liturgyEnd)) {
        let conflictType: 'great_feast' | 'major_feast' = 
          event.level === 'great' ? 'great_feast' : 'major_feast';
        let severity: 'high' | 'medium' = 
          event.level === 'great' ? 'high' : 'medium';
        
        conflicts.push({
          meeting,
          orthodoxEvent: event,
          conflictType,
          severity,
          message: `⚠️ CONFLICT: This meeting overlaps with ${event.name} Liturgy at ${parishSettings.parishName} (${liturgyStart} - ${liturgyEnd})`
        });
      }
    }
  });
  
  // Check for weekday liturgy conflicts (if configured)
  if (parishSettings.weekdayLiturgyTime && !isSunday(meetingDate)) {
    const dayOfWeek = meetingDate.getDay();
    // Check if it's a weekday (not Saturday)
    if (dayOfWeek !== 6) {
      const hasWeekdayLiturgy = orthodoxEvents.some(e => e.liturgyRequired);
      if (hasWeekdayLiturgy) {
        const liturgyStart = parishSettings.weekdayLiturgyTime;
        const liturgyEnd = calculateLiturgyEndTime(liturgyStart, false);
        
        if (timeRangesOverlap(meeting.startTime, meeting.endTime, liturgyStart, liturgyEnd)) {
          conflicts.push({
            meeting,
            orthodoxEvent: orthodoxEvents.find(e => e.liturgyRequired)!,
            conflictType: 'weekday_liturgy',
            severity: 'low',
            message: `⚠️ NOTICE: This meeting overlaps with weekday Liturgy at ${parishSettings.parishName} (${liturgyStart} - ${liturgyEnd})`
          });
        }
      }
    }
  }
  
  // Check for Saturday Vespers conflicts (if configured)
  if (parishSettings.saturdayVespersTime && meetingDate.getDay() === 6) {
    const vespersStart = parishSettings.saturdayVespersTime;
    const vespersEnd = calculateLiturgyEndTime(vespersStart, false);
    
    if (timeRangesOverlap(meeting.startTime, meeting.endTime, vespersStart, vespersEnd)) {
      conflicts.push({
        meeting,
        orthodoxEvent: {
          name: 'Vecernie',
          nameEn: 'Vespers',
          date: meeting.date,
          moveable: false,
          liturgyRequired: false,
          level: 'regular'
        },
        conflictType: 'weekday_liturgy',
        severity: 'low',
        message: `⚠️ NOTICE: This meeting overlaps with Saturday Vespers at ${parishSettings.parishName} (${vespersStart} - ${vespersEnd})`
      });
    }
  }
  
  return conflicts;
};

// Batch detect conflicts for multiple meetings
export const detectConflictsForMeetings = (
  meetings: Meeting[],
  parishSettings: ParishSettings
): Map<number, Conflict[]> => {
  const conflictMap = new Map<number, Conflict[]>();
  
  meetings.forEach(meeting => {
    if (meeting.id) {
      const conflicts = detectMeetingConflicts(meeting, parishSettings);
      if (conflicts.length > 0) {
        conflictMap.set(meeting.id, conflicts);
      }
    }
  });
  
  return conflictMap;
};

// Get conflict indicator color based on severity
export const getConflictColor = (severity: 'high' | 'medium' | 'low'): string => {
  switch (severity) {
    case 'high':
      return '#DC143C'; // Red
    case 'medium':
      return '#FF8C00'; // Orange
    case 'low':
      return '#FFD700'; // Yellow
    default:
      return '#808080'; // Gray
  }
};

// Format conflict message for display
export const formatConflictMessage = (conflict: Conflict): string => {
  const severityEmoji = {
    high: '🔴',
    medium: '🟠',
    low: '🟡'
  };
  
  return `${severityEmoji[conflict.severity]} ${conflict.message}`;
};

// Check if user should be strongly warned about a conflict
export const shouldShowStrongWarning = (conflicts: Conflict[]): boolean => {
  return conflicts.some(c => c.severity === 'high');
};

// Get summary of conflicts for a date
export const getConflictSummary = (
  date: string,
  meetings: Meeting[],
  parishSettings: ParishSettings
): { hasConflicts: boolean; highSeverity: boolean; count: number } => {
  const dateMeetings = meetings.filter(m => m.date === date);
  let totalConflicts = 0;
  let hasHighSeverity = false;
  
  dateMeetings.forEach(meeting => {
    const conflicts = detectMeetingConflicts(meeting, parishSettings);
    totalConflicts += conflicts.length;
    if (conflicts.some(c => c.severity === 'high')) {
      hasHighSeverity = true;
    }
  });
  
  return {
    hasConflicts: totalConflicts > 0,
    highSeverity: hasHighSeverity,
    count: totalConflicts
  };
};
