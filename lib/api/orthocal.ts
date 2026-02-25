// orthocal.info API integration with 24hr cache
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrthodoxEvent } from '../types';

const ORTHOCAL_BASE = 'https://orthocal.info/api/gregorian';
const CACHE_PREFIX = '@orthocal_cache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface OrthocalDay {
  year: number;
  month: number;
  day: number;
  weekday: number;
  tone: number;
  titles: string[];
  summary_title: string;
  feast_level: number;
  feast_level_description: string;
  feasts: string[] | null;
  fast_level: number;
  fast_level_desc: string;
  fast_exception: number;
  fast_exception_desc: string;
  saints: string[];
  service_notes: string[];
  readings: OrthocalReading[];
  stories: OrthocalStory[];
  pascha_distance: number;
}

export interface OrthocalReading {
  source: string;
  book: string;
  description: string;
  display: string;
  short_display: string;
  passage: Array<{
    book: string;
    chapter: number;
    verse: number;
    content: string;
    paragraph_start: boolean;
  }>;
}

export interface OrthocalStory {
  title: string;
  story: string;
}

// Cache key for a specific date
const getCacheKey = (year: number, month: number, day: number): string =>
  `${CACHE_PREFIX}${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// Read from cache if fresh
const readCache = async (key: string): Promise<OrthocalDay | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return data as OrthocalDay;
  } catch {
    return null;
  }
};

// Write to cache
const writeCache = async (key: string, data: OrthocalDay): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Silently fail cache writes
  }
};

// Fetch a single day from orthocal.info
export const fetchOrthocalDay = async (date: Date): Promise<OrthocalDay | null> => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Check cache first
  const cacheKey = getCacheKey(year, month, day);
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  // Fetch from API
  try {
    const url = `${ORTHOCAL_BASE}/${year}/${month}/${day}/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: OrthocalDay = await response.json();
    await writeCache(cacheKey, data);
    return data;
  } catch {
    // Network error — caller should fall back to static data
    return null;
  }
};

// Convert orthocal data to OrthodoxEvent for display
export const orthocalToEvents = (day: OrthocalDay): OrthodoxEvent[] => {
  const events: OrthodoxEvent[] = [];

  // Map feast_level to our level system
  // orthocal levels: 0=no service, 1=presanctified/simple, 2=six stichera, 3=full service, 4=vigil, 5=great feast
  const mapLevel = (level: number): 'great' | 'major' | 'minor' | 'regular' => {
    if (level >= 5) return 'great';
    if (level >= 3) return 'major';
    if (level >= 1) return 'minor';
    return 'regular';
  };

  // Add saints
  for (const saint of day.saints) {
    events.push({
      name: saint,
      date: `${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`,
      moveable: false,
      liturgyRequired: day.feast_level >= 3,
      level: mapLevel(day.feast_level),
    });
  }

  // If feasts exist, add them as separate events
  if (day.feasts) {
    for (const feast of day.feasts) {
      // Avoid duplicating if already in saints
      if (!day.saints.includes(feast)) {
        events.push({
          name: feast,
          date: `${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`,
          moveable: false,
          liturgyRequired: day.feast_level >= 3,
          level: mapLevel(day.feast_level),
        });
      }
    }
  }

  return events;
};

// Map orthocal fast_level to our fasting system
export const orthocalFastingLevel = (day: OrthocalDay): 'none' | 'regular' | 'strict' | 'lent' => {
  switch (day.fast_level) {
    case 0: return 'none'; // no fast
    case 1: return 'regular'; // fast day
    case 2: return 'lent'; // Lenten fast
    case 3: return 'strict'; // strict fast
    default: return day.fast_level > 0 ? 'regular' : 'none';
  }
};

// Get formatted scripture readings
export const getReadingsDisplay = (day: OrthocalDay): string[] => {
  return day.readings.map(r => `${r.source}: ${r.display}`);
};

// Get tone display
export const getToneDisplay = (day: OrthocalDay): string => {
  if (day.tone > 0) return `Glasul ${day.tone}`;
  return '';
};
