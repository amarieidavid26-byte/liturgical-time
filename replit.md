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
- Manages parish settings, meetings, calendar view modes, language preference, and onboarding status
- Persists state across app sessions

**Internationalization (i18n):**
- Full English and Romanian translation support
- Translation system in `lib/translations/index.ts`
- Custom hook `useTranslation()` for accessing translations
- Language toggle in Settings screen
- Default language: Romanian

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

### November 15, 2025 - Design System & UI Enhancement

**Modern Color Palette:**
- **Added:** Gradient color arrays for primary Orthodox colors (gold, royal blue, burgundy)
- **Added:** Semantic color system with modern backgrounds (primaryBg, cardBg, modalBg)
- **Added:** Consistent accent colors (success, warning, danger, info) using Tailwind CSS palette
- **Added:** Text color hierarchy (primaryText, secondaryText, mutedText)
- **Added:** Special Orthodox-themed background colors (sundayGold, fastingPurple, feastBlue)
- **Added:** Shadow definitions (small, medium, large) with consistent elevation
- **Maintained:** Backward compatibility with legacy color names
- **Structure:** `constants/Colors.ts` now exports gradients, backgrounds, accents, text, special colors, and shadow presets

**UI Component Library:**
- **Created:** `components/ui/Card.tsx` - Reusable card component with TypeScript support
- **Features:** 
  - Standard card with optional onPress handler
  - Gradient card with LinearGradient support (requires 2+ colors)
  - Built-in shadow presets (medium shadow by default)
  - Consistent 16px border radius and padding
- **Dependencies:** Installed `expo-linear-gradient` for gradient support
- **Export:** Centralized exports via `components/ui/index.ts`
- **Documentation:** Complete usage guide in `components/ui/README.md`

**Bottom Sheet Integration:**
- **Installed:** `@gorhom/bottom-sheet` for modern bottom sheet UI
- **Features:** Three snap points (25%, 50%, 90%), swipe to dismiss, smooth animations
- **Usage:** Calendar day details now display in bottom sheet instead of modal

### November 13, 2025 - Major Features Update

**Orthodox Calendar API Integration:**
- **Added:** Live Orthodox calendar data integration via orthocal.info API
- **Created:** `lib/api/orthodoxAPI.ts` with caching and offline fallback support
- **Fixed:** API endpoint format to use correct URL path structure (`/daily/{year}/{month}/{day}/`)
- **Updated:** Orthodox Events tab now displays fresh daily data including:
  - Saints commemorated today
  - Daily scripture readings (Epistle & Gospel)
  - Fasting rules for the day
  - Current liturgical tone
  - Feast day information
- **Feature:** Refresh button to manually clear cache and reload data
- **Feature:** 24-hour automatic cache expiration for optimal performance
- **Feature:** Graceful fallback to local data when offline or API unavailable

**Translation System:**
- **Created:** Complete English/Romanian translation system
- **Files:** `lib/translations/index.ts` with all UI strings in both languages
- **Hook:** `lib/hooks/useTranslation.ts` for component-level translation access
- **Store:** Added language state management to Zustand store
- **UI:** Language selector in Settings screen with flag icons
- **Coverage:** Tab labels, meetings screen, settings screen fully translated
- **Default:** Romanian language for Romanian Orthodox users

**Calendar Screen Redesign (November 15, 2025):**
- **Modern Header:** Beautiful gradient header using royal blue gradient colors
- **Parish Display:** Shows parish name prominently with "Calendar Ortodox" subtitle
- **Circular Day Selection:** Days now have circular selection instead of square with smooth animations
- **Touch Animations:** Added spring animations on day press for better feedback
- **Better Dot Indicators:** Improved visual design with larger, more visible dots (5px circular)
- **Bottom Sheet:** Replaced modal with modern bottom sheet for day details (@gorhom/bottom-sheet)
- **Gradient FAB:** Floating action button now uses gradient (emerald green)
- **Enhanced Cards:** Event and meeting cards have modern design with left border indicators
- **Icon Integration:** Added contextual icons (calendar, briefcase, time, location, warning, church)
- **Improved Empty State:** Better empty state with icon when no events/meetings
- **Shadow System:** Consistent shadows throughout using Colors.shadows presets
- **Julian Calendar:** Updated Monday-first format, Sunday highlighting, Julian dates display below Gregorian dates

