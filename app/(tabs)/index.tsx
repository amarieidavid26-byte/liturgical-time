import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, subDays } from 'date-fns';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { getMeetingsByDate } from '../../lib/database/sqlite';
import { getOrthodoxEventsForDate, formatJulianDate, isSunday } from '../../lib/calendar/orthodoxCalendar';
import { detectConflicts } from '../../lib/calendar/conflictDetection';
import { Meeting, OrthodoxEvent } from '../../lib/types';

const CustomDay = ({ date, state, marking, onPress }: any) => {
  const julianEnabled = useAppStore(state => state.julianCalendarEnabled);
  const gregorianDate = parseISO(date.dateString);
  
  let julianMonth = '';
  let julianDay = '';
  
  if (julianEnabled) {
    const julianDateObj = subDays(gregorianDate, 13);
    julianMonth = format(julianDateObj, 'MMM');
    julianDay = format(julianDateObj, 'd');
  }
  
  const isSelected = marking?.selected;
  const selectedColor = marking?.selectedColor || Colors.orthodox.royalBlue;
  
  return (
    <TouchableOpacity 
      onPress={() => onPress(date)} 
      style={{ 
        alignItems: 'center', 
        padding: 4,
        backgroundColor: isSelected ? selectedColor : 'transparent',
        borderRadius: 16,
        width: 32,
        height: julianEnabled ? 42 : 32,
        justifyContent: 'center',
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={{
          color: state === 'disabled' ? '#d9d9d9' : isSelected ? Colors.orthodox.white : state === 'today' ? Colors.orthodox.royalBlue : '#2d4150',
          fontWeight: state === 'today' || isSelected ? 'bold' : 'normal',
          fontSize: 16,
        }}>
          {date.day}
        </Text>
        {julianEnabled && (
          <Text style={{ 
            fontSize: 9, 
            color: isSelected ? Colors.orthodox.white : Colors.orthodox.burgundy, 
            marginTop: 1,
            opacity: isSelected ? 0.9 : 1,
            textAlign: 'center',
            lineHeight: 10,
          }}>
            {julianMonth} {julianDay}
          </Text>
        )}
        {marking?.dots && marking.dots.length > 0 && (
          <View style={{ flexDirection: 'row', marginTop: 2 }}>
            {marking.dots.map((dot: any, index: number) => (
              <View
                key={index}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: dot.color,
                  marginHorizontal: 1
                }}
              />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function CalendarScreen() {
  const { parishSettings, meetings, julianCalendarEnabled, selectedDate, setSelectedDate } = useAppStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [dayMeetings, setDayMeetings] = useState<Meeting[]>([]);
  const [dayEvents, setDayEvents] = useState<OrthodoxEvent[]>([]);

  const markedDates = React.useMemo(() => {
    const dates: any = {};
    
    meetings.forEach((meeting) => {
      if (!dates[meeting.date]) {
        dates[meeting.date] = { dots: [] };
      }
      dates[meeting.date].dots.push({ color: Colors.calendar.meetingDot });
      
      const conflict = detectConflicts(meeting, parishSettings);
      if (conflict) {
        dates[meeting.date].dots.push({ color: Colors.calendar.conflictDot });
      }
    });
    
    const today = new Date();
    for (let i = -30; i <= 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const events = getOrthodoxEventsForDate(date);
      events.forEach((event) => {
        if (!dates[dateStr]) {
          dates[dateStr] = { dots: [] };
        }
        const dotColor = event.level === 'great' ? Colors.calendar.greatFeastDot : Colors.calendar.orthodoxDot;
        dates[dateStr].dots.push({ color: dotColor });
      });
      
      if (isSunday(date)) {
        if (!dates[dateStr]) {
          dates[dateStr] = {};
        }
        dates[dateStr].selected = true;
        dates[dateStr].selectedColor = Colors.calendar.sundayBackground;
      }
    }
    
    return dates;
  }, [meetings, parishSettings]);

  const handleDayPress = async (day: any) => {
    setSelectedDate(day.dateString);
    const meetings = await getMeetingsByDate(day.dateString);
    const events = getOrthodoxEventsForDate(parseISO(day.dateString));
    setDayMeetings(meetings);
    setDayEvents(events);
    setModalVisible(true);
  };

  const handleAddMeeting = () => {
    setModalVisible(false);
    setTimeout(() => {
      router.push('/meeting/new');
    }, 300);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{parishSettings?.parishName || 'Orthodox Calendar'}</Text>
        {julianCalendarEnabled && selectedDate && (
          <Text style={styles.julianDate}>Julian: {formatJulianDate(parseISO(selectedDate))}</Text>
        )}
      </View>

      <Calendar
        firstDay={1}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={handleDayPress}
        dayComponent={CustomDay}
        theme={{
          todayTextColor: Colors.orthodox.royalBlue,
          selectedDayBackgroundColor: Colors.orthodox.royalBlue,
          selectedDayTextColor: Colors.orthodox.white,
          arrowColor: Colors.orthodox.royalBlue,
          dotColor: Colors.orthodox.royalBlue,
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddMeeting}>
        <Ionicons name="add" size={32} color={Colors.orthodox.white} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate && format(parseISO(selectedDate), 'MMMM d, yyyy')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.orthodox.darkGray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {dayEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Orthodox Events</Text>
                  {dayEvents.map((event, index) => (
                    <View key={index} style={styles.eventCard}>
                      <Text style={styles.eventName}>{event.name}</Text>
                      {event.nameEn && <Text style={styles.eventNameEn}>{event.nameEn}</Text>}
                      {event.liturgyRequired && (
                        <Text style={styles.eventLiturgy}>Divine Liturgy Required</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {dayMeetings.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Meetings</Text>
                  {dayMeetings.map((meeting) => {
                    const conflict = detectConflicts(meeting, parishSettings);
                    return (
                      <View
                        key={meeting.id}
                        style={[
                          styles.meetingCard,
                          conflict && styles.meetingCardConflict,
                        ]}
                      >
                        <Text style={styles.meetingTitle}>{meeting.title}</Text>
                        <Text style={styles.meetingTime}>
                          {meeting.startTime} - {meeting.endTime}
                        </Text>
                        {meeting.location && (
                          <Text style={styles.meetingLocation}>{meeting.location}</Text>
                        )}
                        {conflict && (
                          <Text style={styles.conflictText}>{conflict.message}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {dayEvents.length === 0 && dayMeetings.length === 0 && (
                <Text style={styles.emptyText}>No events or meetings on this day</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.addButton} onPress={handleAddMeeting}>
              <Ionicons name="add" size={24} color={Colors.orthodox.white} />
              <Text style={styles.addButtonText}>Add Meeting</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.orthodox.royalBlue,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.white,
    textAlign: 'center',
  },
  julianDate: {
    fontSize: 14,
    color: Colors.orthodox.white,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.orthodox.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.orthodox.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: Colors.calendar.feastBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.gold,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  eventNameEn: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    opacity: 0.7,
    marginTop: 4,
  },
  eventLiturgy: {
    fontSize: 12,
    color: Colors.orthodox.royalBlue,
    marginTop: 4,
    fontStyle: 'italic',
  },
  meetingCard: {
    backgroundColor: Colors.orthodox.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.green,
  },
  meetingCardConflict: {
    backgroundColor: Colors.calendar.conflictBackground,
    borderLeftColor: Colors.orthodox.red,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  meetingTime: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    marginTop: 4,
  },
  meetingLocation: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    marginTop: 2,
    opacity: 0.7,
  },
  conflictText: {
    fontSize: 12,
    color: Colors.orthodox.red,
    marginTop: 4,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orthodox.green,
    margin: 20,
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: Colors.orthodox.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
