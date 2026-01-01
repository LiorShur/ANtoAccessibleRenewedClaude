/**
 * Safety Features Module
 * Access Nature - Critical Safety Utilities
 * 
 * Features:
 * - Lifeline: Share real-time location with emergency contacts
 * - Emergency SOS: One-tap emergency call with GPS coordinates
 * - Weather Integration: Current conditions at location
 */

import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';

class SafetyFeatures {
  constructor() {
    this.emergencyContacts = [];
    this.lifelineActive = false;
    this.lifelineInterval = null;
    this.currentPosition = null;
    this.weatherCache = new Map();
    this.weatherCacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.storageKey = 'accessNature_safety';
  }

  /**
   * Initialize safety features
   */
  initialize() {
    this.loadSettings();
    this.injectStyles();
    this.createSOSButton();
    this.watchPosition();
    console.log('✅ Safety features initialized');
  }

  /**
   * Load saved settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.emergencyContacts = data.emergencyContacts || [];
      }
    } catch (e) {
      console.warn('Failed to load safety settings:', e);
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        emergencyContacts: this.emergencyContacts
      }));
    } catch (e) {
      console.warn('Failed to save safety settings:', e);
    }
  }

  /**
   * Inject styles for safety UI
   */
  injectStyles() {
    if (document.getElementById('safety-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'safety-styles';
    styles.textContent = `
      /* ========== SOS Button ========== */
      .sos-button {
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
        border: 3px solid white;
        box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4);
        cursor: pointer;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 14px;
        letter-spacing: 1px;
        transition: all 0.2s;
      }
      
      .sos-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(220, 38, 38, 0.5);
      }
      
      .sos-button:active {
        transform: scale(0.95);
      }
      
      .sos-button.hidden {
        display: none;
      }
      
      /* Pulse animation for SOS */
      .sos-button::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid #dc2626;
        animation: sosPulse 2s infinite;
        opacity: 0;
      }
      
      @keyframes sosPulse {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.3); opacity: 0; }
      }
      
      /* ========== Safety Modal ========== */
      .safety-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 20000;
        display: none;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }
      
      .safety-overlay.open {
        display: flex;
      }
      
      .safety-modal {
        background: white;
        border-radius: 20px;
        max-width: 400px;
        width: 100%;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        animation: emergencySlide 0.3s ease;
      }
      
      @keyframes emergencySlide {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      
      .safety-header {
        background: linear-gradient(135deg, #dc2626, #991b1b);
        color: white;
        padding: 24px;
        text-align: center;
      }
      
      .safety-header h2 {
        margin: 0;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      
      .safety-header p {
        margin: 10px 0 0;
        opacity: 0.9;
        font-size: 0.9rem;
      }
      
      .safety-body {
        padding: 24px;
      }
      
      .safety-coords {
        background: #f3f4f6;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
        text-align: center;
      }
      
      .safety-coords-label {
        font-size: 0.8rem;
        color: #6b7280;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .safety-coords-value {
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 1.1rem;
        font-weight: 600;
        color: #111827;
      }
      
      .safety-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .safety-btn {
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: all 0.2s;
      }
      
      .safety-btn-emergency {
        background: #dc2626;
        color: white;
        font-size: 1.1rem;
      }
      
      .safety-btn-emergency:hover {
        background: #b91c1c;
      }
      
      .safety-btn-share {
        background: #2563eb;
        color: white;
      }
      
      .safety-btn-share:hover {
        background: #1d4ed8;
      }
      
      .safety-btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }
      
      .safety-btn-secondary:hover {
        background: #e5e7eb;
      }
      
      .safety-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }
      
      .safety-cancel {
        background: none;
        border: none;
        color: #6b7280;
        font-size: 0.95rem;
        cursor: pointer;
        padding: 8px 16px;
      }
      
      .safety-cancel:hover {
        color: #374151;
      }
      
      /* ========== Lifeline Panel ========== */
      .lifeline-panel {
        position: fixed;
        top: 120px;
        right: 12px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 16px;
        z-index: 9990;
        max-width: 280px;
        display: none;
        transition: all 0.3s ease;
      }
      
      .lifeline-panel.active {
        display: block;
      }
      
      /* Minimized state */
      .lifeline-panel.minimized {
        padding: 10px 14px;
        max-width: fit-content;
        cursor: pointer;
      }
      
      .lifeline-panel.minimized .lifeline-header {
        margin-bottom: 0;
      }
      
      .lifeline-panel.minimized .lifeline-stop,
      .lifeline-panel.minimized .lifeline-info,
      .lifeline-panel.minimized .lifeline-actions {
        display: none;
      }
      
      .lifeline-panel.minimized .lifeline-status {
        font-size: 0.85rem;
      }
      
      .lifeline-panel.minimized .lifeline-minimize {
        transform: rotate(180deg);
      }
      
      .lifeline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .lifeline-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #166534;
      }
      
      .lifeline-dot {
        width: 10px;
        height: 10px;
        background: #22c55e;
        border-radius: 50%;
        animation: lifelinePulse 1.5s infinite;
        flex-shrink: 0;
      }
      
      @keyframes lifelinePulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(0.85); }
      }
      
      .lifeline-header-buttons {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      
      .lifeline-minimize {
        background: #f3f4f6;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
        transition: all 0.2s;
      }
      
      .lifeline-minimize:hover {
        background: #e5e7eb;
      }
      
      .lifeline-stop {
        background: #fee2e2;
        color: #dc2626;
        border: none;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .lifeline-stop:hover {
        background: #fecaca;
      }
      
      .lifeline-info {
        font-size: 0.85rem;
        color: #6b7280;
        margin-bottom: 12px;
      }
      
      .lifeline-info strong {
        color: #374151;
      }
      
      .lifeline-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .lifeline-action-btn {
        flex: 1;
        min-width: 100px;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        font-size: 0.8rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.2s;
      }
      
      .lifeline-action-btn:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }
      
      /* ========== Weather Widget ========== */
      .weather-widget {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border-radius: 16px;
        padding: 16px;
        margin: 16px 0;
      }
      
      .weather-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      
      .weather-location {
        font-size: 0.85rem;
        opacity: 0.9;
      }
      
      .weather-refresh {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.75rem;
      }
      
      .weather-main {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .weather-icon {
        font-size: 3rem;
      }
      
      .weather-temp {
        font-size: 2.5rem;
        font-weight: 700;
      }
      
      .weather-desc {
        font-size: 0.95rem;
        opacity: 0.9;
        text-transform: capitalize;
      }
      
      .weather-details {
        display: flex;
        gap: 16px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.2);
        font-size: 0.85rem;
      }
      
      .weather-detail {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .weather-loading {
        text-align: center;
        padding: 20px;
        opacity: 0.8;
      }
      
      .weather-error {
        text-align: center;
        padding: 16px;
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
      }
      
      /* ========== Emergency Contacts ========== */
      .contacts-list {
        margin: 16px 0;
      }
      
      .contact-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: #f9fafb;
        border-radius: 10px;
        margin-bottom: 8px;
      }
      
      .contact-info {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      }
      
      .contact-avatar {
        width: 40px;
        height: 40px;
        background: #e5e7eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
      }
      
      .contact-name {
        font-weight: 600;
        color: #111827;
      }
      
      .contact-phone {
        font-size: 0.85rem;
        color: #6b7280;
      }
      
      .contact-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      
      .contact-edit {
        background: none;
        border: none;
        color: #3b82f6;
        cursor: pointer;
        padding: 6px;
        font-size: 1rem;
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .contact-edit:hover {
        background: #eff6ff;
      }
      
      .contact-remove {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 6px;
        font-size: 1.2rem;
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .contact-remove:hover {
        color: #dc2626;
        background: #fef2f2;
      }
      
      /* ========== High Contrast Overrides ========== */
      .high-contrast .sos-button {
        background: #000;
        border: 4px solid #fff;
      }
      
      .high-contrast .safety-modal {
        border: 3px solid #000;
      }
      
      .high-contrast .lifeline-panel {
        background: #000;
        border: 3px solid #fff;
        color: #fff;
      }
      
      .high-contrast .lifeline-status {
        color: #4ade80;
      }
      
      .high-contrast .lifeline-info {
        color: #d1d5db;
      }
      
      .high-contrast .lifeline-info strong {
        color: #fff;
      }
      
      .high-contrast .lifeline-stop {
        background: #fff;
        color: #000;
        border: 2px solid #fff;
      }
      
      .high-contrast .lifeline-minimize,
      .high-contrast .lifeline-action-btn {
        background: #333;
        color: #fff;
        border: 2px solid #fff;
      }
      
      .high-contrast .contact-item {
        background: #333;
        border: 2px solid #fff;
      }
      
      .high-contrast .contact-name {
        color: #fff;
      }
      
      .high-contrast .contact-phone {
        color: #d1d5db;
      }
      
      .high-contrast .contact-edit {
        color: #60a5fa;
      }
      
      .high-contrast .contact-remove {
        color: #f87171;
      }
      
      /* ========== Mobile Responsive ========== */
      @media (max-width: 600px) {
        .sos-button {
          bottom: 90px;
          right: 16px;
          width: 56px;
          height: 56px;
        }
        
        .lifeline-panel {
          top: auto;
          bottom: 160px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
        
        .lifeline-panel.minimized {
          left: auto;
          right: 10px;
          bottom: 160px;
          max-width: fit-content;
        }
        
        .lifeline-actions {
          flex-direction: column;
        }
        
        .lifeline-action-btn {
          min-width: 100%;
        }
        
        .safety-modal {
          margin: auto 10px;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Watch current position
   */
  watchPosition() {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  }

  /**
   * Create floating SOS button
   */
  createSOSButton() {
    if (document.getElementById('sosButton')) return;
    
    const button = document.createElement('button');
    button.id = 'sosButton';
    button.className = 'sos-button';
    button.innerHTML = 'SOS';
    button.setAttribute('aria-label', 'Emergency SOS - tap for emergency options');
    button.setAttribute('title', 'Emergency SOS');
    
    button.addEventListener('click', () => this.openEmergencyModal());
    
    // Only show on tracker page by default
    if (!window.location.pathname.includes('tracker')) {
      button.classList.add('hidden');
    }
    
    document.body.appendChild(button);
  }

  /**
   * Show/hide SOS button
   */
  showSOSButton(show = true) {
    const button = document.getElementById('sosButton');
    if (button) {
      button.classList.toggle('hidden', !show);
    }
  }

  // ========== Emergency SOS ==========

  /**
   * Open emergency modal with options
   */
  async openEmergencyModal() {
    // Haptic feedback
    if (window.displayPreferences?.haptic) {
      window.displayPreferences.haptic('heavy');
    }
    
    const coords = this.currentPosition 
      ? `${this.currentPosition.lat.toFixed(6)}, ${this.currentPosition.lng.toFixed(6)}`
      : 'Acquiring location...';
    
    // Get user name for display
    const userName = await this.getUserName();
    
    const overlay = document.createElement('div');
    overlay.className = 'safety-overlay open';
    overlay.id = 'safetyOverlay';
    
    overlay.innerHTML = `
      <div class="safety-modal">
        <div class="safety-header">
          <h2>🆘 Emergency</h2>
          <p style="font-size: 1rem; margin-top: 8px;">Sending as: <strong>${userName}</strong></p>
          <p style="opacity: 0.8; margin-top: 4px;">Your current GPS coordinates:</p>
        </div>
        
        <div class="safety-body">
          <div class="safety-coords">
            <div class="safety-coords-label">GPS Location</div>
            <div class="safety-coords-value" id="emergencyCoords">${coords}</div>
          </div>
          
          <div class="safety-actions">
            <button class="safety-btn safety-btn-emergency" onclick="safetyFeatures.callEmergency()">
              📞 Call Emergency Services
            </button>
            
            <button class="safety-btn safety-btn-share" onclick="safetyFeatures.shareLocation()">
              📍 Share My Location
            </button>
            
            <button class="safety-btn safety-btn-secondary" onclick="safetyFeatures.copyCoordinates()">
              📋 Copy Coordinates
            </button>
            
            <button class="safety-btn safety-btn-secondary" onclick="safetyFeatures.changeEmergencyName()" style="font-size: 0.85rem;">
              ✏️ Change Name
            </button>
          </div>
        </div>
        
        <div class="safety-footer">
          <button class="safety-cancel" onclick="safetyFeatures.closeEmergencyModal()">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Update coordinates if still acquiring
    if (!this.currentPosition) {
      this.updateEmergencyCoords();
    }
  }

  /**
   * Allow user to change their emergency name
   */
  async changeEmergencyName() {
    const currentName = localStorage.getItem('accessNature_userName') || '';
    const newName = prompt('Enter your name for emergency messages:', currentName);
    
    if (newName && newName.trim()) {
      localStorage.setItem('accessNature_userName', newName.trim());
      toast.success('Emergency name updated!');
      
      // Refresh the modal
      this.closeEmergencyModal();
      this.openEmergencyModal();
    }
  }

  /**
   * Update coordinates in emergency modal
   */
  updateEmergencyCoords() {
    const el = document.getElementById('emergencyCoords');
    if (!el) return;
    
    if (this.currentPosition) {
      el.textContent = `${this.currentPosition.lat.toFixed(6)}, ${this.currentPosition.lng.toFixed(6)}`;
    } else {
      // Try to get position
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          el.textContent = `${this.currentPosition.lat.toFixed(6)}, ${this.currentPosition.lng.toFixed(6)}`;
        },
        () => {
          el.textContent = 'Location unavailable';
        }
      );
    }
  }

