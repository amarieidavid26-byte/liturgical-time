import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, parse } from 'date-fns';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/lib/store/appStore';
import { getOrthodoxEventsForDate, isFastingDay, formatJulianDisplay } from '@/lib/calendar/orthodoxCalendar';
import { OrthodoxEvent } from '@/lib/types';

interface EventSection {
  title: string;
  data: Array<{ date: Date; events: OrthodoxEvent[]; fasting: string }>;
}

export default function OrthodoxScreen() {
  const julianCalendarEnabled = useAppStore((state) => state.julianCalendarEnabled);
  const [sections, setSections] = useState<EventSection[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'great' | 'major'>('all');

  useEffect(() => {
    generateUpcomingEvents();
  }, [filterLevel, julianCalendarEnabled]);

  const generateUpcomingEvents = () => {
    const today = new Date();
    const eventSections: EventSection[] = [];
    const currentWeek: Array<{ date: Date; events: OrthodoxEvent[]; fasting: string }> = [];
    const nextMonth: Array<{ date: Date; events: OrthodoxEvent[]; fasting: string }> = [];
    
    // Generate events for next 60 days
    for (let i = 0; i < 60; i++) {
      const date = addDays(today, i);
      const events = getOrthodoxEventsForDate(date);
      const fasting = isFastingDay(date);
      
      // Filter based on selected level
      let filteredEvents = events;
      if (filterLevel === 'great') {
        filteredEvents = events.filter(e => e.level === 'great');
      } else if (filterLevel === 'major') {
        filteredEvents = events.filter(e => e.level === 'great' || e.level === 'major');
      }
      
      if (filteredEvents.length > 0 || (i < 7 && fasting !== 'none')) {
        const eventData = { date, events: filteredEvents, fasting };
        
        if (i < 7) {
          currentWeek.push(eventData);
        } else if (i < 30) {
          nextMonth.push(eventData);
        }
      }
    }
    
    if (currentWeek.length > 0) {
      eventSections.push({ title: 'This Week', data: currentWeek });
    }
    if (nextMonth.length > 0) {
      eventSections.push({ title: 'Next Month', data: nextMonth });
    }
    
    setSections(eventSections);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'great': return 'star';
      case 'major': return 'star-half';
      default: return 'star-outline';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'great': return Colors.orthodox.gold;
      case 'major': return Colors.orthodox.royalBlue;
      default: return Colors.orthodox.purple;
    }
  };

  const getFastingDescription = (type: string) => {
    switch (type) {
      case 'lent': return '🍽️ Great Lent - Strict fasting';
      case 'strict': return '🍽️ Strict fast day';
      case 'regular': return '🍽️ Regular fast (no meat, dairy, eggs)';
      default: return '';
    }
  };

  const renderEventItem = ({ item }: { item: { date: Date; events: OrthodoxEvent[]; fasting: string } }) => {
    const { date, events, fasting } = item;
    const julianDate = julianCalendarEnabled ? formatJulianDisplay(date) : null;
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    
    return (
      <View style={[styles.dayCard, isToday && styles.todayCard]}>
        <View style={styles.dateHeader}>
          <Text style={[styles.dateText, isToday && styles.todayText]}>
            {format(date, 'EEEE, MMMM d')}
          </Text>
          {julianDate && (
            <Text style={styles.julianDate}>{julianDate}</Text>
          )}
        </View>
        
        {events.map((event, index) => (
          <View key={index} style={styles.eventItem}>
            <Ionicons
              name={getLevelIcon(event.level)}
              size={20}
              color={getLevelColor(event.level)}
            />
            <View style={styles.eventDetails}>
              <Text style={styles.eventName}>{event.name}</Text>
              {event.nameEn && (
                <Text style={styles.eventNameEn}>{event.nameEn}</Text>
              )}
              {event.liturgyRequired && (
                <Text style={styles.liturgyNote}>🕐 Divine Liturgy</Text>
              )}
            </View>
          </View>
        ))}
        
        {fasting !== 'none' && (
          <Text style={styles.fastingNote}>{getFastingDescription(fasting)}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orthodox Calendar</Text>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterLevel === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterLevel('all')}
          >
            <Text style={[styles.filterText, filterLevel === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterLevel === 'major' && styles.filterButtonActive]}
            onPress={() => setFilterLevel('major')}
          >
            <Text style={[styles.filterText, filterLevel === 'major' && styles.filterTextActive]}>
              Major
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterLevel === 'great' && styles.filterButtonActive]}
            onPress={() => setFilterLevel('great')}
          >
            <Text style={[styles.filterText, filterLevel === 'great' && styles.filterTextActive]}>
              Great
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Special Notices */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={24} color={Colors.orthodox.royalBlue} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Current Liturgical Period</Text>
            <Text style={styles.noticeText}>
              {new Date().getMonth() === 11 || new Date().getMonth() === 0
                ? 'Nativity Fast (November 15 - December 24)'
                : new Date().getMonth() >= 2 && new Date().getMonth() <= 3
                ? 'Great Lent Period'
                : new Date().getMonth() === 7
                ? 'Dormition Fast (August 1-14)'
                : 'Regular Period'}
            </Text>
          </View>
        </View>
        
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.data.map((item, index) => (
              <View key={index}>
                {renderEventItem({ item })}
              </View>
            ))}
          </View>
        ))}
        
        {sections.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No events found for the selected filter</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.orthodox.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.orthodox.lightGray,
  },
  filterButtonActive: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  filterText: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
  },
  filterTextActive: {
    color: Colors.orthodox.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 15,
    backgroundColor: Colors.calendar.sundayBackground,
    borderRadius: 12,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 10,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  dayCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    backgroundColor: Colors.orthodox.lightGray,
    borderRadius: 12,
  },
  todayCard: {
    borderWidth: 2,
    borderColor: Colors.orthodox.gold,
    backgroundColor: Colors.calendar.feastBackground,
  },
  dateHeader: {
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  todayText: {
    color: Colors.orthodox.gold,
  },
  julianDate: {
    fontSize: 12,
    color: Colors.orthodox.purple,
    marginTop: 2,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  eventDetails: {
    flex: 1,
    marginLeft: 10,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.orthodox.darkGray,
  },
  eventNameEn: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  liturgyNote: {
    fontSize: 12,
    color: Colors.orthodox.royalBlue,
    marginTop: 4,
  },
  fastingNote: {
    fontSize: 13,
    color: Colors.orthodox.burgundy,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
