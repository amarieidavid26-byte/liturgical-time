import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/lib/store/appStore';
import { getOrthodoxEventsForDate, isFastingDay, formatJulianDisplay } from '@/lib/calendar/orthodoxCalendar';
import { detectMeetingConflicts } from '@/lib/calendar/conflictDetection';
import { Meeting, OrthodoxEvent } from '@/lib/types';

const getFastingLabel = (type: string, t: (key: string) => string): string => {
  switch (type) {
    case 'lent': return t('calendar.fasting.lentLabel');
    case 'strict': return t('calendar.fasting.strictLabel');
    case 'regular': return t('calendar.fasting.regularLabel');
    default: return '';
  }
};

interface MarkedDate {
  marked?: boolean;
  dots?: Array<{ color: string; key: string }>;
  selected?: boolean;
  selectedColor?: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const parishSettings = useAppStore((state) => state.parishSettings);
  const meetings = useAppStore((state) => state.meetings);
  const julianCalendarEnabled = useAppStore((state) => state.julianCalendarEnabled);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);

  const [markedDates, setMarkedDates] = useState<{ [key: string]: MarkedDate }>({});
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<OrthodoxEvent[]>([]);
  const [selectedDayMeetings, setSelectedDayMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    const generateMarkedDates = () => {
      const marked: { [key: string]: MarkedDate } = {};
      const today = new Date();
      const startDate = new Date(today.getFullYear(), 0, 1);
      const endDate = new Date(today.getFullYear(), 11, 31);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = format(d, 'yyyy-MM-dd');
        const dots: Array<{ color: string; key: string }> = [];

        const orthodoxEvents = getOrthodoxEventsForDate(d);
        if (orthodoxEvents.length > 0) {
          const hasGreatFeast = orthodoxEvents.some(e => e.level === 'great');
          const hasMajorFeast = orthodoxEvents.some(e => e.level === 'major');

          if (hasGreatFeast) {
            dots.push({ color: Colors.warm.primary, key: 'orthodox-great' });
          } else if (hasMajorFeast) {
            dots.push({ color: Colors.warm.accent, key: 'orthodox-major' });
          } else {
            dots.push({ color: Colors.warm.fasting, key: 'orthodox-minor' });
          }
        }

        const fastingType = isFastingDay(d);
        if (fastingType !== 'none') {
          dots.push({ color: Colors.warm.secondary, key: 'fasting' });
        }

        const dayMeetings = meetings.filter(m => m.date === dateString);
        if (dayMeetings.length > 0) {
          dots.push({ color: Colors.warm.green, key: 'meeting' });

          if (parishSettings) {
            const hasConflict = dayMeetings.some(meeting => {
              const conflicts = detectMeetingConflicts(meeting, parishSettings);
              return conflicts.length > 0;
            });
            if (hasConflict) {
              dots.push({ color: Colors.warm.red, key: 'conflict' });
            }
          }
        }

        if (dots.length > 0) {
          marked[dateString] = { dots };
        }
      }

      if (selectedDate) {
        marked[selectedDate] = {
          ...marked[selectedDate],
          selected: true,
          selectedColor: Colors.warm.secondary,
        };
      }

      setMarkedDates(marked);
    };

    generateMarkedDates();
  }, [meetings, selectedDate, parishSettings]);

  const handleDayPress = async (day: DateData) => {
    setSelectedDate(day.dateString);
    const date = parse(day.dateString, 'yyyy-MM-dd', new Date());
    const orthodoxEvents = getOrthodoxEventsForDate(date);
    setSelectedDayEvents(orthodoxEvents);
    const dayMeetings = meetings.filter(m => m.date === day.dateString);
    setSelectedDayMeetings(dayMeetings);
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

  const getTodayHeaderInfo = (): string => {
    const today = new Date();
    const events = getOrthodoxEventsForDate(today);
    const fasting = isFastingDay(today);
    const parts: string[] = [];
    if (events.length > 0) parts.push(events[0].name);
    if (fasting !== 'none') parts.push(getFastingLabel(fasting, t));
    return parts.length > 0 ? parts.join(' · ') : '';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'great': return Colors.warm.primary;
      case 'major': return Colors.warm.accent;
      case 'minor': return Colors.warm.fasting;
      default: return Colors.warm.divider;
    }
  };

  const getFastingDescription = (type: string) => {
    switch (type) {
      case 'lent': return t('calendar.fasting.lent');
      case 'strict': return t('calendar.fasting.strict');
      case 'regular': return t('calendar.fasting.regular');
      default: return t('calendar.fasting.label');
    }
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
                <Ionicons name="close" size={24} color={Colors.warm.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedDayEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('calendar.orthodoxCalendar')}</Text>
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
                            🕐 {t('calendar.liturgyAt')} {parishSettings.sundayLiturgyTime}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {fastingType !== 'none' && (
                <View style={styles.fastingInfo}>
                  <Ionicons name="restaurant-outline" size={20} color={Colors.warm.fasting} />
                  <Text style={styles.fastingText}>
                    {getFastingDescription(fastingType)}
                  </Text>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('calendar.businessMeetings')}</Text>
                  <TouchableOpacity style={styles.addButton} onPress={handleAddMeeting}>
                    <Ionicons name="add-circle" size={24} color={Colors.warm.primary} />
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
                              <Ionicons name="warning" size={16} color={Colors.warm.red} />
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
                  <Text style={styles.noMeetingsText}>{t('calendar.noMeetings')}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.parishName}>{parishSettings?.parishName || t('calendar.orthodoxCalendar')}</Text>
          {getTodayHeaderInfo() !== '' && (
            <Text style={styles.headerFeastText} numberOfLines={1}>{getTodayHeaderInfo()}</Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          {julianCalendarEnabled && (
            <View style={styles.julianIndicator}>
              <Text style={styles.julianText}>{t('calendar.julian')}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push('/meeting/new')}>
            <Ionicons name="add-circle" size={30} color={Colors.warm.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Calendar
        style={styles.calendar}
        markedDates={markedDates}
        onDayPress={handleDayPress}
        markingType="multi-dot"
        firstDay={1}
        theme={{
          backgroundColor: Colors.warm.surface,
          calendarBackground: Colors.warm.surface,
          textSectionTitleColor: Colors.warm.textSecondary,
          selectedDayBackgroundColor: Colors.warm.secondary,
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: Colors.warm.today,
          dayTextColor: Colors.warm.text,
          textDisabledColor: Colors.warm.divider,
          dotColor: Colors.warm.accent,
          selectedDotColor: '#FFFFFF',
          arrowColor: Colors.warm.primary,
          monthTextColor: Colors.warm.text,
          indicatorColor: Colors.warm.primary,
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
          <View style={[styles.legendDot, { backgroundColor: Colors.warm.primary }]} />
          <Text style={styles.legendText}>{t('calendar.greatFeast')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.warm.accent }]} />
          <Text style={styles.legendText}>{t('calendar.majorFeast')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.warm.green }]} />
          <Text style={styles.legendText}>{t('calendar.meeting')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.warm.red }]} />
          <Text style={styles.legendText}>{t('calendar.conflict')}</Text>
        </View>
      </View>

      {renderDayModal()}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.divider,
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
  },
  parishName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.warm.text,
  },
  headerFeastText: {
    fontSize: 13,
    color: Colors.warm.secondary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  julianIndicator: {
    backgroundColor: Colors.warm.fasting,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  julianText: {
    color: '#FFFFFF',
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
    borderTopColor: Colors.warm.divider,
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
    color: Colors.warm.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.warm.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.divider,
  },
  modalDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.warm.text,
  },
  julianDate: {
    fontSize: 14,
    color: Colors.warm.fasting,
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
    color: Colors.warm.text,
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
    backgroundColor: Colors.warm.background,
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
    color: Colors.warm.text,
  },
  eventNameEn: {
    fontSize: 12,
    color: Colors.warm.textSecondary,
    marginTop: 2,
  },
  liturgyTime: {
    fontSize: 12,
    color: Colors.warm.primary,
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
    color: Colors.warm.fasting,
  },
  meetingCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.warm.background,
    borderRadius: 8,
    marginBottom: 10,
  },
  meetingTime: {
    marginRight: 15,
  },
  meetingTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warm.text,
  },
  meetingContent: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warm.text,
  },
  meetingLocation: {
    fontSize: 12,
    color: Colors.warm.textSecondary,
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
    color: Colors.warm.red,
    marginLeft: 4,
  },
  noMeetingsText: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
