/**
 * Trail Alerts
 * Notifies users when they're near reported hazards or accessibility issues
 * 
 * Access Nature - Safety & Navigation Features
 * Created: December 2025
 */

import { toast } from '../utils/toast.js';

/**
 * Trail Alerts Configuration
 */
const ALERT_CONFIG = {
  // Distance thresholds in meters
  distances: {
    immediate: 50,    // Red alert - very close
    warning: 150,     // Orange alert - approaching
    info: 300         // Yellow alert - in area
  },
  
  // Minimum time between alerts for same hazard (ms)
  cooldownTime: 5 * 60 * 1000, // 5 minutes
  
  // Severity threshold - only alert for severity >= this
  minSeverity: 2,
  
  // Check interval when tracking (ms)
  checkInterval: 10000, // 10 seconds
  
  // Audio alerts
  sounds: {
    immediate: 'alert-high',
    warning: 'alert-medium',
    info: 'alert-low'
  }
};

/**
 * Severity display info
 */
const SEVERITY_INFO = {
  1: { label: 'Minor', color: '#22c55e' },
  2: { label: 'Low', color: '#84cc16' },
  3: { label: 'Medium', color: '#f59e0b' },
  4: { label: 'High', color: '#ea580c' },
  5: { label: 'Critical', color: '#dc2626' }
};

/**
 * Issue type icons
 */
const ISSUE_ICONS = {
  curb_ramp: '♿',
  sidewalk_blocked: '🚧',
  damaged_sidewalk: '💔',
  tactile_paving: '🔲',
  inaccessible_entrance: '🚪',
  broken_elevator: '🛗',
  heavy_doors: '🚪',
  stairs_only: '🪜',
  parking_blocked: '🅿️',
  no_parking: '🚫',
  trail_obstacle: '🪨',
  trail_erosion: '🕳️',
  overgrown: '🌿',
  missing_sign: '🪧',
  other: '⚠️'
};

/**
 * Trail Alerts Class
 */
class TrailAlerts {
  constructor() {
    this.isEnabled = true;
    this.isTracking = false;
    this.hazards = [];
    this.alertedHazards = new Map(); // Track which hazards we've alerted on
    this.currentPosition = null;
    this.checkIntervalId = null;
    this.onAlertCallback = null;
    this.voiceAlertsEnabled = false; // Voice alerts for accessibility
  }

