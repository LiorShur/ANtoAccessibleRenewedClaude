/**
 * Display Preferences Manager
 * Access Nature - UI Utilities
 * 
 * Handles:
 * - High Contrast Mode (outdoor readability)
 * - Haptic Feedback
 * - Pull-to-Refresh
 * - Reduced Motion preferences
 */

class DisplayPreferences {
  constructor() {
    this.storageKey = 'accessNature_displayPrefs';
    this.preferences = this.loadPreferences();
    this.pullToRefreshEnabled = false;
    this.pullStartY = 0;
    this.isPulling = false;
  }

  /**
   * Initialize display preferences
   */
  initialize() {
    // Apply saved preferences
    this.applyPreferences();
    
    // Listen for system preference changes
    this.watchSystemPreferences();
    
    // Add high contrast toggle button if not exists
    this.addHighContrastToggle();
    
    // Initialize pull-to-refresh on scrollable containers
    this.initPullToRefresh();
    
    console.log('✅ Display preferences initialized');
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load display preferences:', e);
    }
    
    return {
      highContrast: false,
      hapticFeedback: true,
      reducedMotion: false,
      fontSize: 'normal' // 'normal', 'large', 'extra-large'
    };
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch (e) {
      console.warn('Failed to save display preferences:', e);
    }
  }

  /**
   * Apply all saved preferences
   */
  applyPreferences() {
    // High contrast
    if (this.preferences.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (this.preferences.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
    
    // Font size
    document.documentElement.setAttribute('data-font-size', this.preferences.fontSize);
  }

  /**
   * Watch for system preference changes
   */
  watchSystemPreferences() {
    // Watch for prefers-contrast changes
    if (window.matchMedia) {
      const contrastQuery = window.matchMedia('(prefers-contrast: more)');
      contrastQuery.addEventListener('change', (e) => {
        if (e.matches && !this.preferences.highContrast) {
          this.setHighContrast(true);
        }
      });
      
      // Auto-enable if system prefers high contrast
      if (contrastQuery.matches) {
        this.setHighContrast(true);
      }
      
      // Watch for reduced motion preference
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addEventListener('change', (e) => {
        this.setReducedMotion(e.matches);
      });
      
      if (motionQuery.matches) {
        this.setReducedMotion(true);
      }
    }
  }

  // ========== High Contrast Mode ==========

  /**
   * Toggle high contrast mode
   */
  toggleHighContrast() {
    this.setHighContrast(!this.preferences.highContrast);
    this.haptic('light');
    return this.preferences.highContrast;
  }

  /**
   * Set high contrast mode
   * @param {boolean} enabled
   */
  setHighContrast(enabled) {
    this.preferences.highContrast = enabled;
    
    if (enabled) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    this.savePreferences();
    this.updateToggleButton();
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('displayPreferenceChanged', {
      detail: { preference: 'highContrast', value: enabled }
    }));
  }

  /**
   * Check if high contrast is enabled
   */
  isHighContrast() {
    return this.preferences.highContrast;
  }

  /**
   * Add high contrast toggle button to page
   */
  addHighContrastToggle() {
    // Don't add if already exists
    if (document.getElementById('highContrastToggle')) return;
    
    const toggle = document.createElement('button');
    toggle.id = 'highContrastToggle';
    toggle.className = 'high-contrast-toggle';
    toggle.setAttribute('aria-label', 'Toggle high contrast mode for outdoor visibility');
    toggle.setAttribute('title', 'Toggle high contrast mode');
    toggle.innerHTML = `
      <span class="toggle-icon">☀️</span>
      <span class="toggle-text">${this.preferences.highContrast ? 'Normal' : 'High Contrast'}</span>
    `;
    
    toggle.addEventListener('click', () => {
      this.toggleHighContrast();
    });
    
    document.body.appendChild(toggle);
  }

  /**
   * Update toggle button text
   */
  updateToggleButton() {
    const toggle = document.getElementById('highContrastToggle');
    if (toggle) {
      const text = toggle.querySelector('.toggle-text');
      if (text) {
        text.textContent = this.preferences.highContrast ? 'Normal' : 'High Contrast';
      }
    }
  }

  // ========== Haptic Feedback ==========

  /**
   * Trigger haptic feedback
   * @param {string} type - 'light', 'medium', 'heavy', 'success', 'warning', 'error'
   */
  haptic(type = 'light') {
    if (!this.preferences.hapticFeedback) return;
    
    // Check for Vibration API support
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 30, 20],
      error: [50, 30, 50, 30, 50],
      selection: [5],
      impact: [15]
    };
    
    const pattern = patterns[type] || patterns.light;
    
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Vibration may not be available or permitted
    }
  }

  /**
   * Enable/disable haptic feedback
   * @param {boolean} enabled
   */
  setHapticFeedback(enabled) {
    this.preferences.hapticFeedback = enabled;
    this.savePreferences();
  }

  /**
   * Check if haptic feedback is enabled
   */
  isHapticEnabled() {
    return this.preferences.hapticFeedback && 'vibrate' in navigator;
  }

  // ========== Pull-to-Refresh ==========

  /**
   * Initialize pull-to-refresh functionality
   */
  initPullToRefresh() {
    // Only on touch devices
    if (!('ontouchstart' in window)) return;
    
    const container = document.querySelector('.page-container, .hero-section, main, body');
    if (!container) return;
    
    // Create pull indicator
    this.createPullIndicator();
    
    container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
    container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
    
    this.pullToRefreshEnabled = true;
  }

  /**
   * Create pull-to-refresh indicator element
   */
  createPullIndicator() {
    if (document.getElementById('pullIndicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'pullIndicator';
    indicator.className = 'pull-indicator';
    indicator.innerHTML = `
      <div class="pull-spinner"></div>
      <span class="pull-text">Pull to refresh</span>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pull-indicator {
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%) translateY(-100%);
        background: var(--color-primary, #2c5530);
        color: white;
        padding: 12px 24px;
        border-radius: 0 0 20px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9998;
        transition: transform 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .pull-indicator.visible {
        transform: translateX(-50%) translateY(0);
      }
      
      .pull-indicator.refreshing .pull-spinner {
        animation: spin 0.8s linear infinite;
      }
      
      .pull-spinner {
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .high-contrast .pull-indicator {
        background: #000000;
        border: 3px solid #FFFFFF;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);
  }

  /**
   * Handle touch start for pull-to-refresh
   */
  handleTouchStart(e) {
    // Don't enable pull-to-refresh if:
    // 1. Any modal is open
    // 2. Tracking is active
    // 3. Not at top of page
    
    if (this.shouldBlockPullToRefresh()) {
      this.isPulling = false;
      return;
    }
    
    if (window.scrollY === 0) {
      this.pullStartY = e.touches[0].clientY;
      this.isPulling = true;
    }
  }
  
  /**
   * Check if pull-to-refresh should be blocked
   */
  shouldBlockPullToRefresh() {
    // Check for open modals
    const modalSelectors = [
      '.modal-overlay.visible',
      '.modal-overlay.active',
      '.modal-backdrop.show',
      '.modal-backdrop.active',
      '.survey-modal',
      '.accessibility-survey-modal',
      '[data-modal].visible',
      '[data-modal].active',
      '.overlay.visible',
      '#accessibilitySurveyModal.visible',
      '#accessibilitySurveyModal:not(.hidden)',
      '.modal:not(.hidden)',
      '[role="dialog"]:not(.hidden)',
      '.af2-overlay.open',
      '.af2f-overlay.open'
    ];
    
    for (const selector of modalSelectors) {
      try {
        const modal = document.querySelector(selector);
        if (modal && (modal.offsetParent !== null || getComputedStyle(modal).display !== 'none')) {
          console.log('🚫 Pull-to-refresh blocked: modal open');
          return true;
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    
    // Check if tracking is active or paused
    const trackingController = window.AccessNatureApp?.getController?.('tracking');
    const isTracking = trackingController?.isTrackingActive?.() ||
                       trackingController?.isTracking ||
                       document.body.classList.contains('tracking-active');
    
    const isPaused = trackingController?.isPaused;
    
    if (isTracking || isPaused) {
      console.log('🚫 Pull-to-refresh blocked: tracking active or paused');
      return true;
    }
    
    // Check for unsaved route data (tracking stopped but not saved)
    const stateController = window.AccessNatureApp?.getController?.('state');
    const routeData = stateController?.getRouteData?.() || [];
    
    if (routeData.length > 0) {
      console.log('🚫 Pull-to-refresh blocked: unsaved route data');
      return true;
    }
    
    // Check for any visible overlay or fullscreen element
    const overlays = document.querySelectorAll('.fullscreen-overlay, .photo-viewer, .guide-viewer');
    for (const overlay of overlays) {
      if (overlay.offsetParent !== null) {
        console.log('🚫 Pull-to-refresh blocked: overlay visible');
        return true;
      }
    }
    
    return false;
  }

  /**
   * Handle touch move for pull-to-refresh
   */
  handleTouchMove(e) {
    if (!this.isPulling) return;
    
    // Re-check blocking conditions during move (modal might have opened)
    if (this.shouldBlockPullToRefresh()) {
      this.isPulling = false;
      const indicator = document.getElementById('pullIndicator');
      indicator?.classList.remove('visible');
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const pullDistance = currentY - this.pullStartY;
    
    // Only trigger on downward pull at top of page
    if (pullDistance > 0 && window.scrollY === 0) {
      const indicator = document.getElementById('pullIndicator');
      const pullText = indicator?.querySelector('.pull-text');
      
      if (pullDistance > 60) {
        indicator?.classList.add('visible');
        if (pullText) pullText.textContent = 'Release to refresh';
        
        // Prevent default scroll
        e.preventDefault();
      } else if (pullDistance > 20) {
        indicator?.classList.add('visible');
        if (pullText) pullText.textContent = 'Pull to refresh';
      }
    }
  }

  /**
   * Handle touch end for pull-to-refresh
   */
  handleTouchEnd(e) {
    if (!this.isPulling) return;
    
    const indicator = document.getElementById('pullIndicator');
    const pullText = indicator?.querySelector('.pull-text');
    
    if (indicator?.classList.contains('visible') && pullText?.textContent === 'Release to refresh') {
      // Trigger refresh
      indicator.classList.add('refreshing');
      if (pullText) pullText.textContent = 'Refreshing...';
      
      this.haptic('medium');
      
      // Dispatch refresh event
      window.dispatchEvent(new CustomEvent('pullToRefresh'));
      
      // Fallback: reload page after timeout
      setTimeout(() => {
        indicator?.classList.remove('visible', 'refreshing');
        
        // Try to call page-specific refresh, otherwise reload
        if (typeof window.refreshPageData === 'function') {
          window.refreshPageData();
        } else {
          window.location.reload();
        }
      }, 1000);
    } else {
      indicator?.classList.remove('visible');
    }
    
    this.isPulling = false;
    this.pullStartY = 0;
  }

  // ========== Reduced Motion ==========

  /**
   * Set reduced motion preference
   * @param {boolean} enabled
   */
  setReducedMotion(enabled) {
    this.preferences.reducedMotion = enabled;
    
    if (enabled) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
    
    this.savePreferences();
  }

  /**
   * Check if reduced motion is preferred
   */
  isReducedMotion() {
    return this.preferences.reducedMotion;
  }

  // ========== Font Size ==========

  /**
   * Set font size preference
   * @param {string} size - 'normal', 'large', 'extra-large'
   */
  setFontSize(size) {
    const validSizes = ['normal', 'large', 'extra-large'];
    if (!validSizes.includes(size)) return;
    
    this.preferences.fontSize = size;
    document.documentElement.setAttribute('data-font-size', size);
    this.savePreferences();
  }

  /**
   * Get current font size preference
   */
  getFontSize() {
    return this.preferences.fontSize;
  }

  // ========== Utility Methods ==========

  /**
   * Get all preferences
   */
  getAllPreferences() {
    return { ...this.preferences };
  }

  /**
   * Reset all preferences to defaults
   */
  resetPreferences() {
    this.preferences = {
      highContrast: false,
      hapticFeedback: true,
      reducedMotion: false,
      fontSize: 'normal'
    };
    this.savePreferences();
    this.applyPreferences();
    this.updateToggleButton();
  }
}

// Create singleton instance
export const displayPreferences = new DisplayPreferences();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => displayPreferences.initialize());
} else {
  displayPreferences.initialize();
}

// Make available globally for inline handlers
window.displayPreferences = displayPreferences;

// Convenience function for haptic feedback
export function haptic(type = 'light') {
  displayPreferences.haptic(type);
}

// Export for module use
export default displayPreferences;