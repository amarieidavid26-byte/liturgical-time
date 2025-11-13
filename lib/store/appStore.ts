import { create } from 'zustand';
import { Meeting, ParishSettings, ViewMode } from '../types';

interface AppStore {
  parishSettings: ParishSettings | null;
  meetings: Meeting[];
  selectedDate: string;
  viewMode: ViewMode;
  julianCalendarEnabled: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  language: 'en' | 'ro';
  
  setParishSettings: (settings: ParishSettings | null) => void;
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meeting: Meeting) => void;
  removeMeeting: (id: number) => void;
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleJulianCalendar: () => void;
  setOnboarded: (onboarded: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setLanguage: (lang: 'en' | 'ro') => void;
  reset: () => void;
}

const useAppStore = create<AppStore>((set) => ({
  parishSettings: null,
  meetings: [],
  selectedDate: new Date().toISOString().split('T')[0],
  viewMode: 'month',
  julianCalendarEnabled: false,
  isOnboarded: false,
  isLoading: true,
  language: 'ro',
  
  setParishSettings: (settings) => set({ parishSettings: settings }),
  
  setMeetings: (meetings) => set({ meetings }),
  
  addMeeting: (meeting) => set((state) => ({
    meetings: [...state.meetings, meeting],
  })),
  
  updateMeeting: (meeting) => set((state) => ({
    meetings: state.meetings.map((m) => m.id === meeting.id ? meeting : m),
  })),
  
  removeMeeting: (id) => set((state) => ({
    meetings: state.meetings.filter((m) => m.id !== id),
  })),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  toggleJulianCalendar: () => set((state) => ({
    julianCalendarEnabled: !state.julianCalendarEnabled,
  })),
  
  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setLanguage: (lang) => set({ language: lang }),
  
  reset: () => set({
    parishSettings: null,
    meetings: [],
    selectedDate: new Date().toISOString().split('T')[0],
    viewMode: 'month',
    julianCalendarEnabled: false,
    isOnboarded: false,
    isLoading: false,
    language: 'ro',
  }),
}));

export default useAppStore;
