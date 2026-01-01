// Modern IndexedDB wrapper for route storage
export class RouteDB {
  constructor() {
    this.dbName = 'AccessNatureDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('🔧 IndexedDB upgrade needed, creating schema...');
        
        // Routes store - for saved sessions
        if (!db.objectStoreNames.contains('routes')) {
          const routeStore = db.createObjectStore('routes', { keyPath: 'id' });
          routeStore.createIndex('date', 'date');
          routeStore.createIndex('name', 'name');
          routeStore.createIndex('totalDistance', 'totalDistance');
          console.log('📁 Routes store created');
        }
        
        // Backups store - for unsaved route data
        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'type' });
          console.log('💾 Backups store created');
        }
        
        // Settings store - for app preferences
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
          console.log('⚙️ Settings store created');
        }
        
        // Trail guides store - for HTML guides (future use)
        if (!db.objectStoreNames.contains('trail_guides')) {
          const guidesStore = db.createObjectStore('trail_guides', { keyPath: 'id' });
          guidesStore.createIndex('userId', 'userId');
          guidesStore.createIndex('isPublic', 'isPublic');
          guidesStore.createIndex('generatedAt', 'generatedAt');
          console.log('🌐 Trail guides store created');
        }
        
        console.log('✅ IndexedDB schema creation complete');
      };
    });
  }

  // Save route (replaces localStorage sessions)
  async saveRoute(routeData) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['routes'], 'readwrite');
    const store = transaction.objectStore('routes');
    
    return new Promise((resolve, reject) => {
      const request = store.add(routeData);
      request.onsuccess = () => {
        console.log(`✅ Route saved to IndexedDB: ${routeData.name}`);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('❌ Failed to save route:', request.error);
        reject(request.error);
      };
    });
  }

  // Update existing route
  async updateRoute(routeData) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['routes'], 'readwrite');
    const store = transaction.objectStore('routes');
    
    return new Promise((resolve, reject) => {
      const request = store.put(routeData);
      request.onsuccess = () => {
        console.log(`✅ Route updated in IndexedDB: ${routeData.name}`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all routes (replaces getSessions)
  async getAllRoutes() {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['routes'], 'readonly');
    const store = transaction.objectStore('routes');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const routes = request.result || [];
        console.log(`📂 Retrieved ${routes.length} routes from IndexedDB`);
        resolve(routes);
      };
      request.onerror = () => {
        console.error('❌ Failed to get routes:', request.error);
        reject(request.error);
      };
    });
  }

  // Get single route by ID
  async getRoute(id) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['routes'], 'readonly');
    const store = transaction.objectStore('routes');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete route
  async deleteRoute(id) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['routes'], 'readwrite');
    const store = transaction.objectStore('routes');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log(`🗑️ Route deleted from IndexedDB: ${id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Save backup (replaces localStorage route_backup)
  async saveBackup(backupData) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['backups'], 'readwrite');
    const store = transaction.objectStore('backups');
    
    const backup = {
      type: 'route_backup',
      data: backupData,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(backup);
      request.onsuccess = () => {
        console.log('💾 Backup saved to IndexedDB');
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('❌ Failed to save backup:', request.error);
        reject(request.error);
      };
    });
  }

  // Get backup
  async getBackup() {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['backups'], 'readonly');
    const store = transaction.objectStore('backups');
    
    return new Promise((resolve, reject) => {
      const request = store.get('route_backup');
      request.onsuccess = () => {
        const result = request.result?.data || null;
        if (result) {
          console.log('📥 Backup retrieved from IndexedDB');
        }
        resolve(result);
      };
      request.onerror = () => {
        console.error('❌ Failed to get backup:', request.error);
        reject(request.error);
      };
    });
  }

  // Clear backup
  async clearBackup() {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['backups'], 'readwrite');
    const store = transaction.objectStore('backups');
    
    return new Promise((resolve, reject) => {
      const request = store.delete('route_backup');
      request.onsuccess = () => {
        console.log('🧹 Backup cleared from IndexedDB');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Save settings
  async saveSetting(key, value) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, updated: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get setting
  async getSetting(key, defaultValue = null) {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get storage usage estimate
  async getStorageEstimate() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usagePercent: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(1) : 0
        };
      }
    } catch (error) {
      console.warn('Storage estimate not available:', error);
    }
    
    return { usage: 0, quota: 0, usagePercent: 0 };
  }

  // Clear all data (for reset functionality)
  async clearAllData() {
    if (!this.db) throw new Error('Database not initialized');
    
    const stores = ['routes', 'backups', 'settings', 'trail_guides'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    const promises = stores.map(storeName => {
      const store = transaction.objectStore(storeName);
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    
    await Promise.all(promises);
    console.log('🧹 All IndexedDB data cleared');
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('🔒 IndexedDB connection closed');
    }
  }
}