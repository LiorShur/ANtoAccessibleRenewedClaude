// ==============================================
// ACCESS NATURE - TOAST NOTIFICATION SYSTEM
// Non-blocking notifications replacing alert()
// 
// File: src/utils/toast.js
// Version: 2.0 - Standalone with inline styles
// ==============================================

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.toastCounter = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    // Inject styles if not already present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast-container {
          position: fixed;
          top: 80px;
          right: 16px;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
          max-width: 380px;
          width: calc(100% - 32px);
        }
        
        @media (max-width: 480px) {
          .toast-container {
            top: 70px;
            left: 16px;
            right: 16px;
            max-width: none;
          }
        }
        
        .toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border-left: 4px solid #6b7280;
          pointer-events: auto;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .toast.show {
          opacity: 1;
          transform: translateX(0);
        }
        
        .toast.hide {
          opacity: 0;
          transform: translateX(100%);
        }
        
        .toast-icon {
          flex-shrink: 0;
          font-size: 20px;
          line-height: 1;
        }
        
        .toast-content {
          flex: 1;
          min-width: 0;
        }
        
        .toast-title {
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
          font-size: 14px;
        }
        
        .toast-message {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }
        
        .toast-close {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: #9ca3af;
          font-size: 18px;
          padding: 0;
          transition: all 0.2s;
        }
        
        .toast-close:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        /* Toast types */
        .toast-success { border-left-color: #10b981; }
        .toast-success .toast-icon { color: #10b981; }
        
        .toast-error { border-left-color: #ef4444; }
        .toast-error .toast-icon { color: #ef4444; }
        
        .toast-warning { border-left-color: #f59e0b; }
        .toast-warning .toast-icon { color: #f59e0b; }
        
        .toast-info { border-left-color: #3b82f6; }
        .toast-info .toast-icon { color: #3b82f6; }
        
        /* Progress bar */
        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #e5e7eb;
          border-radius: 0 0 12px 12px;
          overflow: hidden;
        }
        
        .toast-progress-bar {
          height: 100%;
          background: currentColor;
          animation: toast-progress linear forwards;
        }
        
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        .toast:hover .toast-progress-bar {
          animation-play-state: paused;
        }
      `;
      document.head.appendChild(style);
    }

    // Create container
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
    
    this.initialized = true;
  }

  show(message, type = 'info', options = {}) {
    this.init();
    
    const config = {
      title: null,
      duration: 4000,
      closable: true,
      ...options
    };

    const toastId = `toast-${++this.toastCounter}`;
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.style.position = 'relative';

    let html = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${config.title ? `<div class="toast-title">${this.escapeHtml(config.title)}</div>` : ''}
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
    `;

    if (config.closable) {
      html += `<button class="toast-close" aria-label="Close">×</button>`;
    }

    if (config.duration > 0) {
      html += `
        <div class="toast-progress">
          <div class="toast-progress-bar" style="animation-duration: ${config.duration}ms; color: inherit;"></div>
        </div>
      `;
    }

    toast.innerHTML = html;
    this.container.appendChild(toast);
    this.toasts.set(toastId, toast);

    // Event listeners
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss(toastId));
    }

    // Show animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Haptic feedback based on toast type
    this.triggerHaptic(type);

    // Auto dismiss
    if (config.duration > 0) {
      setTimeout(() => this.dismiss(toastId), config.duration);
    }

    return toastId;
  }
  
  /**
   * Trigger haptic feedback for toast type
   * @param {string} type - Toast type
   */
  triggerHaptic(type) {
    if (typeof window.displayPreferences?.haptic === 'function') {
      const hapticMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'light'
      };
      window.displayPreferences.haptic(hapticMap[type] || 'light');
    } else if (navigator.vibrate) {
      // Fallback if displayPreferences not loaded
      const patterns = {
        success: [10, 50, 10],
        error: [50, 30, 50],
        warning: [20, 30, 20],
        info: [10]
      };
      try {
        navigator.vibrate(patterns[type] || patterns.info);
      } catch (e) {}
    }
  }

  dismiss(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    toast.classList.remove('show');
    toast.classList.add('hide');

    setTimeout(() => {
      toast.remove();
      this.toasts.delete(toastId);
    }, 300);
  }

  dismissAll() {
    this.toasts.forEach((_, id) => this.dismiss(id));
  }

  // Convenience methods
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { duration: 6000, ...options });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', { duration: 5000, ...options });
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton
const toastManager = new ToastManager();

// Export functions
export const toast = {
  show: (message, type, options) => toastManager.show(message, type, options),
  success: (message, options) => toastManager.success(message, options),
  error: (message, options) => toastManager.error(message, options),
  warning: (message, options) => toastManager.warning(message, options),
  info: (message, options) => toastManager.info(message, options),
  dismiss: (id) => toastManager.dismiss(id),
  dismissAll: () => toastManager.dismissAll()
};

// Make globally available
if (typeof window !== 'undefined') {
  window.toast = toast;
}

export default toast;