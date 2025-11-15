import { format, subDays, isAfter, isBefore, isSameDay, parseISO, differenceInDays, addDays } from 'date-fns';
import { OrthodoxEvent } from '../types';
import orthodoxData from '../../constants/data/orthodoxCalendar.json';

export const getJulianDate = (gregorianDate: Date): Date => {
  return subDays(gregorianDate, 13);
};

export const formatJulianDate = (gregorianDate: Date): string => {
  const julianDate = getJulianDate(gregorianDate);
  return format(julianDate, 'MMM d, yyyy');
};

export const getOrthodoxEventsForDate = (date: Date): OrthodoxEvent[] => {
  const events: OrthodoxEvent[] = [];
  const dateStr = format(date, 'MM-dd');
  const fullDateStr = format(date, 'yyyy-MM-dd');
  const year = date.getFullYear();
  
  orthodoxData.greatFeasts.forEach((feast) => {
    if (feast.date === dateStr) {
      events.push({
        ...feast,
        date: fullDateStr,
        moveable: false,
        level: feast.level as 'great' | 'major' | 'minor' | 'regular',
        fasting: feast.fasting as 'none' | 'regular' | 'strict' | 'lent' | undefined,
      } as OrthodoxEvent);
    }
  });
  
  orthodoxData.majorFeasts.forEach((feast) => {
    if (feast.date === dateStr) {
      events.push({
        ...feast,
        date: fullDateStr,
        moveable: false,
        level: feast.level as 'great' | 'major' | 'minor' | 'regular',
      } as OrthodoxEvent);
    }
  });
  
  const moveableFeasts = 
    year === 2024 ? orthodoxData.moveableFeasts2024 :
    year === 2025 ? orthodoxData.moveableFeasts2025 :
    year === 2026 ? (orthodoxData as any).moveableFeasts2026 :
    year === 2027 ? (orthodoxData as any).moveableFeasts2027 :
    year === 2028 ? (orthodoxData as any).moveableFeasts2028 :
    null;
  
  if (moveableFeasts) {
    if (fullDateStr === moveableFeasts.pascha) {
      events.push({
        name: 'Paștele (Înviere)',
        nameEn: 'Pascha (Resurrection)',
        date: fullDateStr,
        moveable: true,
        liturgyRequired: true,
        level: 'great',
      });
    }
    if (fullDateStr === moveableFeasts.palmSunday) {
      events.push({
        name: 'Duminica Floriilor',
        nameEn: 'Palm Sunday',
        date: fullDateStr,
        moveable: true,
        liturgyRequired: true,
        level: 'great',
      });
    }
    if (fullDateStr === moveableFeasts.ascension) {
      events.push({
        name: 'Înălțarea Domnului',
        nameEn: 'Ascension',
        date: fullDateStr,
        moveable: true,
        liturgyRequired: true,
        level: 'great',
      });
    }
    if (fullDateStr === moveableFeasts.pentecost) {
      events.push({
        name: 'Rusaliile (Pogorârea Sfântului Duh)',
        nameEn: 'Pentecost',
        date: fullDateStr,
        moveable: true,
        liturgyRequired: true,
        level: 'great',
      });
    }
    if (fullDateStr === moveableFeasts.allSaints) {
      events.push({
        name: 'Duminica Tuturor Sfinților',
        nameEn: 'All Saints Sunday',
        date: fullDateStr,
        moveable: true,
        liturgyRequired: true,
        level: 'major',
      });
    }
  }
  
  return events;
};

export const isSunday = (date: Date): boolean => {
  return date.getDay() === 0;
};

export const isFastingDay = (date: Date): 'none' | 'regular' | 'strict' | 'lent' => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const monthDay = format(date, 'MM-dd');
  const dayOfWeek = date.getDay();
  
  const year = date.getFullYear();
  const greatLent = 
    year === 2024 ? orthodoxData.fastingPeriods.greatLent2024 :
    year === 2025 ? orthodoxData.fastingPeriods.greatLent2025 :
    year === 2026 ? (orthodoxData.fastingPeriods as any).greatLent2026 :
    year === 2027 ? (orthodoxData.fastingPeriods as any).greatLent2027 :
    year === 2028 ? (orthodoxData.fastingPeriods as any).greatLent2028 :
    null;
  
  if (greatLent) {
    const startDate = parseISO(greatLent.start);
    const endDate = parseISO(greatLent.end);
    if ((isSameDay(date, startDate) || isAfter(date, startDate)) && 
        (isSameDay(date, endDate) || isBefore(date, endDate))) {
      return 'lent';
    }
  }
  
  const dormitionStart = new Date(date.getFullYear(), 7, 1);
  const dormitionEnd = new Date(date.getFullYear(), 7, 14);
  if ((isSameDay(date, dormitionStart) || isAfter(date, dormitionStart)) && 
      (isSameDay(date, dormitionEnd) || isBefore(date, dormitionEnd))) {
    return 'regular';
  }
  
  const nativityStart = new Date(date.getFullYear(), 10, 15);
  const nativityEnd = new Date(date.getFullYear(), 11, 24);
  if ((isSameDay(date, nativityStart) || isAfter(date, nativityStart)) && 
      (isSameDay(date, nativityEnd) || isBefore(date, nativityEnd))) {
    return 'regular';
  }
  
  if (monthDay === '09-14') {
    return 'strict';
  }
  
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    return 'regular';
  }
  
  return 'none';
};

