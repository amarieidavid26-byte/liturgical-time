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
import { getAllOrthodoxEvents, formatJulianDate, getOrthodoxEventsForDate, isFastingDay, getCurrentLiturgicalPeriod, getCurrentTone } from '../../lib/calendar/orthodoxCalendar';
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

const LiturgicalHeader = () => {
  const today = new Date();
  const currentPeriod = getCurrentLiturgicalPeriod(today);
  const currentTone = getCurrentTone(today);
  
  return (
    <LinearGradient 
      colors={Colors.orthodox.burgundyGradient} 
      style={{
        padding: 20,
        alignItems: 'center',
        marginBottom: 10
      }}
    >
      <Text style={{ color: Colors.orthodox.gold, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
        {currentPeriod}
      </Text>
      <Text style={{ color: Colors.orthodox.white, fontSize: 14, marginTop: 4 }}>
        Glasul {currentTone}
      </Text>
    </LinearGradient>
  );
};

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
    const getFastingLabel = (fasting: string): string => {
      switch (fasting) {
        case 'strict': return 'Post Aspru';
        case 'lent': return 'Post Mare';
        case 'regular': return 'Post';
        default: return '';
      }
    };
    
    const getFeastSymbol = (eventName: string, level: string): string => {
      const name = eventName.toLowerCase();
      
      if (name.includes('adormirea') || name.includes('dormition')) {
        return '🌸';
      }
      if (name.includes('rusalii') || name.includes('cincizecime') || name.includes('sfântului duh')) {
        return '🕊️';
      }
      if (name.includes('maicii domnului') || name.includes('născătoare')) {
        return '👑';
      }
      if (name.includes('crăciun') || name.includes('naștere')) {
        return '🌟';
      }
      if (level === 'great') {
        return '✝';
      }
      return '';
    };
    
    const getFeastRank = (level: string): string => {
      switch (level) {
        case 'great': return '🔴🔴🔴🔴🔴';
        case 'major': return '🔴🔴🔴🔴';
        case 'minor': return '🔴🔴🔴';
        default: return '🔴';
      }
    };
    
    const getBorderColor = (): string => {
      const hasGreatFeast = feast.events.some(e => e.level === 'great');
      const hasMajorFeast = feast.events.some(e => e.level === 'major');
      
      if (hasGreatFeast) return Colors.orthodox.gold;
      if (hasMajorFeast) return Colors.orthodox.royalBlue;
      if (feast.fasting !== 'none') return Colors.orthodox.fastingBadge;
      return 'transparent';
    };
    
    const getBorderWidth = (): number => {
      const hasGreatFeast = feast.events.some(e => e.level === 'great');
      const hasMajorFeast = feast.events.some(e => e.level === 'major');
      return (hasGreatFeast || hasMajorFeast || feast.fasting !== 'none') ? 3 : 0;
    };
    
    return (
      <View 
        key={`feast-${feast.dateStr}-${index}`}
        style={{
          backgroundColor: feast.fasting !== 'none' ? Colors.orthodox.fastingPurple : Colors.orthodox.cardBg,
          marginHorizontal: 12,
          marginVertical: 6,
          borderRadius: 12,
          ...Colors.shadows.medium,
          flexDirection: 'row',
          overflow: 'hidden',
          borderWidth: getBorderWidth(),
          borderColor: getBorderColor()
        }}
      >
        <View style={{
          width: 80,
          backgroundColor: feast.isSunday ? Colors.orthodox.gold : Colors.orthodox.burgundy,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10
        }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: Colors.orthodox.white }}>
            {format(feast.date, 'd', { locale: ro })}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.orthodox.white, textTransform: 'uppercase' }}>
            {format(feast.date, 'MMM', { locale: ro })}
          </Text>
          {feast.isSunday && (
            <Text style={{ fontSize: 9, color: Colors.orthodox.burgundy, marginTop: 4, fontWeight: 'bold', backgroundColor: Colors.orthodox.white, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
              DUMINICĂ
            </Text>
          )}
        </View>
        
        <View style={{ flex: 1, padding: 12 }}>
          {feast.events.length > 0 ? (
            feast.events.map((event, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  {getFeastSymbol(event.name, event.level) && (
                    <Text style={{ fontSize: 16, marginRight: 6 }}>
                      {getFeastSymbol(event.name, event.level)}
                    </Text>
                  )}
                  <Text style={{
                    fontSize: event.level === 'great' ? 15 : 13,
                    fontWeight: event.level === 'great' ? 'bold' : 'normal',
                    color: event.level === 'great' ? Colors.orthodox.burgundy : Colors.orthodox.primaryText,
                    flex: 1
                  }}>
                    {event.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 9, marginLeft: 22 }}>
                  {getFeastRank(event.level)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 13, color: Colors.orthodox.mutedText, fontStyle: 'italic' }}>
              {format(feast.date, 'EEEE', { locale: ro })}
            </Text>
          )}
          
          {feast.fasting !== 'none' && (
            <View style={{
              backgroundColor: Colors.orthodox.fastingBadge,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 4,
              alignSelf: 'flex-start',
              marginTop: 6
            }}>
              <Text style={{ fontSize: 11, color: Colors.orthodox.white, fontWeight: '600' }}>
                {getFastingLabel(feast.fasting)}
              </Text>
            </View>
          )}
          
          {julianCalendarEnabled && (
            <Text style={{ fontSize: 10, color: Colors.orthodox.mutedText, marginTop: 4 }}>
              Julian: {formatJulianDate(feast.date)}
            </Text>
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
        <LiturgicalHeader />
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
    backgroundColor: Colors.orthodox.primaryBg,
  },
  todayCard: {
    backgroundColor: Colors.orthodox.cardBg,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.gold,
    ...Colors.shadows.medium,
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
    color: Colors.orthodox.primaryText,
  },
  todayDate: {
    fontSize: 14,
    color: Colors.orthodox.secondaryText,
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
    color: Colors.orthodox.primaryText,
  },
  todayText: {
    fontSize: 14,
    color: Colors.orthodox.primaryText,
    lineHeight: 20,
    marginBottom: 4,
  },
  saintsScroll: {
    maxHeight: 120,
  },
  mainSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.orthodox.primaryText,
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
    backgroundColor: Colors.orthodox.cardBg,
    alignItems: 'center',
    ...Colors.shadows.small,
  },
  filterButtonActive: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orthodox.primaryText,
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
    color: Colors.orthodox.primaryText,
    marginTop: 8,
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: Colors.orthodox.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.royalBlue,
    ...Colors.shadows.medium,
  },
  eventCardGreat: {
    backgroundColor: Colors.orthodox.cream,
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
    color: Colors.orthodox.primaryText,
  },
  eventNameEn: {
    fontSize: 14,
    color: Colors.orthodox.secondaryText,
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
    color: Colors.orthodox.primaryText,
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
