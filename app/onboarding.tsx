import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { saveParishSettings, setOnboarded, saveJulianEnabled } from '@/lib/utils/storage';
import { useAppStore } from '@/lib/store/appStore';
import { ParishSettings } from '@/lib/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const setParishSettingsStore = useAppStore((state) => state.setParishSettings);
  const setOnboardedStore = useAppStore((state) => state.setOnboarded);
  const setJulianCalendarEnabledStore = useAppStore((state) => state.setJulianCalendarEnabled);

  const [step, setStep] = useState(0);
  const [parishName, setParishName] = useState('');
  const [sundayLiturgyTime, setSundayLiturgyTime] = useState(new Date(2024, 0, 1, 9, 0));
  const [saturdayVespers, setSaturdayVespers] = useState<Date | null>(null);
  const [weekdayLiturgy, setWeekdayLiturgy] = useState<Date | null>(null);
  const [julianEnabled, setJulianEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'sunday' | 'saturday' | 'weekday' | null>(null);

  const nextStep = () => {
    if (step === 0 && !parishName.trim()) {
      Alert.alert(t('onboarding.requiredField'), t('onboarding.enterParish'));
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      const settings: ParishSettings = {
        parishName: parishName.trim(),
        sundayLiturgyTime: format(sundayLiturgyTime, 'HH:mm'),
        saturdayVespersTime: saturdayVespers ? format(saturdayVespers, 'HH:mm') : undefined,
        weekdayLiturgyTime: weekdayLiturgy ? format(weekdayLiturgy, 'HH:mm') : undefined,
        julianCalendarEnabled: julianEnabled,
      };

      await saveParishSettings(settings);
      await setOnboarded(true);
      await saveJulianEnabled(julianEnabled);

      setParishSettingsStore(settings);
      setOnboardedStore(true);
      setJulianCalendarEnabledStore(julianEnabled);

      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(t('onboarding.error'), t('onboarding.saveFailed'));
      console.error('Onboarding error:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="sunny" size={48} color={Colors.warm.primary} />
            </View>
            <Text style={styles.title}>{t('onboarding.welcome')}</Text>
            <Text style={styles.subtitle}>
              {t('onboarding.welcomeSubtitle')}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('onboarding.parishQuestion')}</Text>
              <TextInput
                style={styles.input}
                value={parishName}
                onChangeText={setParishName}
                placeholder={t('onboarding.parishPlaceholder')}
                placeholderTextColor={Colors.warm.textSecondary}
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="time" size={48} color={Colors.warm.primary} />
            </View>
            <Text style={styles.title}>{t('onboarding.sundayLiturgy')}</Text>
            <Text style={styles.subtitle}>
              {t('onboarding.sundaySubtitle')} {parishName || '...'}?
            </Text>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker('sunday')}
            >
              <Text style={styles.timeButtonText}>
                {format(sundayLiturgyTime, 'h:mm a')}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && showTimePicker === 'sunday' && (
              <DateTimePicker
                value={sundayLiturgyTime}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setSundayLiturgyTime(date);
                }}
              />
            )}

            {Platform.OS === 'android' && showTimePicker === 'sunday' && (
              <DateTimePicker
                value={sundayLiturgyTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(null);
                  if (date) setSundayLiturgyTime(date);
                }}
              />
            )}

            <Text style={styles.note}>
              {t('onboarding.sundayNote')}
            </Text>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="moon" size={48} color={Colors.warm.primary} />
            </View>
            <Text style={styles.title}>{t('onboarding.otherServices')}</Text>
            <Text style={styles.subtitle}>
              {t('onboarding.otherServicesSubtitle')}
            </Text>

            <View style={styles.optionalServiceContainer}>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>{t('onboarding.saturdayVespers')}</Text>
                {saturdayVespers ? (
                  <View style={styles.serviceTimeRow}>
                    <Text style={styles.serviceTime}>{format(saturdayVespers, 'h:mm a')}</Text>
                    <TouchableOpacity onPress={() => setSaturdayVespers(null)}>
                      <Ionicons name="close-circle" size={24} color={Colors.warm.red} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addTimeButton}
                    onPress={() => {
                      setSaturdayVespers(new Date(2024, 0, 1, 17, 0));
                      setShowTimePicker('saturday');
                    }}
                  >
                    <Ionicons name="add-circle" size={24} color={Colors.warm.primary} />
                    <Text style={styles.addTimeText}>{t('onboarding.addTime')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>{t('onboarding.weekdayLiturgy')}</Text>
                {weekdayLiturgy ? (
                  <View style={styles.serviceTimeRow}>
                    <Text style={styles.serviceTime}>{format(weekdayLiturgy, 'h:mm a')}</Text>
                    <TouchableOpacity onPress={() => setWeekdayLiturgy(null)}>
                      <Ionicons name="close-circle" size={24} color={Colors.warm.red} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addTimeButton}
                    onPress={() => {
                      setWeekdayLiturgy(new Date(2024, 0, 1, 7, 0));
                      setShowTimePicker('weekday');
                    }}
                  >
                    <Ionicons name="add-circle" size={24} color={Colors.warm.primary} />
                    <Text style={styles.addTimeText}>{t('onboarding.addTime')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {Platform.OS === 'ios' && showTimePicker === 'saturday' && saturdayVespers && (
              <DateTimePicker
                value={saturdayVespers}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setSaturdayVespers(date);
                }}
              />
            )}

            {Platform.OS === 'ios' && showTimePicker === 'weekday' && weekdayLiturgy && (
              <DateTimePicker
                value={weekdayLiturgy}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setWeekdayLiturgy(date);
                }}
              />
            )}

            {Platform.OS === 'android' && showTimePicker === 'saturday' && saturdayVespers && (
              <DateTimePicker
                value={saturdayVespers}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(null);
                  if (date) setSaturdayVespers(date);
                }}
              />
            )}

            {Platform.OS === 'android' && showTimePicker === 'weekday' && weekdayLiturgy && (
              <DateTimePicker
                value={weekdayLiturgy}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(null);
                  if (date) setWeekdayLiturgy(date);
                }}
              />
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={48} color={Colors.warm.primary} />
            </View>
            <Text style={styles.title}>{t('onboarding.julianCalendar')}</Text>
            <Text style={styles.subtitle}>
              {t('onboarding.julianSubtitle')}
            </Text>

            <TouchableOpacity
              style={[styles.optionButton, julianEnabled && styles.optionButtonActive]}
              onPress={() => setJulianEnabled(!julianEnabled)}
            >
              <Ionicons
                name={julianEnabled ? 'checkbox' : 'square-outline'}
                size={24}
                color={julianEnabled ? Colors.warm.primary : Colors.warm.textSecondary}
              />
              <Text style={[styles.optionText, julianEnabled && styles.optionTextActive]}>
                {t('onboarding.showJulian')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              {t('onboarding.julianNote')}
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressContainer}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === step && styles.progressDotActive,
                  i < step && styles.progressDotCompleted
                ]}
              />
            ))}
          </View>

          {renderStep()}

          <View style={styles.buttonContainer}>
            {step > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                <Ionicons name="arrow-back" size={20} color={Colors.warm.secondary} />
                <Text style={styles.backButtonText}>{t('onboarding.back')}</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.completeButton} onPress={completeOnboarding}>
                <Text style={styles.completeButtonText}>{t('onboarding.getStarted')}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warm.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 10,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warm.divider,
  },
  progressDotActive: {
    backgroundColor: Colors.warm.primary,
    width: 30,
  },
  progressDotCompleted: {
    backgroundColor: Colors.warm.secondary,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.warm.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.warm.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.warm.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.warm.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warm.text,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.warm.divider,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: Colors.warm.surface,
    color: Colors.warm.text,
  },
  timeButton: {
    backgroundColor: Colors.warm.surface,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: Colors.warm.primary,
  },
  timeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.warm.primary,
  },
  note: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 30,
  },
  optionalServiceContainer: {
    width: '100%',
    marginTop: 20,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.divider,
  },
  serviceLabel: {
    fontSize: 16,
    color: Colors.warm.text,
  },
  serviceTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warm.primary,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addTimeText: {
    fontSize: 14,
    color: Colors.warm.primary,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.warm.divider,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
    backgroundColor: Colors.warm.surface,
  },
  optionButtonActive: {
    borderColor: Colors.warm.primary,
    backgroundColor: Colors.calendar.feastBackground,
  },
  optionText: {
    fontSize: 16,
    color: Colors.warm.textSecondary,
  },
  optionTextActive: {
    color: Colors.warm.text,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.warm.secondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.warm.secondary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginLeft: 'auto',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.warm.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginLeft: 'auto',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
