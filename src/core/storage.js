// FIXED: Storage controller with proper backup/restore data structures
// Enhanced storage with IndexedDB migration - CORRECTED VERSION
import { RouteDB } from './indexeddb.js';

export class AppState {
  constructor() {
    this.routeData = [];
    this.pathPoints = [];
    this.totalDistance = 0;
    this.elapsedTime = 0;
    this.isTracking = false;
    this.isPaused = false;
    this.startTime = null;
    this.lastCoords = null;
    this.lastBackupTime = 0;
    this.backupInterval = null;
    
    // IndexedDB integration
    this.routeDB = new RouteDB();
    this.dbReady = false;
    this.initDB();
  }

  // Initialize IndexedDB
  async initDB() {
    try {
      await this.routeDB.init();
      this.dbReady = true;
      console.log('✅ IndexedDB ready - Large storage capacity available');
      
      // Migrate localStorage data if exists
      await this.migrateFromLocalStorage();
    } catch (error) {
      console.warn('⚠️ IndexedDB failed, falling back to localStorage:', error);
      this.dbReady = false;
    }
  }

  // IMPROVED: Migrate existing localStorage data to IndexedDB
  async migrateFromLocalStorage() {
    try {
      // Check if migration already happened
      const migrationStatus = localStorage.getItem('indexeddb_migration');
      if (migrationStatus === 'completed') {
        console.log('ℹ️ Migration already completed, checking for orphaned data...');
        
        // Check if there's backup data that wasn't migrated
        const backupData = localStorage.getItem('sessions_backup_pre_migration');
        if (backupData) {
          const existingRoutes = await this.routeDB.getAllRoutes();
          if (existingRoutes.length === 0) {
            console.log('🔄 Found orphaned backup data, attempting recovery...');
            await this.recoverFromBackup();
          }
        }
        return;
      }

      // Migrate sessions
      const oldSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      if (oldSessions.length > 0) {
        console.log(`🔄 Migrating ${oldSessions.length} routes from localStorage to IndexedDB...`);
        
        let migratedCount = 0;
        for (const session of oldSessions) {
          try {
            await this.routeDB.saveRoute({
              ...session,
              migrated: true,
              migratedAt: new Date().toISOString(),
              migratedFrom: 'localStorage',
              version: '2.0'
            });
            migratedCount++;
            console.log(`✅ Migrated: ${session.name}`);
          } catch (error) {
            console.error(`❌ Failed to migrate route ${session.name}:`, error);
          }
        }
        
        if (migratedCount > 0) {
          // Keep a backup in localStorage, then clear
          localStorage.setItem('sessions_backup_pre_migration', localStorage.getItem('sessions'));
          localStorage.removeItem('sessions');
          console.log(`✅ Successfully migrated ${migratedCount}/${oldSessions.length} routes`);
        }
      }
      
      // Migrate backup
      const oldBackup = localStorage.getItem('route_backup');
      if (oldBackup) {
        try {
          await this.routeDB.saveBackup(JSON.parse(oldBackup));
          localStorage.removeItem('route_backup');
          console.log('✅ Route backup migrated to IndexedDB');
        } catch (error) {
          console.error('❌ Failed to migrate backup:', error);
        }
      }

      // Mark migration as completed
      localStorage.setItem('indexeddb_migration', 'completed');
      console.log('✅ IndexedDB migration completed successfully');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  // NEW: Recover from backup data
  async recoverFromBackup() {
    try {
      const backupData = localStorage.getItem('sessions_backup_pre_migration');
      if (!backupData) return;
      
      const oldSessions = JSON.parse(backupData);
      console.log(`🔄 Recovering ${oldSessions.length} routes from backup...`);
      
      let recoveredCount = 0;
      for (const session of oldSessions) {
        try {
          await this.routeDB.saveRoute({
            ...session,
            migrated: true,
            migratedAt: new Date().toISOString(),
            migratedFrom: 'localStorage_backup_recovery',
            version: '2.0'
          });
          recoveredCount++;
        } catch (error) {
          console.error(`❌ Failed to recover route ${session.name}:`, error);
        }
      }
      
      console.log(`✅ Successfully recovered ${recoveredCount}/${oldSessions.length} routes`);
      
    } catch (error) {
      console.error('❌ Recovery failed:', error);
    }
  }

  // Enhanced route point addition with better backup timing
  addRoutePoint(entry) {
    this.routeData.push({
      ...entry,
      timestamp: entry.timestamp || Date.now()
    });
    
    // Smart backup: every 10 points or every 2 minutes
    const shouldBackup = this.routeData.length % 10 === 0 || 
                        (Date.now() - this.lastBackupTime) > 120000;
    
    if (shouldBackup && this.isTracking) {
      this.autoSave();
    }
  }

  getRouteData() {
    return [...this.routeData];
  }

  // Enhanced clear with IndexedDB cleanup
  clearRouteData() {
    this.routeData = [];
    this.pathPoints = [];
    this.totalDistance = 0;
    this.elapsedTime = 0;
    this.lastCoords = null;
    this.isTracking = false;
    this.isPaused = false;
    this.stopAutoBackup();
    this.clearRouteBackup();
  }

  updateDistance(distance) {
    this.totalDistance = distance;
  }

  getTotalDistance() {
    return this.totalDistance;
  }

  // Enhanced tracking state with auto backup
  setTrackingState(isTracking, isPaused = false) {
    this.isTracking = isTracking;
    this.isPaused = isPaused;
    
    if (isTracking && !isPaused) {
      this.startAutoBackup();
    } else {
      this.stopAutoBackup();
    }
  }

  getTrackingState() {
    return { 
      isTracking: this.isTracking,
      isPaused: this.isPaused 
    };
  }

  setElapsedTime(time) {
    this.elapsedTime = time;
  }

  getElapsedTime() {
    return this.elapsedTime;
  }

  setStartTime(time) {
    this.startTime = time;
  }

  getStartTime() {
    return this.startTime;
  }

  // Enhanced path tracking for map redrawing
  addPathPoint(coords) {
    this.lastCoords = coords;
    this.pathPoints.push(coords);
  }

  getLastCoords() {
    return this.lastCoords;
  }

  // Smart save session (IndexedDB first, localStorage fallback)
  async saveSession(name) {
    if (!name || this.routeData.length === 0) {
      throw new Error('Invalid session data');
    }

    const session = {
      id: Date.now(),
      name,
      date: new Date().toISOString(),
      totalDistance: this.totalDistance,
      elapsedTime: this.elapsedTime,
      data: [...this.routeData],
      dataSize: JSON.stringify(this.routeData).length,
      version: '2.0' // Mark as new version
    };

    try {
      if (this.dbReady) {
        // Use IndexedDB for better storage
        await this.routeDB.saveRoute(session);
        console.log(`✅ Route "${name}" saved to IndexedDB (${session.dataSize} bytes)`);
      } else {
        // Fallback to localStorage
        const sessions = await this.getSessions();
        sessions.push(session);
        localStorage.setItem('sessions', JSON.stringify(sessions));
        console.log(`✅ Route "${name}" saved to localStorage (fallback)`);
      }
      
      await this.clearRouteBackup();
      return session;
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      
      // If IndexedDB failed, try localStorage as fallback
      if (this.dbReady && error.name === 'QuotaExceededError') {
        console.log('💾 IndexedDB quota exceeded, trying localStorage fallback...');
        try {
          const sessions = await this.getSessions();
          sessions.push(session);
          localStorage.setItem('sessions', JSON.stringify(sessions));
          console.log('✅ Route saved to localStorage (quota fallback)');
          return session;
        } catch (fallbackError) {
          throw new Error('Storage quota exceeded on both IndexedDB and localStorage');
        }
      }
      
      throw error;
    }
  }

  // Smart get sessions (IndexedDB first, localStorage fallback)
  async getSessions() {
    try {
      if (this.dbReady) {
        const routes = await this.routeDB.getAllRoutes();
        return routes.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else {
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem('sessions') || '[]');
      }
    } catch (error) {
      console.error('❌ Failed to get sessions:', error);
      // Ultimate fallback
      try {
        return JSON.parse(localStorage.getItem('sessions') || '[]');
      } catch (fallbackError) {
        console.error('❌ localStorage fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  async autoSave() {
  // Get current elapsed time from timer if running
  let currentElapsed = this.elapsedTime;
  
  // If tracking is active, get live elapsed time from timer
  if (this.isTracking) {
    const app = window.AccessNatureApp;
    const timer = app?.getController('timer');
    if (timer && timer.isTimerRunning()) {
      currentElapsed = timer.getCurrentElapsed();
    }
  }

  const backup = {
    routeData: this.routeData,
    pathPoints: this.pathPoints,
    totalDistance: this.totalDistance,
    elapsedTime: currentElapsed,  // Fixed: Use live elapsed time
    startTime: this.startTime,
    isTracking: this.isTracking,
    isPaused: this.isPaused,
    backupTime: Date.now(),
    deviceInfo: {
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };

  try {
    if (this.dbReady) {
      await this.routeDB.saveBackup(backup);
      console.log(`💾 Auto-backup to IndexedDB: ${this.routeData.length} points, ${this.totalDistance.toFixed(2)} km, ${Math.floor(currentElapsed/1000)}s elapsed`);
    } else {
      localStorage.setItem('route_backup', JSON.stringify(backup));
      console.log(`💾 Auto-backup to localStorage: ${this.routeData.length} points, ${Math.floor(currentElapsed/1000)}s elapsed`);
    }
    this.lastBackupTime = Date.now();
  } catch (error) {
    console.warn('Auto-save failed:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem('route_backup', JSON.stringify(backup));
      console.log('💾 Auto-backup fallback to localStorage successful');
    } catch (fallbackError) {
      console.error('❌ Both IndexedDB and localStorage backup failed');
    }
  }
}

  // IMPROVED: Enhanced backup checking with better error handling
  async checkForUnsavedRoute() {
    try {
      let backup = null;
      
      // Try IndexedDB first
      if (this.dbReady) {
        try {
          backup = await this.routeDB.getBackup();
          if (backup) {
            console.log('📥 Backup found in IndexedDB');
          }
        } catch (dbError) {
          console.warn('⚠️ IndexedDB backup check failed:', dbError);
        }
      }
      
      // Fallback to localStorage
      if (!backup) {
        try {
          const localBackup = localStorage.getItem('route_backup');
          if (localBackup) {
            backup = JSON.parse(localBackup);
            console.log('📥 Backup found in localStorage');
          }
        } catch (parseError) {
          console.warn('⚠️ localStorage backup parse failed:', parseError);
          // Remove corrupted backup
          localStorage.removeItem('route_backup');
        }
      }
      
      if (!backup) {
        console.log('📭 No backup found');
        return null;
      }

      // Validate backup structure
      if (typeof backup !== 'object' || !backup.routeData || !Array.isArray(backup.routeData)) {
        console.warn('⚠️ Invalid backup structure, removing...');
        await this.clearRouteBackup();
        return null;
      }

      // Validate backup age
      const backupTime = backup.backupTime || 0;
      const backupAge = Date.now() - backupTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (backupAge > maxAge) {
        console.log('⏰ Route backup too old, removing...');
        await this.clearRouteBackup();
        return null;
      }

      // Validate backup content
      if (backup.routeData.length === 0) {
        console.log('📭 Route backup empty, removing...');
        await this.clearRouteBackup();
        return null;
      }

      const locationPoints = backup.routeData.filter(p => p && p.type === 'location').length;
      console.log(`🔍 Found valid route backup: ${backup.routeData.length} points (${locationPoints} GPS), ${backup.totalDistance?.toFixed(2) || 0} km`);
      
      return backup;
      
    } catch (error) {
      console.error('❌ Failed to check for unsaved route:', error);
      try {
        await this.clearRouteBackup();
      } catch (clearError) {
        console.error('❌ Failed to clear corrupted backup:', clearError);
      }
      return null;
    }
  }

  // FIXED: Enhanced route restoration with proper data structure handling
  restoreFromBackup(backupData) {
    console.log('🔧 RESTORE BACKUP CALLED'); // Add this line
    try {
      // Validate backup data structure
      if (!backupData || typeof backupData !== 'object') {
        console.error('❌ Invalid backup data structure');
        return false;
      }
      
      // Handle both old and new backup formats
      this.routeData = Array.isArray(backupData.routeData) ? backupData.routeData : [];
      this.pathPoints = Array.isArray(backupData.pathPoints) ? backupData.pathPoints : [];
      this.totalDistance = typeof backupData.totalDistance === 'number' ? backupData.totalDistance : 0;
      this.elapsedTime = typeof backupData.elapsedTime === 'number' ? backupData.elapsedTime : 0;
      this.startTime = backupData.startTime || null;
      
      // FIXED: Rebuild pathPoints from routeData if missing
      if (this.pathPoints.length === 0 && this.routeData.length > 0) {
        console.log('🔧 Rebuilding pathPoints from routeData...');
        const locationPoints = this.routeData.filter(p => p && p.type === 'location' && p.coords);
        this.pathPoints = locationPoints.map(p => p.coords);
        console.log(`✅ Rebuilt ${this.pathPoints.length} pathPoints from location data`);
      }
      
      // Set last coords from path points if available
      if (this.pathPoints.length > 0) {
        this.lastCoords = this.pathPoints[this.pathPoints.length - 1];
      }
      
      // Don't auto-resume tracking
      this.isTracking = false;
      this.isPaused = false;

      console.log(`✅ Route restored: ${this.routeData.length} points, ${this.totalDistance.toFixed(2)} km, ${this.pathPoints.length} path points`);
      
      // Update UI displays
      this.updateDistanceDisplay();
      this.updateTimerDisplay();
      
      // FIXED: Restore route on map with proper data
      console.log('🗺️ About to call redrawRouteOnMap...');
      this.redrawRouteOnMap();
      console.log('🗺️ redrawRouteOnMap completed');
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to restore route from backup:', error);
      return false;
    }
  }

  // Update distance display
  updateDistanceDisplay() {
    const distanceElement = document.getElementById('distance');
    if (distanceElement) {
      if (this.totalDistance < 1) {
        distanceElement.textContent = `${(this.totalDistance * 1000).toFixed(0)} m`;
      } else {
        distanceElement.textContent = `${this.totalDistance.toFixed(2)} km`;
      }
    }
  }

  // Update timer display
  updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (timerElement && this.startTime) {
      const elapsed = this.elapsedTime || (Date.now() - this.startTime);
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      
      timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // FIXED: Redraw route on map using enhanced map controller
  // In your redrawRouteOnMap method, add logging:
redrawRouteOnMap() {
  try {
    console.log('🗺️ redrawRouteOnMap called with:', this.routeData.length, 'points');
    
    const app = window.AccessNatureApp;
    const mapController = app?.getController('map');
    
    if (mapController && this.routeData.length > 0) {
      console.log('🗺️ Calling mapController.showRouteData...');
      mapController.showRouteData(this.routeData);
      console.log('✅ showRouteData completed');
    } else {
      console.warn('⚠️ Map controller not ready, scheduling retry...');
      
      // FIXED: Retry after controllers are initialized
      setTimeout(() => {
        console.log('🔄 Retrying map redraw...');
        const retryApp = window.AccessNatureApp;
        const retryMap = retryApp?.getController('map');
        
        if (retryMap && this.routeData.length > 0) {
          console.log('🗺️ Retry successful - calling showRouteData...');
          retryMap.showRouteData(this.routeData);
        } else {
          console.warn('⚠️ Map controller still not available after retry');
        }
      }, 2000); // Wait 2 seconds for controllers to initialize
    }
  } catch (error) {
    console.error('❌ Failed to redraw route on map:', error);
  }
}

  // Auto backup system
  startAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    // Backup every 30 seconds during tracking
    this.backupInterval = setInterval(() => {
      if (this.isTracking && this.routeData.length > 0) {
        this.autoSave();
      }
    }, 30000);

    console.log('🔄 Auto backup started (30s intervals)');
  }

  stopAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  // Enhanced backup clearing
  async clearRouteBackup() {
    try {
      if (this.dbReady) {
        await this.routeDB.clearBackup();
      }
      localStorage.removeItem('route_backup');
      this.stopAutoBackup();
      console.log('🧹 Route backup cleared from all storage');
    } catch (error) {
      console.error('❌ Failed to clear backup:', error);
    }
  }

  // Enhanced storage info
  async getStorageInfo() {
    const info = {
      indexedDBSupported: this.dbReady,
      storageType: this.dbReady ? 'IndexedDB' : 'localStorage',
      migrationCompleted: localStorage.getItem('indexeddb_migration') === 'completed'
    };

    try {
      if (this.dbReady) {
        const estimate = await this.routeDB.getStorageEstimate();
        info.usage = estimate.usage;
        info.quota = estimate.quota;
        info.usagePercent = estimate.usagePercent;
        info.usageFormatted = this.formatBytes(estimate.usage);
        info.quotaFormatted = this.formatBytes(estimate.quota);
      } else {
        // Estimate localStorage usage
        let totalSize = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length;
          }
        }
        info.usage = totalSize;
        info.quota = 5 * 1024 * 1024; // ~5MB typical limit
        info.usagePercent = ((totalSize / info.quota) * 100).toFixed(1);
        info.usageFormatted = this.formatBytes(totalSize);
        info.quotaFormatted = this.formatBytes(info.quota);
      }
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }

    return info;
  }

  // Helper to format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Enhanced session management
  async clearAllSessions() {
    try {
      if (this.dbReady) {
        // Clear from IndexedDB
        const routes = await this.routeDB.getAllRoutes();
        for (const route of routes) {
          await this.routeDB.deleteRoute(route.id);
        }
        console.log('🧹 All routes cleared from IndexedDB');
      }
      // Also clear localStorage for compatibility
      localStorage.removeItem('sessions');
      console.log('🧹 All sessions cleared');
    } catch (error) {
      console.error('❌ Failed to clear sessions:', error);
      // Fallback to localStorage only
      localStorage.removeItem('sessions');
    }
  }

  async clearAllAppData() {
    try {
      if (this.dbReady) {
        await this.routeDB.clearAllData();
        console.log('🧹 All IndexedDB data cleared');
      }
      localStorage.clear();
      this.clearRouteData();
      console.log('🧹 All app data cleared');
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      // Fallback
      localStorage.clear();
      this.clearRouteData();
    }
  }

  async reset() {
    this.clearRouteData();
    this.setTrackingState(false);
  }
}