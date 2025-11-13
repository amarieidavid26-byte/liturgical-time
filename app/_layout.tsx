import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { initDatabase, getAllMeetings, getParishSettingsDb } from '../lib/database/sqlite';
import { getParishSettings, getOnboardingCompleted } from '../lib/utils/storage';
import useAppStore from '../lib/store/appStore';

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

  if (!loaded) {
    return null;
  }

  return (
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
  );
}
