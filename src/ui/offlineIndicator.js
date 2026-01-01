/**
 * Offline Indicator Component
 * Shows users when they're offline and what features are affected
 * 
 * Access Nature - Phase 1: Pre-Beta Polish
 * Created: December 2025
 */

import { toast } from '../utils/toast.js';

class OfflineIndicator {
  constructor() {
    this.isOnline = navigator.onLine;
    this.indicator = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the offline indicator
   */
  initialize() {
    if (this.isInitialized) return;
    
    this.createIndicator();
    this.injectStyles();
    this.bindEvents();
    this.updateStatus();
    
    this.isInitialized = true;
    console.log('📡 Offline indicator initialized');
  }

  /**
   * Create the indicator DOM element
   */
  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'offline-indicator';
    this.indicator.className = 'offline-indicator';
    this.indicator.setAttribute('role', 'status');
    this.indicator.setAttribute('aria-live', 'polite');
    this.indicator.setAttribute('aria-hidden', 'true');
    
    this.indicator.innerHTML = `
      <div class="offline-indicator-content">
        <span class="offline-icon" aria-hidden="true">📡</span>
        <div class="offline-text">
          <span class="offline-title">You're offline</span>
          <span class="offline-details">GPS tracking works, cloud features limited</span>
        </div>
        <button class="offline-dismiss" aria-label="Dismiss" title="Dismiss">×</button>
      </div>
    `;
    
    // Add dismiss button handler
    const dismissBtn = this.indicator.querySelector('.offline-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismiss());
    }
    
    document.body.appendChild(this.indicator);
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('offline-indicator-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'offline-indicator-styles';
    styles.textContent = `
      .offline-indicator {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
        color: #000;
        padding: 0;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        opacity: 0;
        visibility: hidden;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: calc(100vw - 32px);
        width: auto;
        min-width: 280px;
      }
      
      .offline-indicator.visible {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
      }
      
      .offline-indicator.dismissed {
        transform: translateX(-50%) translateY(100px);
        opacity: 0;
      }
      
      .offline-indicator-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
      }
      
      .offline-icon {
        font-size: 24px;
        flex-shrink: 0;
        animation: pulse-icon 2s ease-in-out infinite;
      }
      
      @keyframes pulse-icon {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
      
      .offline-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }
      
      .offline-title {
        font-weight: 600;
        font-size: 14px;
      }
      
      .offline-details {
        font-size: 12px;
        opacity: 0.85;
      }
      
      .offline-dismiss {
        background: rgba(0, 0, 0, 0.15);
        border: none;
        color: #000;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s;
      }
      
      .offline-dismiss:hover {
        background: rgba(0, 0, 0, 0.25);
      }
      
      .offline-dismiss:focus {
        outline: 2px solid #000;
        outline-offset: 2px;
      }
      
      /* Online indicator (brief flash) */
      .offline-indicator.online {
        background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
      }
      
      .offline-indicator.online .offline-title {
        color: #fff;
      }
      
      .offline-indicator.online .offline-details {
        color: rgba(255, 255, 255, 0.9);
      }
      
      .offline-indicator.online .offline-dismiss {
        color: #fff;
        background: rgba(255, 255, 255, 0.2);
      }
      
      /* Mobile adjustments */
      @media (max-width: 480px) {
        .offline-indicator {
          bottom: 70px;
          min-width: auto;
          width: calc(100vw - 24px);
          left: 12px;
          right: 12px;
          transform: translateX(0) translateY(100px);
        }
        
        .offline-indicator.visible {
          transform: translateX(0) translateY(0);
        }
        
        .offline-indicator.dismissed {
          transform: translateX(0) translateY(100px);
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Bind online/offline events
   */
  bindEvents() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Handle coming back online
   */
  handleOnline() {
    this.isOnline = true;
    console.log('📡 Back online');
    
    // Show brief "back online" message
    this.showOnlineMessage();
    
    toast.success('Back online! Cloud features restored.', { duration: 3000 });
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    this.isOnline = false;
    this.dismissed = false;
    console.log('📡 Gone offline');
    
    this.updateStatus();
    
    toast.warning('You\'re offline. Changes will sync when reconnected.', { duration: 5000 });
  }

  /**
   * Show brief online confirmation
   */
  showOnlineMessage() {
    const title = this.indicator.querySelector('.offline-title');
    const details = this.indicator.querySelector('.offline-details');
    const icon = this.indicator.querySelector('.offline-icon');
    const dismissBtn = this.indicator.querySelector('.offline-dismiss');
    
    // Update content for online message
    if (title) title.textContent = 'Back online!';
    if (details) details.textContent = 'All features are now available';
    if (icon) icon.textContent = '✅';
    
    this.indicator.classList.add('online', 'visible');
    this.indicator.setAttribute('aria-hidden', 'false');
    
    // Hide after 3 seconds
    setTimeout(() => {
      // Remove focus before hiding to avoid ARIA warning
      if (dismissBtn && document.activeElement === dismissBtn) {
        dismissBtn.blur();
      }
      this.indicator.classList.remove('visible', 'online');
      this.indicator.setAttribute('aria-hidden', 'true');
      
      // Reset content
      setTimeout(() => {
        if (title) title.textContent = 'You\'re offline';
        if (details) details.textContent = 'GPS tracking works, cloud features limited';
        if (icon) icon.textContent = '📡';
      }, 400);
    }, 3000);
  }

  /**
   * Update indicator visibility based on online status
   */
  updateStatus() {
    if (!this.indicator) return;
    
    if (this.isOnline || this.dismissed) {
      // Remove focus from dismiss button before hiding
      const dismissBtn = this.indicator.querySelector('.offline-dismiss');
      if (dismissBtn && document.activeElement === dismissBtn) {
        dismissBtn.blur();
      }
      this.indicator.classList.remove('visible');
      this.indicator.setAttribute('aria-hidden', 'true');
    } else {
      this.indicator.classList.add('visible');
      this.indicator.classList.remove('online');
      this.indicator.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Dismiss the indicator (user can manually dismiss)
   */
  dismiss() {
    this.dismissed = true;
    
    // Remove focus before hiding to avoid ARIA warning
    const dismissBtn = this.indicator.querySelector('.offline-dismiss');
    if (dismissBtn && document.activeElement === dismissBtn) {
      dismissBtn.blur();
    }
    
    this.indicator.classList.add('dismissed');
    
    setTimeout(() => {
      this.indicator.classList.remove('visible', 'dismissed');
      this.indicator.setAttribute('aria-hidden', 'true');
    }, 400);
  }

  /**
   * Check if currently online
   * @returns {boolean}
   */
  getOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Force show the indicator (for testing)
   */
  show() {
    this.dismissed = false;
    this.indicator.classList.add('visible');
    this.indicator.classList.remove('online');
    this.indicator.setAttribute('aria-hidden', 'false');
  }

  /**
   * Force hide the indicator
   */
  hide() {
    // Remove focus before hiding to avoid ARIA warning
    const dismissBtn = this.indicator.querySelector('.offline-dismiss');
    if (dismissBtn && document.activeElement === dismissBtn) {
      dismissBtn.blur();
    }
    this.indicator.classList.remove('visible');
    this.indicator.setAttribute('aria-hidden', 'true');
  }
}

// Export singleton instance
export const offlineIndicator = new OfflineIndicator();

console.log('📡 Offline indicator module loaded');