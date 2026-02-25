// Orthodox calendar utilities for date calculations and feast lookups
import { format, parse, addDays, subDays, isAfter, isBefore, isEqual, getDay } from 'date-fns';
import orthodoxData from '../../constants/data/orthodoxCalendar.json';
import { OrthodoxEvent, FastingPeriod } from '../types';

// Calculate Julian calendar date (13 days behind Gregorian)
export const getJulianDate = (gregorianDate: Date): Date => {
  return subDays(gregorianDate, 13);
};

// Convert Julian to Gregorian
export const gregorianToJulian = (gregorianDate: Date): string => {
  const julianDate = getJulianDate(gregorianDate);
  return format(julianDate, 'yyyy-MM-dd');
};

// Format date for display
export const formatJulianDisplay = (gregorianDate: Date): string => {
  const julianDate = getJulianDate(gregorianDate);
  const julianDay = format(julianDate, 'd');
  const julianMonth = format(julianDate, 'MMM');
  return `${julianDay} ${julianMonth} (Julian)`;
};

// Check if a date is a fasting day
export const isFastingDay = (date: Date): 'none' | 'regular' | 'strict' | 'lent' => {
  const dateString = format(date, 'yyyy-MM-dd');
  const monthDay = format(date, 'MM-dd');
  const dayOfWeek = getDay(date);
  
  // Check if it's in a fasting period
  const year = format(date, 'yyyy');
  
  // Check Great Lent
  const greatLentKey = `greatLent${year}` as keyof typeof orthodoxData.fastingPeriods;
  const greatLent = orthodoxData.fastingPeriods[greatLentKey];
  if (greatLent && isWithinPeriod(dateString, greatLent.start, greatLent.end)) {
    return 'lent';
  }
  
  // Check Apostles' Fast
  const apostlesFastKey = `apostlesFast${year}` as keyof typeof orthodoxData.fastingPeriods;
  const apostlesFast = orthodoxData.fastingPeriods[apostlesFastKey];
  if (apostlesFast && isWithinPeriod(dateString, apostlesFast.start, apostlesFast.end)) {
    return 'regular';
  }
  
  // Check Dormition Fast (fixed dates)
  if (isWithinMonthDayPeriod(monthDay, orthodoxData.fastingPeriods.dormitionFast.start, 
                              orthodoxData.fastingPeriods.dormitionFast.end)) {
    return 'regular';
  }
  
  // Check Nativity Fast (fixed dates)
  if (isWithinMonthDayPeriod(monthDay, orthodoxData.fastingPeriods.nativityFast.start, 
                              orthodoxData.fastingPeriods.nativityFast.end)) {
    return 'regular';
  }
  
  // Check for specific strict fasting days (Elevation of Cross, Beheading of St. John)
  const strictFastingDays = ['09-14', '08-29'];
  if (strictFastingDays.includes(monthDay)) {
    return 'strict';
  }
  
  // Check weekly fasting (Wednesday and Friday)
  // Sunday = 0, Wednesday = 3, Friday = 5
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    return 'regular';
  }
  
  return 'none';
};

// Check if date is within a period
const isWithinPeriod = (date: string, start: string, end: string): boolean => {
  const checkDate = parse(date, 'yyyy-MM-dd', new Date());
  const startDate = parse(start, 'yyyy-MM-dd', new Date());
  const endDate = parse(end, 'yyyy-MM-dd', new Date());
  
  return (isEqual(checkDate, startDate) || isAfter(checkDate, startDate)) &&
         (isEqual(checkDate, endDate) || isBefore(checkDate, endDate));
};

// Check if month-day is within a period (for fixed annual dates)
const isWithinMonthDayPeriod = (monthDay: string, start: string, end: string): boolean => {
  // Handle periods that cross year boundary (like Nativity Fast: Nov 15 - Dec 24)
  const [startMonth, startDay] = start.split('-').map(Number);
  const [endMonth, endDay] = end.split('-').map(Number);
  const [checkMonth, checkDay] = monthDay.split('-').map(Number);
  
  if (startMonth <= endMonth) {
    // Period within same year
    return (checkMonth > startMonth || (checkMonth === startMonth && checkDay >= startDay)) &&
           (checkMonth < endMonth || (checkMonth === endMonth && checkDay <= endDay));
  } else {
    // Period crosses year boundary
    return (checkMonth > startMonth || (checkMonth === startMonth && checkDay >= startDay)) ||
           (checkMonth < endMonth || (checkMonth === endMonth && checkDay <= endDay));
  }
};

