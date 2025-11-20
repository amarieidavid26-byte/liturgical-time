import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import Colors from '../../constants/Colors';
import useAppStore from '../../lib/store/appStore';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface SyncStatusProps {
  onManualSync?: () => void;
  compact?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ onManualSync, compact = false }) => {
  const t = useTranslation();
  const language = useAppStore((state) => state.language);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const calendarSyncEnabled = useAppStore((state) => state.calendarSyncEnabled);

  if (!calendarSyncEnabled) {
    return null;
  }

  const getLastSyncText = () => {
    if (!syncStatus.lastSyncAt) {
      return language === 'ro' ? 'Niciodată sincronizat' : 'Never synced';
    }

    const lastSyncDate = new Date(syncStatus.lastSyncAt);
    const timeAgo = formatDistanceToNow(lastSyncDate, { 
      addSuffix: true,
      locale: language === 'ro' ? ro : undefined 
    });

    return language === 'ro' ? `Ultima sincronizare ${timeAgo}` : `Last synced ${timeAgo}`;
  };

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return <ActivityIndicator size="small" color={Colors.orthodox.royalBlue} />;
    }
    
    if (syncStatus.error) {
      return <Ionicons name="alert-circle" size={16} color={Colors.orthodox.danger} />;
    }
    
    if (syncStatus.lastSyncSuccess) {
      return <Ionicons name="checkmark-circle" size={16} color={Colors.orthodox.success} />;
    }
    
    return <Ionicons name="cloud-offline" size={16} color={Colors.orthodox.mutedText} />;
  };

  const getSyncMessage = () => {
    if (syncStatus.isSyncing) {
      return language === 'ro' ? 'Se sincronizează...' : 'Syncing...';
    }

    if (syncStatus.error) {
      return syncStatus.error;
    }

    const totalChanges = syncStatus.importedCount + syncStatus.updatedCount + syncStatus.deletedCount;
    
    if (totalChanges > 0 && syncStatus.lastSyncAt) {
      const parts: string[] = [];
      if (syncStatus.importedCount > 0) {
        parts.push(language === 'ro' 
          ? `${syncStatus.importedCount} importate` 
          : `${syncStatus.importedCount} imported`);
      }
      if (syncStatus.updatedCount > 0) {
        parts.push(language === 'ro' 
          ? `${syncStatus.updatedCount} actualizate` 
          : `${syncStatus.updatedCount} updated`);
      }
      if (syncStatus.deletedCount > 0) {
        parts.push(language === 'ro' 
          ? `${syncStatus.deletedCount} șterse` 
          : `${syncStatus.deletedCount} deleted`);
      }
      return parts.join(', ');
    }

    return getLastSyncText();
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {getStatusIcon()}
        <Text style={styles.compactText} numberOfLines={1}>
          {getSyncMessage()}
        </Text>
        {onManualSync && !syncStatus.isSyncing && (
          <TouchableOpacity onPress={onManualSync} style={styles.refreshButton}>
            <Ionicons name="refresh" size={16} color={Colors.orthodox.royalBlue} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      syncStatus.error && styles.containerError
    ]}>
      <View style={styles.statusRow}>
        {getStatusIcon()}
        <View style={styles.textContainer}>
          <Text style={[
            styles.statusText,
            syncStatus.error && styles.statusTextError
          ]}>
            {getSyncMessage()}
          </Text>
          {!syncStatus.isSyncing && syncStatus.lastSyncAt && (
            <Text style={styles.timeText}>{getLastSyncText()}</Text>
          )}
        </View>
        {onManualSync && !syncStatus.isSyncing && (
          <TouchableOpacity onPress={onManualSync} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={Colors.orthodox.royalBlue} />
          </TouchableOpacity>
        )}
      </View>
      
      {syncStatus.error && onManualSync && (
        <TouchableOpacity onPress={onManualSync} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>
            {language === 'ro' ? 'Reîncearcă' : 'Retry'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.orthodox.cardBg,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Colors.shadows.small,
  },
  containerError: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: Colors.orthodox.danger,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.orthodox.cardBg,
    borderRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: Colors.orthodox.primaryText,
    fontWeight: '500',
  },
  statusTextError: {
    color: Colors.orthodox.danger,
  },
  compactText: {
    flex: 1,
    fontSize: 12,
    color: Colors.orthodox.secondaryText,
  },
  timeText: {
    fontSize: 12,
    color: Colors.orthodox.mutedText,
    marginTop: 2,
  },
  refreshButton: {
    padding: 4,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: Colors.orthodox.danger,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.orthodox.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
