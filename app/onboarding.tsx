import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveParishSettings, setOnboardingCompleted } from '../lib/utils/storage';
import { saveParishSettingsDb } from '../lib/database/sqlite';
import { ParishSettings } from '../lib/types';
import Colors from '../constants/Colors';
import useAppStore from '../lib/store/appStore';
import { useTranslation } from '../lib/hooks/useTranslation';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [parishName, setParishName] = useState('');
  const [sundayLiturgyTime, setSundayLiturgyTime] = useState(new Date(2024, 0, 1, 9, 0));
  const [saturdayVespersTime, setSaturdayVespersTime] = useState(new Date(2024, 0, 1, 18, 0));
  const [weekdayLiturgyTime, setWeekdayLiturgyTime] = useState(new Date(2024, 0, 1, 8, 0));
  const [julianEnabled, setJulianEnabled] = useState(false);
  const [showSundayPicker, setShowSundayPicker] = useState(false);
  const [showSaturdayPicker, setShowSaturdayPicker] = useState(false);
  const [showWeekdayPicker, setShowWeekdayPicker] = useState(false);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [includeWeekday, setIncludeWeekday] = useState(false);

  const { setParishSettings, setOnboarded } = useAppStore();
  const t = useTranslation();

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleNext = () => {
    if (step === 1 && !parishName.trim()) {
      Alert.alert(t.required, t.enterParishName);
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      const settings: ParishSettings = {
        parishName: parishName.trim(),
        sundayLiturgyTime: formatTime(sundayLiturgyTime),
        saturdayVespersTime: includeSaturday ? formatTime(saturdayVespersTime) : undefined,
        weekdayLiturgyTime: includeWeekday ? formatTime(weekdayLiturgyTime) : undefined,
        julianCalendarEnabled: julianEnabled,
      };

      await saveParishSettingsDb(settings);
      await saveParishSettings(settings);
      await setOnboardingCompleted(true);
      setParishSettings(settings);
      setOnboarded(true);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(t.error, t.failedToSaveSettings);
      console.error('Error completing onboarding:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t.welcome}!</Text>
            <Text style={styles.subtitle}>{t.welcomeMessage}</Text>
            <Text style={styles.label}>{t.parishName}</Text>
            <TextInput
              style={styles.input}
              value={parishName}
              onChangeText={setParishName}
              placeholder={t.enterParishName}
              placeholderTextColor={Colors.orthodox.lightGray}
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t.sundayLiturgyTime}</Text>
            <Text style={styles.subtitle}>{t.welcomeMessage}</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowSundayPicker(true)}
            >
              <Text style={styles.timeButtonText}>{formatTime(sundayLiturgyTime)}</Text>
            </TouchableOpacity>
            {showSundayPicker && (
              <DateTimePicker
                value={sundayLiturgyTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={Platform.OS === 'ios' ? '#000000' : undefined}
                themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
                style={Platform.OS === 'android' ? { backgroundColor: 'white' } : undefined}
                onChange={(event, date) => {
                  setShowSundayPicker(false);
                  if (date) setSundayLiturgyTime(date);
                }}
              />
            )}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t.optional}</Text>
            <Text style={styles.subtitle}>{t.parishSettings}</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Saturday Vespers</Text>
              <Switch
                value={includeSaturday}
                onValueChange={setIncludeSaturday}
                trackColor={{ false: Colors.orthodox.lightGray, true: Colors.orthodox.royalBlue }}
              />
            </View>
            {includeSaturday && (
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowSaturdayPicker(true)}
              >
                <Text style={styles.timeButtonText}>{formatTime(saturdayVespersTime)}</Text>
              </TouchableOpacity>
            )}
            {showSaturdayPicker && (
              <DateTimePicker
                value={saturdayVespersTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={Platform.OS === 'ios' ? '#000000' : undefined}
                themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
                style={Platform.OS === 'android' ? { backgroundColor: 'white' } : undefined}
                onChange={(event, date) => {
                  setShowSaturdayPicker(false);
                  if (date) setSaturdayVespersTime(date);
                }}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Weekday Liturgy</Text>
              <Switch
                value={includeWeekday}
                onValueChange={setIncludeWeekday}
                trackColor={{ false: Colors.orthodox.lightGray, true: Colors.orthodox.royalBlue }}
              />
            </View>
            {includeWeekday && (
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowWeekdayPicker(true)}
              >
                <Text style={styles.timeButtonText}>{formatTime(weekdayLiturgyTime)}</Text>
              </TouchableOpacity>
            )}
            {showWeekdayPicker && (
              <DateTimePicker
                value={weekdayLiturgyTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={Platform.OS === 'ios' ? '#000000' : undefined}
                themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
                style={Platform.OS === 'android' ? { backgroundColor: 'white' } : undefined}
                onChange={(event, date) => {
                  setShowWeekdayPicker(false);
                  if (date) setWeekdayLiturgyTime(date);
                }}
              />
            )}
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t.julianCalendar}</Text>
            <Text style={styles.subtitle}>
              {t.useJulianCalendar}?
            </Text>
            <Text style={styles.info}>
              {t.julianCalendar} (13 {t.date})
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t.useJulianCalendar}</Text>
              <Switch
                value={julianEnabled}
                onValueChange={setJulianEnabled}
                trackColor={{ false: Colors.orthodox.lightGray, true: Colors.orthodox.royalBlue }}
              />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= step ? styles.progressDotActive : null,
              ]}
            />
          ))}
        </View>

        {renderStep()}

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.buttonSecondaryText}>{t.cancel}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.buttonPrimaryText}>
              {step === 4 ? t.getStarted : t.save}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.orthodox.lightGray,
  },
  progressDotActive: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
    marginBottom: 32,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.orthodox.lightGray,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  timeButton: {
    backgroundColor: Colors.orthodox.lightBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  timeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.orthodox.royalBlue,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 50,
  },
  buttonPrimary: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  buttonPrimaryText: {
    color: Colors.orthodox.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: Colors.orthodox.lightGray,
  },
  buttonSecondaryText: {
    color: Colors.orthodox.darkGray,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