// Get Orthodox events for a specific date
export const getOrthodoxEventsForDate = (date: Date): OrthodoxEvent[] => {
  const events: OrthodoxEvent[] = [];
  const monthDay = format(date, 'MM-dd');
  const dateString = format(date, 'yyyy-MM-dd');
  const year = format(date, 'yyyy');
  
  // Check great feasts
  orthodoxData.greatFeasts.forEach(feast => {
    if (feast.date === monthDay && !feast.moveable) {
      events.push(feast as OrthodoxEvent);
    }
  });
  
  // Check moveable feasts for the year
  const moveableFeastsKey = `moveableFeasts${year}` as keyof typeof orthodoxData;
  const moveableFeasts = orthodoxData[moveableFeastsKey];
  if (moveableFeasts) {
    Object.entries(moveableFeasts).forEach(([feastName, feastDate]) => {
      if (feastDate === dateString) {
        let level: 'great' | 'major' = 'major';
        if (feastName === 'pascha' || feastName === 'palmSunday' || 
            feastName === 'ascension' || feastName === 'pentecost') {
          level = 'great';
        }
        
        events.push({
          name: getFeastNameInRomanian(feastName),
          nameEn: getFeastNameInEnglish(feastName),
          date: feastDate,
          moveable: true,
          liturgyRequired: true,
          level: level
        });
      }
    });
  }
  
  // Check major feasts
  orthodoxData.majorFeasts.forEach(feast => {
    if (feast.date === monthDay) {
      events.push(feast as OrthodoxEvent);
    }
  });
  
  // Check popular Romanian saints
  orthodoxData.popularRomanianSaints.forEach(saint => {
    if (saint.date === monthDay) {
      events.push({
        name: saint.name,
        date: saint.date,
        moveable: false,
        liturgyRequired: saint.liturgy,
        level: 'minor' as const
      });
    }
  });
  
  return events;
};

// Helper function to get Romanian feast name
const getFeastNameInRomanian = (key: string): string => {
  const names: { [key: string]: string } = {
    pascha: 'Sfintele Paști',
    palmSunday: 'Floriile',
    ascension: 'Înălțarea Domnului',
    pentecost: 'Rusaliile',
    allSaints: 'Duminica Tuturor Sfinților'
  };
  return names[key] || key;
};

// Helper function to get English feast name
const getFeastNameInEnglish = (key: string): string => {
  const names: { [key: string]: string } = {
    pascha: 'Pascha (Easter)',
    palmSunday: 'Palm Sunday',
    ascension: 'Ascension',
    pentecost: 'Pentecost',
    allSaints: 'All Saints Sunday'
  };
  return names[key] || key;
};

// Check if date is Sunday
export const isSunday = (date: Date): boolean => {
  return getDay(date) === 0;
};

// Get liturgy time for a specific date based on parish settings
export const getLiturgyTime = (
  date: Date, 
  parishSettings: { 
    sundayLiturgyTime: string;
    weekdayLiturgyTime?: string;
  }
): string | null => {
  const events = getOrthodoxEventsForDate(date);
  const hasLiturgy = events.some(e => e.liturgyRequired);
  
  if (isSunday(date) || hasLiturgy) {
    return parishSettings.sundayLiturgyTime;
  }
  
  if (parishSettings.weekdayLiturgyTime) {
    // Check if it's a weekday with liturgy
    const dayOfWeek = getDay(date);
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      return parishSettings.weekdayLiturgyTime;
    }
  }
  
  return null;
};

// Get feast level color
export const getFeastColor = (level: string): string => {
  switch (level) {
    case 'great':
      return '#FFD700'; // Gold
    case 'major':
      return '#4169E1'; // Royal Blue
    case 'minor':
      return '#87CEEB'; // Sky Blue
    default:
      return '#808080'; // Gray
  }
};

// Get fasting color
export const getFastingColor = (fastingType: string): string => {
  switch (fastingType) {
    case 'lent':
      return '#800020'; // Burgundy
    case 'strict':
      return '#8B0000'; // Dark Red
    case 'regular':
      return '#CD853F'; // Peru
    default:
      return 'transparent';
  }
};
