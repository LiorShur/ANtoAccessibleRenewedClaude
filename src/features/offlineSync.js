/**
 * Offline Sync Manager
 * Access Nature - Robust offline data management
 * 
 * Features:
 * - IndexedDB storage for routes and trail guides
 * - Pending uploads queue with retry logic
 * - Email backup of saved data
 * - UI for managing local storage
 * - Cloud upload when connection restored
 */

import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';

// Settings storage key (shared with admin.html)
const SETTINGS_KEY = 'accessNature_adminSettings';

// Get settings from localStorage
function getSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return {
    adminEmails: ['liorshur@gmail.com'],
    backupEmail: 'liorshur@gmail.com',
    emailjs: {
      serviceId: '',
      templateId: '',
      publicKey: ''
    }
  };
}

class OfflineSync {
  constructor() {
    this.db = null;
    this.dbName = 'AccessNaturePending';
    this.dbVersion = 1;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.emailJsLoaded = false;
  }

  /**
   * Get EmailJS configuration dynamically
   */
  getEmailJSConfig() {
    const settings = getSettings();
    return settings.emailjs || {};
  }

  /**
   * Get backup email address
   */
  getBackupEmail() {
    const settings = getSettings();
    return settings.backupEmail || 'liorshur@gmail.com';
  }

  /**
   * Initialize the offline sync system
   */
  async initialize() {
    await this.openDatabase();
    this.setupConnectivityListeners();
    await this.loadEmailJS();
    
    // Check for pending uploads on init
    const pendingCount = await this.getPendingCount();
    if (pendingCount > 0) {
      console.log(`📦 ${pendingCount} pending uploads found`);
      if (this.isOnline) {
        // Don't auto-sync, just notify user
        this.showPendingNotification(pendingCount);
      }
    }
    
    console.log('✅ Offline Sync Manager initialized');
  }

  /**
   * Open IndexedDB for pending uploads
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Failed to open pending uploads database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Pending uploads database opened');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for pending route uploads
        if (!db.objectStoreNames.contains('pending_routes')) {
          const routeStore = db.createObjectStore('pending_routes', { 
            keyPath: 'localId', 
            autoIncrement: true 
          });
          routeStore.createIndex('timestamp', 'timestamp');
          routeStore.createIndex('status', 'status');
        }

        // Store for pending trail guide uploads
        if (!db.objectStoreNames.contains('pending_guides')) {
          const guideStore = db.createObjectStore('pending_guides', { 
            keyPath: 'localId', 
            autoIncrement: true 
          });
          guideStore.createIndex('timestamp', 'timestamp');
          guideStore.createIndex('status', 'status');
        }

        // Store for email backup queue
        if (!db.objectStoreNames.contains('email_queue')) {
          const emailStore = db.createObjectStore('email_queue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          emailStore.createIndex('timestamp', 'timestamp');
          emailStore.createIndex('sent', 'sent');
        }

        console.log('✅ Pending uploads database schema created');
      };
    });
  }

  /**
   * Load EmailJS library dynamically
   */
  async loadEmailJS() {
    if (this.emailJsLoaded) return;
    
    try {
      // Check if EmailJS is already loaded
      if (typeof emailjs !== 'undefined') {
        this.emailJsLoaded = true;
        return;
      }

      // Load EmailJS script
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      script.async = true;
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      // Initialize EmailJS with dynamic config
      const config = this.getEmailJSConfig();
      if (typeof emailjs !== 'undefined' && config.publicKey) {
        emailjs.init(config.publicKey);
        this.emailJsLoaded = true;
        console.log('✅ EmailJS loaded and initialized');
      } else {
        console.warn('⚠️ EmailJS not configured - email backups disabled. Configure in Admin settings.');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load EmailJS:', error);
    }
  }

  /**
   * Setup online/offline listeners
   */
  setupConnectivityListeners() {
    window.addEventListener('online', async () => {
      this.isOnline = true;
      console.log('🌐 Connection restored');
      
      // Check for pending items
      const pendingCount = await this.getPendingCount();
      
      if (pendingCount > 0) {
        // Show notification with auto-sync option
        this.showPendingNotification(pendingCount);
        
        // Auto-sync after short delay (give network time to stabilize)
        setTimeout(async () => {
          if (this.isOnline) {
            console.log('🔄 Auto-syncing pending uploads...');
            await this.syncAllPending();
          }
        }, 3000);
      }
      
      // Process email queue
      this.processEmailQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Connection lost - data will be saved locally');
      toast.warning('Offline - data will sync when connected');
    });
    
    // Also check connectivity periodically (some devices don't fire online/offline reliably)
    setInterval(async () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      // If we just came back online
      if (!wasOnline && this.isOnline) {
        console.log('🌐 Connection detected via polling');
        const pendingCount = await this.getPendingCount();
        if (pendingCount > 0) {
          this.showPendingNotification(pendingCount);
          await this.syncAllPending();
        }
        this.processEmailQueue();
      }
    }, 30000); // Check every 30 seconds
  }

