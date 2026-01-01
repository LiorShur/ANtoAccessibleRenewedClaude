/**
 * Trail Conditions Reporting
 * Access Nature - Real-time Trail Status Updates
 * 
 * Allows users to report current trail conditions:
 * - Weather impact (muddy, flooded, icy)
 * - Obstacles (fallen tree, construction)
 * - Safety concerns (wildlife, damage)
 * - Positive updates (freshly cleared, new signage)
 */

import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';
import { haptic } from '../ui/displayPreferences.js';

class TrailConditions {
  constructor() {
    this.conditionTypes = {
      weather: {
        icon: '🌧️',
        label: 'Weather Impact',
        options: [
          { value: 'muddy', label: '🟤 Muddy/Wet', severity: 2 },
          { value: 'flooded', label: '🌊 Flooded', severity: 4 },
          { value: 'icy', label: '🧊 Icy/Slippery', severity: 4 },
          { value: 'snow', label: '❄️ Snow Covered', severity: 3 },
          { value: 'dry', label: '☀️ Dry & Clear', severity: 0 }
        ]
      },
      obstacle: {
        icon: '🚧',
        label: 'Obstacles',
        options: [
          { value: 'fallen_tree', label: '🌲 Fallen Tree', severity: 3 },
          { value: 'construction', label: '🚧 Construction', severity: 3 },
          { value: 'overgrown', label: '🌿 Overgrown', severity: 2 },
          { value: 'blocked', label: '⛔ Path Blocked', severity: 5 },
          { value: 'debris', label: '🪨 Debris on Trail', severity: 2 }
        ]
      },
      safety: {
        icon: '⚠️',
        label: 'Safety Concerns',
        options: [
          { value: 'wildlife', label: '🐻 Wildlife Activity', severity: 3 },
          { value: 'damage', label: '💥 Trail Damage', severity: 3 },
          { value: 'erosion', label: '🕳️ Erosion/Holes', severity: 3 },
          { value: 'poor_visibility', label: '🌫️ Poor Visibility', severity: 2 },
          { value: 'unsafe', label: '🚫 Unsafe Conditions', severity: 5 }
        ]
      },
      positive: {
        icon: '✅',
        label: 'Positive Updates',
        options: [
          { value: 'cleared', label: '✨ Freshly Cleared', severity: 0 },
          { value: 'new_signage', label: '🪧 New Signage', severity: 0 },
          { value: 'repaired', label: '🔧 Recently Repaired', severity: 0 },
          { value: 'accessible', label: '♿ Accessibility Improved', severity: 0 },
          { value: 'excellent', label: '⭐ Excellent Conditions', severity: 0 }
        ]
      }
    };
    
    this.expiryDays = 7; // Conditions expire after 7 days
  }

  /**
   * Initialize trail conditions module
   */
  initialize() {
    this.injectStyles();
    console.log('✅ Trail conditions module initialized');
  }

