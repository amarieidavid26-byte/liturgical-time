import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/lib/store/appStore';
import {
  saveParishSettings,
  saveJulianEnabled,
  saveCalendarSyncEnabled,
  clearAllAppData,
} from '@/lib/utils/storage';
import { clearAllMeetings, getAllMeetings } from '@/lib/database/sqlite';
import {
  requestCalendarPermissions,
  getOrCreateAppCalendar,
  syncAllMeetingsToCalendar,
  deleteMeetingFromCalendar,
} from '@/lib/calendar/calendarSync';
import { ParishSettings } from '@/lib/types';

export default function SettingsScreen() {
  const parishSettings = useAppStore((state) => state.parishSettings);
  const setParishSettingsStore = useAppStore((state) => state.setParishSettings);
  const julianCalendarEnabled = useAppStore((state) => state.julianCalendarEnabled);
  const setJulianCalendarEnabledStore = useAppStore((state) => state.setJulianCalendarEnabled);
  const setMeetings = useAppStore((state) => state.setMeetings);
  const calendarSyncEnabled = useAppStore((state) => state.calendarSyncEnabled);
  const setCalendarSyncEnabledStore = useAppStore((state) => state.setCalendarSyncEnabled);
  const reset = useAppStore((state) => state.reset);
  const setOnboarded = useAppStore((state) => state.setOnboarded);

  const [parishName, setParishName] = useState(parishSettings?.parishName || '');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [language, setLanguage] = useState<'ro' | 'en'>('ro');

  const liturgyTime = parishSettings?.sundayLiturgyTime || '09:00';
  const [hours, minutes] = liturgyTime.split(':').map(Number);
  const liturgyDate = new Date(2024, 0, 1, hours, minutes);

  const handleSaveParishName = async () => {
    if (!parishSettings) return;
    try {
      const updated: ParishSettings = { ...parishSettings, parishName: parishName.trim() };
      await saveParishSettings(updated);
      setParishSettingsStore(updated);
      Alert.alert('Saved', 'Parish name updated.');
    } catch {
      Alert.alert('Error', 'Failed to save parish name.');
    }
  };

  const handleLiturgyTimeChange = async (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (!date || !parishSettings) return;
    const timeString = format(date, 'HH:mm');
    const updated: ParishSettings = { ...parishSettings, sundayLiturgyTime: timeString };
    try {
      await saveParishSettings(updated);
      setParishSettingsStore(updated);
    } catch {
      Alert.alert('Error', 'Failed to save liturgy time.');
    }
  };

  const handleJulianToggle = async (value: boolean) => {
    try {
      await saveJulianEnabled(value);
      setJulianCalendarEnabledStore(value);
      if (parishSettings) {
        const updated: ParishSettings = { ...parishSettings, julianCalendarEnabled: value };
        await saveParishSettings(updated);
        setParishSettingsStore(updated);
      }
    } catch {
      Alert.alert('Error', 'Failed to save preference.');
    }
  };

  const handleCalendarSyncToggle = async (value: boolean) => {
    if (value) {
      // Turning ON: request permissions
      const granted = await requestCalendarPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Calendar access is needed to sync meetings. Please enable it in your device Settings.'
        );
        return;
      }

      try {
        await getOrCreateAppCalendar();
        await saveCalendarSyncEnabled(true);
        setCalendarSyncEnabledStore(true);

        // Offer to sync existing meetings
        const meetings = await getAllMeetings();
        if (meetings.length > 0) {
          Alert.alert(
            'Sync Existing Meetings',
            `You have ${meetings.length} meeting${meetings.length > 1 ? 's' : ''}. Would you like to export them to your device calendar?`,
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Sync All',
                onPress: async () => {
                  const count = await syncAllMeetingsToCalendar();
                  const allMeetings = await getAllMeetings();
                  setMeetings(allMeetings);
                  Alert.alert('Done', `${count} meeting${count !== 1 ? 's' : ''} synced to calendar.`);
                },
              },
            ]
          );
        }
      } catch {
        Alert.alert('Error', 'Failed to set up calendar sync.');
      }
    } else {
      // Turning OFF: confirm
      Alert.alert(
        'Disable Calendar Sync',
        'New meetings will no longer be exported to your device calendar. Existing calendar events will remain.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            onPress: async () => {
              await saveCalendarSyncEnabled(false);
              setCalendarSyncEnabledStore(false);
            },
          },
        ]
      );
    }
  };

  const handleDeleteAllMeetings = () => {
    Alert.alert(
      'Delete All Meetings',
      'This will permanently delete all your meetings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete calendar events if sync is enabled
              if (calendarSyncEnabled) {
                const meetings = await getAllMeetings();
                for (const m of meetings) {
                  if (m.calendarEventId) {
                    await deleteMeetingFromCalendar(m.calendarEventId);
                  }
                }
              }
              await clearAllMeetings();
              setMeetings([]);
              Alert.alert('Done', 'All meetings have been deleted.');
            } catch {
              Alert.alert('Error', 'Failed to delete meetings.');
            }
          },
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will delete all data and return to the onboarding screen. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllMeetings();
              await clearAllAppData();
              reset();
              setOnboarded(false);
            } catch {
              Alert.alert('Error', 'Failed to reset app.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Settings</Text>

        {/* Parish Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parish Settings</Text>

          <Text style={styles.label}>Parish Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={parishName}
              onChangeText={setParishName}
              placeholder="Enter parish name"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveParishName}>
              <Ionicons name="checkmark" size={20} color={Colors.orthodox.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Sunday Liturgy Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={Colors.orthodox.royalBlue} />
            <Text style={styles.timeButtonText}>{liturgyTime}</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={liturgyDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={true}
              onChange={handleLiturgyTimeChange}
            />
          )}
          {Platform.OS === 'ios' && showTimePicker && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="calendar-outline" size={20} color={Colors.orthodox.purple} />
              <Text style={styles.rowText}>Julian Calendar Dates</Text>
            </View>
            <Switch
              value={julianCalendarEnabled}
              onValueChange={handleJulianToggle}
              trackColor={{ false: '#E0E0E0', true: Colors.orthodox.gold }}
              thumbColor={Colors.orthodox.white}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="language-outline" size={20} color={Colors.orthodox.royalBlue} />
              <Text style={styles.rowText}>Language</Text>
            </View>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segment, language === 'ro' && styles.segmentActive]}
                onPress={() => setLanguage('ro')}
              >
                <Text style={[styles.segmentText, language === 'ro' && styles.segmentTextActive]}>
                  Română
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, language === 'en' && styles.segmentActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.segmentText, language === 'en' && styles.segmentTextActive]}>
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Calendar Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar Sync</Text>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="sync-outline" size={20} color={calendarSyncEnabled ? Colors.orthodox.royalBlue : '#999'} />
              <View>
                <Text style={styles.rowText}>Sync with Device Calendar</Text>
                {calendarSyncEnabled && (
                  <Text style={styles.syncActiveText}>Active</Text>
                )}
              </View>
            </View>
            <Switch
              value={calendarSyncEnabled}
              onValueChange={handleCalendarSyncToggle}
              trackColor={{ false: '#E0E0E0', true: Colors.orthodox.royalBlue }}
              thumbColor={Colors.orthodox.white}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAllMeetings}>
            <Ionicons name="trash-outline" size={20} color={Colors.orthodox.red} />
            <Text style={styles.dangerButtonText}>Delete All Meetings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerButton, { borderColor: Colors.orthodox.red }]}
            onPress={handleResetApp}
          >
            <Ionicons name="refresh-outline" size={20} color={Colors.orthodox.red} />
            <Text style={styles.dangerButtonText}>Reset App</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Liturgical Time</Text>
            <Text style={styles.aboutValue}>v2.0.0</Text>
          </View>
          <Text style={styles.aboutDescription}>
            An Orthodox calendar for Romanian entrepreneurs. Avoid scheduling conflicts with church
            services and feast days.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  scrollView: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.orthodox.lightGray,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.orthodox.darkGray,
    marginBottom: 8,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.orthodox.lightGray,
    color: Colors.orthodox.darkGray,
  },
  saveButton: {
    backgroundColor: Colors.orthodox.royalBlue,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.orthodox.lightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.royalBlue,
  },
  doneButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.orthodox.royalBlue,
    borderRadius: 8,
  },
  doneButtonText: {
    color: Colors.orthodox.white,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rowText: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.orthodox.lightGray,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  segmentText: {
    fontSize: 13,
    color: Colors.orthodox.darkGray,
  },
  segmentTextActive: {
    color: Colors.orthodox.white,
    fontWeight: '600',
  },
  syncActiveText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 10,
  },
  dangerButtonText: {
    fontSize: 16,
    color: Colors.orthodox.red,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  aboutValue: {
    fontSize: 14,
    color: '#999',
  },
  aboutDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