  // ==================== Save Methods ====================

  /**
   * Save route locally (always saves locally first, then tries cloud)
   * @param {object} routeData - The route data to save
   * @param {object} user - Current user (optional)
   * @returns {object} - { localId, cloudId (if uploaded) }
   */
  async saveRoute(routeData, user = null) {
    const pendingRoute = {
      data: routeData,
      userId: user?.uid || 'anonymous',
      userEmail: user?.email || null,
      userName: user?.displayName || 'Anonymous',
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      cloudId: null
    };

    // Save to local IndexedDB first
    const localId = await this.savePendingRoute(pendingRoute);
    console.log(`💾 Route saved locally with ID: ${localId}`);

    // Queue email backup
    await this.queueEmailBackup('route', { ...pendingRoute, localId });

    // Try to upload to cloud if online
    if (this.isOnline && user) {
      try {
        const cloudId = await this.uploadRouteToCloud(routeData, user);
        if (cloudId) {
          await this.markRouteUploaded(localId, cloudId);
          toast.success('Route saved to cloud! ☁️');
          return { localId, cloudId };
        }
      } catch (error) {
        console.warn('⚠️ Cloud upload failed, saved locally:', error);
        toast.warning('Saved locally - will sync when online');
      }
    } else {
      toast.success('Route saved locally 💾');
    }

    // Try to send email backup
    this.processEmailQueue();

    return { localId, cloudId: null };
  }

  /**
   * Save trail guide locally
   * @param {object} guideData - The guide data
   * @param {object} user - Current user
   */
  async saveTrailGuide(guideData, user = null) {
    const pendingGuide = {
      data: guideData,
      userId: user?.uid || 'anonymous',
      userEmail: user?.email || null,
      userName: user?.displayName || 'Anonymous',
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
      cloudId: null
    };

    // Save locally first
    const localId = await this.savePendingGuide(pendingGuide);
    console.log(`💾 Trail guide saved locally with ID: ${localId}`);

    // Queue email backup
    await this.queueEmailBackup('guide', { ...pendingGuide, localId });

    // Try cloud upload if online
    if (this.isOnline && user) {
      try {
        const cloudId = await this.uploadGuideToCloud(guideData, user);
        if (cloudId) {
          await this.markGuideUploaded(localId, cloudId);
          toast.success('Trail guide saved to cloud! ☁️');
          return { localId, cloudId };
        }
      } catch (error) {
        console.warn('⚠️ Cloud upload failed, saved locally:', error);
        toast.warning('Guide saved locally - will sync when online');
      }
    } else {
      toast.success('Trail guide saved locally 💾');
    }

    // Try to send email
    this.processEmailQueue();

    return { localId, cloudId: null };
  }

  // ==================== IndexedDB Operations ====================

