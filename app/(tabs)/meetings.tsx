import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format, parse } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/lib/store/appStore';
import { deleteMeeting, getAllMeetings } from '@/lib/database/sqlite';
import { detectMeetingConflicts } from '@/lib/calendar/conflictDetection';
import { deleteMeetingFromCalendar } from '@/lib/calendar/calendarSync';
import { Meeting } from '@/lib/types';

export default function MeetingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const meetings = useAppStore((state) => state.meetings);
  const setMeetings = useAppStore((state) => state.setMeetings);
  const removeMeeting = useAppStore((state) => state.removeMeeting);
  const calendarSyncEnabled = useAppStore((state) => state.calendarSyncEnabled);
  const parishSettings = useAppStore((state) => state.parishSettings);

  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    loadMeetings();
  }, []);

  useEffect(() => {
    filterMeetings();
  }, [meetings]);

  const loadMeetings = async () => {
    try {
      const allMeetings = await getAllMeetings();
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const filterMeetings = () => {
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    const upcoming: Meeting[] = [];
    const past: Meeting[] = [];

    meetings.forEach(meeting => {
      if (meeting.date >= todayString) {
        upcoming.push(meeting);
      } else {
        past.push(meeting);
      }
    });

    setUpcomingMeetings(upcoming);
    setPastMeetings(past);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    router.push({
      pathname: `/meeting/${meeting.id}`,
    });
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    Alert.alert(
      t('meetings.deleteMeeting'),
      `${t('meetings.deleteConfirm')} "${meeting.title}"?`,
      [
        { text: t('meetings.cancel'), style: 'cancel' },
        {
          text: t('meetings.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (meeting.id) {
                if (calendarSyncEnabled && meeting.calendarEventId) {
                  await deleteMeetingFromCalendar(meeting.calendarEventId);
                }
                await deleteMeeting(meeting.id);
                removeMeeting(meeting.id);
              }
            } catch (error) {
              Alert.alert(t('meetings.error'), t('meetings.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const meetingDate = parse(item.date, 'yyyy-MM-dd', new Date());
    const conflicts = parishSettings ? detectMeetingConflicts(item, parishSettings) : [];
    const hasHighConflict = conflicts.some(c => c.severity === 'high');

    return (
      <TouchableOpacity
        style={[styles.meetingCard, hasHighConflict && styles.conflictCard]}
        onPress={() => handleEditMeeting(item)}
        onLongPress={() => handleDeleteMeeting(item)}
      >
        <View style={styles.meetingHeader}>
          <View>
            <Text style={styles.meetingTitle}>{item.title}</Text>
            <Text style={styles.meetingDate}>
              {format(meetingDate, 'EEE, MMM d')} • {item.startTime} - {item.endTime}
            </Text>
          </View>
          {conflicts.length > 0 && (
            <Ionicons
              name="warning"
              size={24}
              color={hasHighConflict ? Colors.warm.red : Colors.warm.orange}
            />
          )}
        </View>

        {item.location && (
          <View style={styles.meetingDetails}>
            <Ionicons name="location" size={16} color={Colors.warm.textSecondary} />
            <Text style={styles.meetingLocation}>{item.location}</Text>
          </View>
        )}

        {conflicts.length > 0 && (
          <View style={styles.conflictInfo}>
            <Text style={styles.conflictText}>
              ⚠️ {t('meetings.conflictsWith')} {conflicts[0].orthodoxEvent.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={Colors.warm.divider} />
      <Text style={styles.emptyTitle}>{t('meetings.noMeetings')}</Text>
      <Text style={styles.emptySubtitle}>{t('meetings.noMeetingsSubtitle')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('meetings.title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/meeting/new')}
        >
          <Ionicons name="add-circle" size={32} color={Colors.warm.primary} />
        </TouchableOpacity>
      </View>

      {upcomingMeetings.length === 0 && pastMeetings.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={upcomingMeetings}
          keyExtractor={(item) => item.id?.toString() || ''}
          renderItem={renderMeeting}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            upcomingMeetings.length > 0 ? (
              <Text style={styles.sectionTitle}>{t('meetings.upcoming')}</Text>
            ) : null
          }
          ListFooterComponent={
            pastMeetings.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{t('meetings.past')}</Text>
                <FlatList
                  data={pastMeetings}
                  keyExtractor={(item) => item.id?.toString() || ''}
                  renderItem={renderMeeting}
                  scrollEnabled={false}
                />
              </>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warm.background,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.warm.text,
  },
  addButton: {
    padding: 5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.warm.text,
    marginTop: 20,
    marginBottom: 10,
  },
  meetingCard: {
    backgroundColor: Colors.warm.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  conflictCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warm.red,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warm.text,
    marginBottom: 4,
  },
  meetingDate: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
  },
  meetingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  meetingLocation: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
    marginLeft: 5,
  },
  conflictInfo: {
    marginTop: 10,
    padding: 8,
    backgroundColor: Colors.calendar.conflictBackground,
    borderRadius: 6,
  },
  conflictText: {
    fontSize: 12,
    color: Colors.warm.red,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.warm.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.warm.textSecondary,
    textAlign: 'center',
  },
});