  /**
   * Initialize trail alerts
   */
  initialize() {
    this.injectStyles();
    this.loadSettings();
    
    // Listen for tracking events from TrackingController
    window.addEventListener('trackingStarted', () => {
      console.log('⚠️ Trail Alerts: Tracking started event received');
      this.startMonitoring();
    });
    
    window.addEventListener('trackingStopped', () => {
      console.log('⚠️ Trail Alerts: Tracking stopped event received');
      this.stopMonitoring();
    });
    
    // Listen for position updates from map/GPS
    window.addEventListener('positionUpdate', (e) => {
      if (e.detail && e.detail.lat && e.detail.lng) {
        this.updatePosition(e.detail.lat, e.detail.lng);
      }
    });
    
    console.log('⚠️ Trail Alerts initialized');
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('trail-alerts-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'trail-alerts-styles';
    styles.textContent = `
      /* ========== Alert Banner ========== */
      .trail-alert-banner {
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        max-width: 400px;
        width: calc(100% - 32px);
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }

      .trail-alert-banner.immediate {
        border-top: 4px solid #dc2626;
      }

      .trail-alert-banner.warning {
        border-top: 4px solid #ea580c;
      }

      .trail-alert-banner.info {
        border-top: 4px solid #f59e0b;
      }

      .alert-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #f9fafb;
      }

      .alert-icon {
        font-size: 2rem;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .alert-info {
        flex: 1;
      }

      .alert-title {
        font-weight: 700;
        font-size: 1rem;
        color: #111827;
        margin-bottom: 2px;
      }

      .alert-distance {
        font-size: 0.85rem;
        color: #6b7280;
      }

      .alert-close {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 1.25rem;
        color: #9ca3af;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
      }

      .alert-close:hover {
        background: #e5e7eb;
        color: #374151;
      }

      .alert-body {
        padding: 12px 16px;
      }

      .alert-description {
        font-size: 0.9rem;
        color: #4b5563;
        margin-bottom: 12px;
      }

      .alert-meta {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 0.8rem;
        color: #6b7280;
      }

      .alert-meta span {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .alert-actions {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
      }

      .alert-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .alert-btn-primary {
        background: #667eea;
        color: white;
      }

      .alert-btn-primary:hover {
        background: #5a67d8;
      }

      .alert-btn-secondary {
        background: white;
        color: #374151;
        border: 1px solid #e5e7eb;
      }

      .alert-btn-secondary:hover {
        background: #f3f4f6;
      }

      /* ========== Alert Settings Panel ========== */
      .alert-settings {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid #e5e7eb;
      }

      .alert-settings h4 {
        margin: 0 0 12px 0;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .alert-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
      }

      .alert-toggle-label {
        font-size: 0.9rem;
        color: #374151;
      }

      .alert-toggle-switch {
        width: 48px;
        height: 26px;
        background: #d1d5db;
        border-radius: 13px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s;
      }

      .alert-toggle-switch.active {
        background: #10b981;
      }

      .alert-toggle-switch::after {
        content: '';
        position: absolute;
        width: 22px;
        height: 22px;
        background: white;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .alert-toggle-switch.active::after {
        transform: translateX(22px);
      }

      /* ========== High Contrast ========== */
      .high-contrast .trail-alert-banner {
        background: #000;
        border: 2px solid #fff;
      }

      .high-contrast .alert-header,
      .high-contrast .alert-actions {
        background: #111;
      }

      .high-contrast .alert-title,
      .high-contrast .alert-description {
        color: #fff;
      }

      .high-contrast .alert-btn-primary {
        background: #ffff00;
        color: #000;
      }

      /* ========== Mobile ========== */
      @media (max-width: 600px) {
        .trail-alert-banner {
          top: auto;
          bottom: 80px;
          width: calc(100% - 20px);
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('trailAlertSettings') || '{}');
      this.isEnabled = settings.enabled !== false;
      this.voiceAlertsEnabled = settings.voiceAlertsEnabled || false;
      ALERT_CONFIG.minSeverity = settings.minSeverity || 2;
    } catch (e) {
      console.warn('Failed to load alert settings:', e);
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('trailAlertSettings', JSON.stringify({
        enabled: this.isEnabled,
        voiceAlertsEnabled: this.voiceAlertsEnabled,
        minSeverity: ALERT_CONFIG.minSeverity
      }));
    } catch (e) {
      console.warn('Failed to save alert settings:', e);
    }
  }

  /**
   * Set hazards to monitor
   * @param {array} hazards - Array of hazard/report objects
   */
  setHazards(hazards) {
    this.hazards = hazards.filter(h => {
      // Filter to relevant hazards
      const severity = h.severity || 3;
      return severity >= ALERT_CONFIG.minSeverity;
    });
    console.log(`⚠️ Monitoring ${this.hazards.length} hazards`);
  }

  /**
   * Start monitoring (call when tracking starts)
   */
  async startMonitoring() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.alertedHazards.clear();
    
    // Load hazards from Firebase
    await this.loadHazardsFromFirebase();
    
    // Check periodically
    this.checkIntervalId = setInterval(() => {
      if (this.currentPosition) {
        this.checkNearbyHazards(this.currentPosition.lat, this.currentPosition.lng);
      }
    }, ALERT_CONFIG.checkInterval);
    
    console.log('⚠️ Trail alerts monitoring started');
  }

  /**
   * Load hazards from trail_conditions collection
   */
  async loadHazardsFromFirebase() {
    try {
      const { db } = await import('../../firebase-setup.js');
      const { collection, getDocs, query, where } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );

      const now = new Date().toISOString();
      
      // Get non-expired conditions
      const q = query(
        collection(db, 'trail_conditions'),
        where('expiresAt', '>', now)
      );
      
      const snapshot = await getDocs(q);
      
      const hazards = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.location && data.location.lat && data.location.lng) {
          // Convert trail condition to hazard format
          hazards.push({
            id: doc.id,
            lat: data.location.lat,
            lng: data.location.lng,
            title: data.trailName || 'Trail Condition',
            issueType: data.conditions?.[0]?.value || 'trail_obstacle',
            severity: data.maxSeverity || 3,
            description: data.notes || data.conditions?.map(c => c.label).join(', ') || '',
            timestamp: data.timestamp,
            ...data
          });
        }
      });
      
      this.hazards = hazards;
      console.log(`⚠️ Loaded ${hazards.length} hazards from Firebase`);
      
    } catch (error) {
      console.error('Failed to load hazards:', error);
      this.hazards = [];
    }
  }

  /**
   * Stop monitoring (call when tracking stops)
   */
  stopMonitoring() {
    this.isTracking = false;
    
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    
    console.log('⚠️ Trail alerts monitoring stopped');
  }

  /**
   * Update current position
   * @param {number} lat 
   * @param {number} lng 
   */
  updatePosition(lat, lng) {
    this.currentPosition = { lat, lng };
    
    // Immediate check on position update
    if (this.isEnabled && this.isTracking) {
      this.checkNearbyHazards(lat, lng);
    }
  }

  /**
   * Check for nearby hazards
   * @param {number} lat 
   * @param {number} lng 
   */
  checkNearbyHazards(lat, lng) {
    if (!this.isEnabled || this.hazards.length === 0) return;

    const now = Date.now();

    for (const hazard of this.hazards) {
      const hazardLat = hazard.latitude || hazard.location?.latitude;
      const hazardLng = hazard.longitude || hazard.location?.longitude;
      
      if (!hazardLat || !hazardLng) continue;

      const distance = this.calculateDistance(lat, lng, hazardLat, hazardLng);
      
      // Check if within alert range
      let alertLevel = null;
      if (distance <= ALERT_CONFIG.distances.immediate) {
        alertLevel = 'immediate';
      } else if (distance <= ALERT_CONFIG.distances.warning) {
        alertLevel = 'warning';
      } else if (distance <= ALERT_CONFIG.distances.info) {
        alertLevel = 'info';
      }

      if (alertLevel) {
        // Check cooldown
        const lastAlerted = this.alertedHazards.get(hazard.id);
        if (lastAlerted && (now - lastAlerted) < ALERT_CONFIG.cooldownTime) {
          continue; // Skip - already alerted recently
        }

        // Show alert
        this.showAlert(hazard, distance, alertLevel);
        this.alertedHazards.set(hazard.id, now);
        
        // Only show one alert at a time
        break;
      }
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Show alert banner
   * @param {object} hazard 
   * @param {number} distance 
   * @param {string} level - immediate, warning, or info
   */
  showAlert(hazard, distance, level) {
    // Remove existing alert
    const existing = document.querySelector('.trail-alert-banner');
    if (existing) existing.remove();

    const severity = hazard.severity || 3;
    const severityInfo = SEVERITY_INFO[severity] || SEVERITY_INFO[3];
    const icon = ISSUE_ICONS[hazard.issueType] || '⚠️';
    const distanceText = distance < 100 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;

    const levelText = {
      immediate: '⚠️ Hazard Ahead!',
      warning: '⚡ Approaching Hazard',
      info: '📍 Hazard Nearby'
    };

    const banner = document.createElement('div');
    banner.className = `trail-alert-banner ${level}`;
    banner.innerHTML = `
      <div class="alert-header">
        <div class="alert-icon">${icon}</div>
        <div class="alert-info">
          <div class="alert-title">${levelText[level]}</div>
          <div class="alert-distance">${distanceText} away</div>
        </div>
        <button class="alert-close" onclick="this.closest('.trail-alert-banner').remove()">×</button>
      </div>
      <div class="alert-body">
        <div class="alert-description">${this.escapeHtml(hazard.title)}</div>
        <div class="alert-meta">
          <span style="color: ${severityInfo.color};">⚠️ ${severityInfo.label}</span>
          ${hazard.isTemporary ? '<span>⏳ Temporary</span>' : ''}
          ${(hazard.verificationCount || 0) >= 3 ? '<span>✓ Verified</span>' : ''}
        </div>
      </div>
      <div class="alert-actions">
        <button class="alert-btn alert-btn-secondary" onclick="this.closest('.trail-alert-banner').remove()">
          Dismiss
        </button>
        <button class="alert-btn alert-btn-primary" onclick="trailAlerts.showHazardDetails('${hazard.id}')">
          View Details
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    // Play sound if available
    this.playAlertSound(level);

    // Vibrate if available
    if (navigator.vibrate) {
      const patterns = {
        immediate: [200, 100, 200, 100, 200],
        warning: [200, 100, 200],
        info: [100]
      };
      navigator.vibrate(patterns[level] || [100]);
    }

    // Voice alert for accessibility
    this.speakAlert(hazard, distance, level);

    // Auto-dismiss after delay
    const dismissTimes = {
      immediate: 15000,
      warning: 10000,
      info: 7000
    };
    setTimeout(() => {
      banner.remove();
    }, dismissTimes[level]);

    // Callback
    if (this.onAlertCallback) {
      this.onAlertCallback(hazard, distance, level);
    }
  }

  /**
   * Play alert sound
   * @param {string} level 
   */
  playAlertSound(level) {
    // Use Web Audio API for simple beep
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequencies = {
        immediate: 880,
        warning: 660,
        info: 440
      };

      oscillator.frequency.value = frequencies[level] || 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, level === 'immediate' ? 300 : 150);
    } catch (e) {
      // Audio not available
    }
  }

  /**
   * Speak alert using text-to-speech (accessibility feature)
   * @param {object} hazard 
   * @param {number} distance 
   * @param {string} level 
   */
  speakAlert(hazard, distance, level) {
    if (!this.voiceAlertsEnabled || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const distanceText = distance < 100 ? `${Math.round(distance)} meters` : `${(distance / 1000).toFixed(1)} kilometers`;
    const issueType = this.getIssueTypeLabel(hazard.issueType);
    
    let message = '';
    switch (level) {
      case 'immediate':
        message = `Warning! ${issueType} ${distanceText} ahead. ${hazard.title || ''}`;
        break;
      case 'warning':
        message = `Caution. ${issueType} approaching in ${distanceText}. ${hazard.title || ''}`;
        break;
      case 'info':
        message = `${issueType} nearby, ${distanceText} away.`;
        break;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.1;
    utterance.pitch = level === 'immediate' ? 1.2 : 1.0;
    utterance.volume = 0.9;
    
    speechSynthesis.speak(utterance);
  }

  /**
   * Get human-readable issue type label
   * @param {string} issueType 
   * @returns {string}
   */
  getIssueTypeLabel(issueType) {
    const labels = {
      curb_ramp: 'Curb ramp issue',
      sidewalk_blocked: 'Blocked sidewalk',
      damaged_sidewalk: 'Damaged sidewalk',
      tactile_paving: 'Tactile paving issue',
      inaccessible_entrance: 'Inaccessible entrance',
      broken_elevator: 'Broken elevator',
      heavy_doors: 'Heavy door',
      stairs_only: 'Stairs only, no ramp',
      parking_blocked: 'Blocked accessible parking',
      no_parking: 'No accessible parking',
      trail_obstacle: 'Trail obstacle',
      trail_erosion: 'Trail erosion',
      overgrown: 'Overgrown vegetation',
      missing_sign: 'Missing sign',
      other: 'Accessibility barrier'
    };
    return labels[issueType] || 'Accessibility hazard';
  }

  /**
   * Toggle voice alerts on/off
   */
  toggleVoiceAlerts() {
    this.voiceAlertsEnabled = !this.voiceAlertsEnabled;
    this.saveSettings();
    return this.voiceAlertsEnabled;
  }

  /**
   * Show hazard details (navigate to reports page or show modal)
   * @param {string} hazardId 
   */
  showHazardDetails(hazardId) {
    // Close alert
    const banner = document.querySelector('.trail-alert-banner');
    if (banner) banner.remove();

    // If we have a viewReportDetails function available, use it
    if (typeof window.viewReportDetails === 'function') {
      window.viewReportDetails(hazardId);
    } else {
      // Navigate to reports page with the hazard highlighted
      window.location.href = `reports.html?highlight=${hazardId}`;
    }
  }

  /**
   * Escape HTML
   * @param {string} str 
   * @returns {string}
   */
  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[char]);
  }

  /**
   * Toggle alerts on/off
   */
  toggle() {
    this.isEnabled = !this.isEnabled;
    this.saveSettings();
    toast[this.isEnabled ? 'success' : 'info'](
      this.isEnabled ? '⚠️ Trail alerts enabled' : '🔕 Trail alerts disabled'
    );
    return this.isEnabled;
  }

  /**
   * Set minimum severity for alerts
   * @param {number} severity 1-5
   */
  setMinSeverity(severity) {
    ALERT_CONFIG.minSeverity = Math.max(1, Math.min(5, severity));
    this.saveSettings();
  }

  /**
   * Render settings panel HTML
   * @returns {string}
   */
  renderSettingsPanel() {
    return `
      <div class="alert-settings">
        <h4>⚠️ Trail Alerts</h4>
        <div class="alert-toggle">
          <span class="alert-toggle-label">Enable hazard alerts while tracking</span>
          <div class="alert-toggle-switch ${this.isEnabled ? 'active' : ''}" 
               onclick="trailAlerts.toggle(); this.classList.toggle('active')"></div>
        </div>
        <div class="alert-toggle" style="margin-top: 8px;">
          <span class="alert-toggle-label">🔊 Voice alerts (accessibility)</span>
          <div class="alert-toggle-switch ${this.voiceAlertsEnabled ? 'active' : ''}" 
               onclick="trailAlerts.toggleVoiceAlerts(); this.classList.toggle('active')"></div>
        </div>
        <div class="alert-toggle" style="margin-top: 8px;">
          <span class="alert-toggle-label">Minimum severity to alert</span>
          <select onchange="trailAlerts.setMinSeverity(parseInt(this.value))" 
                  style="padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;">
            ${[1, 2, 3, 4, 5].map(s => `
              <option value="${s}" ${ALERT_CONFIG.minSeverity === s ? 'selected' : ''}>
                ${s} - ${SEVERITY_INFO[s].label}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Show settings in a modal dialog
   */
  showSettingsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'trail-alert-overlay';
    overlay.id = 'alertSettingsOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;

    const modal = document.createElement('div');
    modal.className = 'trail-alert-settings-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: calc(100% - 32px);
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 1.25em;">⚠️ Alert Settings</h3>
        <button id="closeAlertSettings" style="background: none; border: none; font-size: 1.5em; cursor: pointer; padding: 4px;">×</button>
      </div>
      ${this.renderSettingsPanel()}
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 0.85em; color: #6b7280; margin: 0;">
          Trail alerts notify you when you're approaching reported hazards or accessibility issues during tracking.
        </p>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close handlers
    document.getElementById('closeAlertSettings').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
}

// Create and export singleton
export const trailAlerts = new TrailAlerts();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => trailAlerts.initialize());
} else {
  trailAlerts.initialize();
}

// Make available globally
window.trailAlerts = trailAlerts;

console.log('⚠️ Trail Alerts module loaded');