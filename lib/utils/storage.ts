import AsyncStorage from '@react-native-async-storage/async-storage';
import { ParishSettings } from '../types';

const KEYS = {
  PARISH_SETTINGS: '@orthodox_calendar:parish_settings',
  ONBOARDING_COMPLETED: '@orthodox_calendar:onboarding_completed',
  JULIAN_CALENDAR_ENABLED: '@orthodox_calendar:julian_calendar_enabled',
};

export const saveParishSettings = async (settings: ParishSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.PARISH_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving parish settings:', error);
    throw error;
  }
};

export const getParishSettings = async (): Promise<ParishSettings | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PARISH_SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting parish settings:', error);
    return null;
  }
};

export const setOnboardingCompleted = async (completed: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETED, JSON.stringify(completed));
  } catch (error) {
    console.error('Error setting onboarding status:', error);
    throw error;
  }
};

export const getOnboardingCompleted = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETED);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return false;
  }
};

export const setJulianCalendarEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.JULIAN_CALENDAR_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error setting Julian calendar status:', error);
    throw error;
  }
};

export const getJulianCalendarEnabled = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.JULIAN_CALENDAR_ENABLED);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error('Error getting Julian calendar status:', error);
    return false;
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.PARISH_SETTINGS,
      KEYS.ONBOARDING_COMPLETED,
      KEYS.JULIAN_CALENDAR_ENABLED,
    ]);
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};