  /**
   * Close emergency modal
   */
  closeEmergencyModal() {
    document.getElementById('safetyOverlay')?.remove();
  }

  /**
   * Call emergency services
   */
  callEmergency() {
    // Default to 112 (international emergency number)
    // In production, this should be localized
    const emergencyNumber = this.getLocalEmergencyNumber();
    
    // Try tel: link first
    window.location.href = `tel:${emergencyNumber}`;
    
    toast.info(`Calling ${emergencyNumber}...`, { duration: 3000 });
  }

  /**
   * Get local emergency number based on locale
   */
  getLocalEmergencyNumber() {
    // This is a simplified version - in production, use IP geolocation
    const locale = navigator.language || 'en-US';
    
    const emergencyNumbers = {
      'en-US': '911',
      'en-CA': '911',
      'en-GB': '999',
      'en-AU': '000',
      'en-NZ': '111',
      'en-ZA': '10111',
      'de': '112',
      'fr': '112',
      'es': '112',
      'it': '112',
      'default': '112' // EU standard
    };
    
    return emergencyNumbers[locale] || emergencyNumbers[locale.split('-')[0]] || emergencyNumbers.default;
  }

  /**
   * Get current user's display name
   * @returns {string} - User's name or 'Someone'
   */
  async getUserName() {
    try {
      // Try Firebase auth first
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
      const auth = getAuth();
      
      if (auth.currentUser?.displayName) {
        return auth.currentUser.displayName;
      }
      
      // Try localStorage fallback
      const savedName = localStorage.getItem('accessNature_userName');
      if (savedName) {
        return savedName;
      }
      
      // Prompt for name if not available
      const name = await this.promptForEmergencyName();
      return name || 'Someone using Access Nature';
      
    } catch (e) {
      console.warn('Could not get user name:', e);
      return 'Someone using Access Nature';
    }
  }

