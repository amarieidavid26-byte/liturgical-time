// AsyncStorage utilities for parish settings and app preferences
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ParishSettings, ViewMode } from '../types';

const STORAGE_KEYS = {
  PARISH_SETTINGS: '@liturgical_time_parish_settings',
  VIEW_MODE: '@liturgical_time_view_mode',
  JULIAN_ENABLED: '@liturgical_time_julian_enabled',
  IS_ONBOARDED: '@liturgical_time_is_onboarded',
  CALENDAR_SYNC_ENABLED: '@liturgical_time_calendar_sync_enabled',
  APP_CALENDAR_ID: '@liturgical_time_app_calendar_id',
};

// Parish Settings Management
export const saveParishSettings = async (settings: ParishSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PARISH_SETTINGS, JSON.stringify(settings));
    console.log('Parish settings saved successfully');
  } catch (error) {
    console.error('Error saving parish settings:', error);
    throw error;
  }
};

export const getParishSettings = async (): Promise<ParishSettings | null> => {
  try {
    const settings = await AsyncStorage.getItem(STORAGE_KEYS.PARISH_SETTINGS);
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Error getting parish settings:', error);
    return null;
  }
};

export const clearParishSettings = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PARISH_SETTINGS);
    console.log('Parish settings cleared');
  } catch (error) {
    console.error('Error clearing parish settings:', error);
    throw error;
  }
};

// View Mode Preferences
export const saveViewMode = async (mode: ViewMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  } catch (error) {
    console.error('Error saving view mode:', error);
  }
};

export const getViewMode = async (): Promise<ViewMode> => {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return (mode as ViewMode) || 'month';
  } catch (error) {
    console.error('Error getting view mode:', error);
    return 'month';
  }
};

// Julian Calendar Toggle
export const saveJulianEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.JULIAN_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving Julian calendar preference:', error);
  }
};

export const getJulianEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.JULIAN_ENABLED);
    return enabled ? JSON.parse(enabled) : false;
  } catch (error) {
    console.error('Error getting Julian calendar preference:', error);
    return false;
  }
};

// Onboarding Status
export const setOnboarded = async (onboarded: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.IS_ONBOARDED, JSON.stringify(onboarded));
  } catch (error) {
    console.error('Error saving onboarding status:', error);
  }
};

export const isOnboarded = async (): Promise<boolean> => {
  try {
    const onboarded = await AsyncStorage.getItem(STORAGE_KEYS.IS_ONBOARDED);
    return onboarded ? JSON.parse(onboarded) : false;
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return false;
  }
};

// Calendar Sync
export const saveCalendarSyncEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CALENDAR_SYNC_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving calendar sync preference:', error);
  }
};

export const getCalendarSyncEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_SYNC_ENABLED);
    return enabled ? JSON.parse(enabled) : false;
  } catch (error) {
    console.error('Error getting calendar sync preference:', error);
    return false;
  }
};

export const saveAppCalendarId = async (calendarId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_CALENDAR_ID, calendarId);
  } catch (error) {
    console.error('Error saving app calendar ID:', error);
  }
};

export const getAppCalendarId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.APP_CALENDAR_ID);
  } catch (error) {
    console.error('Error getting app calendar ID:', error);
    return null;
  }
};

// Clear all app data (for reset functionality)
export const clearAllAppData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PARISH_SETTINGS,
      STORAGE_KEYS.VIEW_MODE,
      STORAGE_KEYS.JULIAN_ENABLED,
      STORAGE_KEYS.IS_ONBOARDED,
      STORAGE_KEYS.CALENDAR_SYNC_ENABLED,
      STORAGE_KEYS.APP_CALENDAR_ID,
    ]);
    console.log('All app data cleared');
  } catch (error) {
    console.error('Error clearing app data:', error);
    throw error;
  }
};

// Export default parish settings for initial setup
export const getDefaultParishSettings = (): ParishSettings => {
  return {
    parishName: '',
    sundayLiturgyTime: '09:00',
    saturdayVespersTime: undefined,
    weekdayLiturgyTime: undefined,
    julianCalendarEnabled: false,
  };
};
