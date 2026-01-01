/**
 * PWA Manager
 * Access Nature - Progressive Web App Functionality
 * 
 * Handles:
 * - Service Worker registration & updates
 * - Install prompt (Add to Home Screen)
 * - Background sync queue
 * - Offline maps management
 * - Cache management
 */

import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';

class PWAManager {
  constructor() {
    this.swRegistration = null;
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.pendingSync = {
      routes: [],
      reports: [],
      guides: []
    };
    this.storageKey = 'accessNature_pwa';
  }

  /**
   * Initialize PWA functionality
   */
  async initialize() {
    // Check if already installed
    this.checkInstallStatus();
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Listen for install prompt
    this.setupInstallPrompt();
    
    // Listen for online/offline events
    this.setupConnectivityListeners();
    
    // Listen for service worker messages
    this.setupMessageListener();
    
    // Load pending sync items
    this.loadPendingSync();
    
    // Show install prompt if appropriate
    this.maybeShowInstallBanner();
    
    console.log('✅ PWA Manager initialized');
  }

  // ==================== Service Worker ====================

  /**
   * Register service worker with proper update handling
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers not supported');
      return;
    }

    // Check if we just reloaded for an update (prevent loop)
    const updateFlag = sessionStorage.getItem('pwa_update_applied');
    if (updateFlag) {
      console.log('[PWA] Update was just applied, skipping re-check');
      sessionStorage.removeItem('pwa_update_applied');
      return;
    }

    try {
      // Determine the correct SW path based on the current location
      // This handles both root deployment and subdirectory deployment (like GitHub Pages)
      const baseUrl = new URL('./', window.location.href);
      const swUrl = new URL('sw.js', baseUrl);
      
      // Pre-check if sw.js exists to avoid noisy console errors
      try {
        const checkResponse = await fetch(swUrl.href, { method: 'HEAD' });
        if (!checkResponse.ok) {
          console.log('[PWA] sw.js not found - PWA features disabled. Make sure sw.js is deployed.');
          return;
        }
      } catch (fetchError) {
        console.log('[PWA] Could not check for sw.js - PWA features disabled');
        return;
      }
      
      console.log(`[PWA] Registering SW at: ${swUrl.pathname} with scope: ${baseUrl.pathname}`);
      
      this.swRegistration = await navigator.serviceWorker.register(swUrl.pathname, {
        scope: baseUrl.pathname
      });

      console.log('[PWA] Service Worker registered:', this.swRegistration.scope);

      // Check for updates on registration
      this.swRegistration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New Service Worker activated');
        // Only reload if we explicitly requested it
        if (this._updateRequested) {
          this._updateRequested = false;
          sessionStorage.setItem('pwa_update_applied', 'true');
          window.location.reload();
        }
      });

      // Check if there's a waiting worker (update available)
      if (this.swRegistration.waiting) {
        this.showUpdateAvailable();
      }

      // Periodically check for updates (every 60 minutes)
      setInterval(() => {
        this.swRegistration.update().catch(err => {
          console.warn('[PWA] Update check failed:', err);
        });
      }, 60 * 60 * 1000);

    } catch (error) {
      console.warn('[PWA] Service Worker registration failed:', error.message);
      // Don't throw - app should continue to work without SW
    }
  }

  /**
   * Handle new service worker found
   */
  handleUpdateFound() {
    const newWorker = this.swRegistration.installing;
    console.log('[PWA] New Service Worker installing...');

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New SW waiting to activate - show update notification
          console.log('[PWA] Update available');
          this.showUpdateAvailable();
        } else {
          // First install - no update needed
          console.log('[PWA] Service Worker installed for first time');
          toast.success('App ready for offline use!');
        }
      }
    });
  }

  /**
   * Show update available notification (non-intrusive)
   */
  showUpdateAvailable() {
    // Don't spam the user - only show once per session
    if (this._updateShown) return;
    this._updateShown = true;

    // Create a subtle update banner instead of blocking modal
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.innerHTML = `
      <div style="position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%); 
                  background: #1e40af; color: white; padding: 12px 20px; border-radius: 12px; 
                  box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10001; 
                  display: flex; align-items: center; gap: 12px; max-width: 90%;">
        <span>🔄 Update available</span>
        <button id="pwa-update-btn" style="background: white; color: #1e40af; border: none; 
                padding: 6px 14px; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Update Now
        </button>
        <button id="pwa-dismiss-btn" style="background: transparent; color: white; border: none; 
                font-size: 18px; cursor: pointer; padding: 0 4px;">×</button>
      </div>
    `;
    
    document.body.appendChild(banner);

    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      this.applyUpdate();
      banner.remove();
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      banner.remove();
      toast.info('Update will apply when you close all tabs');
    });
  }

  /**
   * Apply the waiting service worker
   */
  applyUpdate() {
    if (this.swRegistration?.waiting) {
      console.log('[PWA] Applying update...');
      this._updateRequested = true;
      // Tell SW to skip waiting
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      toast.info('Updating app...');
    } else {
      console.warn('[PWA] No waiting worker to activate');
    }
  }

  // ==================== Install Prompt ====================

  /**
   * Check if app is already installed
   */
  checkInstallStatus() {
    // Check display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }

    // Check iOS standalone
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
    }

    // Check localStorage flag
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.installed) {
        this.isInstalled = true;
      }
    }
  }

  /**
   * Setup install prompt listener
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt available');
      
      // Prevent automatic prompt
      e.preventDefault();
      
      // Store event for later use
      this.deferredPrompt = e;
      
      // Show custom install button/banner
      this.showInstallButton();
    });

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallButton();
      this.saveState({ installed: true });
      toast.success('Access Nature installed! 🎉');
    });
  }

  /**
   * Show install button in UI
   */
  showInstallButton() {
    // Create install banner if doesn't exist
    let banner = document.getElementById('pwaInstallBanner');
    
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pwaInstallBanner';
      banner.className = 'pwa-install-banner';
      banner.innerHTML = `
        <div class="install-content">
          <span class="install-icon">📱</span>
          <div class="install-text">
            <strong>Install Access Nature</strong>
            <span>Get the full app experience</span>
          </div>
        </div>
        <div class="install-actions">
          <button class="install-btn" id="pwaInstallBtn">Install</button>
          <button class="install-later" id="pwaInstallLater">Later</button>
          <button class="install-dismiss" id="pwaInstallDismiss" aria-label="Dismiss">×</button>
        </div>
      `;
      
      document.body.appendChild(banner);
      
      // Add event listeners
      document.getElementById('pwaInstallBtn')?.addEventListener('click', () => {
        this.showInstallModal();
      });
      
      document.getElementById('pwaInstallLater')?.addEventListener('click', () => {
        this.remindLater();
      });
      
      document.getElementById('pwaInstallDismiss')?.addEventListener('click', () => {
        this.dismissInstallBanner();
      });
    }
    
    banner.classList.add('visible');
  }

  /**
   * Show enhanced install modal with platform-specific instructions
   */
  showInstallModal() {
    const platform = this.detectPlatform();
    const isIOS = platform === 'ios';
    const isAndroid = platform === 'android';
    const isDesktop = platform === 'desktop';
    
    // Create modal
    let modal = document.getElementById('pwaInstallModal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'pwaInstallModal';
    modal.className = 'pwa-install-modal';
    modal.innerHTML = `
      <div class="pwa-install-modal-backdrop" id="pwaModalBackdrop"></div>
      <div class="pwa-install-modal-content" role="dialog" aria-labelledby="installModalTitle" aria-modal="true">
        <button class="pwa-modal-close" id="pwaModalClose" aria-label="Close">×</button>
        
        <div class="pwa-modal-header">
          <div class="pwa-app-icon">🌲</div>
          <h2 id="installModalTitle">Install Access Nature</h2>
          <p class="pwa-modal-subtitle">Add to your home screen for the best experience</p>
        </div>
        
        <div class="pwa-benefits">
          <h3>Why Install?</h3>
          <ul>
            <li>
              <span class="benefit-icon">📴</span>
              <div>
                <strong>Works Offline</strong>
                <span>Access your saved trails without internet</span>
              </div>
            </li>
            <li>
              <span class="benefit-icon">⚡</span>
              <div>
                <strong>Faster Loading</strong>
                <span>App launches instantly from home screen</span>
              </div>
            </li>
            <li>
              <span class="benefit-icon">🔔</span>
              <div>
                <strong>Background Sync</strong>
                <span>Your data syncs automatically</span>
              </div>
            </li>
            <li>
              <span class="benefit-icon">📱</span>
              <div>
                <strong>Full Screen Mode</strong>
                <span>No browser bars - more space for trails</span>
              </div>
            </li>
          </ul>
        </div>
        
        ${isIOS ? this.getIOSInstructions() : ''}
        
        <div class="pwa-modal-actions">
          ${!isIOS ? `<button class="pwa-install-now" id="pwaInstallNowBtn">
            <span class="btn-icon">📲</span>
            Install Now
          </button>` : ''}
          <button class="pwa-install-skip" id="pwaInstallSkipBtn">Maybe Later</button>
        </div>
        
        <p class="pwa-modal-note">
          ${isIOS ? 'Free • No App Store needed • ~2MB storage' : 'Free • No download needed • ~2MB storage'}
        </p>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    document.getElementById('pwaModalClose')?.addEventListener('click', () => this.closeInstallModal());
    document.getElementById('pwaModalBackdrop')?.addEventListener('click', () => this.closeInstallModal());
    document.getElementById('pwaInstallSkipBtn')?.addEventListener('click', () => {
      this.closeInstallModal();
      this.remindLater();
    });
    
    if (!isIOS) {
      document.getElementById('pwaInstallNowBtn')?.addEventListener('click', () => {
        this.closeInstallModal();
        this.promptInstall();
      });
    }
    
    // Show modal with animation
    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });
    
    // Keyboard handling
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeInstallModal();
    });
    
    // Focus trap
    const closeBtn = document.getElementById('pwaModalClose');
    closeBtn?.focus();
  }

  /**
   * Get iOS-specific installation instructions
   */
  getIOSInstructions() {
    return `
      <div class="pwa-ios-instructions">
        <h3>📱 How to Install on iPhone/iPad</h3>
        <ol>
          <li>
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>Tap the Share button</strong>
              <span>It's at the bottom of Safari (box with arrow)</span>
              <div class="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </div>
            </div>
          </li>
          <li>
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>Scroll down and tap "Add to Home Screen"</strong>
              <span>You may need to scroll in the share menu</span>
              <div class="step-icon">➕</div>
            </div>
          </li>
          <li>
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>Tap "Add" in the top right</strong>
              <span>The app icon will appear on your home screen</span>
              <div class="step-icon">✓</div>
            </div>
          </li>
        </ol>
      </div>
    `;
  }

  /**
   * Detect platform for platform-specific instructions
   */
  detectPlatform() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    
    // iOS detection
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      return 'ios';
    }
    
    // Android detection
    if (/android/i.test(ua)) {
      return 'android';
    }
    
    // Desktop (default)
    return 'desktop';
  }

  /**
   * Close install modal
   */
  closeInstallModal() {
    const modal = document.getElementById('pwaInstallModal');
    if (modal) {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    }
    document.body.style.overflow = '';
  }

  /**
   * Remind user later (24 hours)
   */
  remindLater() {
    this.hideInstallButton();
    const remindTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem('pwa_remind_later', remindTime.toString());
    toast.info('We\'ll remind you tomorrow!');
  }

  /**
   * Hide install button
   */
  hideInstallButton() {
    const banner = document.getElementById('pwaInstallBanner');
    banner?.classList.remove('visible');
  }

  /**
   * Dismiss install banner for this session
   */
  dismissInstallBanner() {
    this.hideInstallButton();
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  }

  /**
   * Maybe show install banner based on conditions
   */
  maybeShowInstallBanner() {
    // Don't show if already installed
    if (this.isInstalled) return;
    
    // Don't show if dismissed this session
    if (sessionStorage.getItem('pwa_banner_dismissed')) return;
    
    // Don't show if user said "remind later" and time hasn't passed
    const remindTime = localStorage.getItem('pwa_remind_later');
    if (remindTime && Date.now() < parseInt(remindTime)) {
      return;
    }
    
    // Clear expired remind later
    if (remindTime) {
      localStorage.removeItem('pwa_remind_later');
    }
    
    // Don't show if no prompt available (except for iOS which never gets beforeinstallprompt)
    const isIOS = this.detectPlatform() === 'ios';
    if (!this.deferredPrompt && !isIOS) return;
    
    // Show after delay
    setTimeout(() => {
      this.showInstallButton();
    }, 5000);
  }

  /**
   * Trigger install prompt
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      toast.info('Install is not available on this device');
      return;
    }

    // Show the prompt
    this.deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice;
    
    console.log('[PWA] Install prompt outcome:', outcome);
    
    if (outcome === 'accepted') {
      this.deferredPrompt = null;
    }
    
    this.hideInstallButton();
  }

  // ==================== Connectivity ====================

  /**
   * Setup online/offline listeners
   */
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('[PWA] Connection restored');
      toast.success('Back online! Syncing data...');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] Connection lost');
      toast.warning('You are offline. Changes will sync when connected.');
    });
  }

  /**
   * Check if online
   */
  isOnline() {
    return navigator.onLine;
  }

  // ==================== Background Sync ====================

  /**
   * Setup service worker message listener
   */
  setupMessageListener() {
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'SYNC_SUCCESS':
          this.handleSyncSuccess(data);
          break;
          
        case 'MAP_CACHE_PROGRESS':
          this.handleMapCacheProgress(data);
          break;
          
        case 'MAP_CACHE_COMPLETE':
          this.handleMapCacheComplete(data);
          break;
      }
    });
  }

  /**
   * Handle successful sync notification
   */
  handleSyncSuccess(data) {
    console.log('[PWA] Sync success:', data);
    toast.success(`${data.type} synced successfully`);
    
    // Remove from pending
    this.removePendingItem(data.type + 's', data.id);
  }

  /**
   * Load pending sync items from storage
   */
  loadPendingSync() {
    try {
      const saved = localStorage.getItem(this.storageKey + '_pending');
      if (saved) {
        this.pendingSync = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[PWA] Failed to load pending sync:', e);
    }
  }

  /**
   * Save pending sync items
   */
  savePendingSync() {
    try {
      localStorage.setItem(this.storageKey + '_pending', JSON.stringify(this.pendingSync));
    } catch (e) {
      console.warn('[PWA] Failed to save pending sync:', e);
    }
  }

  /**
   * Add item to sync queue
   * @param {string} type - 'routes', 'reports', or 'guides'
   * @param {object} data - Data to sync
   */
  addToSyncQueue(type, data) {
    const item = {
      id: data.id || Date.now().toString(),
      data,
      timestamp: Date.now()
    };
    
    this.pendingSync[type].push(item);
    this.savePendingSync();
    
    // Try to sync immediately if online
    if (this.isOnline()) {
      this.requestSync(type);
    }
    
    return item.id;
  }

  /**
   * Remove item from pending queue
   */
  removePendingItem(type, id) {
    this.pendingSync[type] = this.pendingSync[type].filter(item => item.id !== id);
    this.savePendingSync();
  }

  /**
   * Request background sync
   * @param {string} tag - Sync tag
   */
  async requestSync(tag) {
    if (!this.swRegistration?.sync) {
      // Background sync not supported - sync manually
      this.manualSync(tag);
      return;
    }

    try {
      await this.swRegistration.sync.register(`sync-${tag}`);
      console.log('[PWA] Background sync registered:', tag);
    } catch (error) {
      console.warn('[PWA] Background sync failed, trying manual:', error);
      this.manualSync(tag);
    }
  }

  /**
   * Manual sync when background sync not available
   */
  async manualSync(type) {
    const items = this.pendingSync[type];
    
    for (const item of items) {
      try {
        // This would call the actual sync function
        // For now, dispatch an event for the app to handle
        window.dispatchEvent(new CustomEvent('pwa-sync', {
          detail: { type, data: item.data }
        }));
        
        this.removePendingItem(type, item.id);
      } catch (error) {
        console.error('[PWA] Manual sync failed:', error);
      }
    }
  }

  /**
   * Sync all pending data
   */
  async syncPendingData() {
    for (const type of ['routes', 'reports', 'guides']) {
      if (this.pendingSync[type].length > 0) {
        await this.requestSync(type);
      }
    }
  }

  /**
   * Get pending sync count
   */
  getPendingSyncCount() {
    return this.pendingSync.routes.length + 
           this.pendingSync.reports.length + 
           this.pendingSync.guides.length;
  }

  // ==================== Offline Maps ====================

  /**
   * Cache map tiles for a region
   * @param {object} bounds - { north, south, east, west }
   * @param {number} zoom - Current zoom level
   * @param {number} maxZoom - Maximum zoom to cache (default 16)
   */
  async cacheMapRegion(bounds, zoom, maxZoom = 16) {
    if (!this.swRegistration?.active) {
      toast.error('Service worker not ready');
      return;
    }

    // Estimate tile count
    const tileCount = this.estimateTileCount(bounds, zoom, maxZoom);
    
    const confirm = await modal.confirm(
      `This will download approximately ${tileCount} map tiles (${this.formatBytes(tileCount * 15000)}). Continue?`,
      '📥 Download Map Area'
    );
    
    if (!confirm) return;

    toast.info('Downloading map tiles...');

    // Send message to service worker
    this.swRegistration.active.postMessage({
      type: 'CACHE_MAP_REGION',
      payload: { bounds, zoom, maxZoom }
    });
  }

  /**
   * Estimate number of tiles for a region
   */
  estimateTileCount(bounds, minZoom, maxZoom) {
    let count = 0;
    
    for (let z = minZoom; z <= maxZoom; z++) {
      const tilesX = Math.ceil((bounds.east - bounds.west) / (360 / Math.pow(2, z)));
      const tilesY = Math.ceil((bounds.north - bounds.south) / (180 / Math.pow(2, z)));
      count += tilesX * tilesY;
    }
    
    return count;
  }

  /**
   * Handle map cache progress
   */
  handleMapCacheProgress(data) {
    const percent = Math.round((data.cached / data.total) * 100);
    
    // Update progress indicator
    const indicator = document.getElementById('mapCacheProgress');
    if (indicator) {
      indicator.textContent = `Downloading: ${percent}%`;
    }
  }

  /**
   * Handle map cache complete
   */
  handleMapCacheComplete(data) {
    toast.success(`Map downloaded! ${data.cached} tiles cached.`);
    
    const indicator = document.getElementById('mapCacheProgress');
    if (indicator) {
      indicator.textContent = '';
    }
  }

  /**
   * Get current map bounds from Leaflet map
   */
  getMapBounds(map) {
    const bounds = map.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
  }

  /**
   * Download current map view for offline use
   * @param {L.Map} map - Leaflet map instance
   */
  async downloadCurrentMapView(map) {
    if (!map) {
      toast.error('Map not available');
      return;
    }

    const bounds = this.getMapBounds(map);
    const zoom = map.getZoom();
    
    await this.cacheMapRegion(bounds, zoom);
  }

  // ==================== Cache Management ====================

  /**
   * Get cache size
   */
  async getCacheSize() {
    return new Promise((resolve) => {
      if (!this.swRegistration?.active) {
        resolve(0);
        return;
      }

      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data.size);
      };

      this.swRegistration.active.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [channel.port2]
      );
    });
  }

  /**
   * Clear all cached data
   */
  async clearCache(cacheName = null) {
    const confirm = await modal.confirm(
      cacheName 
        ? `Clear ${cacheName} cache?`
        : 'Clear all cached data? This will remove offline maps and cached pages.',
      '🗑️ Clear Cache'
    );
    
    if (!confirm) return;

    if (this.swRegistration?.active) {
      this.swRegistration.active.postMessage({
        type: 'CLEAR_CACHE',
        payload: { cacheName }
      });
    }

    toast.success('Cache cleared');
  }

  /**
   * Clear map cache only
   */
  async clearMapCache() {
    await this.clearCache('access-nature-maps-v1.0.0');
  }

  // ==================== Utility Methods ====================

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Save state to localStorage
   */
  saveState(data) {
    try {
      const existing = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      localStorage.setItem(this.storageKey, JSON.stringify({ ...existing, ...data }));
    } catch (e) {
      console.warn('[PWA] Failed to save state:', e);
    }
  }

  /**
   * Check if running as installed PWA
   */
  isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // ==================== Push Notifications ====================

  /**
   * Check if push notifications are supported
   */
  isPushSupported() {
    return 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Get current notification permission status
   */
  getNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'granted', 'denied', or 'default'
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!this.isPushSupported()) {
      toast.warning('Push notifications are not supported on this device');
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        toast.success('Notifications enabled! 🔔');
        await this.subscribeToPush();
        this.updateNotificationUI(true);
      } else if (permission === 'denied') {
        toast.warning('Notifications blocked. Enable in browser settings.');
        this.updateNotificationUI(false);
      }
      
      return permission;
    } catch (error) {
      console.error('[PWA] Failed to request notification permission:', error);
      return 'error';
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush() {
    if (!this.swRegistration) {
      console.warn('[PWA] No service worker registration for push');
      return null;
    }

    try {
      // Check for existing subscription
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        // Note: In production, you'd get this from your server
        const vapidPublicKey = localStorage.getItem('accessNature_vapidKey') || 
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
        
        const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);
        
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
        
        console.log('[PWA] Push subscription created');
        
        // Store subscription (in production, send to your server)
        this.saveSubscription(subscription);
      }
      
      return subscription;
    } catch (error) {
      console.error('[PWA] Failed to subscribe to push:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.warning('Notification permission was denied');
      }
      
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush() {
    try {
      const subscription = await this.swRegistration?.pushManager?.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        localStorage.removeItem('accessNature_pushSubscription');
        toast.info('Notifications disabled');
        this.updateNotificationUI(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Save subscription to local storage
   */
  saveSubscription(subscription) {
    try {
      localStorage.setItem('accessNature_pushSubscription', JSON.stringify(subscription.toJSON()));
    } catch (e) {
      console.warn('[PWA] Failed to save subscription:', e);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  /**
   * Update notification UI elements
   */
  updateNotificationUI(enabled) {
    const toggles = document.querySelectorAll('.notification-toggle');
    toggles.forEach(toggle => {
      toggle.classList.toggle('enabled', enabled);
      toggle.setAttribute('aria-pressed', enabled);
    });
    
    const icons = document.querySelectorAll('.notification-status-icon');
    icons.forEach(icon => {
      icon.textContent = enabled ? '🔔' : '🔕';
    });
  }

  /**
   * Show notification prompt banner
   */
  showNotificationPrompt() {
    // Don't show if already granted or denied
    if (this.getNotificationPermission() !== 'default') return;
    
    // Don't show if dismissed recently
    const dismissed = localStorage.getItem('accessNature_notifPromptDismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
    
    // Remove existing banner
    document.getElementById('notificationPromptBanner')?.remove();
    
    const banner = document.createElement('div');
    banner.id = 'notificationPromptBanner';
    banner.className = 'notification-banner';
    banner.innerHTML = `
      <span class="notification-icon">🔔</span>
      <div class="notification-banner-text">
        <strong>Stay Updated</strong>
        <span>Get notified about trail conditions and report updates</span>
      </div>
      <button class="enable-btn" id="enableNotifBtn">Enable</button>
      <button class="dismiss-btn" id="dismissNotifBtn">×</button>
    `;
    
    document.body.appendChild(banner);
    
    document.getElementById('enableNotifBtn')?.addEventListener('click', async () => {
      banner.remove();
      await this.requestNotificationPermission();
    });
    
    document.getElementById('dismissNotifBtn')?.addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('accessNature_notifPromptDismissed', Date.now().toString());
    });
    
    // Auto-dismiss after 15 seconds
    setTimeout(() => banner.remove(), 15000);
  }

  /**
   * Send a local notification (for testing or local events)
   */
  async showLocalNotification(title, body, options = {}) {
    if (this.getNotificationPermission() !== 'granted') {
      console.warn('[PWA] Notification permission not granted');
      return false;
    }

    try {
      await this.swRegistration?.showNotification(title, {
        body,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: options.tag || 'access-nature-notification',
        renotify: options.renotify || false,
        data: options.data || {},
        actions: options.actions || [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        ...options
      });
      return true;
    } catch (error) {
      console.error('[PWA] Failed to show notification:', error);
      return false;
    }
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pwaManager.initialize());
} else {
  pwaManager.initialize();
}

// Make available globally
window.pwaManager = pwaManager;

export default pwaManager;