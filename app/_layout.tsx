import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/useColorScheme';
import { initDatabase, getAllMeetings, getParishSettingsDb } from '../lib/database/sqlite';
import { getParishSettings, getOnboardingCompleted, getCalendarSyncEnabled, getCalendarId } from '../lib/utils/storage';
import { checkCalendarPermissions } from '../lib/calendar/calendarSyncService';
import { CalendarSyncController } from '../lib/calendar/CalendarSyncController';
import useAppStore from '../lib/store/appStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const {
    setParishSettings,
    setMeetings,
    setOnboarded,
    setIsLoading,
    isOnboarded,
    setCalendarSyncEnabled,
    setCalendarId,
    setCalendarPermissionStatus,
    setSyncStatus,
    calendarSyncEnabled,
  } = useAppStore();

  useEffect(() => {
    async function initialize() {
      try {
        await initDatabase();
        
        let settings = await getParishSettingsDb();
        if (!settings) {
          settings = await getParishSettings();
        }
        setParishSettings(settings);
        
        const meetings = await getAllMeetings();
        setMeetings(meetings);
        
        const onboarded = await getOnboardingCompleted();
        setOnboarded(onboarded);
        
        const calendarSyncEnabled = await getCalendarSyncEnabled();
        const calendarId = await getCalendarId();
        setCalendarSyncEnabled(calendarSyncEnabled);
        setCalendarId(calendarId);
        
        if (calendarSyncEnabled) {
          const permissionStatus = await checkCalendarPermissions();
          setCalendarPermissionStatus(permissionStatus);
        }
        
        if (!onboarded) {
          setTimeout(() => router.replace('/onboarding' as any), 100);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    const syncController = CalendarSyncController.getInstance();
    
    syncController.setStatusCallback((status) => {
      setSyncStatus(status);
      
      if (status.importedCount > 0 || status.updatedCount > 0 || status.deletedCount > 0) {
        getAllMeetings().then(setMeetings);
      }
    });
    
    getCalendarSyncEnabled().then((enabled) => {
      if (enabled) {
        syncController.enable();
        syncController.start();
      }
    });
    
    return () => {
      syncController.stop();
    };
  }, []);

  useEffect(() => {
    const syncController = CalendarSyncController.getInstance();
    
    if (calendarSyncEnabled) {
      syncController.enable();
      syncController.start();
    } else {
      syncController.disable();
    }
  }, [calendarSyncEnabled]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="meeting/new" options={{ presentation: 'modal', title: 'New Meeting' }} />
          <Stack.Screen name="meeting/[id]" options={{ presentation: 'modal', title: 'Edit Meeting' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
