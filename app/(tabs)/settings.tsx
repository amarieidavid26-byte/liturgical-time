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
import { useTranslation } from 'react-i18next';
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
import i18n from '@/lib/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
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
  const [language, setLanguage] = useState<'ro' | 'en'>(i18n.language as 'ro' | 'en');

  const liturgyTime = parishSettings?.sundayLiturgyTime || '09:00';
  const [hours, minutes] = liturgyTime.split(':').map(Number);
  const liturgyDate = new Date(2024, 0, 1, hours, minutes);

  const handleLanguageChange = (lang: 'ro' | 'en') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleSaveParishName = async () => {
    if (!parishSettings) return;
    try {
      const updated: ParishSettings = { ...parishSettings, parishName: parishName.trim() };
      await saveParishSettings(updated);
      setParishSettingsStore(updated);
      Alert.alert(t('settings.saved'), t('settings.parishUpdated'));
    } catch {
      Alert.alert(t('settings.error'), t('settings.saveFailed'));
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
      Alert.alert(t('settings.error'), t('settings.saveFailed'));
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
      Alert.alert(t('settings.error'), t('settings.saveFailed'));
    }
  };

  const handleCalendarSyncToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        Alert.alert(t('settings.permissionRequired'), t('settings.calendarPermission'));
        return;
      }

      try {
        await getOrCreateAppCalendar();
        await saveCalendarSyncEnabled(true);
        setCalendarSyncEnabledStore(true);

        const meetings = await getAllMeetings();
        if (meetings.length > 0) {
          Alert.alert(
            t('settings.syncExisting'),
            t('settings.syncExistingMsg', { count: meetings.length }),
            [
              { text: t('settings.notNow'), style: 'cancel' },
              {
                text: t('settings.syncAll'),
                onPress: async () => {
                  const count = await syncAllMeetingsToCalendar();
                  const allMeetings = await getAllMeetings();
                  setMeetings(allMeetings);
                  Alert.alert(t('settings.done'), t('settings.syncedMsg', { count }));
                },
              },
            ]
          );
        }
      } catch {
        Alert.alert(t('settings.error'), t('settings.syncSetupFailed'));
      }
    } else {
      Alert.alert(
        t('settings.disableSync'),
        t('settings.disableSyncMsg'),
        [
          { text: t('settings.cancel'), style: 'cancel' },
          {
            text: t('settings.disable'),
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
      t('settings.deleteAllTitle'),
      t('settings.deleteAllMsg'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAll'),
          style: 'destructive',
          onPress: async () => {
            try {
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
              Alert.alert(t('settings.done'), t('settings.allDeleted'));
            } catch {
              Alert.alert(t('settings.error'), t('settings.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      t('settings.resetTitle'),
      t('settings.resetMsg'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllMeetings();
              await clearAllAppData();
              reset();
              setOnboarded(false);
            } catch {
              Alert.alert(t('settings.error'), t('settings.resetFailed'));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>

        {/* Parish Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.parishSettings')}</Text>

          <Text style={styles.label}>{t('settings.parishName')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={parishName}
              onChangeText={setParishName}
              placeholder={t('settings.parishPlaceholder')}
              placeholderTextColor={Colors.warm.textSecondary}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveParishName}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t('settings.sundayLiturgy')}</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={Colors.warm.primary} />
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
              <Text style={styles.doneButtonText}>{t('common.done')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.calendarSection')}</Text>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="calendar-outline" size={20} color={Colors.warm.fasting} />
              <Text style={styles.rowText}>{t('settings.julianDates')}</Text>
            </View>
            <Switch
              value={julianCalendarEnabled}
              onValueChange={handleJulianToggle}
              trackColor={{ false: Colors.warm.divider, true: Colors.warm.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="language-outline" size={20} color={Colors.warm.accent} />
              <Text style={styles.rowText}>{t('settings.language')}</Text>
            </View>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segment, language === 'ro' && styles.segmentActive]}
                onPress={() => handleLanguageChange('ro')}
              >
                <Text style={[styles.segmentText, language === 'ro' && styles.segmentTextActive]}>
                  Română
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, language === 'en' && styles.segmentActive]}
                onPress={() => handleLanguageChange('en')}
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
          <Text style={styles.sectionTitle}>{t('settings.calendarSync')}</Text>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Ionicons name="sync-outline" size={20} color={calendarSyncEnabled ? Colors.warm.primary : Colors.warm.textSecondary} />
              <View>
                <Text style={styles.rowText}>{t('settings.syncDevice')}</Text>
                {calendarSyncEnabled && (
                  <Text style={styles.syncActiveText}>{t('settings.active')}</Text>
                )}
              </View>
            </View>
            <Switch
              value={calendarSyncEnabled}
              onValueChange={handleCalendarSyncToggle}
              trackColor={{ false: Colors.warm.divider, true: Colors.warm.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.dataManagement')}</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAllMeetings}>
            <Ionicons name="trash-outline" size={20} color={Colors.warm.red} />
            <Text style={styles.dangerButtonText}>{t('settings.deleteAllMeetings')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerButton, { borderColor: Colors.warm.red }]}
            onPress={handleResetApp}
          >
            <Ionicons name="refresh-outline" size={20} color={Colors.warm.red} />
            <Text style={styles.dangerButtonText}>{t('settings.resetApp')}</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Timpul Liturgic</Text>
            <Text style={styles.aboutValue}>v2.1.0</Text>
          </View>
          <Text style={styles.aboutDescription}>
            {t('settings.aboutDescription')}
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
    backgroundColor: Colors.warm.background,
  },
  scrollView: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.warm.text,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.divider,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warm.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.warm.text,
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
    borderColor: Colors.warm.divider,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.warm.surface,
    color: Colors.warm.text,
  },
  saveButton: {
    backgroundColor: Colors.warm.primary,
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
    backgroundColor: Colors.warm.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warm.divider,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warm.primary,
  },
  doneButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.warm.primary,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
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
    color: Colors.warm.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.warm.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.warm.divider,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: Colors.warm.secondary,
  },
  segmentText: {
    fontSize: 13,
    color: Colors.warm.text,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  syncActiveText: {
    fontSize: 12,
    color: Colors.warm.green,
    fontWeight: '500',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.warm.divider,
    borderRadius: 8,
    marginBottom: 10,
  },
  dangerButtonText: {
    fontSize: 16,
    color: Colors.warm.red,
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
    color: Colors.warm.text,
  },
  aboutValue: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
  },
  aboutDescription: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
    lineHeight: 20,
  },
});
