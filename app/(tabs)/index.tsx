import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/lib/store/appStore';
import { getOrthodoxEventsForDate, isFastingDay, getJulianDate, formatJulianDisplay } from '@/lib/calendar/orthodoxCalendar';
import { detectMeetingConflicts, getConflictSummary } from '@/lib/calendar/conflictDetection';
import { getMeetingsByDate } from '@/lib/database/sqlite';
import { Meeting, OrthodoxEvent } from '@/lib/types';

interface MarkedDate {
  marked?: boolean;
  dots?: Array<{ color: string; key: string }>;
  selected?: boolean;
  selectedColor?: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const parishSettings = useAppStore((state) => state.parishSettings);
  const meetings = useAppStore((state) => state.meetings);
  const julianCalendarEnabled = useAppStore((state) => state.julianCalendarEnabled);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  
  const [markedDates, setMarkedDates] = useState<{ [key: string]: MarkedDate }>({});
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<OrthodoxEvent[]>([]);
  const [selectedDayMeetings, setSelectedDayMeetings] = useState<Meeting[]>([]);

  // Generate marked dates for the calendar
  useEffect(() => {
    const generateMarkedDates = () => {
      const marked: { [key: string]: MarkedDate } = {};
      
      // Get current month and adjacent months
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      
      // Iterate through dates to mark Orthodox events and meetings
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = format(d, 'yyyy-MM-dd');
        const dots: Array<{ color: string; key: string }> = [];
        
        // Check for Orthodox events
        const orthodoxEvents = getOrthodoxEventsForDate(d);
        if (orthodoxEvents.length > 0) {
          const hasGreatFeast = orthodoxEvents.some(e => e.level === 'great');
          const hasMajorFeast = orthodoxEvents.some(e => e.level === 'major');
          
          if (hasGreatFeast) {
            dots.push({ color: Colors.orthodox.gold, key: 'orthodox-great' });
          } else if (hasMajorFeast) {
            dots.push({ color: Colors.orthodox.royalBlue, key: 'orthodox-major' });
          } else {
            dots.push({ color: Colors.orthodox.purple, key: 'orthodox-minor' });
          }
        }
        
        // Check for fasting
        const fastingType = isFastingDay(d);
        if (fastingType !== 'none') {
          dots.push({ color: Colors.orthodox.burgundy, key: 'fasting' });
        }
        
        // Check for meetings
        const dayMeetings = meetings.filter(m => m.date === dateString);
        if (dayMeetings.length > 0) {
          dots.push({ color: Colors.orthodox.green, key: 'meeting' });
          
          // Check for conflicts
          if (parishSettings) {
            const hasConflict = dayMeetings.some(meeting => {
              const conflicts = detectMeetingConflicts(meeting, parishSettings);
              return conflicts.length > 0;
            });
            
            if (hasConflict) {
              dots.push({ color: Colors.orthodox.red, key: 'conflict' });
            }
          }
        }
        
        if (dots.length > 0) {
          marked[dateString] = { dots };
        }
      }
      
      // Mark selected date
      if (selectedDate) {
        marked[selectedDate] = {
          ...marked[selectedDate],
          selected: true,
          selectedColor: Colors.orthodox.royalBlue,
        };
      }
      
      setMarkedDates(marked);
    };
    
    generateMarkedDates();
  }, [meetings, selectedDate, parishSettings]);

  const handleDayPress = async (day: DateData) => {
    setSelectedDate(day.dateString);
    const date = parse(day.dateString, 'yyyy-MM-dd', new Date());
    
    // Get Orthodox events for this day
    const orthodoxEvents = getOrthodoxEventsForDate(date);
    setSelectedDayEvents(orthodoxEvents);
    
    // Get meetings for this day
    const dayMeetings = meetings.filter(m => m.date === day.dateString);
    setSelectedDayMeetings(dayMeetings);
    
    // Show day modal
    setDayModalVisible(true);
  };

  const handleAddMeeting = () => {
    setDayModalVisible(false);
    router.push({
      pathname: '/meeting/new',
      params: { date: selectedDate },
    });
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setDayModalVisible(false);
    router.push({
      pathname: `/meeting/${meeting.id}`,
    });
  };

  const renderDayModal = () => {
    if (!selectedDate) return null;
    
    const date = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const fastingType = isFastingDay(date);
    const julianDate = julianCalendarEnabled ? formatJulianDisplay(date) : null;
    
    return (
      <Modal
        visible={dayModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalDate}>{format(date, 'EEEE, MMMM d, yyyy')}</Text>
              {julianDate && (
                <Text style={styles.julianDate}>{julianDate}</Text>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDayModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.orthodox.darkGray} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Orthodox Events Section */}
              {selectedDayEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Orthodox Calendar</Text>
                  {selectedDayEvents.map((event, index) => (
                    <View key={index} style={styles.eventCard}>
                      <View style={[styles.eventIndicator, { backgroundColor: getLevelColor(event.level) }]} />
                      <View style={styles.eventContent}>
                        <Text style={styles.eventName}>{event.name}</Text>
                        {event.nameEn && (
                          <Text style={styles.eventNameEn}>{event.nameEn}</Text>
                        )}
                        {event.liturgyRequired && parishSettings && (
                          <Text style={styles.liturgyTime}>
                            🕐 Liturgy at {parishSettings.sundayLiturgyTime}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Fasting Info */}
              {fastingType !== 'none' && (
                <View style={styles.fastingInfo}>
                  <Ionicons name="restaurant-outline" size={20} color={Colors.orthodox.burgundy} />
                  <Text style={styles.fastingText}>
                    {getFastingDescription(fastingType)}
                  </Text>
                </View>
              )}
              
              {/* Meetings Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Business Meetings</Text>
                  <TouchableOpacity style={styles.addButton} onPress={handleAddMeeting}>
                    <Ionicons name="add-circle" size={24} color={Colors.orthodox.royalBlue} />
                  </TouchableOpacity>
                </View>
                
                {selectedDayMeetings.length > 0 ? (
                  selectedDayMeetings.map((meeting) => {
                    const conflicts = parishSettings ? detectMeetingConflicts(meeting, parishSettings) : [];
                    return (
                      <TouchableOpacity
                        key={meeting.id}
                        style={styles.meetingCard}
                        onPress={() => handleEditMeeting(meeting)}
                      >
                        <View style={styles.meetingTime}>
                          <Text style={styles.meetingTimeText}>
                            {meeting.startTime} - {meeting.endTime}
                          </Text>
                        </View>
                        <View style={styles.meetingContent}>
                          <Text style={styles.meetingTitle}>{meeting.title}</Text>
                          {meeting.location && (
                            <Text style={styles.meetingLocation}>📍 {meeting.location}</Text>
                          )}
                          {conflicts.length > 0 && (
                            <View style={styles.conflictWarning}>
                              <Ionicons name="warning" size={16} color={Colors.orthodox.red} />
                              <Text style={styles.conflictText}>
                                {conflicts[0].orthodoxEvent.name}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.noMeetingsText}>No meetings scheduled</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'great': return Colors.orthodox.gold;
      case 'major': return Colors.orthodox.royalBlue;
      case 'minor': return Colors.orthodox.purple;
      default: return Colors.orthodox.lightGray;
    }
  };

  const getFastingDescription = (type: string) => {
    switch (type) {
      case 'lent': return 'Great Lent - Strict fasting';
      case 'strict': return 'Strict fast day';
      case 'regular': return 'Regular fast day (no meat, dairy, eggs)';
      default: return 'Fasting day';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.parishName}>{parishSettings?.parishName || 'Orthodox Calendar'}</Text>
        <View style={styles.headerButtons}>
          {julianCalendarEnabled && (
            <View style={styles.julianIndicator}>
              <Text style={styles.julianText}>Julian</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push('/meeting/new')}>
            <Ionicons name="add-circle" size={30} color={Colors.orthodox.royalBlue} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Calendar
        style={styles.calendar}
        markedDates={markedDates}
        onDayPress={handleDayPress}
        markingType="multi-dot"
        theme={{
          backgroundColor: Colors.orthodox.white,
          calendarBackground: Colors.orthodox.white,
          textSectionTitleColor: Colors.orthodox.darkGray,
          selectedDayBackgroundColor: Colors.orthodox.royalBlue,
          selectedDayTextColor: Colors.orthodox.white,
          todayTextColor: Colors.orthodox.gold,
          dayTextColor: Colors.orthodox.darkGray,
          textDisabledColor: '#d9e1e8',
          dotColor: Colors.orthodox.royalBlue,
          selectedDotColor: Colors.orthodox.white,
          arrowColor: Colors.orthodox.royalBlue,
          monthTextColor: Colors.orthodox.darkGray,
          indicatorColor: Colors.orthodox.royalBlue,
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
      />
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orthodox.gold }]} />
          <Text style={styles.legendText}>Great Feast</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orthodox.royalBlue }]} />
          <Text style={styles.legendText}>Major Feast</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orthodox.green }]} />
          <Text style={styles.legendText}>Meeting</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orthodox.red }]} />
          <Text style={styles.legendText}>Conflict</Text>
        </View>
      </View>
      
      {renderDayModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.orthodox.lightGray,
  },
  parishName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  julianIndicator: {
    backgroundColor: Colors.orthodox.purple,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  julianText: {
    color: Colors.orthodox.white,
    fontSize: 12,
    fontWeight: '600',
  },
  calendar: {
    marginBottom: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.orthodox.lightGray,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.orthodox.darkGray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.orthodox.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.orthodox.lightGray,
  },
  modalDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
  },
  julianDate: {
    fontSize: 14,
    color: Colors.orthodox.purple,
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginBottom: 10,
  },
  addButton: {
    padding: 5,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    padding: 10,
    backgroundColor: Colors.orthodox.lightGray,
    borderRadius: 8,
  },
  eventIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  eventNameEn: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  liturgyTime: {
    fontSize: 12,
    color: Colors.orthodox.royalBlue,
    marginTop: 4,
  },
  fastingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.calendar.fastingBackground,
    borderRadius: 8,
    marginBottom: 20,
  },
  fastingText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.orthodox.burgundy,
  },
  meetingCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.orthodox.lightGray,
    borderRadius: 8,
    marginBottom: 10,
  },
  meetingTime: {
    marginRight: 15,
  },
  meetingTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  meetingContent: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  meetingLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding: 4,
    backgroundColor: Colors.calendar.conflictBackground,
    borderRadius: 4,
  },
  conflictText: {
    fontSize: 11,
    color: Colors.orthodox.red,
    marginLeft: 4,
  },
  noMeetingsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
