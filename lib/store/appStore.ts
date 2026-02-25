// Zustand store for global app state management
import { create } from 'zustand';
import { Meeting, ParishSettings, ViewMode } from '../types';
import { format } from 'date-fns';

interface AppStore {
  // State
  parishSettings: ParishSettings | null;
  meetings: Meeting[];
  selectedDate: string;
  viewMode: ViewMode;
  julianCalendarEnabled: boolean;
  calendarSyncEnabled: boolean;
  isOnboarded: boolean;
  isLoading: boolean;

  // Actions
  setParishSettings: (settings: ParishSettings | null) => void;
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meeting: Meeting) => void;
  removeMeeting: (id: number) => void;
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleJulianCalendar: () => void;
  setJulianCalendarEnabled: (enabled: boolean) => void;
  setCalendarSyncEnabled: (enabled: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  parishSettings: null,
  meetings: [],
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  viewMode: 'month' as ViewMode,
  julianCalendarEnabled: false,
  calendarSyncEnabled: false,
  isOnboarded: false,
  isLoading: true,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,
  
  setParishSettings: (settings) => set({ parishSettings: settings }),
  
  setMeetings: (meetings) => set({ meetings }),
  
  addMeeting: (meeting) => set((state) => ({
    meetings: [...state.meetings, meeting].sort((a, b) => {
      if (a.date === b.date) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.date.localeCompare(b.date);
    })
  })),
  
  updateMeeting: (meeting) => set((state) => ({
    meetings: state.meetings.map(m => 
      m.id === meeting.id ? meeting : m
    ).sort((a, b) => {
      if (a.date === b.date) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.date.localeCompare(b.date);
    })
  })),
  
  removeMeeting: (id) => set((state) => ({
    meetings: state.meetings.filter(m => m.id !== id)
  })),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  toggleJulianCalendar: () => set((state) => ({
    julianCalendarEnabled: !state.julianCalendarEnabled
  })),
  
  setJulianCalendarEnabled: (enabled) => set({ julianCalendarEnabled: enabled }),

  setCalendarSyncEnabled: (enabled) => set({ calendarSyncEnabled: enabled }),

  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  reset: () => set(initialState),
}));
