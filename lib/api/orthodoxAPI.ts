import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { getOrthodoxEventsForDate } from '../calendar/orthodoxCalendar';

const ORTHOCAL_API = 'https://orthocal.info/api';
const CACHE_PREFIX = '@orthodox_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export type Jurisdiction = 'oca' | 'rocor' | 'greek' | 'romanian';

export interface OrthodoxAPIResponse {
  saints: string[];
  readings: {
    epistle?: string;
    gospel?: string;
  };
  fasting: string;
  feast?: string;
  tone?: number;
  date: string;
}

interface CachedData {
  data: OrthodoxAPIResponse;
  timestamp: number;
}

const getLocalOrthodoxData = (date: string): OrthodoxAPIResponse => {
  const dateObj = new Date(date);
  const events = getOrthodoxEventsForDate(dateObj);
  
  return {
    saints: events.map(e => e.nameEn || e.name),
    readings: {},
    fasting: events.find(e => e.fasting)?.fasting || 'none',
    feast: events.find(e => e.level === 'great' || e.level === 'major')?.nameEn,
    tone: undefined,
    date: date,
  };
};

const getCacheKey = (date: string, jurisdiction: Jurisdiction): string => {
  return `${CACHE_PREFIX}${jurisdiction}_${date}`;
};

const getCachedData = async (date: string, jurisdiction: Jurisdiction): Promise<OrthodoxAPIResponse | null> => {
  try {
    const cacheKey = getCacheKey(date, jurisdiction);
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp }: CachedData = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to read from cache:', error);
  }
  
  return null;
};

const setCachedData = async (date: string, jurisdiction: Jurisdiction, data: OrthodoxAPIResponse): Promise<void> => {
  try {
    const cacheKey = getCacheKey(date, jurisdiction);
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to write to cache:', error);
  }
};

export const fetchOrthodoxData = async (
  date: string,
  jurisdiction: Jurisdiction = 'romanian'
): Promise<OrthodoxAPIResponse> => {
  const cachedData = await getCachedData(date, jurisdiction);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch(`${ORTHOCAL_API}/daily?date=${date}&jurisdiction=${jurisdiction}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const apiData = await response.json();
    
    const data: OrthodoxAPIResponse = {
      saints: apiData.saints || [],
      readings: {
        epistle: apiData.readings?.epistle || apiData.epistle,
        gospel: apiData.readings?.gospel || apiData.gospel,
      },
      fasting: apiData.fast_level || apiData.fasting || 'none',
      feast: apiData.feast,
      tone: apiData.tone,
      date: date,
    };
    
    await setCachedData(date, jurisdiction, data);
    return data;
  } catch (error) {
    console.warn('Failed to fetch from Orthodox Calendar API, using local data:', error);
    const fallbackData = getLocalOrthodoxData(date);
    await setCachedData(date, jurisdiction, fallbackData);
    return fallbackData;
  }
};

export const fetchOrthodoxDataForDateRange = async (
  startDate: Date,
  endDate: Date,
  jurisdiction: Jurisdiction = 'romanian'
): Promise<Map<string, OrthodoxAPIResponse>> => {
  const results = new Map<string, OrthodoxAPIResponse>();
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const data = await fetchOrthodoxData(dateStr, jurisdiction);
    results.set(dateStr, data);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return results;
};

export const clearOrthodoxCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};
