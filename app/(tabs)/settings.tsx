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
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { saveParishSettings, clearAllData, setCalendarSyncEnabled as saveCalendarSyncEnabled, setCalendarId as saveCalendarId } from '../../lib/utils/storage';
import { deleteAllMeetings, saveParishSettingsDb, deleteParishSettingsDb } from '../../lib/database/sqlite';
import { useTranslation } from '../../lib/hooks/useTranslation';
import {
  requestCalendarPermissions,
  getOrCreateCalendar,
  smartImportMeetings,
  syncExternalChanges,
} from '../../lib/calendar/calendarSyncService';
import { getAllMeetings } from '../../lib/database/sqlite';

export default function SettingsScreen() {
  const { 
    parishSettings, 
    setParishSettings, 
    julianCalendarEnabled, 
    toggleJulianCalendar, 
    language, 
    setLanguage, 
    reset,
    calendarSyncEnabled,
    calendarId,
    calendarPermissionStatus,
    setCalendarSyncEnabled,
    setCalendarId,
    setCalendarPermissionStatus,
  } = useAppStore();
  const t = useTranslation();
  
  const [parishName, setParishName] = useState(parishSettings?.parishName || '');
  const [sundayTime, setSundayTime] = useState(
    parishSettings?.sundayLiturgyTime
      ? new Date(2024, 0, 1, parseInt(parishSettings.sundayLiturgyTime.split(':')[0]), parseInt(parishSettings.sundayLiturgyTime.split(':')[1]))
      : new Date(2024, 0, 1, 9, 0)
  );
  const [showSundayPicker, setShowSundayPicker] = useState(false);
  const [isEnablingSync, setIsEnablingSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await smartImportMeetings();
      const syncResult = await syncExternalChanges();
      
      const { setMeetings } = useAppStore.getState();
      const meetings = await getAllMeetings();
      setMeetings(meetings);
      
      Alert.alert(
        'Sync Complete',
        `Imported: ${result.imported} new meetings\nUpdated: ${syncResult.updated} meetings\nDeleted: ${syncResult.deleted} meetings\nSkipped: ${result.skipped} duplicates`
      );
    } catch (error) {
      console.error('Manual sync error:', error);
      Alert.alert('Sync Error', 'Failed to sync calendar. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleCalendarSync = async (enabled: boolean) => {
    if (enabled) {
      setIsEnablingSync(true);
      try {
        const permissionStatus = await requestCalendarPermissions();
        setCalendarPermissionStatus(permissionStatus);

        if (permissionStatus === 'granted') {
          const newCalendarId = await getOrCreateCalendar();
          if (newCalendarId) {
            setCalendarId(newCalendarId);
            setCalendarSyncEnabled(true);
            await saveCalendarId(newCalendarId);
            await saveCalendarSyncEnabled(true);
            Alert.alert(
              'Calendar Sync Enabled',
              'Your meetings will now be synchronized with your device calendar under "Timpul Liturgic".'
            );
          } else {
            Alert.alert('Error', 'Failed to create calendar. Please try again.');
            setCalendarSyncEnabled(false);
            await saveCalendarSyncEnabled(false);
          }
        } else {
          Alert.alert(
            'Permission Denied',
            'Calendar access is required to sync meetings. Please enable calendar permissions in your device settings.'
          );
          setCalendarSyncEnabled(false);
          await saveCalendarSyncEnabled(false);
        }
      } catch (error) {
        console.error('Error enabling calendar sync:', error);
        Alert.alert('Error', 'Failed to enable calendar sync');
        setCalendarSyncEnabled(false);
        await saveCalendarSyncEnabled(false);
      } finally {
        setIsEnablingSync(false);
      }
    } else {
      setCalendarSyncEnabled(false);
      await saveCalendarSyncEnabled(false);
      Alert.alert(
        'Calendar Sync Disabled',
        'New meetings will no longer be synced to your device calendar. Existing calendar events will remain.'
      );
    }
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
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            textColor={Platform.OS === 'ios' ? '#000000' : undefined}
            themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
            style={Platform.OS === 'android' ? { backgroundColor: 'white' } : undefined}
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
        <Text style={styles.sectionTitle}>Calendar Sync</Text>
        
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Sync with Device Calendar</Text>
            <Text style={styles.sublabel}>
              Automatically sync meetings to your device calendar
            </Text>
            {calendarSyncEnabled && calendarPermissionStatus === 'granted' && (
              <View style={styles.syncStatusBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.orthodox.success} />
                <Text style={styles.syncStatusText}>Syncing to "Timpul Liturgic"</Text>
              </View>
            )}
            {calendarPermissionStatus === 'denied' && (
              <View style={[styles.syncStatusBadge, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="alert-circle" size={14} color={Colors.orthodox.danger} />
                <Text style={[styles.syncStatusText, { color: Colors.orthodox.danger }]}>
                  Permission denied
                </Text>
              </View>
            )}
          </View>
          {isEnablingSync ? (
            <ActivityIndicator size="small" color={Colors.orthodox.royalBlue} />
          ) : (
            <Switch
              value={calendarSyncEnabled}
              onValueChange={handleToggleCalendarSync}
              trackColor={{ false: Colors.orthodox.lightGray, true: Colors.orthodox.royalBlue }}
              disabled={isEnablingSync}
            />
          )}
        </View>

        {calendarSyncEnabled && calendarPermissionStatus === 'granted' && (
          <TouchableOpacity 
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={handleManualSync}
            disabled={isSyncing}
          >
            <Ionicons 
              name={isSyncing ? "sync" : "cloud-download"} 
              size={24} 
              color={isSyncing ? Colors.orthodox.darkGray : Colors.orthodox.royalBlue} 
            />
            <Text style={[styles.syncButtonText, isSyncing && styles.syncButtonTextDisabled]}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
            {isSyncing && <ActivityIndicator size="small" color={Colors.orthodox.royalBlue} />}
          </TouchableOpacity>
        )}
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
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  syncStatusText: {
    fontSize: 12,
    color: Colors.orthodox.success,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: Colors.orthodox.lightBlue,
    marginTop: 12,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.royalBlue,
  },
  syncButtonTextDisabled: {
    color: Colors.orthodox.darkGray,
  },
});
