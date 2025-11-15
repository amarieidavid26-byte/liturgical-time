import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isWithinInterval, addDays, addMonths } from 'date-fns';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { getAllOrthodoxEvents, formatJulianDate, getOrthodoxEventsForDate, isFastingDay } from '../../lib/calendar/orthodoxCalendar';
import { OrthodoxEvent } from '../../lib/types';
import { fetchOrthodoxData, OrthodoxAPIResponse, clearOrthodoxCache } from '../../lib/api/orthodoxAPI';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/ui/Card';

type FilterType = 'all' | 'great' | 'major';

export default function OrthodoxScreen() {
  const { julianCalendarEnabled } = useAppStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [todayData, setTodayData] = useState<OrthodoxAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const data = await fetchOrthodoxData(today, 'romanian');
      setTodayData(data);
    } catch (error) {
      console.error('Failed to load today\'s data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await clearOrthodoxCache();
      await loadTodayData();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const allEvents = useMemo(() => getAllOrthodoxEvents(), []);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    if (filter === 'great') return allEvents.filter((e) => e.level === 'great');
    if (filter === 'major') return allEvents.filter((e) => e.level === 'major' || e.level === 'great');
    return allEvents;
  }, [allEvents, filter]);

  const thisWeekEvents = useMemo(() => {
    const now = new Date();
    const weekEnd = addDays(now, 7);
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      return isWithinInterval(eventDate, { start: now, end: weekEnd });
    });
  }, [filteredEvents]);

  const nextMonthEvents = useMemo(() => {
    const weekEnd = addDays(new Date(), 7);
    const monthEnd = addDays(new Date(), 30);
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      return isWithinInterval(eventDate, { start: weekEnd, end: monthEnd });
    });
  }, [filteredEvents]);

  const renderEvent = ({ item }: { item: OrthodoxEvent }) => {
    const eventDate = parseISO(item.date);
    const isGreat = item.level === 'great';
    const isMajor = item.level === 'major';

    return (
      <View
        style={[
          styles.eventCard,
          isGreat && styles.eventCardGreat,
          isMajor && styles.eventCardMajor,
        ]}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleContainer}>
            <Text style={styles.eventName}>{item.name}</Text>
            {item.nameEn && <Text style={styles.eventNameEn}>{item.nameEn}</Text>}
          </View>
          {isGreat && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Great Feast</Text>
            </View>
          )}
          {isMajor && !isGreat && (
            <View style={[styles.badge, styles.badgeMajor]}>
              <Text style={styles.badgeText}>Major</Text>
            </View>
          )}
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={Colors.orthodox.darkGray} />
            <Text style={styles.detailText}>
              {format(eventDate, 'MMMM d, yyyy')}
            </Text>
          </View>
          {julianCalendarEnabled && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.orthodox.darkGray} />
              <Text style={styles.detailText}>
                Julian: {formatJulianDate(eventDate)}
              </Text>
            </View>
          )}
          {item.liturgyRequired && (
            <View style={styles.detailRow}>
              <Ionicons name="business" size={16} color={Colors.orthodox.royalBlue} />
              <Text style={[styles.detailText, { color: Colors.orthodox.royalBlue }]}>
                Divine Liturgy Required
              </Text>
            </View>
          )}
          {item.fasting && item.fasting !== 'none' && (
            <View style={styles.detailRow}>
              <Ionicons name="leaf" size={16} color={Colors.orthodox.burgundy} />
              <Text style={[styles.detailText, { color: Colors.orthodox.burgundy }]}>
                Fasting: {item.fasting}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTodayCard = () => {
    if (loading) {
      return (
        <View style={styles.todayCard}>
          <ActivityIndicator size="small" color={Colors.orthodox.royalBlue} />
        </View>
      );
    }

    if (!todayData) return null;

    return (
      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <View>
            <Text style={styles.todayTitle}>Today's Orthodox Calendar</Text>
            <Text style={styles.todayDate}>{format(new Date(), 'MMMM d, yyyy')}</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.orthodox.royalBlue} />
            ) : (
              <Ionicons name="refresh" size={24} color={Colors.orthodox.royalBlue} />
            )}
          </TouchableOpacity>
        </View>

        {todayData.feast && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="star" size={18} color={Colors.orthodox.gold} />
              <Text style={styles.todaySectionTitle}>Feast Day</Text>
            </View>
            <Text style={styles.todayText}>{todayData.feast}</Text>
          </View>
        )}

        {todayData.saints && todayData.saints.length > 0 && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="people" size={18} color={Colors.orthodox.royalBlue} />
              <Text style={styles.todaySectionTitle}>Saints Commemorated</Text>
            </View>
            <ScrollView style={styles.saintsScroll} nestedScrollEnabled>
              {todayData.saints.map((saint, index) => (
                <Text key={index} style={styles.todayText}>• {saint}</Text>
              ))}
            </ScrollView>
          </View>
        )}

        {todayData.readings && (todayData.readings.epistle || todayData.readings.gospel) && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="book" size={18} color={Colors.orthodox.burgundy} />
              <Text style={styles.todaySectionTitle}>Daily Readings</Text>
            </View>
            {todayData.readings.epistle && (
              <Text style={styles.todayText}>Epistle: {todayData.readings.epistle}</Text>
            )}
            {todayData.readings.gospel && (
              <Text style={styles.todayText}>Gospel: {todayData.readings.gospel}</Text>
            )}
          </View>
        )}

        {todayData.fasting && todayData.fasting !== 'none' && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="leaf" size={18} color={Colors.orthodox.burgundy} />
              <Text style={styles.todaySectionTitle}>Fasting</Text>
            </View>
            <Text style={styles.todayText}>{todayData.fasting}</Text>
          </View>
        )}

        {todayData.tone && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="musical-notes" size={18} color={Colors.orthodox.darkGray} />
              <Text style={styles.todaySectionTitle}>Tone</Text>
            </View>
            <Text style={styles.todayText}>Tone {todayData.tone}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {renderTodayCard()}
        
        <Text style={styles.mainSectionTitle}>Upcoming Feasts (2024-2028)</Text>
        
        <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'great' && styles.filterButtonActive]}
          onPress={() => setFilter('great')}
        >
          <Text style={[styles.filterText, filter === 'great' && styles.filterTextActive]}>
            Great Feasts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'major' && styles.filterButtonActive]}
          onPress={() => setFilter('major')}
        >
          <Text style={[styles.filterText, filter === 'major' && styles.filterTextActive]}>
            Major+
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        ListHeaderComponent={
          <>
            {thisWeekEvents.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>This Week</Text>
                {thisWeekEvents.map((event, index) => (
                  <View key={`week-${index}`}>{renderEvent({ item: event })}</View>
                ))}
              </>
            )}
            {nextMonthEvents.length > 0 && (
              <Text style={styles.sectionTitle}>Next Month</Text>
            )}
          </>
        }
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.white,
  },
  todayCard: {
    backgroundColor: Colors.orthodox.lightGray,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.gold,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
  },
  todayDate: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    opacity: 0.7,
    marginTop: 4,
  },
  todaySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  todaySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  todaySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  todayText: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    lineHeight: 20,
    marginBottom: 4,
  },
  saintsScroll: {
    maxHeight: 120,
  },
  mainSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.orthodox.lightGray,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  filterTextActive: {
    color: Colors.orthodox.white,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
    marginTop: 8,
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: Colors.orthodox.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.royalBlue,
  },
  eventCardGreat: {
    backgroundColor: Colors.calendar.feastBackground,
    borderLeftColor: Colors.orthodox.gold,
  },
  eventCardMajor: {
    borderLeftColor: Colors.orthodox.royalBlue,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitleContainer: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
  },
  eventNameEn: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    opacity: 0.7,
    marginTop: 4,
  },
  badge: {
    backgroundColor: Colors.orthodox.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeMajor: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.orthodox.white,
  },
  eventDetails: {
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
});
