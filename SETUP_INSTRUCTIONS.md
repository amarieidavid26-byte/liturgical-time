# Orthodox Business Calendar - Complete Setup Guide

## Quick Setup in Cursor/VSCode

### 1. Create New Project
```bash
cd ~/Desktop
npx create-expo-app@latest liturgical-time --template tabs@51
cd liturgical-time
```

### 2. Install Dependencies
```bash
npm install react-native-calendars expo-sqlite @react-native-async-storage/async-storage date-fns zustand @expo/vector-icons @react-native-community/datetimepicker@7.6.4
```

### 3. Open in Cursor
```bash
cursor .
```

### 4. File Structure to Create

Create these folders first:
```bash
mkdir -p lib/database lib/calendar lib/utils lib/store
mkdir -p components/Calendar components/Meeting components/Orthodox
mkdir -p constants/data
mkdir -p app/meeting
```

### 5. Copy All Files

Now you need to create/replace these files in Cursor. Use the file contents provided in the COPY_FILES.md document.

### 6. Run the App

```bash
# For iOS Simulator
npm run ios

# For Android (if you have Android Studio)
npm run android

# For Web Preview
npm run web
```

### 7. Test on Your iPhone

1. Download "Expo Go" from App Store
2. Make sure your Mac and iPhone are on same WiFi
3. Run `npm start`
4. Scan the QR code with your iPhone camera
5. Open in Expo Go

## File List You Need to Create/Update:

### Core Configuration Files:
- `/constants/Colors.ts` - UPDATE existing file
- `/constants/data/orthodoxCalendar.json` - CREATE new file

### Library Files:
- `/lib/types.ts` - CREATE
- `/lib/database/sqlite.ts` - CREATE
- `/lib/calendar/orthodoxCalendar.ts` - CREATE
- `/lib/calendar/conflictDetection.ts` - CREATE
- `/lib/utils/storage.ts` - CREATE
- `/lib/store/appStore.ts` - CREATE

### App Files:
- `/app/_layout.tsx` - UPDATE existing
- `/app/onboarding.tsx` - CREATE
- `/app/(tabs)/_layout.tsx` - UPDATE existing
- `/app/(tabs)/index.tsx` - UPDATE existing (Calendar screen)
- `/app/(tabs)/meetings.tsx` - CREATE
- `/app/(tabs)/orthodox.tsx` - CREATE
- `/app/(tabs)/settings.tsx` - CREATE (coming next)
- `/app/meeting/[id].tsx` - CREATE (coming next)
- `/app/meeting/new.tsx` - CREATE (coming next)

## Working with Claude in Cursor

Once you have the project open in Cursor:

1. **Use Cmd+K** to open Claude inline
2. **Use Cmd+L** to open Claude chat panel
3. **Select code** and ask Claude to modify it
4. **Use @file** to reference specific files

Example prompts for Cursor:
- "Create the Add Meeting form screen at app/meeting/new.tsx"
- "Add the Settings screen implementation"
- "Fix any TypeScript errors in this file"
- "Add validation to the meeting form"

## Next Steps After Setup

1. Test the onboarding flow
2. Add a few test meetings
3. Verify conflict detection works
4. Test Julian calendar toggle
5. Complete the remaining screens with Claude in Cursor

## Troubleshooting

If you get errors:
```bash
# Clear cache
npm start -- --clear

# Reset Metro bundler
npx expo start -c

# If iOS simulator issues
npx expo run:ios --clear
```

## Tips for Using Claude in Cursor

1. **Be specific**: "Create a form component for adding meetings with date/time pickers"
2. **Reference context**: "@orthodoxCalendar.json - use this data format"
3. **Iterate quickly**: Test after each change
4. **Use the terminal**: Cursor's integrated terminal is perfect for running the app

Ready to continue building in Cursor! 🚀
