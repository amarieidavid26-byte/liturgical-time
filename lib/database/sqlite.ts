import * as SQLite from 'expo-sqlite';
import { Meeting } from '../types';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export const initDatabase = async (): Promise<void> => {
  if (isInitialized && db) {
    return;
  }
  
  try {
    db = await SQLite.openDatabaseAsync('orthodox_calendar.db');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        calendarEventId TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS parish_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        parishName TEXT NOT NULL,
        sundayLiturgyTime TEXT NOT NULL,
        saturdayVespersTime TEXT,
        weekdayLiturgyTime TEXT,
        julianCalendarEnabled INTEGER NOT NULL DEFAULT 0,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    try {
      await db.execAsync(`
        ALTER TABLE meetings ADD COLUMN calendarEventId TEXT;
      `);
      console.log('Added calendarEventId column to existing meetings table');
    } catch (alterError: any) {
      if (!alterError.message?.includes('duplicate column name')) {
        console.log('calendarEventId column already exists or other error:', alterError.message);
      }
    }
    
    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const getAllMeetings = async (): Promise<Meeting[]> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getAllAsync<Meeting>(
      'SELECT * FROM meetings ORDER BY date ASC, startTime ASC'
    );
    return result;
  } catch (error) {
    console.error('Error getting meetings:', error);
    throw error;
  }
};

export const getMeetingById = async (id: number): Promise<Meeting | null> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getFirstAsync<Meeting>(
      'SELECT * FROM meetings WHERE id = ?',
      [id]
    );
    return result || null;
  } catch (error) {
    console.error('Error getting meeting by id:', error);
    throw error;
  }
};

export const getMeetingsByDate = async (date: string): Promise<Meeting[]> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getAllAsync<Meeting>(
      'SELECT * FROM meetings WHERE date = ? ORDER BY startTime ASC',
      [date]
    );
    return result;
  } catch (error) {
    console.error('Error getting meetings by date:', error);
    throw error;
  }
};

export const createMeeting = async (meeting: Meeting): Promise<number> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.runAsync(
      `INSERT INTO meetings (title, date, startTime, endTime, location, notes, calendarEventId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        meeting.title,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.location || null,
        meeting.notes || null,
        meeting.calendarEventId || null,
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
};

export const updateMeeting = async (meeting: Meeting): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  if (!meeting.id) throw new Error('Meeting ID is required for update');
  
  try {
    await db.runAsync(
      `UPDATE meetings 
       SET title = ?, date = ?, startTime = ?, endTime = ?, location = ?, notes = ?, calendarEventId = ?, updatedAt = datetime('now')
       WHERE id = ?`,
      [
        meeting.title,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.location || null,
        meeting.notes || null,
        meeting.calendarEventId || null,
        meeting.id,
      ]
    );
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
};

export const deleteMeeting = async (id: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    await db.runAsync('DELETE FROM meetings WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
};

export const deleteAllMeetings = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    await db.runAsync('DELETE FROM meetings');
  } catch (error) {
    console.error('Error deleting all meetings:', error);
    throw error;
  }
};

export const saveParishSettingsDb = async (settings: any): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO parish_settings (id, parishName, sundayLiturgyTime, saturdayVespersTime, weekdayLiturgyTime, julianCalendarEnabled, updatedAt)
       VALUES (1, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        settings.parishName,
        settings.sundayLiturgyTime,
        settings.saturdayVespersTime || null,
        settings.weekdayLiturgyTime || null,
        settings.julianCalendarEnabled ? 1 : 0,
      ]
    );
  } catch (error) {
    console.error('Error saving parish settings to DB:', error);
    throw error;
  }
};

export const getParishSettingsDb = async (): Promise<any | null> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM parish_settings WHERE id = 1'
    );
    
    if (result) {
      return {
        parishName: result.parishName,
        sundayLiturgyTime: result.sundayLiturgyTime,
        saturdayVespersTime: result.saturdayVespersTime,
        weekdayLiturgyTime: result.weekdayLiturgyTime,
        julianCalendarEnabled: result.julianCalendarEnabled === 1,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting parish settings from DB:', error);
    return null;
  }
};

export const deleteParishSettingsDb = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    await db.runAsync('DELETE FROM parish_settings');
  } catch (error) {
    console.error('Error deleting parish settings:', error);
    throw error;
  }
};
