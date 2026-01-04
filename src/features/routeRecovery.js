/**
 * Route Recovery Module - Import, Upload, and Generate Trail Guides
 * Access Nature App
 * 
 * Features:
 * - Import JSON route files
 * - Direct upload to Firebase (bypassing offlineSync)
 * - Generate and upload trail guides
 * - Create route cards for display
 * - Recovery UI panel for mobile use
 * 
 * Usage:
 *   import { routeRecovery } from './routeRecovery.js';
 *   routeRecovery.showPanel();  // Show recovery UI
 *   routeRecovery.importAndUpload(jsonData);  // Direct import
 */

import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';
import { storageService } from '../services/storageService.js';

class RouteRecovery {
  constructor() {
    this.panel = null;
    this.currentData = null;
    this.log = [];
  }

  /**
   * Add log entry for tracking operations
   */
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.log.push({ timestamp, message, type });
    console.log(`[RouteRecovery] ${message}`);
    this.updateLogDisplay();
  }

  /**
   * Update the log display in the panel
   */
  updateLogDisplay() {
    const logEl = document.getElementById('recovery-log');
    if (!logEl) return;
    
    logEl.innerHTML = this.log.map(entry => `
      <div class="recovery-log-entry ${entry.type}">
        <span class="log-time">${entry.timestamp}</span>
        <span class="log-msg">${entry.message}</span>
      </div>
    `).join('');
    
    logEl.scrollTop = logEl.scrollHeight;
  }

  /**
   * Show the recovery panel UI
   */
  showPanel() {
    if (this.panel) {
      this.panel.style.display = 'flex';
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'route-recovery-panel';
    panel.innerHTML = `
      <style>
        #route-recovery-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.95);
          z-index: 100000;
          display: flex;
          flex-direction: column;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .recovery-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #1a472a 0%, #2d5a3f 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .recovery-title {
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .recovery-close {
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
        }
        
        .recovery-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .recovery-section {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .recovery-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #4ade80;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .recovery-btn {
          width: 100%;
          padding: 14px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .recovery-btn.primary {
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
          color: #000;
        }
        
        .recovery-btn.secondary {
          background: rgba(255,255,255,0.1);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .recovery-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .recovery-btn:active:not(:disabled) {
          transform: scale(0.98);
          opacity: 0.9;
        }
        
        /* Better touch targets for mobile */
        .recovery-btn {
          -webkit-tap-highlight-color: rgba(74, 222, 128, 0.3);
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
        }
        
        #recovery-file-input {
          display: none;
        }
        
        .recovery-info {
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .recovery-info.warning {
          background: rgba(251, 191, 36, 0.1);
          border-color: rgba(251, 191, 36, 0.3);
          color: #fbbf24;
        }
        
        .recovery-info.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        
        .recovery-info.success {
          background: rgba(74, 222, 128, 0.15);
          border-color: rgba(74, 222, 128, 0.5);
          color: #4ade80;
        }
        
        #recovery-log {
          max-height: 200px;
          overflow-y: auto;
          background: #000;
          border-radius: 8px;
          padding: 10px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 11px;
        }
        
        .recovery-log-entry {
          padding: 3px 0;
          border-bottom: 1px solid #222;
        }
        
        .recovery-log-entry .log-time {
          color: #666;
          margin-right: 8px;
        }
        
        .recovery-log-entry.info .log-msg { color: #4ade80; }
        .recovery-log-entry.warn .log-msg { color: #fbbf24; }
        .recovery-log-entry.error .log-msg { color: #ef4444; }
        .recovery-log-entry.success .log-msg { color: #22d3ee; }
        
        .route-preview {
          background: #111;
          border-radius: 8px;
          padding: 12px;
          margin-top: 12px;
        }
        
        .route-preview h4 {
          margin: 0 0 8px 0;
          color: #fff;
          font-size: 14px;
        }
        
        .route-preview-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .preview-stat {
          background: rgba(255,255,255,0.05);
          padding: 8px;
          border-radius: 6px;
        }
        
        .preview-stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #4ade80;
        }
        
        .preview-stat-label {
          font-size: 11px;
          color: #888;
        }
        
        .auth-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        
        .auth-status.signed-in {
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.3);
        }
        
        .auth-status.signed-out {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .auth-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .auth-dot.online { background: #4ade80; }
        .auth-dot.offline { background: #ef4444; }
        
        .recovery-progress {
          height: 4px;
          background: #333;
          border-radius: 2px;
          margin: 12px 0;
          overflow: hidden;
        }
        
        .recovery-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4ade80, #22d3ee);
          width: 0%;
          transition: width 0.3s;
        }
      </style>
      
      <div class="recovery-header">
        <div class="recovery-title">🔧 Route Recovery</div>
        <button class="recovery-close" onclick="routeRecovery.hidePanel()">✕</button>
      </div>
      
      <div class="recovery-body">
        <!-- Auth Status -->
        <div id="auth-status-container"></div>
        
        <!-- Step 1: Import -->
        <div class="recovery-section">
          <h3>📁 Step 1: Import Route File</h3>
          <button class="recovery-btn primary" id="select-file-btn">
            📂 Select JSON File
          </button>
          <input type="file" id="recovery-file-input" accept=".json,application/json" />
          <div id="route-preview-container"></div>
        </div>
        
        <!-- Step 2: Upload -->
        <div class="recovery-section">
          <h3>☁️ Step 2: Upload to Cloud</h3>
          <button class="recovery-btn primary" id="upload-route-btn" disabled onclick="routeRecovery.uploadToCloud()">
            ⬆️ Upload Route to Firebase
          </button>
          <button class="recovery-btn secondary" id="generate-guide-btn" disabled onclick="routeRecovery.generateTrailGuide()">
            📖 Generate & Upload Trail Guide
          </button>
          <div class="recovery-progress" id="upload-progress" style="display: none;">
            <div class="recovery-progress-bar" id="progress-bar"></div>
          </div>
        </div>
        
        <!-- Step 3: Migrate Existing -->
        <div class="recovery-section">
          <h3>🔄 Migrate Existing Guides</h3>
          <p style="color: #888; font-size: 12px; margin: 0 0 12px 0;">
            Fix existing trail guides missing the isPublic field
          </p>
          <button class="recovery-btn secondary" onclick="routeRecovery.migrateExistingGuides()">
            🔧 Add isPublic to My Guides
          </button>
        </div>
        
        <!-- Log Output -->
        <div class="recovery-section">
          <h3>📋 Activity Log</h3>
          <div id="recovery-log">
            <div class="recovery-log-entry info">
              <span class="log-time">${new Date().toLocaleTimeString()}</span>
              <span class="log-msg">Recovery panel opened</span>
            </div>
          </div>
          <button class="recovery-btn secondary" style="margin-top: 12px;" onclick="routeRecovery.exportLog()">
            📥 Export Log
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;
    
    // Setup file input listener
    document.getElementById('recovery-file-input').addEventListener('change', (e) => {
      this.handleFileSelect(e);
    });
    
    // Setup select file button to trigger file input
    document.getElementById('select-file-btn').addEventListener('click', () => {
      this.addLog('File picker triggered...', 'info');
      document.getElementById('recovery-file-input').click();
    });
    
    // Check auth status
    this.updateAuthStatus();
    
    this.addLog('Recovery panel ready');
  }

  /**
   * Hide the recovery panel
   */
  hidePanel() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  /**
   * Update authentication status display
   */
  async updateAuthStatus() {
    const container = document.getElementById('auth-status-container');
    if (!container) return;
    
    try {
      const { auth } = await import('../../firebase-setup.js');
      const user = auth.currentUser;
      
      if (user) {
        container.innerHTML = `
          <div class="auth-status signed-in">
            <div class="auth-dot online"></div>
            <span>Signed in as: ${user.email}</span>
          </div>
        `;
        this.addLog(`Authenticated as ${user.email}`, 'success');
      } else {
        container.innerHTML = `
          <div class="auth-status signed-out">
            <div class="auth-dot offline"></div>
            <span>Not signed in - <a href="#" onclick="routeRecovery.signIn()" style="color: #4ade80;">Sign in</a></span>
          </div>
        `;
        this.addLog('Not authenticated - sign in required', 'warn');
      }
    } catch (error) {
      container.innerHTML = `
        <div class="auth-status signed-out">
          <div class="auth-dot offline"></div>
          <span>Auth check failed: ${error.message}</span>
        </div>
      `;
      this.addLog(`Auth check failed: ${error.message}`, 'error');
    }
  }

  /**
   * Trigger sign in
   */
  async signIn() {
    try {
      const app = window.AccessNatureApp;
      const authController = app?.getController('auth');
      if (authController?.showAuthModal) {
        this.hidePanel();
        authController.showAuthModal();
      } else {
        this.addLog('Auth controller not available', 'error');
      }
    } catch (error) {
      this.addLog(`Sign in failed: ${error.message}`, 'error');
    }
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    this.addLog(`Selected file: ${file.name}`);
    
    try {
      const text = await this.readFile(file);
      const data = JSON.parse(text);
      
      this.currentData = this.normalizeRouteData(data);
      this.showRoutePreview(this.currentData);
      
      // Enable upload buttons
      document.getElementById('upload-route-btn').disabled = false;
      document.getElementById('generate-guide-btn').disabled = false;
      
      this.addLog(`Parsed route: ${this.currentData.routeInfo.name}`, 'success');
      this.addLog(`GPS points: ${this.currentData.stats.locationPoints}`);
      this.addLog(`Photos: ${this.currentData.stats.photos}`);
      this.addLog(`Distance: ${this.currentData.stats.distance.toFixed(2)} km`);
      
    } catch (error) {
      this.addLog(`Parse error: ${error.message}`, 'error');
      toast.error('Failed to parse JSON file');
    }
  }

  /**
   * Read file as text
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Normalize route data from different export formats
   */
  normalizeRouteData(data) {
    let routeData, routeInfo, accessibilityData;
    
    // Handle different formats
    if (data.routeData && Array.isArray(data.routeData)) {
      // New format from export.js
      routeData = data.routeData;
      routeInfo = data.routeInfo || {
        name: data.name || 'Imported Route',
        totalDistance: data.totalDistance || 0,
        elapsedTime: data.elapsedTime || 0,
        date: data.date || new Date().toISOString()
      };
      accessibilityData = data.accessibilityData || {};
    } else if (data.route && Array.isArray(data.route)) {
      // Old format
      routeData = data.route;
      routeInfo = {
        name: data.name || 'Imported Route',
        totalDistance: data.totalDistance || 0,
        elapsedTime: data.elapsedTime || 0,
        date: new Date().toISOString()
      };
      accessibilityData = data.accessibility || {};
    } else {
      throw new Error('Unrecognized route format');
    }
    
    // Calculate stats
    const locationPoints = routeData.filter(p => p.type === 'location');
    const photos = routeData.filter(p => p.type === 'photo');
    const notes = routeData.filter(p => p.type === 'text');
    
    return {
      routeData,
      routeInfo,
      accessibilityData,
      stats: {
        locationPoints: locationPoints.length,
        photos: photos.length,
        notes: notes.length,
        distance: routeInfo.totalDistance || 0,
        duration: routeInfo.elapsedTime || 0
      }
    };
  }

  /**
   * Show route preview
   */
  showRoutePreview(data) {
    const container = document.getElementById('route-preview-container');
    if (!container) return;
    
    const duration = this.formatDuration(data.stats.duration);
    
    container.innerHTML = `
      <div class="route-preview">
        <h4>📍 ${data.routeInfo.name}</h4>
        <div class="route-preview-stats">
          <div class="preview-stat">
            <div class="preview-stat-value">${data.stats.distance.toFixed(2)}</div>
            <div class="preview-stat-label">km Distance</div>
          </div>
          <div class="preview-stat">
            <div class="preview-stat-value">${duration}</div>
            <div class="preview-stat-label">Duration</div>
          </div>
          <div class="preview-stat">
            <div class="preview-stat-value">${data.stats.locationPoints}</div>
            <div class="preview-stat-label">GPS Points</div>
          </div>
          <div class="preview-stat">
            <div class="preview-stat-value">${data.stats.photos}</div>
            <div class="preview-stat-label">Photos</div>
          </div>
        </div>
        ${data.accessibilityData?.wheelchairAccess ? `
          <div style="margin-top: 10px; padding: 8px; background: rgba(74,222,128,0.1); border-radius: 6px; font-size: 12px;">
            ♿ ${data.accessibilityData.wheelchairAccess} • 
            🥾 ${data.accessibilityData.difficulty || 'Not specified'}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Format duration in ms to readable string
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Upload route directly to Firebase
   */
  async uploadToCloud() {
    if (!this.currentData) {
      this.addLog('No route data loaded', 'error');
      return;
    }
    
    this.showProgress(true);
    this.setProgress(5);
    
    try {
      // Check auth
      const { auth, db } = await import('../../firebase-setup.js');
      const user = auth.currentUser;
      
      if (!user) {
        this.addLog('Please sign in first', 'error');
        toast.error('Please sign in first');
        this.showProgress(false);
        return;
      }
      
      this.addLog('Starting upload...', 'info');
      this.setProgress(10);
      
      // Upload photos to Storage if needed
      this.addLog('Preparing route data...', 'info');
      
      const { routeData: processedRouteData, routeId, photosUploaded } = await storageService.prepareRouteForSave(
        this.currentData.routeData,
        user.uid,
        (current, total) => {
          this.addLog(`Uploading photo ${current}/${total}...`, 'info');
          this.setProgress(10 + (current / total) * 50);
        }
      );
      
      if (photosUploaded > 0) {
        this.addLog(`✅ ${photosUploaded} photos uploaded to Storage`, 'success');
      }
      
      this.setProgress(65);
      
      const { collection, addDoc, serverTimestamp } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );
      
      // Prepare document
      const routeDoc = {
        userId: user.uid,
        userEmail: user.email,
        userDisplayName: user.displayName || 'Anonymous',
        routeName: this.currentData.routeInfo.name,
        createdAt: serverTimestamp(),
        uploadedAt: new Date().toISOString(),
        totalDistance: this.currentData.routeInfo.totalDistance || 0,
        elapsedTime: this.currentData.routeInfo.elapsedTime || 0,
        originalDate: this.currentData.routeInfo.date,
        routeData: processedRouteData,
        storageRouteId: routeId || null,
        stats: {
          locationPoints: this.currentData.stats.locationPoints,
          photos: this.currentData.stats.photos,
          notes: this.currentData.stats.notes,
          totalDataPoints: processedRouteData.length,
          photosInStorage: photosUploaded
        },
        accessibilityData: this.currentData.accessibilityData,
        deviceInfo: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          appVersion: '1.0',
          source: 'routeRecovery'
        }
      };
      
      // Final size check
      const finalSize = JSON.stringify(routeDoc).length;
      this.addLog(`Document size: ${Math.round(finalSize/1024)} KB`, 'info');
      
      if (finalSize > 1000000) {
        throw new Error(`Document too large (${Math.round(finalSize/1024)} KB). Please reduce photos.`);
      }
      
      this.setProgress(80);
      
      // Upload to Firestore
      const docRef = await addDoc(collection(db, 'routes'), routeDoc);
      
      this.setProgress(100);
      this.currentData.cloudId = docRef.id;
      
      this.addLog(`✅ Route uploaded: ${docRef.id}`, 'success');
      toast.success('Route uploaded to cloud!');
      
      setTimeout(() => this.showProgress(false), 1000);
      
      return docRef.id;
      
    } catch (error) {
      this.addLog(`❌ Upload failed: ${error.message}`, 'error');
      toast.error('Upload failed: ' + error.message);
      this.showProgress(false);
    }
  }

  /**
   * Generate and upload trail guide
   */
  async generateTrailGuide() {
    if (!this.currentData) {
      this.addLog('No route data loaded', 'error');
      return;
    }
    
    this.showProgress(true);
    this.setProgress(10);
    
    try {
      const { auth, db } = await import('../../firebase-setup.js');
      const user = auth.currentUser;
      
      if (!user) {
        this.addLog('Please sign in first', 'error');
        toast.error('Please sign in first');
        this.showProgress(false);
        return;
      }
      
      this.addLog('Generating trail guide...', 'info');
      this.setProgress(30);
      
      // Import trail guide generator
      const { trailGuideGeneratorV2 } = await import('./trailGuideGeneratorV2.js');
      
      // Generate HTML
      const html = trailGuideGeneratorV2.generateHTML(
        this.currentData.routeData,
        this.currentData.routeInfo,
        this.currentData.accessibilityData || {}
      );
      
      this.addLog('Trail guide HTML generated', 'info');
      this.setProgress(50);
      
      const { collection, addDoc, serverTimestamp } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );
      
      // Prepare guide document
      const guideDoc = {
        routeId: this.currentData.cloudId || null,
        userId: user.uid,
        userEmail: user.email,
        userDisplayName: user.displayName || 'Anonymous',
        title: this.currentData.routeInfo.name,
        routeName: this.currentData.routeInfo.name,
        html: html,
        createdAt: serverTimestamp(),
        generatedAt: new Date().toISOString(),
        isPublic: true,  // IMPORTANT: Set to true so it appears in listings
        accessibilityData: this.currentData.accessibilityData || {},
        accessibility: {
          wheelchairAccess: this.currentData.accessibilityData?.wheelchairAccess,
          difficulty: this.currentData.accessibilityData?.difficulty,
          trailSurface: this.currentData.accessibilityData?.trailSurface,
          location: this.currentData.accessibilityData?.location
        },
        metadata: {
          totalDistance: this.currentData.routeInfo.totalDistance || 0,
          elapsedTime: this.currentData.routeInfo.elapsedTime || 0,
          locationCount: this.currentData.stats.locationPoints,
          photoCount: this.currentData.stats.photos,
          noteCount: this.currentData.stats.notes
        },
        stats: {
          totalDistance: this.currentData.routeInfo.totalDistance || 0,
          elapsedTime: this.currentData.routeInfo.elapsedTime || 0,
          locationPoints: this.currentData.stats.locationPoints,
          photos: this.currentData.stats.photos
        },
        community: {
          views: 0,
          likes: 0
        }
      };
      
      this.setProgress(70);
      
      // Upload to Firestore
      const guideRef = await addDoc(collection(db, 'trail_guides'), guideDoc);
      
      this.setProgress(100);
      
      this.addLog(`✅ Trail guide uploaded: ${guideRef.id}`, 'success');
      toast.success('Trail guide created and uploaded!');
      
      setTimeout(() => this.showProgress(false), 1000);
      
      return guideRef.id;
      
    } catch (error) {
      this.addLog(`❌ Guide generation failed: ${error.message}`, 'error');
      toast.error('Trail guide failed: ' + error.message);
      this.showProgress(false);
    }
  }

  /**
   * Migrate existing trail guides to add isPublic field
   */
  async migrateExistingGuides() {
    this.showProgress(true);
    this.setProgress(10);
    
    try {
      const { auth, db } = await import('../../firebase-setup.js');
      const { collection, query, where, getDocs, updateDoc, doc } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );
      
      const user = auth.currentUser;
      if (!user) {
        this.addLog('Please sign in first', 'error');
        toast.error('Please sign in first');
        this.showProgress(false);
        return;
      }
      
      this.addLog('Starting migration...', 'info');
      this.setProgress(20);
      
      // Get all user's guides
      const guidesQuery = query(
        collection(db, 'trail_guides'),
        where('userId', '==', user.uid)
      );
      
      const snapshot = await getDocs(guidesQuery);
      this.addLog(`Found ${snapshot.size} trail guides`, 'info');
      
      let updated = 0;
      let skipped = 0;
      let current = 0;
      
      for (const docSnap of snapshot.docs) {
        current++;
        this.setProgress(20 + (current / snapshot.size) * 70);
        
        const data = docSnap.data();
        
        if (data.isPublic === undefined || data.isPublic === null) {
          await updateDoc(doc(db, 'trail_guides', docSnap.id), {
            isPublic: true
          });
          updated++;
          this.addLog(`Updated: ${docSnap.id}`, 'info');
        } else {
          skipped++;
        }
      }
      
      this.setProgress(100);
      
      this.addLog(`✅ Migration complete: ${updated} updated, ${skipped} already had isPublic`, 'success');
      toast.success(`Migration complete: ${updated} guides updated`);
      
      setTimeout(() => this.showProgress(false), 1000);
      
    } catch (error) {
      this.addLog(`❌ Migration failed: ${error.message}`, 'error');
      toast.error('Migration failed: ' + error.message);
      this.showProgress(false);
    }
  }

  /**
   * Show/hide progress bar
   */
  showProgress(show) {
    const progressEl = document.getElementById('upload-progress');
    if (progressEl) {
      progressEl.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Set progress percentage
   */
  setProgress(percent) {
    const bar = document.getElementById('progress-bar');
    if (bar) {
      bar.style.width = `${percent}%`;
    }
  }

  /**
   * Export log to file
   */
  exportLog() {
    const content = this.log.map(entry => 
      `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovery-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.addLog('Log exported', 'info');
  }

  /**
   * Direct import and upload (for programmatic use)
   */
  async importAndUpload(jsonData) {
    try {
      this.currentData = this.normalizeRouteData(jsonData);
      const routeId = await this.uploadToCloud();
      const guideId = await this.generateTrailGuide();
      return { routeId, guideId };
    } catch (error) {
      console.error('Import and upload failed:', error);
      throw error;
    }
  }
}

// Create and export singleton
export const routeRecovery = new RouteRecovery();

// Make available globally
if (typeof window !== 'undefined') {
  window.routeRecovery = routeRecovery;
}

export default routeRecovery;