  async savePendingRoute(routeData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_routes'], 'readwrite');
      const store = transaction.objectStore('pending_routes');
      const request = store.add(routeData);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePendingGuide(guideData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_guides'], 'readwrite');
      const store = transaction.objectStore('pending_guides');
      const request = store.add(guideData);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markRouteUploaded(localId, cloudId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_routes'], 'readwrite');
      const store = transaction.objectStore('pending_routes');
      const request = store.get(localId);
      
      request.onsuccess = () => {
        const route = request.result;
        if (route) {
          route.status = 'uploaded';
          route.cloudId = cloudId;
          route.uploadedAt = new Date().toISOString();
          store.put(route);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markGuideUploaded(localId, cloudId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_guides'], 'readwrite');
      const store = transaction.objectStore('pending_guides');
      const request = store.get(localId);
      
      request.onsuccess = () => {
        const guide = request.result;
        if (guide) {
          guide.status = 'uploaded';
          guide.cloudId = cloudId;
          guide.uploadedAt = new Date().toISOString();
          store.put(guide);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingRoutes() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_routes'], 'readonly');
      const store = transaction.objectStore('pending_routes');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingGuides() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_guides'], 'readonly');
      const store = transaction.objectStore('pending_guides');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingCount() {
    try {
      const routes = await this.getPendingRoutes();
      const guides = await this.getPendingGuides();
      const pendingRoutes = routes.filter(r => r.status === 'pending').length;
      const pendingGuides = guides.filter(g => g.status === 'pending').length;
      return pendingRoutes + pendingGuides;
    } catch (error) {
      return 0;
    }
  }

  async deleteLocalRoute(localId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_routes'], 'readwrite');
      const store = transaction.objectStore('pending_routes');
      const request = store.delete(localId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLocalGuide(localId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pending_guides'], 'readwrite');
      const store = transaction.objectStore('pending_guides');
      const request = store.delete(localId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Cloud Upload ====================

  async uploadRouteToCloud(routeData, user) {
    try {
      const { db } = await import('../../firebase-setup.js');
      const { collection, addDoc, serverTimestamp } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );

      const docData = {
        ...routeData,
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'routes'), docData);
      console.log('☁️ Route uploaded to cloud:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Cloud upload failed:', error);
      throw error;
    }
  }

  async uploadGuideToCloud(guideData, user) {
    try {
      const { db } = await import('../../firebase-setup.js');
      const { collection, addDoc, serverTimestamp } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );

      const docData = {
        ...guideData,
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'trail_guides'), docData);
      console.log('☁️ Trail guide uploaded to cloud:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Guide cloud upload failed:', error);
      throw error;
    }
  }

  // ==================== Email Backup ====================

  async queueEmailBackup(type, data) {
    return new Promise((resolve, reject) => {
      const emailItem = {
        type,
        data,
        timestamp: new Date().toISOString(),
        sent: false,
        retryCount: 0
      };

      const transaction = this.db.transaction(['email_queue'], 'readwrite');
      const store = transaction.objectStore('email_queue');
      const request = store.add(emailItem);
      
      request.onsuccess = () => {
        console.log('📧 Email backup queued');
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async processEmailQueue() {
    if (!this.emailJsLoaded || !this.isOnline) return;

    try {
      const transaction = this.db.transaction(['email_queue'], 'readonly');
      const store = transaction.objectStore('email_queue');
      const index = store.index('sent');
      const request = index.getAll(false);

      request.onsuccess = async () => {
        const unsent = request.result || [];
        
        for (const item of unsent) {
          if (item.retryCount >= 3) continue; // Max retries
          
          try {
            await this.sendEmailBackup(item);
            await this.markEmailSent(item.id);
            console.log('📧 Email backup sent successfully');
          } catch (error) {
            console.warn('📧 Email send failed:', error);
            await this.incrementEmailRetry(item.id);
          }
        }
      };
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  async sendEmailBackup(emailItem) {
    const config = this.getEmailJSConfig();
    
    if (!config.publicKey || !config.serviceId || !config.templateId) {
      console.log('📧 EmailJS not configured - skipping email. Configure in Admin settings.');
      return;
    }

    const { type, data } = emailItem;
    
    // Prepare email content
    const subject = type === 'route' 
      ? `Access Nature Route Backup - ${new Date(data.timestamp).toLocaleString()}`
      : `Access Nature Trail Guide Backup - ${new Date(data.timestamp).toLocaleString()}`;

    const content = JSON.stringify(data, null, 2);

    // Send via EmailJS
    await emailjs.send(
      config.serviceId,
      config.templateId,
      {
        to_email: this.getBackupEmail(),
        subject: subject,
        content_type: type,
        user_name: data.userName || 'Anonymous',
        user_email: data.userEmail || 'Not provided',
        backup_data: content.substring(0, 5000), // EmailJS has content limits
        timestamp: data.timestamp,
        local_id: data.localId
      }
    );
  }

  async markEmailSent(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['email_queue'], 'readwrite');
      const store = transaction.objectStore('email_queue');
      const request = store.get(id);
      
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.sent = true;
          item.sentAt = new Date().toISOString();
          store.put(item);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async incrementEmailRetry(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['email_queue'], 'readwrite');
      const store = transaction.objectStore('email_queue');
      const request = store.get(id);
      
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.retryCount = (item.retryCount || 0) + 1;
          store.put(item);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== UI Methods ====================

  showPendingNotification(count) {
    if (!count) {
      this.getPendingCount().then(c => {
        if (c > 0) this.showPendingNotification(c);
      });
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'pending-sync-banner';
    banner.innerHTML = `
      <div style="position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%); 
                  background: #059669; color: white; padding: 12px 20px; border-radius: 12px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10001; 
                  display: flex; align-items: center; gap: 12px; max-width: 90%;">
        <span>📦 ${count} item${count !== 1 ? 's' : ''} pending upload</span>
        <button id="view-pending-btn" style="background: white; color: #059669; border: none; 
                padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer;">
          View
        </button>
        <button id="sync-pending-btn" style="background: rgba(255,255,255,0.2); color: white; border: none; 
                padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Sync Now
        </button>
        <button id="dismiss-pending-btn" style="background: transparent; color: white; border: none; 
                font-size: 18px; cursor: pointer; padding: 0 4px;">×</button>
      </div>
    `;
    
    // Remove any existing banner
    document.getElementById('pending-sync-banner')?.remove();
    document.body.appendChild(banner);

    document.getElementById('view-pending-btn')?.addEventListener('click', () => {
      banner.remove();
      this.showPendingUploadsModal();
    });

    document.getElementById('sync-pending-btn')?.addEventListener('click', async () => {
      banner.remove();
      await this.syncAllPending();
    });

    document.getElementById('dismiss-pending-btn')?.addEventListener('click', () => {
      banner.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => banner.remove(), 10000);
  }

  /**
   * Show modal with all pending uploads
   */
  async showPendingUploadsModal() {
    const routes = await this.getPendingRoutes();
    const guides = await this.getPendingGuides();

    const overlay = document.createElement('div');
    overlay.id = 'pending-uploads-modal';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); z-index: 10002;
      display: flex; align-items: center; justify-content: center;
    `;

    const formatDate = (ts) => new Date(ts).toLocaleString();
    
    const routeCards = routes.map(r => `
      <div class="pending-item" data-type="route" data-id="${r.localId}" 
           style="background: ${r.status === 'uploaded' ? '#dcfce7' : '#fef3c7'}; 
                  padding: 12px; margin-bottom: 8px; border-radius: 8px;
                  border-left: 4px solid ${r.status === 'uploaded' ? '#22c55e' : '#f59e0b'};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>🗺️ Route</strong>
          <span style="font-size: 0.8em; color: #6b7280;">
            ${r.status === 'uploaded' ? '☁️ Uploaded' : '⏳ Pending'}
          </span>
        </div>
        <div style="font-size: 0.85em; color: #374151; margin-top: 4px;">
          ${r.data?.name || 'Untitled'} • ${(r.data?.totalDistance || 0).toFixed(2)} km
        </div>
        <div style="font-size: 0.75em; color: #9ca3af; margin-top: 4px;">
          Saved: ${formatDate(r.timestamp)}
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          ${r.status !== 'uploaded' ? `
            <button onclick="offlineSync.uploadSingleRoute(${r.localId})" 
                    style="padding: 4px 10px; font-size: 0.8em; background: #3b82f6; 
                           color: white; border: none; border-radius: 4px; cursor: pointer;">
              ☁️ Upload
            </button>
          ` : ''}
          <button onclick="offlineSync.exportRouteAsFile(${r.localId})" 
                  style="padding: 4px 10px; font-size: 0.8em; background: #6b7280; 
                         color: white; border: none; border-radius: 4px; cursor: pointer;">
            📥 Export
          </button>
          <button onclick="offlineSync.deleteRoute(${r.localId})" 
                  style="padding: 4px 10px; font-size: 0.8em; background: #ef4444; 
                         color: white; border: none; border-radius: 4px; cursor: pointer;">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

    const guideCards = guides.map(g => `
      <div class="pending-item" data-type="guide" data-id="${g.localId}"
           style="background: ${g.status === 'uploaded' ? '#dcfce7' : '#fef3c7'}; 
                  padding: 12px; margin-bottom: 8px; border-radius: 8px;
                  border-left: 4px solid ${g.status === 'uploaded' ? '#22c55e' : '#f59e0b'};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>📚 Trail Guide</strong>
          <span style="font-size: 0.8em; color: #6b7280;">
            ${g.status === 'uploaded' ? '☁️ Uploaded' : '⏳ Pending'}
          </span>
        </div>
        <div style="font-size: 0.85em; color: #374151; margin-top: 4px;">
          ${g.data?.title || g.data?.name || 'Untitled Guide'}
        </div>
        <div style="font-size: 0.75em; color: #9ca3af; margin-top: 4px;">
          Saved: ${formatDate(g.timestamp)}
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          ${g.status !== 'uploaded' ? `
            <button onclick="offlineSync.uploadSingleGuide(${g.localId})" 
                    style="padding: 4px 10px; font-size: 0.8em; background: #3b82f6; 
                           color: white; border: none; border-radius: 4px; cursor: pointer;">
              ☁️ Upload
            </button>
          ` : ''}
          <button onclick="offlineSync.exportGuideAsFile(${g.localId})" 
                  style="padding: 4px 10px; font-size: 0.8em; background: #6b7280; 
                         color: white; border: none; border-radius: 4px; cursor: pointer;">
            📥 Export
          </button>
          <button onclick="offlineSync.deleteGuide(${g.localId})" 
                  style="padding: 4px 10px; font-size: 0.8em; background: #ef4444; 
                         color: white; border: none; border-radius: 4px; cursor: pointer;">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

    overlay.innerHTML = `
      <div style="background: white; border-radius: 16px; max-width: 500px; width: calc(100% - 32px);
                  max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
        <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 1.25em;">📦 Local Storage</h2>
            <button id="close-pending-modal" style="background: none; border: none; 
                    font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
          </div>
          <p style="margin: 8px 0 0; color: #6b7280; font-size: 0.9em;">
            ${routes.length} route${routes.length !== 1 ? 's' : ''}, 
            ${guides.length} guide${guides.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div style="padding: 16px; overflow-y: auto; flex: 1;">
          ${routes.length === 0 && guides.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
              <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
              <p>No locally saved data</p>
            </div>
          ` : ''}
          
          ${routes.length > 0 ? `
            <h3 style="font-size: 1em; color: #374151; margin: 0 0 12px;">Routes</h3>
            ${routeCards}
          ` : ''}
          
          ${guides.length > 0 ? `
            <h3 style="font-size: 1em; color: #374151; margin: 16px 0 12px;">Trail Guides</h3>
            ${guideCards}
          ` : ''}
        </div>
        
        <div style="padding: 16px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px;">
          <button id="sync-all-btn" style="flex: 1; padding: 12px; background: #3b82f6; 
                  color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
            ☁️ Upload All Pending
          </button>
          <button id="clear-uploaded-btn" style="padding: 12px; background: #6b7280; 
                  color: white; border: none; border-radius: 8px; cursor: pointer;">
            🧹 Clear Uploaded
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('close-pending-modal')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('sync-all-btn')?.addEventListener('click', async () => {
      await this.syncAllPending();
      overlay.remove();
      this.showPendingUploadsModal(); // Refresh
    });

    document.getElementById('clear-uploaded-btn')?.addEventListener('click', async () => {
      await this.clearUploaded();
      overlay.remove();
      this.showPendingUploadsModal(); // Refresh
    });
  }

  // ==================== Sync Operations ====================

  async syncAllPending() {
    if (this.syncInProgress) {
      console.log('⚠️ Sync already in progress...');
      return;
    }

    if (!this.isOnline) {
      toast.error('No internet connection');
      return;
    }

    this.syncInProgress = true;

    try {
      // Get current user
      let user = null;
      try {
        const { auth } = await import('../../firebase-setup.js');
        user = auth.currentUser;
      } catch (e) {
        console.warn('Could not get auth:', e);
      }

      if (!user) {
        console.log('⚠️ No user signed in - skipping auto-sync');
        this.syncInProgress = false;
        return;
      }

      const routes = await this.getPendingRoutes();
      const guides = await this.getPendingGuides();
      const pendingRoutes = routes.filter(r => r.status === 'pending');
      const pendingGuides = guides.filter(g => g.status === 'pending');
      
      const totalPending = pendingRoutes.length + pendingGuides.length;
      
      if (totalPending === 0) {
        console.log('✅ No pending items to sync');
        this.syncInProgress = false;
        return;
      }
      
      console.log(`🔄 Syncing ${totalPending} pending items...`);
      toast.info(`Syncing ${totalPending} item${totalPending !== 1 ? 's' : ''}...`);
      
      let successCount = 0;
      let failCount = 0;

      // Upload pending routes
      for (const route of pendingRoutes) {
        try {
          const cloudId = await this.uploadRouteToCloud(route.data, user);
          await this.markRouteUploaded(route.localId, cloudId);
          successCount++;
          console.log(`☁️ Route synced: ${route.localId} -> ${cloudId}`);
        } catch (error) {
          console.error('Failed to upload route:', error);
          failCount++;
          // Increment retry count
          await this.incrementRetryCount('pending_routes', route.localId);
        }
      }

      // Upload pending guides
      for (const guide of pendingGuides) {
        try {
          const cloudId = await this.uploadGuideToCloud(guide.data, user);
          await this.markGuideUploaded(guide.localId, cloudId);
          successCount++;
          console.log(`☁️ Guide synced: ${guide.localId} -> ${cloudId}`);
        } catch (error) {
          console.error('Failed to upload guide:', error);
          failCount++;
          // Increment retry count
          await this.incrementRetryCount('pending_guides', guide.localId);
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`☁️ Uploaded ${successCount} item${successCount !== 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} item${failCount !== 1 ? 's' : ''} failed - will retry later`);
      }
      
      // Process email queue after sync
      await this.processEmailQueue();

    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Increment retry count for failed uploads
   */
  async incrementRetryCount(storeName, localId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.get(localId);
      
      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastRetryAt = new Date().toISOString();
          store.put(item);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async uploadSingleRoute(localId) {
    try {
      const { auth } = await import('../../firebase-setup.js');
      const user = auth.currentUser;
      
      if (!user) {
        toast.error('Please sign in to upload');
        return;
      }

      const routes = await this.getPendingRoutes();
      const route = routes.find(r => r.localId === localId);
      
      if (!route) {
        toast.error('Route not found');
        return;
      }

      toast.info('Uploading...');
      const cloudId = await this.uploadRouteToCloud(route.data, user);
      await this.markRouteUploaded(localId, cloudId);
      toast.success('Route uploaded! ☁️');
      
      // Refresh modal
      document.getElementById('pending-uploads-modal')?.remove();
      this.showPendingUploadsModal();
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    }
  }

  async uploadSingleGuide(localId) {
    try {
      const { auth } = await import('../../firebase-setup.js');
      const user = auth.currentUser;
      
      if (!user) {
        toast.error('Please sign in to upload');
        return;
      }

      const guides = await this.getPendingGuides();
      const guide = guides.find(g => g.localId === localId);
      
      if (!guide) {
        toast.error('Guide not found');
        return;
      }

      toast.info('Uploading...');
      const cloudId = await this.uploadGuideToCloud(guide.data, user);
      await this.markGuideUploaded(localId, cloudId);
      toast.success('Trail guide uploaded! ☁️');
      
      // Refresh modal
      document.getElementById('pending-uploads-modal')?.remove();
      this.showPendingUploadsModal();
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    }
  }

  async deleteRoute(localId) {
    if (!confirm('Delete this route from local storage?')) return;
    
    try {
      await this.deleteLocalRoute(localId);
      toast.success('Route deleted');
      document.getElementById('pending-uploads-modal')?.remove();
      this.showPendingUploadsModal();
    } catch (error) {
      toast.error('Delete failed');
    }
  }

  async deleteGuide(localId) {
    if (!confirm('Delete this trail guide from local storage?')) return;
    
    try {
      await this.deleteLocalGuide(localId);
      toast.success('Guide deleted');
      document.getElementById('pending-uploads-modal')?.remove();
      this.showPendingUploadsModal();
    } catch (error) {
      toast.error('Delete failed');
    }
  }

  async clearUploaded() {
    if (!confirm('Remove all successfully uploaded items from local storage?')) return;
    
    try {
      const routes = await this.getPendingRoutes();
      const guides = await this.getPendingGuides();
      
      for (const route of routes.filter(r => r.status === 'uploaded')) {
        await this.deleteLocalRoute(route.localId);
      }
      for (const guide of guides.filter(g => g.status === 'uploaded')) {
        await this.deleteLocalGuide(guide.localId);
      }
      
      toast.success('Cleared uploaded items');
    } catch (error) {
      toast.error('Clear failed');
    }
  }

  // ==================== Export Methods ====================

  async exportRouteAsFile(localId) {
    const routes = await this.getPendingRoutes();
    const route = routes.find(r => r.localId === localId);
    
    if (!route) {
      toast.error('Route not found');
      return;
    }

    const blob = new Blob([JSON.stringify(route.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-${localId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Route exported');
  }

  async exportGuideAsFile(localId) {
    const guides = await this.getPendingGuides();
    const guide = guides.find(g => g.localId === localId);
    
    if (!guide) {
      toast.error('Guide not found');
      return;
    }

    const blob = new Blob([JSON.stringify(guide.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guide-${localId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Guide exported');
  }

  // ==================== Photo Queue ====================

  /**
   * Queue a photo for upload when offline
   * @param {object} photoData - Photo data including base64 content
   * @param {object} context - Context (routeId, location, etc.)
   */
  async queuePhoto(photoData, context = {}) {
    const queuedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: photoData.content, // base64 or blob
      fileName: photoData.fileName || `photo_${Date.now()}.jpg`,
      mimeType: photoData.mimeType || 'image/jpeg',
      location: photoData.location || context.location || null,
      routeId: context.routeId || null,
      reportId: context.reportId || null,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    try {
      // Store in localStorage for photos (smaller than IndexedDB key/value limits)
      const pendingPhotos = JSON.parse(localStorage.getItem('accessNature_pendingPhotos') || '[]');
      pendingPhotos.push(queuedPhoto);
      localStorage.setItem('accessNature_pendingPhotos', JSON.stringify(pendingPhotos));
      
      console.log(`📸 Photo queued for upload: ${queuedPhoto.id}`);
      toast.info('Photo saved offline - will upload when connected');
      
      // Update pending indicator
      this.updatePendingIndicator();
      
      // Try to upload if online
      if (this.isOnline) {
        this.processPhotoQueue();
      }
      
      return queuedPhoto.id;
    } catch (error) {
      console.error('Failed to queue photo:', error);
      toast.error('Failed to save photo offline');
      return null;
    }
  }

  /**
   * Process pending photo uploads
   */
  async processPhotoQueue() {
    const pendingPhotos = JSON.parse(localStorage.getItem('accessNature_pendingPhotos') || '[]');
    
    if (pendingPhotos.length === 0) return;
    
    console.log(`📸 Processing ${pendingPhotos.length} pending photos...`);
    
    for (const photo of pendingPhotos) {
      if (photo.status === 'uploaded') continue;
      
      try {
        // Import Firebase storage
        const { storage } = await import('../../firebase-setup.js');
        const { ref, uploadString, getDownloadURL } = 
          await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js');
        
        const storageRef = ref(storage, `photos/${photo.id}`);
        
        // Upload base64 data
        const snapshot = await uploadString(storageRef, photo.data, 'data_url');
        const downloadUrl = await getDownloadURL(snapshot.ref);
        
        // Mark as uploaded
        photo.status = 'uploaded';
        photo.downloadUrl = downloadUrl;
        photo.uploadedAt = new Date().toISOString();
        
        console.log(`✅ Photo uploaded: ${photo.id}`);
        
      } catch (error) {
        console.error(`Failed to upload photo ${photo.id}:`, error);
        photo.retryCount = (photo.retryCount || 0) + 1;
        
        if (photo.retryCount >= 3) {
          photo.status = 'failed';
        }
      }
    }
    
    // Save updated queue
    localStorage.setItem('accessNature_pendingPhotos', JSON.stringify(pendingPhotos));
    
    // Remove successfully uploaded photos after a delay
    setTimeout(() => {
      const remaining = pendingPhotos.filter(p => p.status !== 'uploaded');
      localStorage.setItem('accessNature_pendingPhotos', JSON.stringify(remaining));
      this.updatePendingIndicator();
    }, 5000);
  }

  // ==================== Survey Queue ====================

  /**
   * Queue an accessibility survey for submission when offline
   * @param {object} surveyData - The survey form data
   * @param {object} context - Route/location context
   */
  async queueSurvey(surveyData, context = {}) {
    const queuedSurvey = {
      id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: surveyData,
      routeId: context.routeId || null,
      location: context.location || null,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    try {
      const pendingSurveys = JSON.parse(localStorage.getItem('accessNature_pendingSurveys') || '[]');
      pendingSurveys.push(queuedSurvey);
      localStorage.setItem('accessNature_pendingSurveys', JSON.stringify(pendingSurveys));
      
      console.log(`📋 Survey queued: ${queuedSurvey.id}`);
      toast.info('Survey saved offline - will submit when connected');
      
      this.updatePendingIndicator();
      
      if (this.isOnline) {
        this.processSurveyQueue();
      }
      
      return queuedSurvey.id;
    } catch (error) {
      console.error('Failed to queue survey:', error);
      toast.error('Failed to save survey offline');
      return null;
    }
  }

  /**
   * Process pending survey submissions
   */
  async processSurveyQueue() {
    const pendingSurveys = JSON.parse(localStorage.getItem('accessNature_pendingSurveys') || '[]');
    
    if (pendingSurveys.length === 0) return;
    
    console.log(`📋 Processing ${pendingSurveys.length} pending surveys...`);
    
    for (const survey of pendingSurveys) {
      if (survey.status === 'submitted') continue;
      
      try {
        // Store survey data with route or as standalone
        const { db } = await import('../../firebase-setup.js');
        const { doc, updateDoc, collection, addDoc, serverTimestamp } = 
          await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js');
        
        if (survey.routeId) {
          // Update existing route with survey data
          const routeRef = doc(db, 'routes', survey.routeId);
          await updateDoc(routeRef, {
            accessibility: survey.data,
            accessibilityUpdatedAt: serverTimestamp()
          });
        } else {
          // Store as standalone survey
          await addDoc(collection(db, 'accessibility_surveys'), {
            ...survey.data,
            location: survey.location,
            submittedAt: serverTimestamp(),
            queuedAt: survey.timestamp
          });
        }
        
        survey.status = 'submitted';
        survey.submittedAt = new Date().toISOString();
        
        console.log(`✅ Survey submitted: ${survey.id}`);
        
      } catch (error) {
        console.error(`Failed to submit survey ${survey.id}:`, error);
        survey.retryCount = (survey.retryCount || 0) + 1;
        
        if (survey.retryCount >= 3) {
          survey.status = 'failed';
        }
      }
    }
    
    // Save updated queue
    localStorage.setItem('accessNature_pendingSurveys', JSON.stringify(pendingSurveys));
    
    // Clean up submitted surveys
    setTimeout(() => {
      const remaining = pendingSurveys.filter(s => s.status !== 'submitted');
      localStorage.setItem('accessNature_pendingSurveys', JSON.stringify(remaining));
      this.updatePendingIndicator();
    }, 5000);
  }

  /**
   * Update pending items indicator in UI
   */
  updatePendingIndicator() {
    const photos = JSON.parse(localStorage.getItem('accessNature_pendingPhotos') || '[]');
    const surveys = JSON.parse(localStorage.getItem('accessNature_pendingSurveys') || '[]');
    
    const pendingPhotos = photos.filter(p => p.status === 'pending').length;
    const pendingSurveys = surveys.filter(s => s.status === 'pending').length;
    const total = pendingPhotos + pendingSurveys;
    
    // Update any pending indicators in the UI
    const indicators = document.querySelectorAll('.pending-sync-count');
    indicators.forEach(el => {
      el.textContent = total;
      el.style.display = total > 0 ? 'flex' : 'none';
    });
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('pendingItemsUpdated', {
      detail: { photos: pendingPhotos, surveys: pendingSurveys, total }
    }));
  }

  /**
   * Get all pending items count
   */
  getAllPendingCount() {
    const photos = JSON.parse(localStorage.getItem('accessNature_pendingPhotos') || '[]');
    const surveys = JSON.parse(localStorage.getItem('accessNature_pendingSurveys') || '[]');
    const routes = this.pendingRoutes?.length || 0;
    const guides = this.pendingGuides?.length || 0;
    
    return {
      photos: photos.filter(p => p.status === 'pending').length,
      surveys: surveys.filter(s => s.status === 'pending').length,
      routes,
      guides,
      total: photos.length + surveys.length + routes + guides
    };
  }

  /**
   * Process all pending queues
   */
  async processAllQueues() {
    if (!this.isOnline) {
      toast.warning('Cannot sync while offline');
      return;
    }
    
    toast.info('Syncing pending items...');
    
    await Promise.all([
      this.processPhotoQueue(),
      this.processSurveyQueue(),
      this.retryPendingUploads()
    ]);
    
    const remaining = this.getAllPendingCount();
    if (remaining.total === 0) {
      toast.success('All items synced! ✓');
    } else {
      toast.warning(`${remaining.total} items still pending`);
    }
  }
}

// Create and export singleton
export const offlineSync = new OfflineSync();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => offlineSync.initialize());
} else {
  offlineSync.initialize();
}

// Make available globally
window.offlineSync = offlineSync;

export default offlineSync;
