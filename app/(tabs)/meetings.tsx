import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isPast } from 'date-fns';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { deleteMeeting, getAllMeetings } from '../../lib/database/sqlite';
import { detectConflicts } from '../../lib/calendar/conflictDetection';
import { Meeting } from '../../lib/types';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { deleteMeetingFromCalendar } from '../../lib/calendar/calendarSyncService';

export default function MeetingsScreen() {
  const { meetings, setMeetings, parishSettings, calendarSyncEnabled } = useAppStore();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);
  const t = useTranslation();
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

  useEffect(() => {
    const now = new Date();
    const upcoming = meetings.filter((m) => !isPast(parseISO(m.date)) || parseISO(m.date).toDateString() === now.toDateString());
    const past = meetings.filter((m) => isPast(parseISO(m.date)) && parseISO(m.date).toDateString() !== now.toDateString());
    setUpcomingMeetings(upcoming);
    setPastMeetings(past);
  }, [meetings]);

  const handleDeleteMeeting = (meeting: Meeting) => {
    Alert.alert(
      t.deleteMeeting,
      `${t.confirmDelete} "${meeting.title}"?`,
      [
        { 
          text: t.cancel, 
          style: 'cancel',
          onPress: () => {
            if (meeting.id) {
              swipeableRefs.current.get(meeting.id)?.close();
            }
          }
        },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              if (meeting.id) {
                if (calendarSyncEnabled) {
                  await deleteMeetingFromCalendar(meeting);
                }
                await deleteMeeting(meeting.id);
                const updated = await getAllMeetings();
                setMeetings(updated);
                swipeableRefs.current.delete(meeting.id);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meeting');
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (meeting: Meeting) => () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => handleDeleteMeeting(meeting)}
    >
      <Ionicons name="trash" size={24} color={Colors.orthodox.white} />
    </TouchableOpacity>
  );

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const conflict = detectConflicts(item, parishSettings);
    const meetingDate = parseISO(item.date);

    return (
      <Swipeable
        ref={(ref) => {
          if (ref && item.id) {
            swipeableRefs.current.set(item.id, ref);
          }
        }}
        renderRightActions={renderRightActions(item)}
      >
        <TouchableOpacity
          style={[
            styles.meetingCard,
            conflict && styles.meetingCardConflict,
          ]}
          onPress={() => router.push(`/meeting/${item.id}`)}
        >
          <View style={styles.meetingHeader}>
            <Text style={styles.meetingTitle}>{item.title}</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.orthodox.darkGray}
            />
          </View>
          <View style={styles.meetingDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={16} color={Colors.orthodox.darkGray} />
              <Text style={styles.detailText}>
                {format(meetingDate, 'MMMM d, yyyy')}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={16} color={Colors.orthodox.darkGray} />
              <Text style={styles.detailText}>
                {item.startTime} - {item.endTime}
              </Text>
            </View>
            {item.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color={Colors.orthodox.darkGray} />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
            )}
          </View>
          {conflict && (
            <View style={styles.conflictBanner}>
              <Ionicons name="warning" size={16} color={Colors.orthodox.red} />
              <Text style={styles.conflictText}>{conflict.message}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color={Colors.orthodox.lightGray} />
      <Text style={styles.emptyTitle}>{t.noMeetings}</Text>
      <Text style={styles.emptySubtitle}>{t.addFirstMeeting}</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <FlatList
          data={upcomingMeetings}
          renderItem={renderMeeting}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          ListHeaderComponent={
            upcomingMeetings.length > 0 ? (
              <Text style={styles.sectionTitle}>{t.upcoming}</Text>
            ) : null
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            pastMeetings.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{t.past}</Text>
                {pastMeetings.map((meeting) => (
                  <View key={meeting.id} style={{ opacity: 0.6 }}>
                    {renderMeeting({ item: meeting })}
                  </View>
                ))}
              </>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/meeting/new')}
        >
          <Ionicons name="add" size={32} color={Colors.orthodox.white} />
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginTop: 8,
    marginBottom: 16,
  },
  meetingCard: {
    backgroundColor: Colors.orthodox.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.green,
  },
  meetingCardConflict: {
    borderLeftColor: Colors.orthodox.red,
    backgroundColor: Colors.calendar.conflictBackground,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    flex: 1,
  },
  meetingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(220, 20, 60, 0.1)',
    borderRadius: 6,
  },
  conflictText: {
    fontSize: 12,
    color: Colors.orthodox.red,
    fontWeight: '600',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
    opacity: 0.6,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.orthodox.green,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteAction: {
    backgroundColor: Colors.orthodox.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
    marginBottom: 12,
  },
});
