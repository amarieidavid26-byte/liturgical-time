# Orthodox Business Calendar Mobile App

## Overview

A React Native + Expo mobile application for Romanian Orthodox entrepreneurs. Its primary purpose is to help users avoid scheduling business meetings during Orthodox church services by combining a liturgical calendar with meeting management. Key capabilities include viewing Orthodox feast days, scheduling meetings, receiving conflict warnings, customizing parish liturgy times, and supporting both Gregorian and Julian calendars. The app aims to provide a tool that integrates spiritual observance with professional life for its target audience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React Native with Expo SDK 54, TypeScript (strict mode).
- **Navigation:** File-based routing via `expo-router` with tab-based navigation (Calendar, Meetings, Orthodox Events, Prayers, Settings) and modal routes for actions.
- **UI Components:** Custom themed components for light/dark modes, `react-native-calendars`, Orthodox-themed color scheme (gold, royal blue, burgundy), platform-specific components.
- **State Management:** Zustand for global state, persisting parish settings, meetings, calendar views, language, and onboarding status across sessions.
- **Internationalization (i18n):** Full English and Romanian support, custom `useTranslation()` hook, language toggle in Settings. Default language is Romanian.
- **Animation:** React Native Reanimated for smooth UI transitions.
- **Notifications:** `expo-notifications` for prayer reminder scheduling with local push notifications.

### Data Storage Solutions
- **Local Database:** `expo-sqlite` for structured data (meetings, parish settings, prayers).
  - **Prayers Table:** Stores prayer schedules with fields: name, time, reminderMinutes, isDaily, selectedDays (JSON array), notificationId (JSON array of scheduled notification IDs), lastCompleted, streak, isEnabled
  - **Data Integrity:** Daily prayers store empty selectedDays array ('[]'), weekly prayers store 0-6 day indices
- **Key-Value Storage:** AsyncStorage for simple preferences (onboarding, Julian calendar toggle, API response caching).
- **Data Flow:** Database initialized on app render, settings loaded, Zustand store hydrated, UI reads from store, user actions update both database and store.

### Business Logic
- **Orthodox Calendar Calculations:** Manages fixed and moveable feast dates, Julian calendar conversion, and Sunday detection.
- **Live Orthodox Data API:** Integrates with `orthocal.info` for daily liturgical data (saints, readings, fasting, feasts, tone), implementing 24-hour caching with AsyncStorage and graceful degradation to local data.
- **Conflict Detection Engine:** Compares meeting times against parish liturgy schedules, Great Feasts, Major Feasts, and Sundays, calculating liturgy duration and returning conflict severity.
- **Meeting Management:** CRUD operations for meetings with automatic conflict checking and visual indicators.
- **Prayer Reminder System:** Comprehensive prayer scheduling with:
  - **Daily & Weekly Patterns:** Support for daily prayers and custom weekly schedules with per-day selection
  - **Notification Scheduling:** Local push notifications with customizable reminder times (5-60 minutes before prayer)
  - **Multi-Notification Management:** Weekly prayers create separate notifications per selected day, all tracked as JSON array
  - **Weekday Conversion:** Automatic conversion between JavaScript (0-6, Sunday=0) and Expo (1-7, Sunday=1) formats
  - **Streak Tracking:** Monitors consecutive days of prayer completion to encourage consistency
  - **Prayer Presets:** Quick-add templates for common Orthodox prayers (Morning Prayers, Evening Prayers, Akathist)
  - **Data Validation:** Robust validation for selectedDays arrays with deduplication and bounds checking