  /**
   * Inject styles for conditions UI
   */
  injectStyles() {
    if (document.getElementById('trail-conditions-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'trail-conditions-styles';
    styles.textContent = `
      /* Trail Conditions Modal */
      .conditions-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        z-index: 15000;
        display: none;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }
      
      .conditions-overlay.open {
        display: flex;
      }
      
      .conditions-modal {
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
      }
      
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .conditions-header {
        background: linear-gradient(135deg, #2c5530, #4a7c59);
        color: white;
        padding: 20px;
        text-align: center;
      }
      
      .conditions-header h2 {
        margin: 0;
        font-size: 1.3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      
      .conditions-header p {
        margin: 8px 0 0;
        opacity: 0.9;
        font-size: 0.9rem;
      }
      
      .conditions-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .condition-category {
        margin-bottom: 20px;
      }
      
      .category-title {
        font-weight: 600;
        color: #374151;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95rem;
      }
      
      .condition-options {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .condition-chip {
        padding: 10px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 25px;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .condition-chip:hover {
        border-color: #4a7c59;
        background: #f0fdf4;
      }
      
      .condition-chip.selected {
        border-color: #2c5530;
        background: #2c5530;
        color: white;
      }
      
      .condition-chip.severity-high {
        border-color: #dc2626;
      }
      
      .condition-chip.severity-high.selected {
        background: #dc2626;
        border-color: #dc2626;
      }
      
      .conditions-notes {
        margin-top: 16px;
      }
      
      .conditions-notes label {
        display: block;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
        font-size: 0.95rem;
      }
      
      .conditions-notes textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        font-size: 1rem;
        resize: vertical;
        min-height: 80px;
        font-family: inherit;
      }
      
      .conditions-notes textarea:focus {
        outline: none;
        border-color: #4a7c59;
      }
      
      .conditions-footer {
        padding: 16px 20px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
      }
      
      .conditions-footer button {
        flex: 1;
        padding: 14px 20px;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      
      .btn-cancel {
        background: #f3f4f6;
        color: #374151;
      }
      
      .btn-cancel:hover {
        background: #e5e7eb;
      }
      
      .btn-submit {
        background: #2c5530;
        color: white;
      }
      
      .btn-submit:hover {
        background: #1e3a21;
      }
      
      .btn-submit:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }
      
      /* Condition Badge (for display on trail cards) */
      .condition-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      
      .condition-badge.severity-0 {
        background: #dcfce7;
        color: #166534;
      }
      
      .condition-badge.severity-1,
      .condition-badge.severity-2 {
        background: #fef9c3;
        color: #854d0e;
      }
      
      .condition-badge.severity-3 {
        background: #fed7aa;
        color: #9a3412;
      }
      
      .condition-badge.severity-4,
      .condition-badge.severity-5 {
        background: #fee2e2;
        color: #991b1b;
      }
      
      /* Conditions Summary */
      .conditions-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      
      .condition-time {
        font-size: 0.7rem;
        color: #6b7280;
        margin-left: 4px;
      }
      
      /* Mobile Responsive */
      @media (max-width: 600px) {
        .conditions-modal {
          max-height: 90vh;
          border-radius: 20px 20px 0 0;
          margin-top: auto;
        }
        
        .condition-chip {
          padding: 8px 12px;
          font-size: 0.85rem;
        }
        
        .conditions-footer {
          flex-direction: column;
        }
      }
      
      /* High Contrast */
      .high-contrast .conditions-modal {
        border: 3px solid #000;
      }
      
      .high-contrast .condition-chip {
        border-width: 3px;
      }
      
      .high-contrast .condition-chip.selected {
        background: #000;
        border-color: #000;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Open conditions report modal
   * @param {string} trailId - Trail guide ID
   * @param {string} trailName - Trail name for display
   * @returns {Promise<object|null>} - Condition report data or null if cancelled
   */
  async openReportModal(trailId, trailName = 'this trail') {
    return new Promise((resolve) => {
      // Create modal HTML
      const overlay = document.createElement('div');
      overlay.className = 'conditions-overlay open';
      overlay.id = 'conditionsOverlay';
      
      overlay.innerHTML = `
        <div class="conditions-modal">
          <div class="conditions-header">
            <h2>📋 Report Trail Conditions</h2>
            <p>Help others by reporting current conditions on ${trailName}</p>
          </div>
          
          <div class="conditions-body">
            ${this.renderCategories()}
            
            <div class="conditions-notes">
              <label for="conditionNotes">Additional Notes (optional)</label>
              <textarea id="conditionNotes" placeholder="Any details that might help other hikers..."></textarea>
            </div>
          </div>
          
          <div class="conditions-footer">
            <button class="btn-cancel" id="conditionsCancel">Cancel</button>
            <button class="btn-submit" id="conditionsSubmit" disabled>Submit Report</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // Track selections
      const selectedConditions = new Set();
      
      // Setup chip click handlers
      overlay.querySelectorAll('.condition-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const value = chip.dataset.value;
          const severity = parseInt(chip.dataset.severity);
          
          chip.classList.toggle('selected');
          
          if (chip.classList.contains('selected')) {
            selectedConditions.add({ value, severity, label: chip.textContent.trim() });
            haptic('selection');
          } else {
            selectedConditions.forEach(c => {
              if (c.value === value) selectedConditions.delete(c);
            });
          }
          
          // Enable/disable submit button
          const submitBtn = document.getElementById('conditionsSubmit');
          submitBtn.disabled = selectedConditions.size === 0;
        });
      });
      
