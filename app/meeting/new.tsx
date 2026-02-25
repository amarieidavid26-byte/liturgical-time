import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/lib/store/appStore';
import { addMeeting, getAllMeetings } from '@/lib/database/sqlite';
import { detectMeetingConflicts } from '@/lib/calendar/conflictDetection';
import { exportMeetingToCalendar } from '@/lib/calendar/calendarSync';
import { Meeting } from '@/lib/types';

export default function NewMeetingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string }>();
  const parishSettings = useAppStore((state) => state.parishSettings);
  const calendarSyncEnabled = useAppStore((state) => state.calendarSyncEnabled);
  const setMeetings = useAppStore((state) => state.setMeetings);

  const initialDate = params.date
    ? parse(params.date, 'yyyy-MM-dd', new Date())
    : new Date();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(new Date(2024, 0, 1, 9, 0));
  const [endTime, setEndTime] = useState(new Date(2024, 0, 1, 10, 0));
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('meetingForm.requiredField'), t('meetingForm.enterTitle'));
      return;
    }

    const startTimeStr = format(startTime, 'HH:mm');
    const endTimeStr = format(endTime, 'HH:mm');

    if (startTimeStr >= endTimeStr) {
      Alert.alert(t('meetingForm.invalidTime'), t('meetingForm.endAfterStart'));
      return;
    }

    const meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim(),
      date: format(date, 'yyyy-MM-dd'),
      startTime: startTimeStr,
      endTime: endTimeStr,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (parishSettings) {
      const tempMeeting: Meeting = { ...meeting, id: 0 };
      const conflicts = detectMeetingConflicts(tempMeeting, parishSettings);

      if (conflicts.length > 0) {
        const highSeverity = conflicts.some((c) => c.severity === 'high');
        const conflictNames = conflicts.map((c) => c.orthodoxEvent.name).join(', ');

        const result = await new Promise<boolean>((resolve) => {
          Alert.alert(
            highSeverity ? t('meetingForm.schedulingConflict') : t('meetingForm.potentialConflict'),
            `${t('meetingForm.overlapsWith')} ${conflictNames}\n\n`,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('meetingForm.saveAnyway'), onPress: () => resolve(true) },
            ]
          );
        });

        if (!result) return;
      }
    }

    setSaving(true);
    try {
      const newMeetingId = await addMeeting(meeting);
      if (calendarSyncEnabled) {
        await exportMeetingToCalendar({ ...meeting, id: newMeetingId });
      }
      const allMeetings = await getAllMeetings();
      setMeetings(allMeetings);
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('meetingForm.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color={Colors.warm.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('meetingForm.newMeeting')}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
                {saving ? t('meetingForm.saving') : t('meetingForm.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('meetingForm.titleLabel')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('meetingForm.titlePlaceholder')}
              placeholderTextColor={Colors.warm.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('meetingForm.dateLabel')}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.warm.primary} />
              <Text style={styles.pickerText}>{format(date, 'EEEE, d MMMM yyyy', { locale: ro })}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (d) setDate(d);
                }}
                textColor={Colors.warm.text}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneButtonText}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.label}>{t('meetingForm.startTimeLabel')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={Colors.warm.primary} />
                <Text style={styles.pickerText}>{format(startTime, 'h:mm a')}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e, d) => {
                    if (Platform.OS === 'android') setShowStartPicker(false);
                    if (d) setStartTime(d);
                  }}
                  textColor={Colors.warm.text}
                />
              )}
              {Platform.OS === 'ios' && showStartPicker && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowStartPicker(false)}
                >
                  <Text style={styles.doneButtonText}>{t('common.done')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.timeField}>
              <Text style={styles.label}>{t('meetingForm.endTimeLabel')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={Colors.warm.primary} />
                <Text style={styles.pickerText}>{format(endTime, 'h:mm a')}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e, d) => {
                    if (Platform.OS === 'android') setShowEndPicker(false);
                    if (d) setEndTime(d);
                  }}
                  textColor={Colors.warm.text}
                />
              )}
              {Platform.OS === 'ios' && showEndPicker && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowEndPicker(false)}
                >
                  <Text style={styles.doneButtonText}>{t('common.done')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('meetingForm.locationLabel')}</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder={t('meetingForm.locationPlaceholder')}
              placeholderTextColor={Colors.warm.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('meetingForm.notesLabel')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('meetingForm.notesPlaceholder')}
              placeholderTextColor={Colors.warm.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 40 }} />
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.divider,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.warm.text,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warm.primary,
  },
  field: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.warm.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.warm.divider,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.warm.surface,
    color: Colors.warm.text,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.warm.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warm.divider,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.warm.text,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 15,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  timeField: {
    flex: 1,
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
});