- **Instant Bidirectional Calendar Sync:** Production-ready real-time synchronization with ALL native device calendars on iOS and Android. Supports iCloud, Google, Samsung, Xiaomi, OnePlus, Outlook, Yahoo, Exchange, and local calendars. Features include:
  - **CalendarSyncService:** Class-based architecture with comprehensive calendar type detection (iCloud, Google, Samsung, Xiaomi, OnePlus, Outlook, Yahoo, Exchange, CalDAV, Nextcloud, ownCloud) and static singleton pattern
  - **Instant Push:** 500ms debounced automatic sync when meetings are created/updated/deleted in app, persists calendar event IDs back to database for update/delete operations, integrated via dynamic imports in database layer
  - **Instant Pull:** Triggered when app becomes active via AppState listener, fetches new external events and imports them with sourceOfTruth='external'
  - **Duplicate Prevention:** Guards prevent re-pushing external events (sourceOfTruth='external' or has externalEventId) to avoid feedback loops and spurious duplicates
  - **Event ID Persistence:** createMeeting and updateMeeting persist calendarEventId and lastSynced timestamps after instant push completes, ensuring native events remain addressable for later modifications
  - **Real-Time Background Sync:** 30-second interval polling while app is open, checks for external changes (updates/deletions), pauses when app is inactive
  - **External Event Tracking:** Database stores calendarEventId, externalEventId, calendarSource, lastSynced, sourceOfTruth ('app'|'external'), createdAt, updatedAt for conflict resolution
  - **SyncStatus UI Component:** Shows real-time sync state (syncing, success, error), last sync time with relative timestamps, manual sync button, retry on failure
  - **State Management:** Zustand store tracks syncStatus (isSyncing, lastSyncAt, error, counts) for UI reactivity
  - **Lifecycle Management:** Real-time sync lifecycle tied to calendarSyncEnabled state, starts/stops automatically when sync is toggled, AppState listener for instant pull on app focus
  - **Manual Sync:** Available in Meetings tab (pull-to-refresh) and Settings tab ("Sync Now" button), validates sync is enabled before running
  - **Smart Filtering:** Excludes app's liturgical calendar from imports to prevent circular syncing
  - **Universal Calendar Support:** Works with all calendar types on both platforms - iCloud, Google, Samsung Calendar, Xiaomi Mi Calendar, OnePlus Calendar, Outlook, Yahoo, Exchange, and local calendars
  - **Platform-Specific Optimization:** iOS prefers iCloud sources, Android intelligently falls back from Google → manufacturer calendars → local source
  - **Error Handling:** Comprehensive try/catch with logging, graceful degradation for failed sync operations

### Platform Support
- **Multi-Platform Rendering:** Supports iOS (SF Symbols), Android (Material Icons), and web (responsive layouts).
- **Platform-Specific Features:** iOS haptic feedback and BlurView; Android edge-to-edge display support; web browser-based external links.

### UI/UX Design Decisions
- **Orthodox Calendar Tab:** Features a liturgical header with current period and tone, traditional calendar page-style design with ornamental borders and feast symbols based on significance, colored dots for feast rank, and fasting indicators.
- **Modern Color Palette:** Utilizes gradient color arrays for Orthodox colors, a semantic color system, and consistent accent colors.
- **UI Components:** Reusable Card component with gradient support and shadow presets.
- **Bottom Sheet Integration:** Uses `@gorhom/bottom-sheet` for displaying day details.
- **Orthodox Events Tab:** Displays a 90-day chronological timeline of events, grouped into time periods with Romanian localization, and includes smart filtering options.

## External Dependencies

- **Core Framework:** `expo` (SDK 54), `react-native` (0.81.4), `react` (19.1.0).
- **Navigation & Routing:** `expo-router`, `@react-navigation/native`, `@react-navigation/bottom-tabs`.
- **Data & Storage:** `expo-sqlite`, `@react-native-async-storage/async-storage`.
- **State Management:** `zustand`.
- **UI & Calendar:** `react-native-calendars`, `@react-native-community/datetimepicker`, `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `expo-linear-gradient`.
- **Utilities:** `date-fns`, `@expo/vector-icons`.
- **Expo Modules:** `expo-font`, `expo-haptics`, `expo-blur`, `expo-splash-screen`, `expo-constants`, `expo-symbols`, `expo-calendar`, `expo-notifications`.
- **Data Sources:** `constants/data/orthodoxCalendar.json` (static data), `orthocal.info API` (live data).