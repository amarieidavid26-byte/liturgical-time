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
        externalEventId TEXT,
        calendarSource TEXT,
        lastSynced TEXT,
        sourceOfTruth TEXT,
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
      
      CREATE TABLE IF NOT EXISTS prayers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        time TEXT NOT NULL,
        reminderMinutes INTEGER DEFAULT 30,
        isDaily INTEGER DEFAULT 1,
        selectedDays TEXT,
        notificationId TEXT,
        lastCompleted TEXT,
        streak INTEGER DEFAULT 0,
        isEnabled INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
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
    
    try {
      await db.execAsync(`
        ALTER TABLE meetings ADD COLUMN externalEventId TEXT;
      `);
      console.log('Added externalEventId column to existing meetings table');
    } catch (alterError: any) {
      if (!alterError.message?.includes('duplicate column name')) {
        console.log('externalEventId column already exists');
      }
    }
    
    try {
      await db.execAsync(`
        ALTER TABLE meetings ADD COLUMN calendarSource TEXT;
      `);
      console.log('Added calendarSource column to existing meetings table');
    } catch (alterError: any) {
      if (!alterError.message?.includes('duplicate column name')) {
        console.log('calendarSource column already exists');
      }
    }
    
    try {
      await db.execAsync(`
        ALTER TABLE meetings ADD COLUMN lastSynced TEXT;
      `);
      console.log('Added lastSynced column to existing meetings table');
    } catch (alterError: any) {
      if (!alterError.message?.includes('duplicate column name')) {
        console.log('lastSynced column already exists');
      }
    }
    
    try {
      await db.execAsync(`
        ALTER TABLE meetings ADD COLUMN sourceOfTruth TEXT;
      `);
      console.log('Added sourceOfTruth column to existing meetings table');
    } catch (alterError: any) {
      if (!alterError.message?.includes('duplicate column name')) {
        console.log('sourceOfTruth column already exists');
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
      `INSERT INTO meetings (title, date, startTime, endTime, location, notes, calendarEventId, externalEventId, calendarSource, lastSynced, sourceOfTruth, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        meeting.title,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.location || null,
        meeting.notes || null,
        meeting.calendarEventId || null,
        meeting.externalEventId || null,
        meeting.calendarSource || null,
        meeting.lastSynced || null,
        meeting.sourceOfTruth || 'app',
      ]
    );
    
    const meetingId = result.lastInsertRowId;
    const createdMeeting = { ...meeting, id: meetingId };
    
    import('../calendar/instantSync').then(({ instantPushMeeting }) => {
      instantPushMeeting(createdMeeting, 'create').then((eventId) => {
        if (eventId && !meeting.externalEventId) {
          db?.runAsync(
            'UPDATE meetings SET calendarEventId = ?, lastSynced = datetime(\'now\') WHERE id = ?',
            [eventId, meetingId]
          );
        }
      });
    });
    
    return meetingId;
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
       SET title = ?, date = ?, startTime = ?, endTime = ?, location = ?, notes = ?, calendarEventId = ?, externalEventId = ?, calendarSource = ?, lastSynced = ?, sourceOfTruth = ?, updatedAt = datetime('now')
       WHERE id = ?`,
      [
        meeting.title,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.location || null,
        meeting.notes || null,
        meeting.calendarEventId || null,
        meeting.externalEventId || null,
        meeting.calendarSource || null,
        meeting.lastSynced || null,
        meeting.sourceOfTruth || 'app',
        meeting.id,
      ]
    );
    
    import('../calendar/instantSync').then(({ instantPushMeeting }) => {
      instantPushMeeting(meeting, 'update').then((eventId) => {
        if (eventId && !meeting.externalEventId && meeting.id) {
          db?.runAsync(
            'UPDATE meetings SET calendarEventId = ?, lastSynced = datetime(\'now\') WHERE id = ?',
            [eventId, meeting.id]
          );
        }
      });
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
};

export const deleteMeeting = async (id: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const meeting = await getMeetingById(id);
    
    await db.runAsync('DELETE FROM meetings WHERE id = ?', [id]);
    
    if (meeting) {
      import('../calendar/instantSync').then(({ instantPushMeeting }) => {
        instantPushMeeting(meeting, 'delete');
      });
    }
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

export interface Prayer {
  id?: number;
  name: string;
  time: string;
  reminderMinutes: number;
  isDaily: boolean;
  selectedDays: string;
  notificationId?: string | null;
  lastCompleted?: string | null;
  streak: number;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getAllPrayers = async (): Promise<Prayer[]> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getAllAsync<any>(
      'SELECT * FROM prayers ORDER BY time ASC'
    );
    return result.map(prayer => ({
      ...prayer,
      isDaily: prayer.isDaily === 1,
      isEnabled: prayer.isEnabled === 1,
    }));
  } catch (error) {
    console.error('Error getting prayers:', error);
    throw error;
  }
};

export const getPrayerById = async (id: number): Promise<Prayer | null> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM prayers WHERE id = ?',
      [id]
    );
    if (result) {
      return {
        ...result,
        isDaily: result.isDaily === 1,
        isEnabled: result.isEnabled === 1,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting prayer by id:', error);
    throw error;
  }
};

export const savePrayer = async (prayer: Prayer): Promise<number> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const result = await db.runAsync(
      `INSERT INTO prayers (name, time, reminderMinutes, isDaily, selectedDays, notificationId, lastCompleted, streak, isEnabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prayer.name,
        prayer.time,
        prayer.reminderMinutes,
        prayer.isDaily ? 1 : 0,
        prayer.selectedDays,
        prayer.notificationId || null,
        prayer.lastCompleted || null,
        prayer.streak || 0,
        prayer.isEnabled !== false ? 1 : 0,
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error saving prayer:', error);
    throw error;
  }
};

export const updatePrayer = async (prayer: Prayer): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  if (!prayer.id) throw new Error('Prayer ID is required for update');
  
  try {
    await db.runAsync(
      `UPDATE prayers 
       SET name = ?, time = ?, reminderMinutes = ?, isDaily = ?, selectedDays = ?, 
           notificationId = ?, lastCompleted = ?, streak = ?, isEnabled = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        prayer.name,
        prayer.time,
        prayer.reminderMinutes,
        prayer.isDaily ? 1 : 0,
        prayer.selectedDays,
        prayer.notificationId || null,
        prayer.lastCompleted || null,
        prayer.streak || 0,
        prayer.isEnabled !== false ? 1 : 0,
        prayer.id,
      ]
    );
  } catch (error) {
    console.error('Error updating prayer:', error);
    throw error;
  }
};

export const deletePrayer = async (id: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    await db.runAsync('DELETE FROM prayers WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error deleting prayer:', error);
    throw error;
  }
};

export const deleteAllPrayers = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    await db.runAsync('DELETE FROM prayers');
  } catch (error) {
    console.error('Error deleting all prayers:', error);
    throw error;
  }
};

export const markPrayerCompleted = async (id: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const prayer = await getPrayerById(id);
    if (!prayer) return;
    
    const newStreak = prayer.streak + 1;
    await db.runAsync(
      'UPDATE prayers SET lastCompleted = CURRENT_TIMESTAMP, streak = ? WHERE id = ?',
      [newStreak, id]
    );
  } catch (error) {
    console.error('Error marking prayer completed:', error);
    throw error;
  }
};
