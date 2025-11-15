import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths } from 'date-fns';
import { ro } from 'date-fns/locale';
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
    const allDays: GroupedFeast[] = [];
    
    // Build COMPLETE 90-day sequence - every single day
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      
      // Get Orthodox events for this specific date
      const allEvents = getOrthodoxEventsForDate(checkDate);
      const fasting = isFastingDay(checkDate);
      
      // Apply filter to events (but keep the day regardless)
      let filteredEvents = allEvents;
      if (filter === 'great') {
        filteredEvents = allEvents.filter(e => e.level === 'great');
      } else if (filter === 'major') {
        filteredEvents = allEvents.filter(e => e.level === 'great' || e.level === 'major');
      }
      
      // ALWAYS add every day to maintain chronological continuity
      // Only filter affects the events shown, not whether the day appears
      allDays.push({
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
    
    // Group days by time period
    const grouped: GroupedFeasts = {
      today: allDays.filter(f => f.isToday),
      thisWeek: allDays.filter(f => f.daysFromNow > 0 && f.daysFromNow <= 7),
      thisMonth: allDays.filter(f => f.daysFromNow > 7 && f.daysFromNow <= 30),
      nextMonth: allDays.filter(f => f.daysFromNow > 30 && f.daysFromNow <= 60),
      later: allDays.filter(f => f.daysFromNow > 60)
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
                {format(feast.date, 'EEEE, d MMMM yyyy', { locale: ro })}
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
            <Text style={styles.todayTitle}>Calendarul Ortodox de Astăzi</Text>
            <Text style={styles.todayDate}>{format(new Date(), 'd MMMM yyyy', { locale: ro })}</Text>
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
              <Text style={styles.todaySectionTitle}>Sărbătoare</Text>
            </View>
            <Text style={styles.todayText}>{todayData.feast}</Text>
          </View>
        )}

        {todayData.saints && todayData.saints.length > 0 && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="people" size={18} color={Colors.orthodox.royalBlue} />
              <Text style={styles.todaySectionTitle}>Sfinți Prăznuiți</Text>
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
              <Text style={styles.todaySectionTitle}>Citiri Zilnice</Text>
            </View>
            {todayData.readings.epistle && (
              <Text style={styles.todayText}>Apostol: {todayData.readings.epistle}</Text>
            )}
            {todayData.readings.gospel && (
              <Text style={styles.todayText}>Evanghelie: {todayData.readings.gospel}</Text>
            )}
          </View>
        )}

        {todayData.fasting && todayData.fasting !== 'none' && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="leaf" size={18} color={Colors.orthodox.burgundy} />
              <Text style={styles.todaySectionTitle}>Post</Text>
            </View>
            <Text style={styles.todayText}>{todayData.fasting}</Text>
          </View>
        )}

        {todayData.tone && (
          <View style={styles.todaySection}>
            <View style={styles.todaySectionHeader}>
              <Ionicons name="musical-notes" size={18} color={Colors.orthodox.darkGray} />
              <Text style={styles.todaySectionTitle}>Glasul</Text>
            </View>
            <Text style={styles.todayText}>Glasul {todayData.tone}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {renderTodayCard()}
        
        <Text style={styles.mainSectionTitle}>Sărbători Viitoare</Text>
        
        <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Toate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'great' && styles.filterButtonActive]}
          onPress={() => setFilter('great')}
        >
          <Text style={[styles.filterText, filter === 'great' && styles.filterTextActive]}>
            Mari Sărbători
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'major' && styles.filterButtonActive]}
          onPress={() => setFilter('major')}
        >
          <Text style={[styles.filterText, filter === 'major' && styles.filterTextActive]}>
            Majore+
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
                Astăzi - {format(new Date(), 'EEEE, d MMMM', { locale: ro })}
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
              Luna Aceasta - {format(new Date(), 'MMMM yyyy', { locale: ro })}
            </Text>
            {upcomingFeasts.thisMonth.map((feast, index) => renderFeastCard(feast, index))}
          </View>
        )}

        {/* Next Month */}
        {upcomingFeasts.nextMonth.length > 0 && (
          <View style={styles.groupedSection}>
            <Text style={styles.sectionTitle}>
              Luna Viitoare - {format(addMonths(new Date(), 1), 'MMMM yyyy', { locale: ro })}
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