  /**
   * Prompt user for their name for emergency purposes
   */
  async promptForEmergencyName() {
    return new Promise((resolve) => {
      const name = prompt('Enter your name for emergency messages (this will be saved):');
      if (name && name.trim()) {
        localStorage.setItem('accessNature_userName', name.trim());
        resolve(name.trim());
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Share location via Web Share API or fallback
   */
  async shareLocation() {
    if (!this.currentPosition) {
      toast.error('Location not available. Please wait for GPS.');
      return;
    }
    
    // Get user's name
    const userName = await this.getUserName();
    
    const { lat, lng } = this.currentPosition;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const timestamp = new Date().toLocaleString();
    
    const message = `🆘 EMERGENCY ALERT 🆘

${userName} is experiencing an emergency and needs help!

📍 LOCATION:
Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
Map: ${mapsUrl}

⏰ Time: ${timestamp}

⚠️ IMPORTANT:
Please try to contact ${userName} immediately. If you cannot reach them, please alert emergency services and provide this location.

Emergency Numbers:
• US/Canada: 911
• UK: 999
• EU: 112
• Australia: 000

---
Sent via Access Nature App`;

    // Store message for other share methods
    this.lastEmergencyMessage = message;
    this.lastEmergencyUserName = userName;
    
    // Show share options modal instead of direct share
    this.showShareOptionsModal(message, userName, mapsUrl);
  }

  /**
   * Show modal with share options for better control
   */
  showShareOptionsModal(message, userName, mapsUrl) {
    // Close existing emergency modal
    document.getElementById('safetyOverlay')?.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'safety-overlay open';
    overlay.id = 'shareOptionsOverlay';
    
    overlay.innerHTML = `
      <div class="safety-modal">
        <div class="safety-header">
          <h2>📤 Share Emergency Alert</h2>
          <p>Choose how to share your emergency location</p>
        </div>
        
        <div class="safety-body">
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; margin-bottom: 16px; font-size: 0.9rem;">
            <strong>Message preview:</strong><br>
            <span style="color: #991b1b;">${userName} is experiencing an emergency...</span>
          </div>
          
          <div class="safety-actions">
            <button class="safety-btn safety-btn-emergency" onclick="safetyFeatures.shareViaSMS()">
              💬 Send via SMS/Text
            </button>
            
            <button class="safety-btn safety-btn-share" onclick="safetyFeatures.shareViaWhatsApp()">
              📱 Send via WhatsApp
            </button>
            
            <button class="safety-btn safety-btn-share" onclick="safetyFeatures.shareViaEmail()">
              ✉️ Send via Email
            </button>
            
            <button class="safety-btn safety-btn-secondary" onclick="safetyFeatures.shareViaSystem()">
              📤 Other Apps...
            </button>
            
            <button class="safety-btn safety-btn-secondary" onclick="safetyFeatures.copyEmergencyMessage()">
              📋 Copy Full Message
            </button>
          </div>
        </div>
        
        <div class="safety-footer">
          <button class="safety-cancel" onclick="document.getElementById('shareOptionsOverlay').remove(); safetyFeatures.openEmergencyModal();">
            ← Back
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  /**
   * Share via SMS - most reliable for full message
   */
  shareViaSMS() {
    const message = this.lastEmergencyMessage;
    if (!message) {
      toast.error('No message to share');
      return;
    }
    
    // SMS URL with body
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    
    toast.success('Opening SMS app...');
    document.getElementById('shareOptionsOverlay')?.remove();
  }

  /**
   * Share via WhatsApp
   */
  shareViaWhatsApp() {
    const message = this.lastEmergencyMessage;
    if (!message) {
      toast.error('No message to share');
      return;
    }
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('Opening WhatsApp...');
    document.getElementById('shareOptionsOverlay')?.remove();
  }

  /**
   * Share via Email
   */
  shareViaEmail() {
    const message = this.lastEmergencyMessage;
    const userName = this.lastEmergencyUserName || 'Someone';
    
    if (!message) {
      toast.error('No message to share');
      return;
    }
    
    const subject = encodeURIComponent(`🆘 EMERGENCY ALERT - ${userName} needs help!`);
    const body = encodeURIComponent(message);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    
    toast.success('Opening email app...');
    document.getElementById('shareOptionsOverlay')?.remove();
  }

  /**
   * Share via system share sheet (may truncate on some devices)
   */
  async shareViaSystem() {
    const message = this.lastEmergencyMessage;
    const userName = this.lastEmergencyUserName || 'Someone';
    
    if (!message) {
      toast.error('No message to share');
      return;
    }
    
    if (navigator.share) {
      try {
        // Don't include URL separately - it causes truncation
        await navigator.share({
          title: `🆘 Emergency Alert - ${userName}`,
          text: message
        });
        toast.success('Emergency location shared!');
        document.getElementById('shareOptionsOverlay')?.remove();
      } catch (e) {
        if (e.name !== 'AbortError') {
          toast.error('Share failed. Try SMS or copy the message.');
        }
      }
    } else {
      toast.info('System share not available. Try SMS or copy.');
    }
  }

  /**
   * Copy full emergency message to clipboard
   */
  async copyEmergencyMessage() {
    const message = this.lastEmergencyMessage;
    
    if (!message) {
      toast.error('No message to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Full emergency message copied! Paste it anywhere.');
      
      if (window.displayPreferences?.haptic) {
        window.displayPreferences.haptic('success');
      }
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = message;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Full emergency message copied!');
    }
  }

  /**
   * Fallback share method (legacy)
   * @param {string} message - Emergency message
   * @param {string} userName - User's name
   */
  fallbackShare(message, userName = 'Someone') {
    // Try SMS
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    toast.info('Opening SMS with emergency alert');
  }

  /**
   * Copy coordinates to clipboard
   */
  async copyCoordinates() {
    if (!this.currentPosition) {
      toast.error('Location not available');
      return;
    }
    
    const { lat, lng } = this.currentPosition;
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Coordinates copied!');
      
      if (window.displayPreferences?.haptic) {
        window.displayPreferences.haptic('success');
      }
    } catch (e) {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Coordinates copied!');
    }
  }

  // ========== Lifeline Feature ==========

  /**
   * Start lifeline - share location periodically
   * @param {number} intervalMinutes - Update interval in minutes
   */
  async startLifeline(intervalMinutes = 5) {
    if (this.lifelineActive) {
      toast.info('Lifeline is already active');
      return;
    }
    
    if (!this.currentPosition) {
      toast.error('Please wait for GPS location');
      return;
    }
    
    // Show contacts selector or use saved contacts
    if (this.emergencyContacts.length === 0) {
      const addContact = await modal.confirm(
        'No emergency contacts set. Would you like to add one now?',
        'Setup Lifeline'
      );
      
      if (addContact) {
        await this.manageContacts();
      }
      return;
    }
    
    this.lifelineActive = true;
    
    // Count email vs SMS contacts
    const emailContacts = this.emergencyContacts.filter(c => c.email).length;
    const smsOnlyContacts = this.emergencyContacts.length - emailContacts;
    
    // Share initial location
    await this.sendLifelineUpdate();
    
    // Set up interval
    this.lifelineInterval = setInterval(() => {
      this.sendLifelineUpdate();
    }, intervalMinutes * 60 * 1000);
    
    // Show lifeline panel
    this.showLifelinePanel();
    
    // Show appropriate toast message
    if (emailContacts > 0) {
      toast.success(`Lifeline active! ${emailContacts} contact(s) will receive automatic email updates every ${intervalMinutes} minutes.`);
    } else {
      toast.success(`Lifeline active! Tap "Share Now" to send your location to contacts.`);
    }
    
    if (smsOnlyContacts > 0 && emailContacts > 0) {
      setTimeout(() => {
        toast.info(`${smsOnlyContacts} contact(s) don't have email - use "Share Now" to send them updates.`);
      }, 3000);
    }
  }

  /**
   * Stop lifeline
   */
  stopLifeline() {
    if (!this.lifelineActive) return;
    
    this.lifelineActive = false;
    
    if (this.lifelineInterval) {
      clearInterval(this.lifelineInterval);
      this.lifelineInterval = null;
    }
    
    this.hideLifelinePanel();
    toast.info('Lifeline stopped');
  }

  /**
   * Send lifeline update to contacts
   */
  async sendLifelineUpdate() {
    if (!this.currentPosition) return;
    
    const userName = await this.getUserName();
    const { lat, lng } = this.currentPosition;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const time = new Date().toLocaleTimeString();
    const timestamp = new Date().toLocaleString();
    
    console.log(`📍 Lifeline update for ${userName} at ${time}: ${lat}, ${lng}`);
    
    // Prepare message for sharing
    const lifelineMessage = `📍 Lifeline Update from ${userName}

Location as of ${timestamp}:
Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
Map: ${mapsUrl}

${userName} is sharing their location with you via Access Nature's Lifeline feature. This is an automated check-in.

If you cannot reach ${userName} and are concerned about their safety, please contact emergency services.`;
    
    // Store latest update
    this.lastLifelineUpdate = {
      userName,
      position: this.currentPosition,
      time: new Date().toISOString(),
      mapsUrl,
      message: lifelineMessage
    };
    
    // Send notifications to all contacts
    let emailsSent = 0;
    let emailsFailed = 0;
    
    for (const contact of this.emergencyContacts) {
      // Try to send email if contact has email and EmailJS is configured
      if (contact.email) {
        try {
          await this.sendLifelineEmail(contact, lifelineMessage, userName, mapsUrl, timestamp);
          emailsSent++;
          console.log(`✅ Lifeline email sent to ${contact.name}`);
        } catch (error) {
          emailsFailed++;
          console.warn(`⚠️ Failed to send lifeline email to ${contact.name}:`, error);
        }
      }
    }
    
    // Update status
    if (emailsSent > 0) {
      console.log(`📧 Lifeline: ${emailsSent} email notification(s) sent`);
    }
    if (emailsFailed > 0) {
      console.warn(`⚠️ Lifeline: ${emailsFailed} email(s) failed to send`);
    }
    
    // Update the lifeline panel with latest status
    this.updateLifelinePanelTime();
  }
  
  /**
   * Send lifeline email via EmailJS
   */
  async sendLifelineEmail(contact, message, userName, mapsUrl, timestamp) {
    // Check if EmailJS is available
    if (typeof emailjs === 'undefined') {
      // Try to load EmailJS
      await this.loadEmailJSForLifeline();
    }
    
    if (typeof emailjs === 'undefined') {
      throw new Error('EmailJS not available');
    }
    
    // Get EmailJS config from localStorage (set in admin)
    const settings = JSON.parse(localStorage.getItem('accessNature_adminSettings') || '{}');
    const config = settings.emailjs || {};
    
    if (!config.serviceId || !config.templateId || !config.publicKey) {
      throw new Error('EmailJS not configured');
    }
    
    // Send email
    await emailjs.send(config.serviceId, config.templateId, {
      to_email: contact.email,
      to_name: contact.name,
      from_name: userName,
      subject: `📍 Lifeline Check-in from ${userName}`,
      message: message,
      maps_url: mapsUrl,
      timestamp: timestamp
    });
  }
  
  /**
   * Load EmailJS for lifeline feature
   */
  async loadEmailJSForLifeline() {
    if (typeof emailjs !== 'undefined') return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      script.onload = () => {
        const settings = JSON.parse(localStorage.getItem('accessNature_adminSettings') || '{}');
        const config = settings.emailjs || {};
        if (config.publicKey) {
          emailjs.init(config.publicKey);
        }
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Update lifeline panel time display
   */
  updateLifelinePanelTime() {
    const panel = document.getElementById('lifelinePanel');
    if (!panel) return;
    
    const timeEl = panel.querySelector('.lifeline-time');
    if (timeEl) {
      timeEl.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
    }
  }

  /**
   * Show lifeline status panel
   */
  showLifelinePanel() {
    let panel = document.getElementById('lifelinePanel');
    
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'lifelinePanel';
      panel.className = 'lifeline-panel';
      document.body.appendChild(panel);
    }
    
    // Count email vs SMS contacts
    const emailContacts = this.emergencyContacts.filter(c => c.email).length;
    const smsOnlyContacts = this.emergencyContacts.length - emailContacts;
    
    let contactInfo = '';
    if (emailContacts > 0 && smsOnlyContacts > 0) {
      contactInfo = `📧 ${emailContacts} auto-notify, 📱 ${smsOnlyContacts} SMS-only`;
    } else if (emailContacts > 0) {
      contactInfo = `📧 ${emailContacts} contact(s) with auto-notifications`;
    } else {
      contactInfo = `📱 ${smsOnlyContacts} contact(s) - tap "Share Now" to send updates`;
    }
    
    // Update panel content
    panel.innerHTML = `
      <div class="lifeline-header">
        <div class="lifeline-status">
          <span class="lifeline-dot"></span>
          <span class="lifeline-status-text">Lifeline Active</span>
        </div>
        <div class="lifeline-header-buttons">
          <button class="lifeline-minimize" onclick="safetyFeatures.toggleLifelineMinimize()" title="Minimize">▼</button>
          <button class="lifeline-stop" onclick="safetyFeatures.stopLifeline()">Stop</button>
        </div>
      </div>
      <div class="lifeline-info">
        ${contactInfo}
      </div>
      <div class="lifeline-time" style="font-size: 0.75rem; color: #6b7280; margin-bottom: 8px;">
        Last update: ${new Date().toLocaleTimeString()}
      </div>
      <div class="lifeline-actions">
        <button class="lifeline-action-btn" onclick="safetyFeatures.shareLastLifelineUpdate()">
          📤 Share Now
        </button>
        <button class="lifeline-action-btn" onclick="safetyFeatures.manageContacts()">
          ✏️ Edit Contacts
        </button>
      </div>
    `;
    
    // Click on minimized panel to expand
    panel.addEventListener('click', (e) => {
      if (panel.classList.contains('minimized') && !e.target.closest('button')) {
        this.toggleLifelineMinimize();
      }
    });
    
    panel.classList.add('active');
    panel.classList.remove('minimized');
  }

  /**
   * Toggle lifeline panel minimize state
   */
  toggleLifelineMinimize() {
    const panel = document.getElementById('lifelinePanel');
    if (panel) {
      panel.classList.toggle('minimized');
    }
  }

  /**
   * Update lifeline panel (e.g., after editing contacts)
   */
  updateLifelinePanel() {
    if (this.lifelineActive) {
      const panel = document.getElementById('lifelinePanel');
      const info = panel?.querySelector('.lifeline-info');
      if (info) {
        info.innerHTML = `Sharing location with <strong>${this.emergencyContacts.length}</strong> contact(s)`;
      }
    }
  }

  /**
   * Share the last lifeline update manually
   */
  async shareLastLifelineUpdate() {
    if (!this.lastLifelineUpdate) {
      // Generate one if we don't have it
      await this.sendLifelineUpdate();
    }
    
    if (this.lastLifelineUpdate?.message) {
      // Set the emergency message so share functions work
      this.lastEmergencyMessage = this.lastLifelineUpdate.message;
      this.lastEmergencyUserName = this.lastLifelineUpdate.userName;
      
      this.showShareOptionsModal(
        this.lastLifelineUpdate.message,
        this.lastLifelineUpdate.userName,
        this.lastLifelineUpdate.mapsUrl
      );
    }
  }

  /**
   * Hide lifeline panel
   */
  hideLifelinePanel() {
    const panel = document.getElementById('lifelinePanel');
    panel?.classList.remove('active');
    panel?.classList.remove('minimized');
  }

  /**
   * Manage emergency contacts
   */
  async manageContacts() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'safety-overlay open';
      overlay.id = 'contactsOverlay';
      
      overlay.innerHTML = `
        <div class="safety-modal">
          <div class="safety-header" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
            <h2>👥 Emergency Contacts</h2>
            <p>People who will receive your location updates</p>
          </div>
          
          <div class="safety-body">
            <div class="contacts-list" id="contactsList">
              ${this.renderContacts()}
            </div>
            
            <button class="safety-btn safety-btn-share" onclick="safetyFeatures.addContact()">
              ➕ Add Contact
            </button>
          </div>
          
          <div class="safety-footer">
            <button class="safety-cancel" onclick="document.getElementById('contactsOverlay').remove()">
              Done
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      resolve();
    });
  }

  /**
   * Render contacts list HTML
   */
  renderContacts() {
    if (this.emergencyContacts.length === 0) {
      return '<p style="text-align: center; color: #6b7280;">No contacts added yet</p>';
    }
    
    return this.emergencyContacts.map((contact, i) => `
      <div class="contact-item">
        <div class="contact-info">
          <div class="contact-avatar">👤</div>
          <div>
            <div class="contact-name">${contact.name}</div>
            <div class="contact-phone">${contact.phone}</div>
            ${contact.email ? `<div class="contact-email" style="font-size: 0.75rem; color: #10b981;">📧 Auto-notify enabled</div>` : '<div class="contact-email" style="font-size: 0.75rem; color: #9ca3af;">📱 SMS only</div>'}
          </div>
        </div>
        <div class="contact-actions">
          <button class="contact-edit" onclick="safetyFeatures.editContact(${i})" title="Edit contact">✏️</button>
          <button class="contact-remove" onclick="safetyFeatures.removeContact(${i})" title="Remove contact">×</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Add emergency contact
   */
  async addContact() {
    const name = await modal.prompt('Contact name:', 'Add Emergency Contact');
    if (!name) return;
    
    const phone = await modal.prompt('Phone number (for SMS):', 'Add Emergency Contact');
    if (!phone) return;
    
    const email = await modal.prompt('Email address (optional, for automatic notifications):', 'Add Emergency Contact');
    
    this.emergencyContacts.push({ name, phone, email: email || null });
    this.saveSettings();
    
    // Update list
    const list = document.getElementById('contactsList');
    if (list) {
      list.innerHTML = this.renderContacts();
    }
    
    if (email) {
      toast.success(`${name} added with email notifications enabled`);
    } else {
      toast.success(`${name} added (SMS sharing only)`);
    }
  }

  /**
   * Edit emergency contact
   */
  async editContact(index) {
    const contact = this.emergencyContacts[index];
    if (!contact) return;
    
    const name = await modal.prompt('Contact name:', 'Edit Emergency Contact', contact.name);
    if (name === null) return; // User cancelled
    
    const phone = await modal.prompt('Phone number (for SMS):', 'Edit Emergency Contact', contact.phone);
    if (phone === null) return; // User cancelled
    
    const email = await modal.prompt('Email address (optional, for automatic notifications):', 'Edit Emergency Contact', contact.email || '');
    if (email === null) return; // User cancelled
    
    // Update contact
    this.emergencyContacts[index] = { 
      name: name || contact.name, 
      phone: phone || contact.phone,
      email: email || null
    };
    this.saveSettings();
    
    // Update list
    const list = document.getElementById('contactsList');
    if (list) {
      list.innerHTML = this.renderContacts();
    }
    
    // Update lifeline panel if active
    this.updateLifelinePanel();
    
    toast.success(`${name || contact.name} updated`);
  }

  /**
   * Remove emergency contact
   */
  removeContact(index) {
    const contact = this.emergencyContacts[index];
    this.emergencyContacts.splice(index, 1);
    this.saveSettings();
    
    const list = document.getElementById('contactsList');
    if (list) {
      list.innerHTML = this.renderContacts();
    }
    
    toast.info(`${contact.name} removed`);
  }

  // ========== Weather Integration ==========

  /**
   * Get weather for location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<object>} - Weather data
   */
  async getWeather(lat, lng) {
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    
    // Check cache
    const cached = this.weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.weatherCacheTimeout) {
      return cached.data;
    }
    
    try {
      // Using Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      
      if (!response.ok) throw new Error('Weather API error');
      
      const data = await response.json();
      const weather = this.parseWeatherData(data);
      
      // Cache result
      this.weatherCache.set(cacheKey, {
        data: weather,
        timestamp: Date.now()
      });
      
      return weather;
      
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      return null;
    }
  }

  /**
   * Parse Open-Meteo weather data
   */
  parseWeatherData(data) {
    const current = data.current;
    const weatherCodes = {
      0: { icon: '☀️', desc: 'Clear sky' },
      1: { icon: '🌤️', desc: 'Mainly clear' },
      2: { icon: '⛅', desc: 'Partly cloudy' },
      3: { icon: '☁️', desc: 'Overcast' },
      45: { icon: '🌫️', desc: 'Foggy' },
      48: { icon: '🌫️', desc: 'Depositing rime fog' },
      51: { icon: '🌧️', desc: 'Light drizzle' },
      53: { icon: '🌧️', desc: 'Moderate drizzle' },
      55: { icon: '🌧️', desc: 'Dense drizzle' },
      61: { icon: '🌧️', desc: 'Slight rain' },
      63: { icon: '🌧️', desc: 'Moderate rain' },
      65: { icon: '🌧️', desc: 'Heavy rain' },
      71: { icon: '🌨️', desc: 'Slight snow' },
      73: { icon: '🌨️', desc: 'Moderate snow' },
      75: { icon: '❄️', desc: 'Heavy snow' },
      77: { icon: '🌨️', desc: 'Snow grains' },
      80: { icon: '🌦️', desc: 'Slight showers' },
      81: { icon: '🌦️', desc: 'Moderate showers' },
      82: { icon: '⛈️', desc: 'Violent showers' },
      85: { icon: '🌨️', desc: 'Slight snow showers' },
      86: { icon: '🌨️', desc: 'Heavy snow showers' },
      95: { icon: '⛈️', desc: 'Thunderstorm' },
      96: { icon: '⛈️', desc: 'Thunderstorm with hail' },
      99: { icon: '⛈️', desc: 'Thunderstorm with heavy hail' }
    };
    
    const code = current.weather_code;
    const weather = weatherCodes[code] || { icon: '🌡️', desc: 'Unknown' };
    
    return {
      temp: Math.round(current.temperature_2m),
      tempUnit: '°C',
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      icon: weather.icon,
      description: weather.desc,
      code
    };
  }

  /**
   * Render weather widget HTML
   * @param {object} weather - Weather data
   * @param {string} locationName - Location name
   * @returns {string} - HTML string
   */
  renderWeatherWidget(weather, locationName = 'Current Location') {
    if (!weather) {
      return `
        <div class="weather-widget">
          <div class="weather-error">
            <p>⚠️ Weather unavailable</p>
            <button class="weather-refresh" onclick="safetyFeatures.refreshWeather()">Retry</button>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="weather-widget">
        <div class="weather-header">
          <span class="weather-location">📍 ${locationName}</span>
          <button class="weather-refresh" onclick="safetyFeatures.refreshWeather()">🔄</button>
        </div>
        <div class="weather-main">
          <span class="weather-icon">${weather.icon}</span>
          <div>
            <div class="weather-temp">${weather.temp}${weather.tempUnit}</div>
            <div class="weather-desc">${weather.description}</div>
          </div>
        </div>
        <div class="weather-details">
          <span class="weather-detail">💧 ${weather.humidity}%</span>
          <span class="weather-detail">💨 ${weather.windSpeed} km/h</span>
        </div>
      </div>
    `;
  }

  /**
   * Get and display weather for current location
   */
  async showCurrentWeather(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="weather-widget">
        <div class="weather-loading">Loading weather...</div>
      </div>
    `;
    
    if (!this.currentPosition) {
      container.innerHTML = this.renderWeatherWidget(null);
      return;
    }
    
    const weather = await this.getWeather(
      this.currentPosition.lat,
      this.currentPosition.lng
    );
    
    container.innerHTML = this.renderWeatherWidget(weather);
  }

  /**
   * Refresh weather display
   */
  async refreshWeather() {
    // Clear cache for current location
    if (this.currentPosition) {
      const cacheKey = `${this.currentPosition.lat.toFixed(2)},${this.currentPosition.lng.toFixed(2)}`;
      this.weatherCache.delete(cacheKey);
    }
    
    // Re-fetch (will need to know the container)
    toast.info('Refreshing weather...');
  }
}

// Create singleton instance
export const safetyFeatures = new SafetyFeatures();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => safetyFeatures.initialize());
} else {
  safetyFeatures.initialize();
}

// Make available globally for onclick handlers
window.safetyFeatures = safetyFeatures;

export default safetyFeatures;