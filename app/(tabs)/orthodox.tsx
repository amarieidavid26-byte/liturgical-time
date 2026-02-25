import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { useAppStore } from '@/lib/store/appStore';
import { getOrthodoxEventsForDate, isFastingDay, formatJulianDisplay } from '@/lib/calendar/orthodoxCalendar';
import { OrthodoxEvent } from '@/lib/types';

const ROMANIAN_MONTHS: { [key: string]: string } = {
  '01': 'Ianuarie',
  '02': 'Februarie',
  '03': 'Martie',
  '04': 'Aprilie',
  '05': 'Mai',
  '06': 'Iunie',
  '07': 'Iulie',
  '08': 'August',
  '09': 'Septembrie',
  '10': 'Octombrie',
  '11': 'Noiembrie',
  '12': 'Decembrie',
};

const ROMANIAN_DAYS: { [key: string]: string } = {
  'Monday': 'Luni',
  'Tuesday': 'Marți',
  'Wednesday': 'Miercuri',
  'Thursday': 'Joi',
  'Friday': 'Vineri',
  'Saturday': 'Sâmbătă',
  'Sunday': 'Duminică',
};

const formatRomanianDate = (date: Date): string => {
  const dayName = ROMANIAN_DAYS[format(date, 'EEEE')] || format(date, 'EEEE');
  const day = format(date, 'd');
  const monthNum = format(date, 'MM');
  const monthName = ROMANIAN_MONTHS[monthNum] || format(date, 'MMMM');
  return `${dayName}, ${day} ${monthName}`;
};

interface EventSection {
  title: string;
  data: Array<{ date: Date; events: OrthodoxEvent[]; fasting: string }>;
}

export default function OrthodoxScreen() {
  const julianCalendarEnabled = useAppStore((state) => state.julianCalendarEnabled);
  const { t } = useTranslation();
  const [sections, setSections] = useState<EventSection[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'great' | 'major'>('all');

  useEffect(() => {
    generateUpcomingEvents();
  }, [filterLevel, julianCalendarEnabled]);

  const generateUpcomingEvents = () => {
    const today = new Date();
    const monthBuckets: { [key: string]: Array<{ date: Date; events: OrthodoxEvent[]; fasting: string }> } = {};

    for (let i = 0; i < 90; i++) {
      const date = addDays(today, i);
      const events = getOrthodoxEventsForDate(date);
      const fasting = isFastingDay(date);

      let filteredEvents = events;
      if (filterLevel === 'great') {
        filteredEvents = events.filter(e => e.level === 'great');
      } else if (filterLevel === 'major') {
        filteredEvents = events.filter(e => e.level === 'great' || e.level === 'major');
      }

      if (filteredEvents.length > 0 || (i < 7 && fasting !== 'none')) {
        const monthKey = format(date, 'yyyy-MM');
        if (!monthBuckets[monthKey]) {
          monthBuckets[monthKey] = [];
        }
        monthBuckets[monthKey].push({ date, events: filteredEvents, fasting });
      }
    }

    const eventSections: EventSection[] = [];
    const sortedMonths = Object.keys(monthBuckets).sort();
    for (const monthKey of sortedMonths) {
      const monthNum = monthKey.split('-')[1];
      const year = monthKey.split('-')[0];
      const monthName = ROMANIAN_MONTHS[monthNum] || monthNum;
      eventSections.push({
        title: `${monthName} ${year}`,
        data: monthBuckets[monthKey],
      });
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
      case 'great': return Colors.warm.primary;
      case 'major': return Colors.warm.accent;
      default: return Colors.warm.fasting;
    }
  };

  const getFastingDescription = (type: string) => {
    switch (type) {
      case 'lent': return `🍽️ ${t('calendar.fasting.lent')}`;
      case 'strict': return `🍽️ ${t('calendar.fasting.strict')}`;
      case 'regular': return `🍽️ ${t('calendar.fasting.regular')}`;
      default: return '';
    }
  };

  const renderEventItem = ({ item }: { item: { date: Date; events: OrthodoxEvent[]; fasting: string } }) => {
    const { date, events, fasting } = item;
    const julianDate = julianCalendarEnabled ? formatJulianDisplay(date) : null;
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isSunday = date.getDay() === 0;

    return (
      <View style={[styles.dayCard, isToday && styles.todayCard]}>
        <View style={styles.dateHeader}>
          <View style={styles.dateRow}>
            <Text style={[styles.dateText, isToday && styles.todayText]}>
              {formatRomanianDate(date)}
            </Text>
            {isSunday && (
              <View style={styles.sundayBadge}>
                <Text style={styles.sundayBadgeText}>DUM</Text>
              </View>
            )}
          </View>
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
                <Text style={styles.liturgyNote}>🕐 Sfânta Liturghie</Text>
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
        <Text style={styles.headerTitle}>{t('calendar.orthodoxCalendar')}</Text>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterLevel === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterLevel('all')}
          >
            <Text style={[styles.filterText, filterLevel === 'all' && styles.filterTextActive]}>
              Toate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterLevel === 'major' && styles.filterButtonActive]}
            onPress={() => setFilterLevel('major')}
          >
            <Text style={[styles.filterText, filterLevel === 'major' && styles.filterTextActive]}>
              Majore
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterLevel === 'great' && styles.filterButtonActive]}
            onPress={() => setFilterLevel('great')}
          >
            <Text style={[styles.filterText, filterLevel === 'great' && styles.filterTextActive]}>
              Mari
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={24} color={Colors.warm.primary} />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Perioada Liturgică</Text>
            <Text style={styles.noticeText}>
              {new Date().getMonth() === 11 || new Date().getMonth() === 0
                ? 'Postul Crăciunului (15 Nov - 24 Dec)'
                : new Date().getMonth() >= 1 && new Date().getMonth() <= 3
                ? 'Perioada Postului Mare'
                : new Date().getMonth() === 7
                ? 'Postul Adormirii Maicii Domnului (1-14 Aug)'
                : 'Perioadă regulată'}
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
            <Text style={styles.emptyText}>Nu s-au găsit evenimente pentru filtrul selectat</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warm.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warm.divider,
    backgroundColor: Colors.warm.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.warm.text,
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
    backgroundColor: Colors.warm.background,
  },
  filterButtonActive: {
    backgroundColor: Colors.warm.secondary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.warm.text,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 15,
    backgroundColor: Colors.calendar.feastBackground,
    borderRadius: 12,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 10,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warm.text,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    color: Colors.warm.textSecondary,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.warm.secondary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  dayCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    backgroundColor: Colors.warm.surface,
    borderRadius: 12,
  },
  todayCard: {
    borderWidth: 2,
    borderColor: Colors.warm.primary,
    backgroundColor: Colors.calendar.feastBackground,
  },
  dateHeader: {
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warm.text,
    flexShrink: 1,
  },
  todayText: {
    color: Colors.warm.primary,
  },
  sundayBadge: {
    backgroundColor: Colors.warm.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sundayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  julianDate: {
    fontSize: 12,
    color: Colors.warm.fasting,
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
    color: Colors.warm.text,
  },
  eventNameEn: {
    fontSize: 13,
    color: Colors.warm.textSecondary,
    marginTop: 2,
  },
  liturgyNote: {
    fontSize: 12,
    color: Colors.warm.primary,
    marginTop: 4,
  },
  fastingNote: {
    fontSize: 13,
    color: Colors.warm.secondary,
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
    color: Colors.warm.textSecondary,
  },
});
