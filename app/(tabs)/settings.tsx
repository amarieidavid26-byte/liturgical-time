import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { saveParishSettings, clearAllData } from '../../lib/utils/storage';
import { deleteAllMeetings, saveParishSettingsDb, deleteParishSettingsDb } from '../../lib/database/sqlite';
import { useTranslation } from '../../lib/hooks/useTranslation';

export default function SettingsScreen() {
  const { parishSettings, setParishSettings, julianCalendarEnabled, toggleJulianCalendar, language, setLanguage, reset } = useAppStore();
  const t = useTranslation();
  
  const [parishName, setParishName] = useState(parishSettings?.parishName || '');
  const [sundayTime, setSundayTime] = useState(
    parishSettings?.sundayLiturgyTime
      ? new Date(2024, 0, 1, parseInt(parishSettings.sundayLiturgyTime.split(':')[0]), parseInt(parishSettings.sundayLiturgyTime.split(':')[1]))
      : new Date(2024, 0, 1, 9, 0)
  );
  const [showSundayPicker, setShowSundayPicker] = useState(false);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSaveSettings = async () => {
    if (!parishName.trim()) {
      Alert.alert('Error', 'Parish name is required');
      return;
    }

    try {
      const settings = {
        ...parishSettings,
        parishName: parishName.trim(),
        sundayLiturgyTime: formatTime(sundayTime),
        julianCalendarEnabled,
      };
      await saveParishSettingsDb(settings);
      await saveParishSettings(settings);
      setParishSettings(settings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleClearMeetings = () => {
    Alert.alert(
      'Clear All Meetings',
      'Are you sure you want to delete all meetings? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllMeetings();
              Alert.alert('Success', 'All meetings have been deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear meetings');
            }
          },
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'Are you sure you want to reset the app? This will delete all data including parish settings and meetings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllMeetings();
              await deleteParishSettingsDb();
              await clearAllData();
              reset();
              router.replace('/onboarding' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parish Information</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.label}>Parish Name</Text>
          <TextInput
            style={styles.input}
            value={parishName}
            onChangeText={setParishName}
            placeholder="Enter parish name"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.label}>Sunday Liturgy Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowSundayPicker(true)}
          >
            <Text style={styles.timeButtonText}>{formatTime(sundayTime)}</Text>
            <Ionicons name="time" size={20} color={Colors.orthodox.royalBlue} />
          </TouchableOpacity>
        </View>

        {showSundayPicker && (
          <DateTimePicker
            value={sundayTime}
            mode="time"
            display="spinner"
            onChange={(event, date) => {
              setShowSundayPicker(false);
              if (date) setSundayTime(date);
            }}
          />
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calendar Display</Text>
        
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.label}>{t.useJulianCalendar}</Text>
            <Text style={styles.sublabel}>Display Julian dates alongside Gregorian</Text>
          </View>
          <Switch
            value={julianCalendarEnabled}
            onValueChange={toggleJulianCalendar}
            trackColor={{ false: Colors.orthodox.lightGray, true: Colors.orthodox.royalBlue }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.language}</Text>
        
        <View style={styles.languageButtons}>
          <TouchableOpacity
            style={[styles.languageButton, language === 'ro' && styles.languageButtonActive]}
            onPress={() => setLanguage('ro')}
          >
            <Text style={[styles.languageButtonText, language === 'ro' && styles.languageButtonTextActive]}>
              🇷🇴 {t.romanian}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.languageButtonText, language === 'en' && styles.languageButtonTextActive]}>
              🇬🇧 {t.english}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearMeetings}>
          <Ionicons name="trash" size={20} color={Colors.orthodox.red} />
          <Text style={styles.dangerButtonText}>Clear All Meetings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleResetApp}>
          <Ionicons name="refresh" size={20} color={Colors.orthodox.red} />
          <Text style={styles.dangerButtonText}>Reset App</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>App Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Calendar Source</Text>
          <Text style={styles.aboutValue}>Romanian Orthodox Calendar</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    opacity: 0.6,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.orthodox.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.orthodox.lightBlue,
    padding: 12,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.orthodox.royalBlue,
  },
  saveButton: {
    backgroundColor: Colors.orthodox.royalBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: Colors.orthodox.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.orthodox.red,
    marginBottom: 12,
  },
  dangerButtonText: {
    color: Colors.orthodox.red,
    fontSize: 16,
    fontWeight: '600',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.orthodox.lightGray,
  },
  aboutLabel: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  aboutValue: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
    opacity: 0.6,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.orthodox.lightGray,
    alignItems: 'center',
  },
  languageButtonActive: {
    borderColor: Colors.orthodox.royalBlue,
    backgroundColor: Colors.orthodox.lightBlue,
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  languageButtonTextActive: {
    color: Colors.orthodox.royalBlue,
  },
});