**Meeting Management:**
- **Feature:** Swipe-to-delete gesture for meetings using react-native-gesture-handler
- **UI:** Red trash icon appears when swiping left on a meeting card
- **UX:** Confirmation dialog appears before deleting a meeting

**DateTimePicker Improvements:**
- **Fixed:** Time picker digits now readable on both iOS and Android
- **iOS:** Black text color (#000000), light theme variant, spinner display
- **Android:** Default display with white background
- **Coverage:** All date/time pickers in new meetings, edit meetings, onboarding, and settings

**Orthodox Events Tab - Chronological Feast Display (November 15, 2025):**
- **Complete 90-Day Timeline:** Shows continuous day-by-day sequence from today forward, maintaining chronological order
- **Smart Filtering:** Three filter options (Toate/All, Mari Sărbători/Great Feasts, Sărbători Majore/Major Feasts) that affect only which events show per day, not whether days appear
- **Grouped Sections:** Days organized into time periods with Romanian labels:
  - Astăzi (Today) - with gradient header and enhanced today card
  - Săptămâna Aceasta (This Week) - days 1-7 from today
  - Luna Aceasta (This Month) - days 8-30 from today
  - Luna Viitoare (Next Month) - days 31-60 from today
  - Mai Târziu (Later) - days 61-90 from today
- **Full Romanian Localization:** All date formatting uses Romanian locale (date-fns/locale/ro)
  - Romanian day names (luni, marți, miercuri, joi, vineri, sâmbătă, duminică)
  - Romanian month names (ianuarie, februarie, martie, etc.)
  - Date formats: "EEEE, d MMMM yyyy" and "d MMMM yyyy"
- **Continuous Calendar View:** Every day in 90-day window displays regardless of events, fasting status, or filter selection
- **Implementation:** `generateUpcomingFeasts()` function in `app/(tabs)/orthodox.tsx` builds complete day sequence, applies filters to events only

**Traditional Orthodox Calendar Design (November 15, 2025):**
- **Liturgical Header:** Burgundy gradient header displaying current liturgical period and tone
  - `getCurrentLiturgicalPeriod()` helper function with accurate date-based calculations
  - Easter-relative periods: Postul Mare, Săptămâna Patimilor, Paștele, Săptămâna Luminată, Perioada Paștilor, Înălțarea Domnului, După Înălțare, Rusaliile, Duminica Tuturor Sfinților, Postul Sfinților Apostoli
  - Fixed-date periods: Postul Crăciunului, Perioada de Crăciun, După Botez, Postul Adormirii Maicii Domnului, Adormirea Maicii Domnului, Înălțarea Sfintei Cruci
  - Easter dates table extended through 2030
- **Traditional Calendar Cards:** Calendar page-style design with horizontal layout
  - Left date block (80px wide): Gold background for Sundays, burgundy for weekdays
  - Large day number (32px bold) with abbreviated month name
  - "DUMINICĂ" label badge on Sunday dates
  - Right content area with feast names and details
  - Cross symbols (✝) displayed before great feast names in gold color
  - Feast names styled by importance: great feasts bold 15px burgundy, others normal 13px
  - Empty days show weekday name in italic gray
- **Fasting Indicators:** Purple-tinted badges with Romanian labels
  - "Post Aspru" for strict fasting
  - "Post Mare" for Great Lent fasting
  - "Post" for regular fasting
- **Julian Calendar Support:** Julian dates shown below main content when enabled
- **Design Philosophy:** Traditional Orthodox calendar aesthetic with liturgical accuracy