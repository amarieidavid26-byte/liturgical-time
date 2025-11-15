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

interface GroupedFeast {
  date: Date;
  dateStr: string;
  events: OrthodoxEvent[];
  fasting: 'none' | 'regular' | 'strict' | 'lent';
  daysFromNow: number;
  isToday: boolean;
  isTomorrow: boolean;
  isSunday: boolean;
}

interface GroupedFeasts {
  today: GroupedFeast[];
  thisWeek: GroupedFeast[];
  thisMonth: GroupedFeast[];
  nextMonth: GroupedFeast[];
  later: GroupedFeast[];
}

export default function OrthodoxScreen() {
  const { julianCalendarEnabled } = useAppStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [todayData, setTodayData] = useState<OrthodoxAPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingFeasts, setUpcomingFeasts] = useState<GroupedFeasts>({
    today: [],
    thisWeek: [],
    thisMonth: [],
    nextMonth: [],
    later: []
  });

  useEffect(() => {
    loadTodayData();
    generateUpcomingFeasts();
  }, []);

  useEffect(() => {
    generateUpcomingFeasts();
  }, [filter, julianCalendarEnabled]);

  const generateUpcomingFeasts = () => {
    const today = new Date();
    const feasts: GroupedFeast[] = [];
    
    // Get feasts for the next 90 days from TODAY
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      
      // Get Orthodox events for this specific date
      const events = getOrthodoxEventsForDate(checkDate);
      const fasting = isFastingDay(checkDate);
      
      // Apply filter
      let filteredEvents = events;
      if (filter === 'great') {
        filteredEvents = events.filter(e => e.level === 'great');
      } else if (filter === 'major') {
        filteredEvents = events.filter(e => e.level === 'great' || e.level === 'major');
      }
      
      // Only add if there are events or it's a significant fasting day
      if (filteredEvents.length > 0 || (fasting !== 'none' && i < 30)) {
        feasts.push({
          date: checkDate,
          dateStr: dateStr,
          events: filteredEvents,
          fasting: fasting,
          daysFromNow: i,
          isToday: i === 0,
          isTomorrow: i === 1,
          isSunday: checkDate.getDay() === 0
        });
      }
    }
    
    // Group feasts by time period
    const grouped: GroupedFeasts = {
      today: feasts.filter(f => f.isToday),
      thisWeek: feasts.filter(f => f.daysFromNow > 0 && f.daysFromNow <= 7),
      thisMonth: feasts.filter(f => f.daysFromNow > 7 && f.daysFromNow <= 30),
      nextMonth: feasts.filter(f => f.daysFromNow > 30 && f.daysFromNow <= 60),
      later: feasts.filter(f => f.daysFromNow > 60)
    };
    
    setUpcomingFeasts(grouped);
  };

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

  const renderFeastCard = (feast: GroupedFeast, index: number) => {
    const hasGreatFeast = feast.events.some(e => e.level === 'great');
    const hasMajorFeast = feast.events.some(e => e.level === 'major');
    
    return (
      <View 
        key={`feast-${feast.dateStr}-${index}`}
        style={[
          styles.eventCard,
          hasGreatFeast && styles.eventCardGreat,
        ]}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={16} color={Colors.orthodox.darkGray} />
              <Text style={styles.detailText}>
                {format(feast.date, 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
            {julianCalendarEnabled && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.orthodox.darkGray} />
                <Text style={styles.detailText}>
                  Julian: {formatJulianDate(feast.date)}
                </Text>
              </View>
            )}
            {feast.daysFromNow > 0 && (
              <Text style={styles.daysFromNow}>
                {feast.isTomorrow ? 'Mâine' : `În ${feast.daysFromNow} zile`}
              </Text>
            )}
          </View>
        </View>

        {feast.events.length > 0 && (
          <View style={styles.eventsSection}>
            {feast.events.map((event, idx) => {
              const isGreat = event.level === 'great';
              const isMajor = event.level === 'major';
              
              return (
                <View key={`event-${idx}`} style={styles.eventItem}>
                  <View style={styles.eventItemHeader}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    {isGreat && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Mare Sărbătoare</Text>
                      </View>
                    )}
                    {isMajor && !isGreat && (
                      <View style={[styles.badge, styles.badgeMajor]}>
                        <Text style={styles.badgeText}>Major</Text>
                      </View>
                    )}
                  </View>
                  {event.nameEn && (
                    <Text style={styles.eventNameEn}>{event.nameEn}</Text>
                  )}
                  {event.liturgyRequired && (
                    <View style={styles.detailRow}>
                      <Ionicons name="business" size={14} color={Colors.orthodox.royalBlue} />
                      <Text style={[styles.detailText, { color: Colors.orthodox.royalBlue, fontSize: 12 }]}>
                        Liturghie Obligatorie
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {feast.fasting && feast.fasting !== 'none' && (
          <View style={styles.detailRow}>
            <Ionicons name="leaf" size={16} color={Colors.orthodox.burgundy} />
            <Text style={[styles.detailText, { color: Colors.orthodox.burgundy }]}>
              Post: {feast.fasting}
            </Text>
          </View>
        )}
        
        {feast.isSunday && (
          <View style={styles.detailRow}>
            <Ionicons name="sunny" size={16} color={Colors.orthodox.gold} />
            <Text style={[styles.detailText, { color: Colors.orthodox.gold }]}>
              Duminică
            </Text>
          </View>
        )}
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

      <View style={styles.listContent}>
        {/* Today's Feasts - Special Gold Gradient Card */}
        {upcomingFeasts.today.length > 0 && (
          <View style={styles.groupedSection}>
            <LinearGradient
              colors={Colors.gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.todayGradientHeader}
            >
              <Ionicons name="star" size={24} color={Colors.orthodox.white} />
              <Text style={styles.todayGroupTitle}>
                Astăzi - {format(new Date(), 'EEEE, d MMMM')}
              </Text>
            </LinearGradient>
            {upcomingFeasts.today.map((feast, index) => renderFeastCard(feast, index))}
          </View>
        )}

        {/* This Week */}
        {upcomingFeasts.thisWeek.length > 0 && (
          <View style={styles.groupedSection}>
            <Text style={styles.sectionTitle}>Săptămâna Aceasta</Text>
            {upcomingFeasts.thisWeek.map((feast, index) => renderFeastCard(feast, index))}
          </View>
        )}

        {/* This Month */}
        {upcomingFeasts.thisMonth.length > 0 && (
          <View style={styles.groupedSection}>
            <Text style={styles.sectionTitle}>
              Luna Aceasta - {format(new Date(), 'MMMM yyyy')}
            </Text>
            {upcomingFeasts.thisMonth.map((feast, index) => renderFeastCard(feast, index))}
          </View>
        )}

        {/* Next Month */}
        {upcomingFeasts.nextMonth.length > 0 && (
          <View style={styles.groupedSection}>
            <Text style={styles.sectionTitle}>
              Luna Viitoare - {format(addMonths(new Date(), 1), 'MMMM yyyy')}
            </Text>
            {upcomingFeasts.nextMonth.map((feast, index) => renderFeastCard(feast, index))}
          </View>
        )}

        {/* Later (61-90 days) */}
        {upcomingFeasts.later.length > 0 && (
          <View style={styles.groupedSection}>
            <Text style={styles.sectionTitle}>Mai Târziu</Text>
            {upcomingFeasts.later.map((feast, index) => renderFeastCard(feast, index))}
          </View>
        )}
      </View>
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
  groupedSection: {
    marginBottom: 24,
  },
  todayGradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  todayGroupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.orthodox.white,
  },
  daysFromNow: {
    fontSize: 12,
    color: Colors.orthodox.royalBlue,
    fontWeight: '600',
    marginTop: 4,
  },
  eventsSection: {
    marginTop: 8,
    gap: 12,
  },
  eventItem: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  eventItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
});