export const getAllOrthodoxEvents = (): OrthodoxEvent[] => {
  const events: OrthodoxEvent[] = [];
  const currentYear = new Date().getFullYear();
  
  orthodoxData.greatFeasts.forEach((feast) => {
    events.push({
      ...feast,
      date: `${currentYear}-${feast.date}`,
      moveable: false,
      level: feast.level as 'great' | 'major' | 'minor' | 'regular',
      fasting: feast.fasting as 'none' | 'regular' | 'strict' | 'lent' | undefined,
    } as OrthodoxEvent);
  });
  
  orthodoxData.majorFeasts.forEach((feast) => {
    events.push({
      ...feast,
      date: `${currentYear}-${feast.date}`,
      moveable: false,
      level: feast.level as 'great' | 'major' | 'minor' | 'regular',
    } as OrthodoxEvent);
  });
  
  const moveableFeasts = 
    currentYear === 2024 ? orthodoxData.moveableFeasts2024 :
    currentYear === 2025 ? orthodoxData.moveableFeasts2025 :
    currentYear === 2026 ? (orthodoxData as any).moveableFeasts2026 :
    currentYear === 2027 ? (orthodoxData as any).moveableFeasts2027 :
    currentYear === 2028 ? (orthodoxData as any).moveableFeasts2028 :
    null;
  
  if (moveableFeasts) {
    events.push({
      name: 'Paștele (Înviere)',
      nameEn: 'Pascha (Resurrection)',
      date: moveableFeasts.pascha,
      moveable: true,
      liturgyRequired: true,
      level: 'great',
    });
    events.push({
      name: 'Duminica Floriilor',
      nameEn: 'Palm Sunday',
      date: moveableFeasts.palmSunday,
      moveable: true,
      liturgyRequired: true,
      level: 'great',
    });
    events.push({
      name: 'Înălțarea Domnului',
      nameEn: 'Ascension',
      date: moveableFeasts.ascension,
      moveable: true,
      liturgyRequired: true,
      level: 'great',
    });
    events.push({
      name: 'Rusaliile (Pogorârea Sfântului Duh)',
      nameEn: 'Pentecost',
      date: moveableFeasts.pentecost,
      moveable: true,
      liturgyRequired: true,
      level: 'great',
    });
    events.push({
      name: 'Duminica Tuturor Sfinților',
      nameEn: 'All Saints Sunday',
      date: moveableFeasts.allSaints,
      moveable: true,
      liturgyRequired: true,
      level: 'major',
    });
  }
  
  return events.sort((a, b) => {
    const dateA = parseISO(a.date);
    const dateB = parseISO(b.date);
    return dateA.getTime() - dateB.getTime();
  });
};

export const getCurrentLiturgicalPeriod = (date: Date): string => {
  const monthDay = format(date, 'MM-dd');
  const year = date.getFullYear();
  
  const easterDates: { [key: number]: Date } = {
    2024: new Date('2024-05-05'),
    2025: new Date('2025-04-20'),
    2026: new Date('2026-04-12'),
    2027: new Date('2027-05-02'),
    2028: new Date('2028-04-16'),
    2029: new Date('2029-04-08'),
    2030: new Date('2030-04-28'),
  };
  
  const currentPascha = easterDates[year];
  if (!currentPascha) {
    return '📖 Perioada de peste An';
  }
  
  const daysFromPascha = differenceInDays(date, currentPascha);
  
  if (daysFromPascha >= 0 && daysFromPascha <= 7) {
    return '🌟 Săptămâna Luminată';
  }
  if (daysFromPascha > 7 && daysFromPascha <= 49) {
    return `⭐ Perioada Paștilor - Săptămâna ${Math.floor(daysFromPascha / 7) + 1}`;
  }
  
  if ((monthDay >= '11-15' && monthDay <= '11-30') || 
      (monthDay >= '12-01' && monthDay <= '12-24')) {
    return '🕯️ Postul Crăciunului (Postul Sfintei Filoftei)';
  }
  
  if ((monthDay >= '12-25' && monthDay <= '12-31') || 
      (monthDay >= '01-01' && monthDay <= '01-06')) {
    return '⭐ Perioada Crăciunului';
  }
  
  const greatLentStart = subDays(currentPascha, 48);
  if (date >= greatLentStart && date < currentPascha) {
    const week = Math.floor(differenceInDays(date, greatLentStart) / 7) + 1;
    return `📿 Postul Mare - Săptămâna ${week}`;
  }
  
  const pentecost = addDays(currentPascha, 49);
  const peterPaul = new Date(year + '-06-29');
  if (date > pentecost && date < peterPaul) {
    return '🔑 Postul Sfinților Apostoli';
  }
  
  if (monthDay >= '08-01' && monthDay <= '08-14') {
    return '🌸 Postul Adormirii Maicii Domnului';
  }
  
  return '📖 Perioada de peste An';
};

export const getCurrentTone = (date: Date): number => {
  const year = date.getFullYear();
  
  const easterDates: { [key: number]: Date } = {
    2024: new Date('2024-05-05'),
    2025: new Date('2025-04-20'),
    2026: new Date('2026-04-12'),
    2027: new Date('2027-05-02'),
    2028: new Date('2028-04-16'),
    2029: new Date('2029-04-08'),
    2030: new Date('2030-04-28'),
  };
  
  const pascha = easterDates[year];
  if (!pascha) {
    return 1;
  }
  
  const weeksSincePascha = Math.floor(differenceInDays(date, pascha) / 7);
  
  return ((weeksSincePascha % 8) + 8) % 8 + 1;
};