      // Cancel button
      document.getElementById('conditionsCancel').addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
      
      // Close on backdrop click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
      
      // Submit button
      document.getElementById('conditionsSubmit').addEventListener('click', async () => {
        const notes = document.getElementById('conditionNotes').value.trim();
        
        // Calculate max severity
        let maxSeverity = 0;
        selectedConditions.forEach(c => {
          if (c.severity > maxSeverity) maxSeverity = c.severity;
        });
        
        const report = {
          trailId,
          conditions: Array.from(selectedConditions),
          notes,
          maxSeverity,
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + this.expiryDays * 24 * 60 * 60 * 1000).toISOString()
        };
        
        overlay.remove();
        haptic('success');
        resolve(report);
      });
    });
  }

  /**
   * Render condition categories HTML
   */
  renderCategories() {
    let html = '';
    
    for (const [key, category] of Object.entries(this.conditionTypes)) {
      html += `
        <div class="condition-category">
          <div class="category-title">
            <span>${category.icon}</span>
            <span>${category.label}</span>
          </div>
          <div class="condition-options">
            ${category.options.map(opt => `
              <div class="condition-chip ${opt.severity >= 4 ? 'severity-high' : ''}" 
                   data-value="${opt.value}" 
                   data-severity="${opt.severity}"
                   data-category="${key}">
                ${opt.label}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  /**
   * Save condition report to Firebase
   * @param {object} report - Condition report data
   * @param {object} user - Current user
   */
  async saveReport(report, user) {
    try {
      const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      const { db } = await import('../../firebase-setup.js');
      
      console.log('📝 Saving condition report...', report);
      
      const docData = {
        ...report,
        userId: user?.uid || 'anonymous',
        userDisplayName: user?.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        verified: false,
        verificationCount: 0
      };
      
      const docRef = await addDoc(collection(db, 'trail_conditions'), docData);
      
      console.log('✅ Condition report saved with ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('Failed to save condition report:', error);
      throw error;
    }
  }

  /**
   * Get conditions for a trail
   * @param {string} trailId - Trail guide ID
   * @returns {Promise<array>} - Array of condition reports
   */
  async getTrailConditions(trailId) {
    try {
      const { collection, query, where, getDocs, orderBy, Timestamp } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      const { db } = await import('../../firebase-setup.js');
      
      const now = new Date();
      
      const q = query(
        collection(db, 'trail_conditions'),
        where('trailId', '==', trailId),
        where('expiresAt', '>', now.toISOString()),
        orderBy('expiresAt'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const conditions = [];
      
      snapshot.forEach(doc => {
        conditions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return conditions;
      
    } catch (error) {
      console.error('Failed to get trail conditions:', error);
      return [];
    }
  }

  /**
   * Render condition badges for display
   * @param {array} conditions - Array of condition objects
   * @returns {string} - HTML string
   */
  renderConditionBadges(conditions) {
    if (!conditions || conditions.length === 0) return '';
    
    // Get unique conditions, prioritize by severity
    const uniqueConditions = [];
    const seenValues = new Set();
    
    conditions.forEach(report => {
      report.conditions?.forEach(c => {
        if (!seenValues.has(c.value)) {
          seenValues.add(c.value);
          uniqueConditions.push(c);
        }
      });
    });
    
    // Sort by severity (highest first), limit to 3
    uniqueConditions.sort((a, b) => b.severity - a.severity);
    const displayConditions = uniqueConditions.slice(0, 3);
    
    return `
      <div class="conditions-summary">
        ${displayConditions.map(c => `
          <span class="condition-badge severity-${c.severity}">
            ${c.label}
          </span>
        `).join('')}
        ${uniqueConditions.length > 3 ? `<span class="condition-badge severity-0">+${uniqueConditions.length - 3} more</span>` : ''}
      </div>
    `;
  }

  /**
   * Get severity color
   * @param {number} severity - 0-5
   * @returns {string} - Color code
   */
  getSeverityColor(severity) {
    const colors = {
      0: '#22c55e', // Green
      1: '#eab308', // Yellow
      2: '#eab308', // Yellow
      3: '#f97316', // Orange
      4: '#ef4444', // Red
      5: '#dc2626'  // Dark red
    };
    return colors[severity] || colors[0];
  }

  /**
   * Get time ago string
   * @param {string} timestamp - ISO timestamp
   * @returns {string}
   */
  getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  /**
   * Quick report for current location (no trailId needed)
   * Uses current GPS position as the "trail"
   */
  async quickReportCondition() {
    // Get current position
    let position = null;
    try {
      position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
    } catch (e) {
      toast.error('Unable to get your location. Please enable GPS.');
      return;
    }
    
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const locationId = `loc_${lat.toFixed(5)}_${lng.toFixed(5)}`;
    
    // Open modal and get report data
    const report = await this.openReportModal(locationId, 'Current Location');
    
    if (!report) {
      // User cancelled
      return;
    }
    
    // Add location to report
    report.location = { lat, lng };
    report.trailName = 'Current Location';
    
    // Get current user
    let user = null;
    try {
      const { auth } = await import('../../firebase-setup.js');
      user = auth.currentUser;
    } catch (e) {
      console.warn('Could not get current user:', e);
    }
    
    // Save to Firebase
    try {
      await this.saveReport(report, user);
      // Show success with slight delay to ensure visibility
      setTimeout(() => {
        toast.success('✅ Condition report submitted! Thank you for helping others.');
      }, 100);
    } catch (error) {
      console.error('Failed to save report:', error);
      toast.error('Failed to submit report: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Show conditions in nearby area
   */
  async showNearbyConditions() {
    // Get current position
    let position = null;
    try {
      position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
    } catch (e) {
      toast.error('Unable to get your location. Please enable GPS.');
      return;
    }

    toast.info('Searching for nearby trail conditions...');

    try {
      const { db } = await import('../../firebase-setup.js');
      const { collection, getDocs, query, where, orderBy } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );

      const now = new Date().toISOString();
      
      // Try simple query first (no index required)
      let snapshot;
      try {
        const q = query(
          collection(db, 'trail_conditions'),
          where('expiresAt', '>', now)
        );
        snapshot = await getDocs(q);
      } catch (queryError) {
        console.warn('Query with filter failed, trying to get all docs:', queryError);
        // Fallback: get all documents and filter client-side
        const allDocsSnapshot = await getDocs(collection(db, 'trail_conditions'));
        const validDocs = [];
        allDocsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.expiresAt && data.expiresAt > now) {
            validDocs.push({ id: doc.id, data: () => data });
          }
        });
        snapshot = { empty: validDocs.length === 0, forEach: (cb) => validDocs.forEach(d => cb(d)) };
      }
      
      if (snapshot.empty) {
        toast.info('No recent trail conditions reported yet. Be the first to report!');
        return;
      }

      const conditions = [];
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      snapshot.forEach(doc => {
        const data = typeof doc.data === 'function' ? doc.data() : doc.data;
        // Check if condition has location and is within ~5km
        if (data.location && data.location.lat && data.location.lng) {
          const dist = this.calculateDistance(
            userLat, userLng,
            data.location.lat, data.location.lng
          );
          if (dist <= 5) { // Within 5km
            conditions.push({ ...data, id: doc.id, distance: dist });
          }
        }
      });

      if (conditions.length === 0) {
        toast.info('No conditions reported within 5km of your location.');
        return;
      }

      // Sort by distance (closest first)
      conditions.sort((a, b) => a.distance - b.distance);

      // Display in modal
      this.showConditionsListModal(conditions);

    } catch (error) {
      console.error('Error fetching nearby conditions:', error);
      // More specific error message
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please sign in to view conditions.');
      } else if (error.code === 'unavailable') {
        toast.error('Service unavailable. Check your internet connection.');
      } else {
        toast.error('Unable to fetch conditions: ' + (error.message || 'Unknown error'));
      }
    }
  }

  /**
   * Calculate distance between two points (km)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Show list of conditions in modal
   */
  showConditionsListModal(conditions) {
    const overlay = document.createElement('div');
    overlay.className = 'conditions-overlay open';
    overlay.id = 'nearbyConditionsOverlay';

    const conditionCards = conditions.map((c, index) => {
      const timeAgo = this.getTimeAgo(c.timestamp);
      const severityColor = this.getSeverityColor(c.maxSeverity || 2);
      const conditionList = c.conditions?.map(cond => cond.label).join(', ') || 'Unknown';
      
      return `
        <div class="condition-card" data-condition-id="${c.id}" data-lat="${c.location?.lat}" data-lng="${c.location?.lng}" 
             style="border-left: 4px solid ${severityColor}; padding: 12px; margin-bottom: 12px; background: #f9fafb; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${c.trailName || 'Trail'}</strong>
            <span style="font-size: 0.8em; color: #6b7280;">${c.distance.toFixed(1)} km away</span>
          </div>
          <div style="margin-top: 4px; color: #374151; font-size: 0.9em;">${conditionList}</div>
          <div style="margin-top: 4px; font-size: 0.75em; color: #9ca3af;">Reported ${timeAgo}</div>
          ${c.notes ? `<div style="margin-top: 4px; font-style: italic; color: #6b7280; font-size: 0.85em;">"${c.notes}"</div>` : ''}
          
          <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
            <button class="condition-action-btn view-on-map" data-index="${index}" 
                    style="padding: 6px 12px; font-size: 0.8em; border: 1px solid #3b82f6; background: white; color: #3b82f6; border-radius: 6px; cursor: pointer;">
              🗺️ View on Map
            </button>
            <button class="condition-action-btn report-fixed" data-index="${index}"
                    style="padding: 6px 12px; font-size: 0.8em; border: 1px solid #22c55e; background: white; color: #22c55e; border-radius: 6px; cursor: pointer;">
              ✅ Fixed
            </button>
            <button class="condition-action-btn report-not-there" data-index="${index}"
                    style="padding: 6px 12px; font-size: 0.8em; border: 1px solid #f59e0b; background: white; color: #f59e0b; border-radius: 6px; cursor: pointer;">
              ❌ Not There
            </button>
          </div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="conditions-modal" style="max-height: 80vh; overflow-y: auto;">
        <div class="conditions-header">
          <h2>📍 Nearby Conditions</h2>
          <p>${conditions.length} report${conditions.length !== 1 ? 's' : ''} within 5km</p>
        </div>
        <div class="conditions-body" style="max-height: 50vh; overflow-y: auto;">
          ${conditionCards}
        </div>
        <div class="conditions-footer">
          <button class="btn-submit" id="closeNearbyConditions">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Store conditions for reference
    this._currentConditions = conditions;

    // View on Map handlers
    overlay.querySelectorAll('.view-on-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const condition = conditions[index];
        if (condition?.location) {
          this.viewConditionOnMap(condition);
          overlay.remove();
        }
      });
    });

    // Report Fixed handlers
    overlay.querySelectorAll('.report-fixed').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        const condition = conditions[index];
        await this.reportConditionStatus(condition, 'fixed');
        e.target.closest('.condition-card').style.opacity = '0.5';
        e.target.disabled = true;
        e.target.textContent = '✅ Reported';
      });
    });

    // Report Not There handlers
    overlay.querySelectorAll('.report-not-there').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        const condition = conditions[index];
        await this.reportConditionStatus(condition, 'not_found');
        e.target.closest('.condition-card').style.opacity = '0.5';
        e.target.disabled = true;
        e.target.textContent = '❌ Reported';
      });
    });

    document.getElementById('closeNearbyConditions').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /**
   * View a condition on the map
   * @param {object} condition - Condition with location
   */
  viewConditionOnMap(condition) {
    if (!condition?.location?.lat || !condition?.location?.lng) {
      toast.error('Location not available for this condition');
      return;
    }

    const { lat, lng } = condition.location;
    
    // Get the map controller
    const mapController = window.AccessNatureApp?.getController('map');
    
    if (mapController?.map) {
      // Pan to location
      mapController.map.setView([lat, lng], 16);
      
      // Add a temporary marker
      const conditionList = condition.conditions?.map(c => c.label).join(', ') || 'Unknown condition';
      const timeAgo = this.getTimeAgo(condition.timestamp);
      
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'condition-marker',
          html: `<div style="background: ${this.getSeverityColor(condition.maxSeverity || 2)}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">⚠️</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapController.map);
      
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <strong style="font-size: 1.1em;">${condition.trailName || 'Trail Condition'}</strong>
          <div style="margin-top: 6px; color: #374151;">${conditionList}</div>
          <div style="margin-top: 4px; font-size: 0.85em; color: #6b7280;">Reported ${timeAgo}</div>
          ${condition.notes ? `<div style="margin-top: 6px; font-style: italic; color: #6b7280;">"${condition.notes}"</div>` : ''}
          <div style="margin-top: 10px; display: flex; gap: 6px;">
            <button onclick="trailConditions.reportConditionStatus({id:'${condition.id}'}, 'fixed'); this.parentElement.innerHTML='<span style=color:#22c55e>✅ Marked as Fixed</span>'" 
                    style="padding: 4px 8px; font-size: 0.8em; border: 1px solid #22c55e; background: white; color: #22c55e; border-radius: 4px; cursor: pointer;">
              ✅ Fixed
            </button>
            <button onclick="trailConditions.reportConditionStatus({id:'${condition.id}'}, 'not_found'); this.parentElement.innerHTML='<span style=color:#f59e0b>❌ Reported</span>'" 
                    style="padding: 4px 8px; font-size: 0.8em; border: 1px solid #f59e0b; background: white; color: #f59e0b; border-radius: 4px; cursor: pointer;">
              ❌ Not There
            </button>
          </div>
        </div>
      `).openPopup();
      
      // Remove marker after 30 seconds
      setTimeout(() => {
        mapController.map.removeLayer(marker);
      }, 30000);
      
      toast.success('📍 Showing condition on map');
    } else {
      // No map available, open in external maps
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(mapsUrl, '_blank');
      toast.info('Opening in Google Maps...');
    }
  }

  /**
   * Report a condition as fixed or not found
   * @param {object} condition - The condition to update
   * @param {string} status - 'fixed' or 'not_found'
   */
  async reportConditionStatus(condition, status) {
    try {
      const { db } = await import('../../firebase-setup.js');
      const { doc, updateDoc, arrayUnion, increment, deleteDoc, getDoc } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
      );
      const { auth } = await import('../../firebase-setup.js');
      
      const user = auth.currentUser;
      const userId = user?.uid || 'anonymous';
      
      const conditionRef = doc(db, 'trail_conditions', condition.id);
      
      // Get current data
      const conditionDoc = await getDoc(conditionRef);
      if (!conditionDoc.exists()) {
        toast.error('Condition no longer exists');
        return;
      }
      
      const data = conditionDoc.data();
      const statusField = status === 'fixed' ? 'fixedReports' : 'notFoundReports';
      const currentReports = data[statusField] || [];
      
      // Check if user already reported
      if (currentReports.includes(userId)) {
        toast.info('You already reported this condition');
        return;
      }
      
      // Update the document
      await updateDoc(conditionRef, {
        [statusField]: arrayUnion(userId),
        [`${statusField}Count`]: increment(1),
        lastStatusUpdate: new Date().toISOString()
      });
      
      // If enough people report it fixed/not found, auto-expire it
      const newCount = (data[`${statusField}Count`] || 0) + 1;
      if (newCount >= 3) {
        // Auto-expire by setting expiresAt to now
        await updateDoc(conditionRef, {
          expiresAt: new Date().toISOString(),
          autoExpiredReason: status === 'fixed' ? 'Reported fixed by community' : 'Reported not found by community'
        });
        toast.success(`Condition marked as ${status === 'fixed' ? 'resolved' : 'not found'} by community!`);
      } else {
        toast.success(`Thank you! ${3 - newCount} more report${3 - newCount !== 1 ? 's' : ''} needed to remove.`);
      }
      
    } catch (error) {
      console.error('Failed to update condition status:', error);
      toast.error('Failed to update. Please try again.');
    }
  }
}

// Create singleton instance
export const trailConditions = new TrailConditions();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => trailConditions.initialize());
} else {
  trailConditions.initialize();
}

// Make available globally
window.trailConditions = trailConditions;

export default trailConditions;