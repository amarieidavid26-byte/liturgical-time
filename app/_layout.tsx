import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '@/lib/i18n';
import { useColorScheme } from '@/components/useColorScheme';
import { initDatabase, getAllMeetings } from '@/lib/database/sqlite';
import { prefetchToday } from '@/lib/calendar/orthodoxCalendar';
import { getParishSettings, isOnboarded, getJulianEnabled, getViewMode, getCalendarSyncEnabled } from '@/lib/utils/storage';
import { useAppStore } from '@/lib/store/appStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const setParishSettings = useAppStore((state) => state.setParishSettings);
  const setMeetings = useAppStore((state) => state.setMeetings);
  const setOnboarded = useAppStore((state) => state.setOnboarded);
  const setJulianCalendarEnabled = useAppStore((state) => state.setJulianCalendarEnabled);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const setCalendarSyncEnabled = useAppStore((state) => state.setCalendarSyncEnabled);
  const setLoading = useAppStore((state) => state.setLoading);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  const initializeApp = async () => {
    try {
      // Initialize database and prefetch today's calendar data
      await initDatabase();
      prefetchToday(); // Fire and forget — don't block init

      // Load saved data
      const [parish, onboarded, meetings, julianEnabled, viewMode, calendarSyncEnabled] = await Promise.all([
        getParishSettings(),
        isOnboarded(),
        getAllMeetings(),
        getJulianEnabled(),
        getViewMode(),
        getCalendarSyncEnabled(),
      ]);

      // Update global state
      setParishSettings(parish);
      setOnboarded(onboarded);
      setMeetings(meetings);
      setJulianCalendarEnabled(julianEnabled);
      setViewMode(viewMode);
      setCalendarSyncEnabled(calendarSyncEnabled);
      setLoading(false);

      // Hide splash screen
      await SplashScreen.hideAsync();
    } catch (error) {
      console.error('Error initializing app:', error);
      setLoading(false);
      await SplashScreen.hideAsync();
    }
  };

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="meeting/new"
          options={{
            presentation: 'modal',
            title: 'Întâlnire Nouă',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="meeting/[id]"
          options={{
            presentation: 'modal',
            title: 'Editare Întâlnire',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Despre' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
