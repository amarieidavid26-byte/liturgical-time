import { AppState, AppStateStatus } from 'react-native';
import { smartImportMeetings, syncExternalChanges } from './calendarSyncService';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastSyncSuccess: boolean;
  error: string | null;
  importedCount: number;
  updatedCount: number;
  deletedCount: number;
}

export interface SyncControllerConfig {
  enabled: boolean;
  baseInterval: number;
  maxInterval: number;
  minSyncGap: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: SyncControllerConfig = {
  enabled: true,
  baseInterval: 60000,
  maxInterval: 120000,
  minSyncGap: 10000,
  maxRetries: 3,
};

export class CalendarSyncController {
  private static instance: CalendarSyncController | null = null;
  
  private config: SyncControllerConfig;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncMutex = false;
  private retryCount = 0;
  private currentInterval: number;
  private appStateSubscription: any = null;
  private statusCallback: ((status: SyncStatus) => void) | null = null;
  
  private status: SyncStatus = {
    isSyncing: false,
    lastSyncAt: null,
    lastSyncSuccess: true,
    error: null,
    importedCount: 0,
    updatedCount: 0,
    deletedCount: 0,
  };

  private constructor(config: Partial<SyncControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentInterval = this.config.baseInterval;
  }

  static getInstance(config?: Partial<SyncControllerConfig>): CalendarSyncController {
    if (!CalendarSyncController.instance) {
      CalendarSyncController.instance = new CalendarSyncController(config);
    }
    return CalendarSyncController.instance;
  }

  static resetInstance(): void {
    if (CalendarSyncController.instance) {
      CalendarSyncController.instance.stop();
      CalendarSyncController.instance = null;
    }
  }

  setStatusCallback(callback: (status: SyncStatus) => void): void {
    this.statusCallback = callback;
    this.notifyStatus();
  }

  private notifyStatus(): void {
    if (this.statusCallback) {
      this.statusCallback({ ...this.status });
    }
  }

  private updateStatus(updates: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyStatus();
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  start(): void {
    if (!this.config.enabled) {
      console.log('CalendarSyncController: sync disabled');
      return;
    }

    this.stop();

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    if (AppState.currentState === 'active') {
      this.performSync();
      this.schedulePoll();
    }

    console.log('CalendarSyncController: started');
  }

  stop(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    console.log('CalendarSyncController: stopped');
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      console.log('CalendarSyncController: app became active, triggering instant pull');
      this.performSync();
      this.schedulePoll();
    } else {
      console.log('CalendarSyncController: app became inactive, pausing polling');
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }
    }
  }

  async performSync(force = false): Promise<boolean> {
    if (this.syncMutex && !force) {
      console.log('CalendarSyncController: sync already in progress, skipping');
      return false;
    }

    const now = Date.now();
    const lastSync = this.status.lastSyncAt ? new Date(this.status.lastSyncAt).getTime() : 0;
    const timeSinceLastSync = now - lastSync;

    if (!force && timeSinceLastSync < this.config.minSyncGap) {
      console.log(`CalendarSyncController: skipping sync, last sync was ${timeSinceLastSync}ms ago`);
      return false;
    }

    if (this.retryCount >= this.config.maxRetries) {
      console.log('CalendarSyncController: max retries reached, auto-sync disabled');
      this.updateStatus({
        error: 'Max sync retries reached. Please check calendar permissions and try again.',
        lastSyncSuccess: false,
      });
      this.stop();
      return false;
    }

    this.syncMutex = true;
    this.updateStatus({ isSyncing: true, error: null });

    try {
      console.log('CalendarSyncController: starting sync...');
      
      const importResult = await smartImportMeetings();
      const syncResult = await syncExternalChanges();

      const totalChanges = importResult.imported + syncResult.updated + syncResult.deleted;

      this.updateStatus({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        lastSyncSuccess: true,
        error: null,
        importedCount: importResult.imported,
        updatedCount: syncResult.updated,
        deletedCount: syncResult.deleted,
      });

      this.retryCount = 0;

      if (totalChanges === 0) {
        this.applyBackoff();
      } else {
        this.resetInterval();
        console.log(`CalendarSyncController: sync complete - ${importResult.imported} imported, ${syncResult.updated} updated, ${syncResult.deleted} deleted`);
      }

      return true;
    } catch (error) {
      console.error('CalendarSyncController: sync error', error);
      
      this.retryCount++;
      this.updateStatus({
        isSyncing: false,
        lastSyncSuccess: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      });

      this.applyBackoff();
      return false;
    } finally {
      this.syncMutex = false;
    }
  }

  private schedulePoll(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    if (!this.config.enabled || AppState.currentState !== 'active') {
      return;
    }

    const jitter = Math.random() * 5000;
    const nextPollIn = this.currentInterval + jitter;

    this.syncTimer = setTimeout(() => {
      this.performSync();
      this.schedulePoll();
    }, nextPollIn);

    console.log(`CalendarSyncController: next poll in ${Math.round(nextPollIn / 1000)}s`);
  }

  private applyBackoff(): void {
    this.currentInterval = Math.min(
      this.currentInterval * 1.5,
      this.config.maxInterval
    );
    console.log(`CalendarSyncController: backing off to ${Math.round(this.currentInterval / 1000)}s`);
  }

  private resetInterval(): void {
    this.currentInterval = this.config.baseInterval;
    console.log(`CalendarSyncController: reset interval to ${Math.round(this.currentInterval / 1000)}s`);
  }

  async manualSync(): Promise<boolean> {
    console.log('CalendarSyncController: manual sync triggered');
    return this.performSync(true);
  }

  enable(): void {
    this.config.enabled = true;
    this.retryCount = 0;
    this.resetInterval();
    this.start();
  }

  disable(): void {
    this.config.enabled = false;
    this.stop();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export default CalendarSyncController.getInstance();
