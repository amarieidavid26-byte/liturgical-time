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
import { format, parse } from 'date-fns';
import Colors from '@/constants/Colors';
import { saveParishSettings, setOnboarded, saveJulianEnabled } from '@/lib/utils/storage';
import { useAppStore } from '@/lib/store/appStore';
import { ParishSettings } from '@/lib/types';

export default function OnboardingScreen() {
  const router = useRouter();
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
      Alert.alert('Required Field', 'Please enter your parish name.');
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
      
      // Save to storage and update store
      await saveParishSettings(settings);
      await setOnboarded(true);
      await saveJulianEnabled(julianEnabled);
      
      setParishSettingsStore(settings);
      setOnboardedStore(true);
      setJulianCalendarEnabledStore(julianEnabled);
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
      console.error('Onboarding error:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Ionicons name="home" size={64} color={Colors.orthodox.royalBlue} style={styles.icon} />
            <Text style={styles.title}>Welcome to Liturgical Time</Text>
            <Text style={styles.subtitle}>
              Let's set up your parish information to help you avoid scheduling conflicts with church services.
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>What's your parish name?</Text>
              <TextInput
                style={styles.input}
                value={parishName}
                onChangeText={setParishName}
                placeholder="e.g., Holy Trinity Orthodox Church"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        );
      
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Ionicons name="time" size={64} color={Colors.orthodox.gold} style={styles.icon} />
            <Text style={styles.title}>Sunday Divine Liturgy</Text>
            <Text style={styles.subtitle}>
              When does Sunday Divine Liturgy typically start at {parishName || 'your parish'}?
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
              This will be used to detect conflicts with Sunday services and major feast days.
            </Text>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Ionicons name="moon" size={64} color={Colors.orthodox.burgundy} style={styles.icon} />
            <Text style={styles.title}>Other Services (Optional)</Text>
            <Text style={styles.subtitle}>
              Add other regular service times if you'd like conflict detection for them.
            </Text>
            
            <View style={styles.optionalServiceContainer}>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>Saturday Vespers</Text>
                {saturdayVespers ? (
                  <View style={styles.serviceTimeRow}>
                    <Text style={styles.serviceTime}>{format(saturdayVespers, 'h:mm a')}</Text>
                    <TouchableOpacity onPress={() => setSaturdayVespers(null)}>
                      <Ionicons name="close-circle" size={24} color={Colors.orthodox.red} />
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
                    <Ionicons name="add-circle" size={24} color={Colors.orthodox.royalBlue} />
                    <Text style={styles.addTimeText}>Add Time</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>Weekday Liturgy</Text>
                {weekdayLiturgy ? (
                  <View style={styles.serviceTimeRow}>
                    <Text style={styles.serviceTime}>{format(weekdayLiturgy, 'h:mm a')}</Text>
                    <TouchableOpacity onPress={() => setWeekdayLiturgy(null)}>
                      <Ionicons name="close-circle" size={24} color={Colors.orthodox.red} />
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
                    <Ionicons name="add-circle" size={24} color={Colors.orthodox.royalBlue} />
                    <Text style={styles.addTimeText}>Add Time</Text>
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
            <Ionicons name="calendar" size={64} color={Colors.orthodox.purple} style={styles.icon} />
            <Text style={styles.title}>Julian Calendar</Text>
            <Text style={styles.subtitle}>
              Would you like to see Mount Athos/Old Calendar dates (13 days behind)?
            </Text>
            
            <TouchableOpacity 
              style={[styles.optionButton, julianEnabled && styles.optionButtonActive]}
              onPress={() => setJulianEnabled(!julianEnabled)}
            >
              <Ionicons 
                name={julianEnabled ? 'checkbox' : 'square-outline'} 
                size={24} 
                color={julianEnabled ? Colors.orthodox.gold : '#999'} 
              />
              <Text style={[styles.optionText, julianEnabled && styles.optionTextActive]}>
                Show Julian Calendar Dates
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.note}>
              You can toggle this later in settings. Julian dates will appear as ghosted dates on the calendar.
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
                <Ionicons name="arrow-back" size={20} color={Colors.orthodox.royalBlue} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            {step < 3 ? (
              <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.completeButton} onPress={completeOnboarding}>
                <Text style={styles.completeButtonText}>Get Started</Text>
                <Ionicons name="checkmark-circle" size={20} color="white" />
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
    backgroundColor: Colors.orthodox.white,
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
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: Colors.orthodox.royalBlue,
    width: 30,
  },
  progressDotCompleted: {
    backgroundColor: Colors.orthodox.gold,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    color: Colors.orthodox.darkGray,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: Colors.orthodox.lightGray,
  },
  timeButton: {
    backgroundColor: Colors.orthodox.lightBlue,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 20,
  },
  timeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.orthodox.royalBlue,
  },
  note: {
    fontSize: 14,
    color: '#999',
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
    borderBottomColor: '#E0E0E0',
  },
  serviceLabel: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  serviceTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.royalBlue,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addTimeText: {
    fontSize: 14,
    color: Colors.orthodox.royalBlue,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
  },
  optionButtonActive: {
    borderColor: Colors.orthodox.gold,
    backgroundColor: Colors.calendar.feastBackground,
  },
  optionText: {
    fontSize: 16,
    color: '#999',
  },
  optionTextActive: {
    color: Colors.orthodox.darkGray,
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
    color: Colors.orthodox.royalBlue,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.orthodox.royalBlue,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginLeft: 'auto',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.orthodox.gold,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginLeft: 'auto',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
