// Database initialization and operations for meetings
import * as SQLite from 'expo-sqlite';
import { Meeting } from '../types';

// Open or create the database
const db = SQLite.openDatabaseSync('liturgicaltime.db');

// Initialize the database tables
export const initDatabase = async (): Promise<void> => {
  try {
    // Create meetings table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate: add calendarEventId column if missing
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(meetings)`);
    const hasCalendarEventId = columns.some(col => col.name === 'calendarEventId');
    if (!hasCalendarEventId) {
      await db.execAsync(`ALTER TABLE meetings ADD COLUMN calendarEventId TEXT`);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Get all meetings
export const getAllMeetings = async (): Promise<Meeting[]> => {
  try {
    const result = await db.getAllAsync<Meeting>(
      'SELECT * FROM meetings ORDER BY date, startTime'
    );
    return result || [];
  } catch (error) {
    console.error('Error getting meetings:', error);
    return [];
  }
};

// Get meetings for a specific date
export const getMeetingsByDate = async (date: string): Promise<Meeting[]> => {
  try {
    const result = await db.getAllAsync<Meeting>(
      'SELECT * FROM meetings WHERE date = ? ORDER BY startTime',
      [date]
    );
    return result || [];
  } catch (error) {
    console.error('Error getting meetings by date:', error);
    return [];
  }
};

// Get meetings for a date range
export const getMeetingsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<Meeting[]> => {
  try {
    const result = await db.getAllAsync<Meeting>(
      'SELECT * FROM meetings WHERE date >= ? AND date <= ? ORDER BY date, startTime',
      [startDate, endDate]
    );
    return result || [];
  } catch (error) {
    console.error('Error getting meetings by date range:', error);
    return [];
  }
};

// Add a new meeting
export const addMeeting = async (meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
  try {
    const result = await db.runAsync(
      `INSERT INTO meetings (title, date, startTime, endTime, location, notes, calendarEventId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        meeting.title,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.location || null,
        meeting.notes || null,
        meeting.calendarEventId || null
      ]
    );
    
    console.log('Meeting added successfully:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding meeting:', error);
    throw error;
  }
};

// Update a meeting
export const updateMeeting = async (meeting: Meeting): Promise<void> => {
  try {
    await db.runAsync(
      `UPDATE meetings
       SET title = ?, date = ?, startTime = ?, endTime = ?,
           location = ?, notes = ?, calendarEventId = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        meeting.title,
        meeting.date,
        meeting.startTime,
        meeting.endTime,
        meeting.location || null,
        meeting.notes || null,
        meeting.calendarEventId || null,
        meeting.id
      ]
    );
    
    console.log('Meeting updated successfully');
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
};

// Delete a meeting
export const deleteMeeting = async (id: number): Promise<void> => {
  try {
    await db.runAsync('DELETE FROM meetings WHERE id = ?', [id]);
    console.log('Meeting deleted successfully');
  } catch (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
};

// Get a single meeting by ID
export const getMeetingById = async (id: number): Promise<Meeting | null> => {
  try {
    const result = await db.getFirstAsync<Meeting>(
      'SELECT * FROM meetings WHERE id = ?',
      [id]
    );
    return result || null;
  } catch (error) {
    console.error('Error getting meeting by ID:', error);
    return null;
  }
};

// Update only the calendarEventId for a meeting
export const updateMeetingCalendarEventId = async (meetingId: number, calendarEventId: string | null): Promise<void> => {
  try {
    await db.runAsync(
      `UPDATE meetings SET calendarEventId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [calendarEventId, meetingId]
    );
  } catch (error) {
    console.error('Error updating meeting calendarEventId:', error);
    throw error;
  }
};

// Clear all meetings (use with caution!)
export const clearAllMeetings = async (): Promise<void> => {
  try {
    await db.runAsync('DELETE FROM meetings');
    console.log('All meetings cleared');
  } catch (error) {
    console.error('Error clearing meetings:', error);
    throw error;
  }
};
