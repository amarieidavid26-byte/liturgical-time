import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { getMeetingById, updateMeeting, getAllMeetings } from '../../lib/database/sqlite';
import { detectConflicts } from '../../lib/calendar/conflictDetection';
import { Meeting } from '../../lib/types';
import { syncMeetingToCalendar, updateExternalCalendarEvent } from '../../lib/calendar/calendarSyncService';
import { useTranslation } from '../../lib/hooks/useTranslation';

export default function EditMeetingScreen() {
  const { id } = useLocalSearchParams();
  const { parishSettings, setMeetings, calendarSyncEnabled, calendarId } = useAppStore();
  const t = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date(2024, 0, 1, 10, 0));
  const [endTime, setEndTime] = useState(new Date(2024, 0, 1, 11, 0));
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    loadMeeting();
  }, [id]);

  const loadMeeting = async () => {
    try {
      const meetingId = parseInt(id as string);
      const data = await getMeetingById(meetingId);
      if (data) {
        setMeeting(data);
        setTitle(data.title);
        setDate(parseISO(data.date));
        const [startHour, startMin] = data.startTime.split(':');
        setStartTime(new Date(2024, 0, 1, parseInt(startHour), parseInt(startMin)));
        const [endHour, endMin] = data.endTime.split(':');
        setEndTime(new Date(2024, 0, 1, parseInt(endHour), parseInt(endMin)));
        setLocation(data.location || '');
        setNotes(data.notes || '');
      }
    } catch (error) {
      Alert.alert(t.error, t.failedToLoadMeeting);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const checkConflict = () => {
    const updatedMeeting: Meeting = {
      ...meeting,
      title,
      date: format(date, 'yyyy-MM-dd'),
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
      location,
      notes,
    };
    return detectConflicts(updatedMeeting, parishSettings);
  };

  const conflict = checkConflict();

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t.error, t.enterMeetingTitle);
      return;
    }

    if (endTime <= startTime) {
      Alert.alert(t.error, t.endTimeAfterStart);
      return;
    }

    if (conflict && conflict.severity === 'high') {
      Alert.alert(
        t.conflictDetected,
        `${conflict.message}. ${t.save}?`,
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.save, onPress: () => saveMeeting() },
        ]
      );
    } else {
      saveMeeting();
    }
  };

  const saveMeeting = async () => {
    if (!meeting?.id) return;

    try {
      const updatedMeeting: Meeting = {
        ...meeting,
        title: title.trim(),
        date: format(date, 'yyyy-MM-dd'),
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        lastSynced: new Date().toISOString(),
      };

      if (meeting.externalEventId) {
        await updateExternalCalendarEvent(updatedMeeting);
      }

      if (calendarSyncEnabled && calendarId) {
        const calendarEventId = await syncMeetingToCalendar(updatedMeeting, calendarId);
        if (calendarEventId) {
          updatedMeeting.calendarEventId = calendarEventId;
        }
      }

      await updateMeeting(updatedMeeting);
      const updated = await getAllMeetings();
      setMeetings(updated);
      router.back();
    } catch (error) {
      Alert.alert(t.error, t.failedToUpdateMeeting);
      console.error('Error updating meeting:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.orthodox.royalBlue} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Meeting title"
            placeholderTextColor={Colors.orthodox.lightGray}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.timeButtonText}>{format(date, 'MMMM d, yyyy')}</Text>
            <Ionicons name="calendar" size={20} color={Colors.orthodox.royalBlue} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              textColor={Platform.OS === 'ios' ? '#000000' : undefined}
              themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
              style={Platform.OS === 'android' ? { backgroundColor: 'white' } : undefined}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Start Time *</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={styles.timeButtonText}>{formatTime(startTime)}</Text>
              <Ionicons name="time" size={20} color={Colors.orthodox.royalBlue} />
            </TouchableOpacity>
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={Platform.OS === 'ios' ? '#000000' : undefined}
                themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
                style={Platform.OS === 'android' ? { backgroundColor: 'white' } : undefined}
                onChange={(event, selectedTime) => {
                  setShowStartTimePicker(false);
                  if (selectedTime) setStartTime(selectedTime);
                }}
              />
            )}
          </View>

          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Text style={styles.timeButtonText}>{formatTime(endTime)}</Text>
              <Ionicons name="time" size={20} color={Colors.orthodox.royalBlue} />
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor={Platform.OS === 'ios' ? '#000000' : undefined}
                themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
                style={Platform.OS === 'android' ? { backgroundColor: 'white' } : undefined}
                onChange={(event, selectedTime) => {
                  setShowEndTimePicker(false);
                  if (selectedTime) setEndTime(selectedTime);
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Meeting location"
            placeholderTextColor={Colors.orthodox.lightGray}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes"
            placeholderTextColor={Colors.orthodox.lightGray}
            multiline
            numberOfLines={4}
          />
        </View>

        {conflict && (
          <View style={[
            styles.conflictBanner,
            conflict.severity === 'high' && styles.conflictBannerHigh,
            conflict.severity === 'medium' && styles.conflictBannerMedium,
          ]}>
            <Ionicons name="warning" size={20} color={
              conflict.severity === 'high' ? Colors.orthodox.red :
              conflict.severity === 'medium' ? Colors.orthodox.orange :
              Colors.orthodox.yellow
            } />
            <View style={{ flex: 1 }}>
              <Text style={styles.conflictTitle}>Conflict Detected</Text>
              <Text style={styles.conflictMessage}>{conflict.message}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    padding: 12,
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.royalBlue,
  },
  conflictBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginBottom: 20,
  },
  conflictBannerHigh: {
    backgroundColor: 'rgba(220, 20, 60, 0.1)',
  },
  conflictBannerMedium: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginBottom: 4,
  },
  conflictMessage: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
  },
  saveButton: {
    backgroundColor: Colors.orthodox.green,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: Colors.orthodox.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.orthodox.darkGray,
    fontSize: 16,
  },
});
