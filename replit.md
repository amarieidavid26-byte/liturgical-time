# Orthodox Business Calendar Mobile App

## Overview

A React Native + Expo mobile application for Romanian Orthodox entrepreneurs. Its primary purpose is to help users avoid scheduling business meetings during Orthodox church services by combining a liturgical calendar with meeting management. Key capabilities include viewing Orthodox feast days, scheduling meetings, receiving conflict warnings, customizing parish liturgy times, and supporting both Gregorian and Julian calendars. The app aims to provide a tool that integrates spiritual observance with professional life for its target audience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React Native with Expo SDK 54, TypeScript (strict mode).
- **Navigation:** File-based routing via `expo-router` with tab-based navigation (Calendar, Meetings, Orthodox Events, Settings) and modal routes for actions.
- **UI Components:** Custom themed components for light/dark modes, `react-native-calendars`, Orthodox-themed color scheme (gold, royal blue, burgundy), platform-specific components.
- **State Management:** Zustand for global state, persisting parish settings, meetings, calendar views, language, and onboarding status across sessions.
- **Internationalization (i18n):** Full English and Romanian support, custom `useTranslation()` hook, language toggle in Settings. Default language is Romanian.
- **Animation:** React Native Reanimated for smooth UI transitions.

### Data Storage Solutions
- **Local Database:** `expo-sqlite` for structured data (meetings, parish settings).
- **Key-Value Storage:** AsyncStorage for simple preferences (onboarding, Julian calendar toggle, API response caching).
- **Data Flow:** Database initialized on app render, settings loaded, Zustand store hydrated, UI reads from store, user actions update both database and store.

### Business Logic
- **Orthodox Calendar Calculations:** Manages fixed and moveable feast dates, Julian calendar conversion, and Sunday detection.
- **Live Orthodox Data API:** Integrates with `orthocal.info` for daily liturgical data (saints, readings, fasting, feasts, tone), implementing 24-hour caching with AsyncStorage and graceful degradation to local data.
- **Conflict Detection Engine:** Compares meeting times against parish liturgy schedules, Great Feasts, Major Feasts, and Sundays, calculating liturgy duration and returning conflict severity.
- **Meeting Management:** CRUD operations for meetings with automatic conflict checking and visual indicators.
- **Two-Way Calendar Sync:** Comprehensive bidirectional synchronization with native device calendars (Apple Calendar, Google Calendar). Features include:
  - **Smart Import:** Automatically imports meetings from external calendars with duplicate detection (comparing date + overlapping time)
  - **Last-Modified-Wins Conflict Resolution:** Tracks lastSynced timestamps to resolve conflicts when meetings are edited in both locations
  - **Bidirectional Editing:** Imported meetings are fully editable in the app with changes propagated back to the external calendar
  - **External Event Tracking:** Database stores externalEventId, calendarSource, and lastSynced for each imported meeting
  - **Auto-Sync on Foreground:** AppState listener triggers sync when app returns to foreground (battery-friendly)
  - **Manual Sync Controls:** "Sync Now" button in Settings and pull-to-refresh on Meetings tab
  - **Smart Filtering:** Excludes the app's liturgical calendar from imports to prevent circular syncing
  - **Sync Status UI:** Meeting cards display badges showing calendar source for imported events
  - **Persistent Settings:** Calendar preferences and sync state maintained across app restarts
  - **Error Handling:** All sync operations wrapped in try/catch with logging to prevent crashes

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
- **Expo Modules:** `expo-font`, `expo-haptics`, `expo-blur`, `expo-splash-screen`, `expo-constants`, `expo-symbols`, `expo-calendar`.
- **Data Sources:** `constants/data/orthodoxCalendar.json` (static data), `orthocal.info API` (live data).