import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, subDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { getMeetingsByDate } from '../../lib/database/sqlite';
import { getOrthodoxEventsForDate, formatJulianDate, isSunday } from '../../lib/calendar/orthodoxCalendar';
import { detectConflicts } from '../../lib/calendar/conflictDetection';
import { Meeting, OrthodoxEvent } from '../../lib/types';

const CustomDay = ({ date, state, marking, onPress }: any) => {
  const julianEnabled = useAppStore(state => state.julianCalendarEnabled);
  const gregorianDate = parseISO(date.dateString);
  const scale = useSharedValue(1);
  
  let julianMonth = '';
  let julianDay = '';
  
  if (julianEnabled) {
    const julianDateObj = subDays(gregorianDate, 13);
    julianMonth = format(julianDateObj, 'MMM');
    julianDay = format(julianDateObj, 'd');
  }
  
  const isSelected = marking?.selected;
  const selectedColor = marking?.selectedColor || Colors.orthodox.royalBlue;
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onPress(date);
  };
  
  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[animatedStyle]}>
        <View
          style={{ 
            alignItems: 'center', 
            justifyContent: 'center',
            width: 40,
            height: julianEnabled ? 50 : 40,
          }}
        >
          <View 
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isSelected ? selectedColor : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              ...Colors.shadows.small,
            }}
          >
            <Text style={{
              color: state === 'disabled' ? '#d9d9d9' : isSelected ? Colors.orthodox.white : state === 'today' ? Colors.orthodox.royalBlue : Colors.orthodox.primaryText,
              fontWeight: state === 'today' || isSelected ? 'bold' : 'normal',
              fontSize: 16,
            }}>
              {date.day}
            </Text>
          </View>
          {julianEnabled && (
            <Text style={{ 
              fontSize: 8, 
              color: isSelected ? Colors.orthodox.royalBlue : Colors.orthodox.burgundy, 
              marginTop: 2,
              textAlign: 'center',
              lineHeight: 9,
            }}>
              {julianMonth} {julianDay}
            </Text>
          )}
          {marking?.dots && marking.dots.length > 0 && (
            <View style={{ flexDirection: 'row', marginTop: 2, gap: 2 }}>
              {marking.dots.slice(0, 3).map((dot: any, index: number) => (
                <View
                  key={index}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: dot.color,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

export default function CalendarScreen() {
  const { parishSettings, meetings, julianCalendarEnabled, selectedDate, setSelectedDate } = useAppStore();
  const [dayMeetings, setDayMeetings] = useState<Meeting[]>([]);
  const [dayEvents, setDayEvents] = useState<OrthodoxEvent[]>([]);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  const markedDates = useMemo(() => {
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
        dates[dateStr].selectedColor = '#E3F2FD';
      }
    }
    
    return dates;
  }, [meetings, parishSettings]);

  const handleDayPress = useCallback(async (day: any) => {
    setSelectedDate(day.dateString);
    const meetings = await getMeetingsByDate(day.dateString);
    const events = getOrthodoxEventsForDate(parseISO(day.dateString));
    setDayMeetings(meetings);
    setDayEvents(events);
    bottomSheetRef.current?.expand();
  }, [setSelectedDate]);

  const handleAddMeeting = useCallback(() => {
    bottomSheetRef.current?.close();
    setTimeout(() => {
      router.push('/meeting/new');
    }, 300);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.orthodox.royalBlueGradient as any}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>
          {parishSettings?.parishName || 'Orthodox Calendar'}
        </Text>
        <Text style={styles.headerSubtitle}>Calendar Ortodox</Text>
        {julianCalendarEnabled && selectedDate && (
          <Text style={styles.julianDate}>
            Julian: {formatJulianDate(parseISO(selectedDate))}
          </Text>
        )}
      </LinearGradient>

      <Calendar
        firstDay={1}
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={handleDayPress}
        dayComponent={CustomDay}
        theme={{
          backgroundColor: Colors.orthodox.primaryBg,
          calendarBackground: Colors.orthodox.primaryBg,
          textSectionTitleColor: Colors.orthodox.secondaryText,
          selectedDayBackgroundColor: Colors.orthodox.royalBlue,
          selectedDayTextColor: Colors.orthodox.white,
          todayTextColor: Colors.orthodox.royalBlue,
          dayTextColor: Colors.orthodox.primaryText,
          textDisabledColor: Colors.orthodox.mutedText,
          arrowColor: Colors.orthodox.royalBlue,
          monthTextColor: Colors.orthodox.primaryText,
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
        }}
        style={styles.calendar}
      />

      <TouchableOpacity 
        style={[styles.fab, Colors.shadows.large]} 
        onPress={handleAddMeeting}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10B981', '#059669'] as any}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color={Colors.orthodox.white} />
        </LinearGradient>
      </TouchableOpacity>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {selectedDate && format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>

          {dayEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color={Colors.orthodox.gold} />
                <Text style={styles.sectionTitle}>Orthodox Events</Text>
              </View>
              {dayEvents.map((event, index) => (
                <View key={index} style={[styles.eventCard, Colors.shadows.small]}>
                  <View style={styles.eventDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    {event.nameEn && <Text style={styles.eventNameEn}>{event.nameEn}</Text>}
                    {event.liturgyRequired && (
                      <View style={styles.liturgyBadge}>
                        <Ionicons name="church" size={12} color={Colors.orthodox.royalBlue} />
                        <Text style={styles.eventLiturgy}>Divine Liturgy</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {dayMeetings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="briefcase" size={20} color={Colors.orthodox.green} />
                <Text style={styles.sectionTitle}>Meetings</Text>
              </View>
              {dayMeetings.map((meeting) => {
                const conflict = detectConflicts(meeting, parishSettings);
                return (
                  <View
                    key={meeting.id}
                    style={[
                      styles.meetingCard,
                      Colors.shadows.small,
                      conflict && styles.meetingCardConflict,
                    ]}
                  >
                    <View style={[
                      styles.meetingDot,
                      conflict && styles.meetingDotConflict
                    ]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.meetingTitle}>{meeting.title}</Text>
                      <View style={styles.meetingDetails}>
                        <Ionicons name="time-outline" size={14} color={Colors.orthodox.secondaryText} />
                        <Text style={styles.meetingTime}>
                          {meeting.startTime} - {meeting.endTime}
                        </Text>
                      </View>
                      {meeting.location && (
                        <View style={styles.meetingDetails}>
                          <Ionicons name="location-outline" size={14} color={Colors.orthodox.secondaryText} />
                          <Text style={styles.meetingLocation}>{meeting.location}</Text>
                        </View>
                      )}
                      {conflict && (
                        <View style={styles.conflictBadge}>
                          <Ionicons name="warning" size={14} color={Colors.orthodox.danger} />
                          <Text style={styles.conflictText}>{conflict.message}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {dayEvents.length === 0 && dayMeetings.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.orthodox.mutedText} />
              <Text style={styles.emptyText}>No events or meetings on this day</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.addButton, Colors.shadows.medium]} 
            onPress={handleAddMeeting}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10B981', '#059669'] as any}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.orthodox.white} />
              <Text style={styles.addButtonText}>Add Meeting</Text>
            </LinearGradient>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.primaryBg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.orthodox.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.orthodox.white,
    textAlign: 'center',
    opacity: 0.9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  julianDate: {
    fontSize: 12,
    color: Colors.orthodox.white,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  calendar: {
    marginTop: 16,
    borderRadius: 16,
    marginHorizontal: 12,
    ...Colors.shadows.small,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetBackground: {
    backgroundColor: Colors.orthodox.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomSheetHandle: {
    backgroundColor: Colors.orthodox.mutedText,
    width: 40,
  },
  bottomSheetContent: {
    paddingBottom: 40,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.primaryText,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.orthodox.primaryText,
  },
  eventCard: {
    backgroundColor: Colors.orthodox.feastBlue,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  eventDot: {
    width: 4,
    backgroundColor: Colors.orthodox.gold,
    borderRadius: 2,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.primaryText,
    marginBottom: 4,
  },
  eventNameEn: {
    fontSize: 14,
    color: Colors.orthodox.secondaryText,
  },
  liturgyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: Colors.orthodox.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventLiturgy: {
    fontSize: 11,
    color: Colors.orthodox.royalBlue,
    fontWeight: '600',
  },
  meetingCard: {
    backgroundColor: Colors.orthodox.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    gap: 12,
  },
  meetingCardConflict: {
    backgroundColor: '#FEF2F2',
    borderColor: Colors.orthodox.danger,
  },
  meetingDot: {
    width: 4,
    backgroundColor: Colors.orthodox.success,
    borderRadius: 2,
  },
  meetingDotConflict: {
    backgroundColor: Colors.orthodox.danger,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.primaryText,
    marginBottom: 8,
  },
  meetingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  meetingTime: {
    fontSize: 14,
    color: Colors.orthodox.secondaryText,
  },
  meetingLocation: {
    fontSize: 14,
    color: Colors.orthodox.secondaryText,
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: Colors.orthodox.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conflictText: {
    fontSize: 11,
    color: Colors.orthodox.danger,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.orthodox.mutedText,
    marginTop: 12,
  },
  addButton: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    color: Colors.orthodox.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
