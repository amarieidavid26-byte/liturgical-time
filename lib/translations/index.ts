export const translations = {
  en: {
    // Tabs
    calendar: 'Calendar',
    meetings: 'Meetings',
    orthodox: 'Orthodox',
    settings: 'Settings',
    
    // Meetings
    noMeetings: 'No meetings scheduled',
    addMeeting: 'Add Meeting',
    addFirstMeeting: 'Tap + to add your first meeting',
    deleteMeeting: 'Delete Meeting',
    confirmDelete: 'Are you sure you want to delete',
    upcoming: 'Upcoming',
    past: 'Past',
    
    // Form
    title: 'Title',
    date: 'Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    location: 'Location',
    notes: 'Notes',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    
    // Conflicts
    conflictDetected: 'Conflict Detected',
    scheduleAnyway: 'Schedule Anyway',
    conflictWarning: 'This meeting conflicts with church services',
    
    // Calendar
    orthodoxCalendar: 'Orthodox Calendar',
    julianCalendar: 'Julian',
    noEventsOrMeetings: 'No events or meetings on this day',
    orthodoxEvents: 'Orthodox Events',
    divineLiturgyRequired: 'Divine Liturgy Required',
    
    // Settings
    parishSettings: 'Parish Settings',
    parishName: 'Parish Name',
    sundayLiturgyTime: 'Sunday Liturgy Time',
    feastDayLiturgyTime: 'Feast Day Liturgy Time',
    useJulianCalendar: 'Use Julian Calendar',
    language: 'Language',
    english: 'English',
    romanian: 'Romanian',
    
    // Orthodox
    todaysOrthodoxCalendar: "Today's Orthodox Calendar",
    upcomingFeasts: 'Upcoming Feasts',
    feastDay: 'Feast Day',
    saintsCommemorated: 'Saints Commemorated',
    dailyReadings: 'Daily Readings',
    epistle: 'Epistle',
    gospel: 'Gospel',
    fasting: 'Fasting',
    tone: 'Tone',
    greatFeast: 'Great Feast',
    major: 'Major',
    all: 'All',
    greatFeasts: 'Great Feasts',
    thisWeek: 'This Week',
    nextMonth: 'Next Month',
  },
  ro: {
    // Tabs
    calendar: 'Calendar',
    meetings: 'Întâlniri',
    orthodox: 'Ortodox',
    settings: 'Setări',
    
    // Meetings
    noMeetings: 'Nicio întâlnire programată',
    addMeeting: 'Adaugă Întâlnire',
    addFirstMeeting: 'Apasă + pentru a adăuga prima întâlnire',
    deleteMeeting: 'Șterge Întâlnirea',
    confirmDelete: 'Sigur doriți să ștergeți',
    upcoming: 'Viitoare',
    past: 'Trecute',
    
    // Form
    title: 'Titlu',
    date: 'Data',
    startTime: 'Ora Început',
    endTime: 'Ora Sfârșit',
    location: 'Locație',
    notes: 'Notițe',
    save: 'Salvează',
    cancel: 'Anulează',
    delete: 'Șterge',
    
    // Conflicts
    conflictDetected: 'Conflict Detectat',
    scheduleAnyway: 'Programează Oricum',
    conflictWarning: 'Această întâlnire intră în conflict cu serviciile religioase',
    
    // Calendar
    orthodoxCalendar: 'Calendar Ortodox',
    julianCalendar: 'Julian',
    noEventsOrMeetings: 'Niciun eveniment sau întâlnire în această zi',
    orthodoxEvents: 'Evenimente Ortodoxe',
    divineLiturgyRequired: 'Sfânta Liturghie Obligatorie',
    
    // Settings
    parishSettings: 'Setări Parohie',
    parishName: 'Numele Parohiei',
    sundayLiturgyTime: 'Ora Liturghiei Duminicale',
    feastDayLiturgyTime: 'Ora Liturghiei de Sărbătoare',
    useJulianCalendar: 'Folosește Calendarul Iulian',
    language: 'Limbă',
    english: 'Engleză',
    romanian: 'Română',
    
    // Orthodox
    todaysOrthodoxCalendar: 'Calendarul Ortodox de Azi',
    upcomingFeasts: 'Sărbători Viitoare',
    feastDay: 'Sărbătoare',
    saintsCommemorated: 'Sfinți Prăznuiți',
    dailyReadings: 'Citirile Zilei',
    epistle: 'Apostol',
    gospel: 'Evanghelie',
    fasting: 'Post',
    tone: 'Glasul',
    greatFeast: 'Mare Sărbătoare',
    major: 'Major',
    all: 'Toate',
    greatFeasts: 'Mari Sărbători',
    thisWeek: 'Săptămâna Aceasta',
    nextMonth: 'Luna Viitoare',
  }
};

export type Language = keyof typeof translations;
export type TranslationKeys = keyof typeof translations.en;
