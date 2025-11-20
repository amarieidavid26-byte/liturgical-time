import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert, StyleSheet, Platform, Modal, RefreshControl } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parse } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { getAllPrayers, savePrayer, updatePrayer, deletePrayer, markPrayerCompleted, Prayer } from '../../lib/database/sqlite';
import { useTranslation } from '../../lib/hooks/useTranslation';
import Colors from '../../constants/Colors';

export default function PrayersScreen() {
  const t = useTranslation();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [prayerName, setPrayerName] = useState('');
  const [prayerTime, setPrayerTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [isDaily, setIsDaily] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const loadPrayers = async () => {
    try {
      const loadedPrayers = await getAllPrayers();
      setPrayers(loadedPrayers);
    } catch (error) {
      console.error('Error loading prayers:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPrayers();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrayers();
    setRefreshing(false);
  }, []);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.permissionDenied, t.notificationPermissionRequired);
      return false;
    }
    return true;
  };

  const schedulePrayerNotification = async (prayer: Prayer) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    try {
      const prayerTimeParsed = parse(prayer.time, 'HH:mm', new Date());
      const notificationTime = new Date(prayerTimeParsed);
      notificationTime.setMinutes(notificationTime.getMinutes() - prayer.reminderMinutes);

      const notificationIds: string[] = [];

      if (prayer.isDaily) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕊️ ${t.notificationTitle}`,
            body: t.notificationBody
              .replace('{prayer}', prayer.name)
              .replace('{minutes}', prayer.reminderMinutes.toString()),
            sound: 'default',
            data: { prayerId: prayer.id },
          },
          trigger: {
            hour: notificationTime.getHours(),
            minute: notificationTime.getMinutes(),
            repeats: true,
          },
        });
        notificationIds.push(notificationId);
      } else {
        let days: number[] = [];
        try {
          if (!prayer.selectedDays || prayer.selectedDays === '[]') {
            console.warn('No days selected for weekly prayer, skipping scheduling');
            return null;
          }
          days = JSON.parse(prayer.selectedDays);
          if (!Array.isArray(days) || days.length === 0) {
            console.warn('Invalid selectedDays, skipping weekly scheduling');
            return null;
          }
        } catch (error) {
          console.error('Failed to parse selectedDays:', error);
          return null;
        }

        const uniqueDays = [...new Set(days)].filter(day => day >= 0 && day <= 6);
        if (uniqueDays.length === 0) {
          console.warn('No valid days after filtering, skipping weekly scheduling');
          return null;
        }

        for (const day of uniqueDays) {
          const expoWeekday = day === 0 ? 1 : day + 1;
          
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🕊️ ${t.notificationTitle}`,
              body: t.notificationBody
                .replace('{prayer}', prayer.name)
                .replace('{minutes}', prayer.reminderMinutes.toString()),
              sound: 'default',
              data: { prayerId: prayer.id },
            },
            trigger: {
              hour: notificationTime.getHours(),
              minute: notificationTime.getMinutes(),
              weekday: expoWeekday,
              repeats: true,
            },
          });
          notificationIds.push(notificationId);
        }
      }

      return notificationIds.length > 0 ? JSON.stringify(notificationIds) : null;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const handleAddPrayer = async () => {
    if (!prayerName.trim()) {
      Alert.alert(t.required, t.prayerName);
      return;
    }

    if (!isDaily && selectedDays.length === 0) {
      Alert.alert(t.required, t.selectDays);
      return;
    }

    try {
      const newPrayer: Prayer = {
        name: prayerName.trim(),
        time: format(prayerTime, 'HH:mm'),
        reminderMinutes,
        isDaily,
        selectedDays: isDaily ? '[]' : JSON.stringify(selectedDays),
        notificationId: null,
        streak: 0,
        isEnabled: true,
      };

      const notificationId = await schedulePrayerNotification(newPrayer);
      newPrayer.notificationId = notificationId || null;

      await savePrayer(newPrayer);
      await loadPrayers();
      
      setPrayerName('');
      setPrayerTime(new Date());
      setReminderMinutes(30);
      setIsDaily(true);
      setSelectedDays([]);
      setShowAddModal(false);
      
      Alert.alert(t.success, t.prayerSaved);
    } catch (error) {
      console.error('Error adding prayer:', error);
      Alert.alert(t.error, t.failedToSavePrayer);
    }
  };

  const cancelPrayerNotifications = async (notificationId: string | null) => {
    if (!notificationId) return;
    
    try {
      const notificationIds = JSON.parse(notificationId);
      if (Array.isArray(notificationIds)) {
        for (const id of notificationIds) {
          if (typeof id === 'string' && id.length > 0) {
            await Notifications.cancelScheduledNotificationAsync(id);
          }
        }
      }
    } catch (error) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (fallbackError) {
        console.error('Failed to cancel notification:', fallbackError);
      }
    }
  };

  const handleDeletePrayer = (prayer: Prayer) => {
    Alert.alert(
      t.deletePrayer,
      `${t.confirmDelete} "${prayer.name}"?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelPrayerNotifications(prayer.notificationId || null);
              if (prayer.id) {
                await deletePrayer(prayer.id);
                await loadPrayers();
                Alert.alert(t.success, t.prayerDeleted);
              }
            } catch (error) {
              console.error('Error deleting prayer:', error);
              Alert.alert(t.error, t.failedToDeletePrayer);
            }
          },
        },
      ]
    );
  };

  const handleTogglePrayer = async (prayer: Prayer) => {
    try {
      const updatedPrayer = { ...prayer, isEnabled: !prayer.isEnabled };
      
      if (updatedPrayer.isEnabled) {
        const notificationId = await schedulePrayerNotification(updatedPrayer);
        updatedPrayer.notificationId = notificationId || null;
      } else {
        await cancelPrayerNotifications(prayer.notificationId || null);
        updatedPrayer.notificationId = null;
      }

      await updatePrayer(updatedPrayer);
      await loadPrayers();
    } catch (error) {
      console.error('Error toggling prayer:', error);
      Alert.alert(t.error, t.failedToSavePrayer);
    }
  };

  const handleMarkCompleted = async (prayer: Prayer) => {
    try {
      if (prayer.id) {
        await markPrayerCompleted(prayer.id);
        await loadPrayers();
      }
    } catch (error) {
      console.error('Error marking prayer completed:', error);
    }
  };

  const handlePresetPrayer = (name: string, hour: number, minute: number) => {
    setPrayerName(name);
    const presetTime = new Date();
    presetTime.setHours(hour, minute, 0, 0);
    setPrayerTime(presetTime);
    setReminderMinutes(15);
    setShowAddModal(true);
  };

  const dayNames = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient colors={Colors.orthodox.royalBlueGradient} style={styles.header}>
        <Text style={styles.headerTitle}>{t.prayerJournal}</Text>
        <Text style={styles.headerSubtitle}>{t.scheduleYourTimeWithGod}</Text>
      </LinearGradient>

      {prayers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={64} color={Colors.orthodox.darkGray} />
          <Text style={styles.emptyText}>{t.noPrayers}</Text>
          <Text style={styles.emptySubtext}>{t.addFirstPrayer}</Text>
        </View>
      ) : (
        prayers.map((prayer) => (
          <View key={prayer.id} style={[styles.prayerCard, !prayer.isEnabled && styles.prayerCardDisabled]}>
            <View style={styles.prayerHeader}>
              <View style={styles.prayerInfo}>
                <Text style={[styles.prayerName, !prayer.isEnabled && styles.textDisabled]}>
                  {prayer.name}
                </Text>
                <Text style={[styles.prayerTime, !prayer.isEnabled && styles.textDisabled]}>
                  {prayer.time}
                </Text>
              </View>
              <Switch
                value={prayer.isEnabled}
                onValueChange={() => handleTogglePrayer(prayer)}
                trackColor={{ false: Colors.orthodox.lightGray, true: Colors.orthodox.royalBlue }}
              />
            </View>

            <View style={styles.reminderBadge}>
              <Ionicons 
                name="notifications" 
                size={16} 
                color={prayer.isEnabled ? Colors.orthodox.royalBlue : Colors.orthodox.darkGray} 
              />
              <Text style={[styles.reminderText, !prayer.isEnabled && styles.textDisabled]}>
                {t.reminderBefore} {prayer.reminderMinutes} {t.minutes}
              </Text>
            </View>

            {prayer.streak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={16} color={Colors.orthodox.gold[500]} />
                <Text style={styles.streakText}>
                  {t.streak}: {prayer.streak} {t.days}
                </Text>
              </View>
            )}

            <View style={styles.prayerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleMarkCompleted(prayer)}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.orthodox.success} />
                <Text style={styles.actionButtonText}>{t.markCompleted}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeletePrayer(prayer)}
              >
                <Ionicons name="trash" size={20} color={Colors.orthodox.danger} />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>{t.delete}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={styles.presetsSection}>
        <Text style={styles.sectionTitle}>{t.quickPresets}</Text>
        
        <TouchableOpacity 
          style={styles.presetButton}
          onPress={() => handlePresetPrayer(t.morningPrayers, 7, 0)}
        >
          <Text style={styles.presetText}>🌅 {t.morningPrayers} - 7:00</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.presetButton}
          onPress={() => handlePresetPrayer(t.eveningPrayers, 21, 0)}
        >
          <Text style={styles.presetText}>🌙 {t.eveningPrayers} - 21:00</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.presetButton}
          onPress={() => handlePresetPrayer(t.akathist, 19, 0)}
        >
          <Text style={styles.presetText}>🕊️ {t.akathist} - 19:00</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.addButtonText}>{t.addPrayer}</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.addPrayer}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={Colors.orthodox.darkGray} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t.prayerName}</Text>
              <TextInput
                style={styles.input}
                value={prayerName}
                onChangeText={setPrayerName}
                placeholder={t.prayerName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t.prayerTime}</Text>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>{format(prayerTime, 'HH:mm')}</Text>
                <Ionicons name="time" size={20} color={Colors.orthodox.royalBlue} />
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={prayerTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) setPrayerTime(date);
                }}
              />
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t.reminderBefore}</Text>
              <View style={styles.reminderPicker}>
                {[5, 10, 15, 30, 60].map(mins => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.reminderOption,
                      reminderMinutes === mins && styles.reminderOptionActive
                    ]}
                    onPress={() => setReminderMinutes(mins)}
                  >
                    <Text style={[
                      styles.reminderOptionText,
                      reminderMinutes === mins && styles.reminderOptionTextActive
                    ]}>
                      {mins} {t.minutes}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>{t.daily}</Text>
                <Switch
                  value={isDaily}
                  onValueChange={setIsDaily}
                  trackColor={{ false: Colors.orthodox.lightGray, true: Colors.orthodox.royalBlue }}
                />
              </View>
            </View>

            {!isDaily && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t.selectDays}</Text>
                <View style={styles.dayPicker}>
                  {dayNames.map((dayName, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        selectedDays.includes(index) && styles.dayButtonActive
                      ]}
                      onPress={() => toggleDay(index)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        selectedDays.includes(index) && styles.dayButtonTextActive
                      ]}>
                        {dayName.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddPrayer}
              >
                <Text style={styles.saveButtonText}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.orthodox.cream,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.orthodox.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.orthodox.white,
    opacity: 0.9,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.orthodox.mediumGray,
    marginTop: 8,
  },
  prayerCard: {
    backgroundColor: Colors.orthodox.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerCardDisabled: {
    opacity: 0.6,
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginBottom: 4,
  },
  prayerTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.orthodox.royalBlue,
  },
  textDisabled: {
    color: Colors.orthodox.mediumGray,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orthodox.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  reminderText: {
    fontSize: 12,
    color: Colors.orthodox.darkGray,
    marginLeft: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakText: {
    fontSize: 14,
    color: Colors.orthodox.gold[500],
    fontWeight: '600',
    marginLeft: 6,
  },
  prayerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.orthodox.lightGray,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orthodox.success,
  },
  deleteButtonText: {
    color: Colors.orthodox.danger,
  },
  presetsSection: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.orthodox.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginBottom: 12,
  },
  presetButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.orthodox.cream,
    borderRadius: 8,
    marginBottom: 8,
  },
  presetText: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orthodox.royalBlue,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    shadowColor: Colors.orthodox.royalBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.orthodox.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.orthodox.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.orthodox.darkGray,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.orthodox.lightGray,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.orthodox.lightGray,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  timeButtonText: {
    fontSize: 16,
    color: Colors.orthodox.darkGray,
  },
  reminderPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.orthodox.lightGray,
  },
  reminderOptionActive: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  reminderOptionText: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
  },
  reminderOptionTextActive: {
    color: Colors.orthodox.white,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.orthodox.lightGray,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.darkGray,
  },
  saveButton: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orthodox.white,
  },
  dayPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.orthodox.lightGray,
    minWidth: 50,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.orthodox.royalBlue,
  },
  dayButtonText: {
    fontSize: 14,
    color: Colors.orthodox.darkGray,
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: Colors.orthodox.white,
    fontWeight: '600',
  },
});
