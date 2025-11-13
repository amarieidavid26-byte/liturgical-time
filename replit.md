# Orthodox Business Calendar Mobile App

## Overview

A React Native + Expo mobile application designed for Romanian Orthodox entrepreneurs to avoid scheduling business meetings during church services. The app combines an Orthodox liturgical calendar with business meeting management, providing conflict detection when meetings overlap with Divine Liturgy, Great Feasts, or Sunday services.

The application allows users to:
- View Orthodox feast days and fasting periods
- Schedule and manage business meetings
- Receive warnings when meetings conflict with church services
- Customize parish-specific liturgy times
- Support both Gregorian and Julian calendar modes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React Native with Expo SDK 54, using TypeScript in strict mode

**Navigation:** File-based routing via `expo-router` with tab-based navigation structure
- Main tabs: Calendar, Meetings, Orthodox Events, Settings
- Modal routes for meeting creation/editing
- Onboarding flow for first-time setup

**UI Components:**
- Custom themed components (`ThemedView`, `ThemedText`) supporting light/dark modes
- Native calendar integration via `react-native-calendars`
- Orthodox-themed color scheme (gold, royal blue, burgundy)
- Platform-specific components for iOS/Android/web

**State Management:** Zustand for global state
- Centralized store in `lib/store/appStore.ts`
- Manages parish settings, meetings, calendar view modes, and onboarding status
- Persists state across app sessions

**Animation:** React Native Reanimated for smooth UI transitions and gestures

### Data Storage Solutions

**Local Database:** expo-sqlite for structured data persistence
- `meetings` table: Stores all business meeting records with timestamps
- `parish_settings` table: Stores user's parish configuration (singleton pattern with id=1 check)
- Database initialization occurs in root layout before app renders

**Key-Value Storage:** AsyncStorage for simple preferences
- Onboarding completion status
- Parish settings backup/fallback
- Julian calendar toggle state
- Orthodox Calendar API response caching (24-hour expiration)

**Data Flow:**
1. App initializes database on first render (_layout.tsx)
2. Loads settings from database, falls back to AsyncStorage if needed
3. Zustand store hydrates with database data
4. UI components read from Zustand store
5. User actions update both database and store simultaneously

**External API Integration:**
- Orthodox Calendar API (`orthocal.info`) for live liturgical data
- Fetches daily saints, readings, fasting rules, feast information, and tone
- 24-hour cache using AsyncStorage to minimize API calls and enable offline use
- Automatic fallback to local JSON data when API is unavailable
- Supports Romanian jurisdiction by default (configurable for OCA, ROCOR, Greek)

### Business Logic

**Orthodox Calendar Calculations** (`lib/calendar/orthodoxCalendar.ts`):
- Fixed feast dates from JSON data file
- Moveable feast calculations based on Easter date (per year 2024-2028)
- Julian calendar conversion (13-day offset)
- Sunday detection for weekly liturgy conflicts

**Live Orthodox Data API** (`lib/api/orthodoxAPI.ts`):
- Fetches fresh daily Orthodox calendar data from orthocal.info
- Returns saints commemorated, daily scripture readings, fasting level, feast days, and liturgical tone
- Implements 24-hour caching strategy with AsyncStorage
- Graceful degradation to local data when offline or API unavailable
- Cache management utilities (clear cache, bulk date range fetching)

**Conflict Detection Engine** (`lib/calendar/conflictDetection.ts`):
- Compares meeting times against parish liturgy schedules
- Checks for overlaps with Great Feasts, Major Feasts, and Sundays
- Calculates liturgy duration based on feast importance (90-120 minutes)
- Returns conflict severity levels (high/medium/low)

**Meeting Management:**
- CRUD operations via SQLite helpers
- Date/time parsing with `date-fns`
- Automatic conflict checking on meeting creation/update
- Visual indicators on calendar for conflicts

### Platform Support

**Multi-Platform Rendering:**
- iOS: Uses native SF Symbols via expo-symbols
- Android: Falls back to Material Icons
- Web: Static Metro bundler output with responsive layouts

**Platform-Specific Features:**
- iOS: Haptic feedback on tab presses, BlurView tab bar
- Android: Edge-to-edge display support
- Web: Browser-based external link handling

## External Dependencies

**Core Framework:**
- `expo` (SDK 54): Cross-platform development framework
- `react-native` (0.81.4): Mobile UI framework
- `react` (19.1.0): Component library

**Navigation & Routing:**
- `expo-router` (~6.0.7): File-based routing system
- `@react-navigation/native` & `@react-navigation/bottom-tabs`: Tab navigation

**Data & Storage:**
- `expo-sqlite` (^16.0.9): Local SQLite database
- `@react-native-async-storage/async-storage` (^2.2.0): Key-value storage

**State Management:**
- `zustand` (^5.0.8): Lightweight state management

**UI & Calendar:**
- `react-native-calendars` (^1.1313.0): Calendar component library
- `@react-native-community/datetimepicker` (^7.6.4): Native date/time pickers
- `react-native-reanimated` (~4.1.0): Animation library
- `react-native-gesture-handler` (~2.28.0): Gesture handling

**Utilities:**
- `date-fns` (^4.1.0): Date manipulation and formatting
- `@expo/vector-icons` (^15.0.2): Icon library

**Expo Modules:**
- `expo-font`: Custom font loading
- `expo-haptics`: Tactile feedback
- `expo-blur`: Native blur effects (iOS)
- `expo-splash-screen`: Launch screen management
- `expo-constants`: App configuration access

**Data Sources:**
- `constants/data/orthodoxCalendar.json`: Static Orthodox liturgical calendar data (2024-2028)
- `orthocal.info API`: Live Orthodox calendar data with daily updates

**Development Tools:**
- `eslint` with `eslint-config-expo`: Code linting
- TypeScript with strict mode enabled
- `@expo/ngrok`: Tunnel mode for cloud-based Expo development

## Recent Changes

### November 13, 2025 - Orthodox Calendar API Integration
- **Added:** Live Orthodox calendar data integration via orthocal.info API
- **Created:** `lib/api/orthodoxAPI.ts` with caching and offline fallback support
- **Updated:** Orthodox Events tab now displays fresh daily data including:
  - Saints commemorated today
  - Daily scripture readings (Epistle & Gospel)
  - Fasting rules for the day
  - Current liturgical tone
  - Feast day information
- **Feature:** Refresh button to manually clear cache and reload data
- **Feature:** 24-hour automatic cache expiration for optimal performance
- **Feature:** Graceful fallback to local data when offline or API unavailable