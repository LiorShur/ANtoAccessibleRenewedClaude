/**
 * Loading States Utility
 * Provides skeleton loaders, button states, and operation feedback
 * 
 * Access Nature - Phase 1: Pre-Beta Polish
 * Created: December 2025
 */

/**
 * Loading States Manager
 * Handles various loading indicators throughout the app
 */
class LoadingStates {
  constructor() {
    this.activeLoaders = new Map();
    this.injectStyles();
  }

  /**
   * Inject CSS styles for loading components
   */
  injectStyles() {
    if (document.getElementById('loading-states-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'loading-states-styles';
    styles.textContent = `
      /* Skeleton loader base */
      .skeleton {
        background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.5s infinite;
        border-radius: 4px;
      }
      
      @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      /* Skeleton variants */
      .skeleton-text {
        height: 1em;
        margin: 0.5em 0;
      }
      
      .skeleton-text-sm {
        height: 0.75em;
        width: 60%;
      }
      
      .skeleton-title {
        height: 1.5em;
        width: 70%;
        margin-bottom: 0.75em;
      }
      
      .skeleton-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }
      
      .skeleton-image {
        width: 100%;
        height: 150px;
        border-radius: 8px;
      }
      
      .skeleton-card {
        padding: 16px;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .skeleton-button {
        height: 36px;
        width: 100px;
        border-radius: 6px;
      }
      
      /* Button loading state */
      .btn-loading {
        position: relative;
        color: transparent !important;
        pointer-events: none;
      }
      
      .btn-loading::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        top: 50%;
        left: 50%;
        margin-left: -9px;
        margin-top: -9px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: btn-spinner 0.8s linear infinite;
      }
      
      .btn-loading.btn-secondary::after,
      .btn-loading.btn-outline::after {
        border-color: rgba(0,0,0,0.2);
        border-top-color: #333;
      }
      
      @keyframes btn-spinner {
        to { transform: rotate(360deg); }
      }
      
      /* Full page loading overlay */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 1;
        transition: opacity 0.3s ease;
      }
      
      .loading-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #e0e0e0;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: loading-spin 1s linear infinite;
      }
      
      .loading-spinner-sm {
        width: 20px;
        height: 20px;
        border-width: 2px;
      }
      
      .loading-spinner-lg {
        width: 70px;
        height: 70px;
        border-width: 5px;
      }
      
      @keyframes loading-spin {
        to { transform: rotate(360deg); }
      }
      
      .loading-text {
        margin-top: 16px;
        color: #666;
        font-size: 14px;
        text-align: center;
      }
      
      /* Inline loading indicator */
      .inline-loader {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #666;
        font-size: 14px;
      }
      
      .inline-loader .loading-spinner {
        width: 16px;
        height: 16px;
        border-width: 2px;
      }
      
      /* Progress bar */
      .progress-bar-container {
        width: 100%;
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      
      .progress-bar.indeterminate {
        width: 30%;
        animation: progress-indeterminate 1.5s ease-in-out infinite;
      }
      
      @keyframes progress-indeterminate {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
      
      /* Pulse animation for elements */
      .pulse {
        animation: pulse-animation 2s ease-in-out infinite;
      }
      
      @keyframes pulse-animation {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* Fade in animation */
      .fade-in {
        animation: fade-in-animation 0.3s ease-out;
      }
      
      @keyframes fade-in-animation {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Content placeholder while loading */
      .content-loading {
        min-height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #666;
      }
      
      /* Trail card skeleton */
      .skeleton-trail-card {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .skeleton-trail-card .skeleton-image {
        height: 120px;
        margin-bottom: 12px;
      }
      
      .skeleton-trail-card .skeleton-title {
        margin-bottom: 8px;
      }
      
      .skeleton-trail-card .skeleton-text {
        margin-bottom: 4px;
      }
      
      /* Report card skeleton */
      .skeleton-report-card {
        background: #fff;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      
      .skeleton-report-card .skeleton-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        flex-shrink: 0;
      }
      
      .skeleton-report-card .skeleton-content {
        flex: 1;
      }
    `;
    
    document.head.appendChild(styles);
  }

  // ==================== BUTTON LOADING ====================
  
  /**
   * Set button to loading state
   * @param {HTMLElement|string} button - Button element or selector
   * @param {string} loadingText - Optional text to show (hidden but for screen readers)
   * @returns {Function} - Function to restore button
   */
  setButtonLoading(button, loadingText = 'Loading...') {
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (!btn) return () => {};
    
    const originalText = btn.textContent;
    const originalDisabled = btn.disabled;
    
    btn.classList.add('btn-loading');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.setAttribute('aria-label', loadingText);
    
    // Store original state
    const id = Date.now().toString();
    this.activeLoaders.set(id, { btn, originalText, originalDisabled });
    
    // Return restore function
    return () => {
      btn.classList.remove('btn-loading');
      btn.disabled = originalDisabled;
      btn.removeAttribute('aria-busy');
      btn.setAttribute('aria-label', originalText);
      this.activeLoaders.delete(id);
    };
  }

  /**
   * Wrap an async operation with button loading state
   * @param {HTMLElement|string} button - Button element or selector
   * @param {Function} asyncFn - Async function to execute
   * @param {object} options - Options
   */
  async withButtonLoading(button, asyncFn, options = {}) {
    const restore = this.setButtonLoading(button, options.loadingText);
    try {
      return await asyncFn();
    } finally {
      restore();
    }
  }

  // ==================== SKELETON LOADERS ====================
  
  /**
   * Create a skeleton element
   * @param {string} type - Type of skeleton (text, title, image, avatar, button)
   * @param {object} options - Options like width, height
   * @returns {HTMLElement}
   */
  createSkeleton(type = 'text', options = {}) {
    const el = document.createElement('div');
    el.className = `skeleton skeleton-${type}`;
    
    if (options.width) el.style.width = options.width;
    if (options.height) el.style.height = options.height;
    if (options.className) el.classList.add(options.className);
    
    return el;
  }

  /**
   * Create a trail card skeleton
   * @returns {HTMLElement}
   */
  createTrailCardSkeleton() {
    const card = document.createElement('div');
    card.className = 'skeleton-trail-card';
    card.innerHTML = `
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text-sm"></div>
    `;
    return card;
  }

  /**
   * Create a report card skeleton
   * @returns {HTMLElement}
   */
  createReportCardSkeleton() {
    const card = document.createElement('div');
    card.className = 'skeleton-report-card';
    card.innerHTML = `
      <div class="skeleton skeleton-icon"></div>
      <div class="skeleton-content">
        <div class="skeleton skeleton-title" style="width: 60%;"></div>
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
        <div class="skeleton skeleton-text-sm" style="width: 40%;"></div>
      </div>
    `;
    return card;
  }

  /**
   * Show skeleton loaders in a container
   * @param {HTMLElement|string} container - Container element or selector
   * @param {number} count - Number of skeletons
   * @param {string} type - Type of skeleton (trail-card, report-card, text)
   */
  showSkeletons(container, count = 3, type = 'trail-card') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    // Store original content
    const originalContent = el.innerHTML;
    el.setAttribute('data-original-content', originalContent);
    el.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
      let skeleton;
      switch (type) {
        case 'trail-card':
          skeleton = this.createTrailCardSkeleton();
          break;
        case 'report-card':
          skeleton = this.createReportCardSkeleton();
          break;
        default:
          skeleton = this.createSkeleton(type);
      }
      el.appendChild(skeleton);
    }
  }

  /**
   * Hide skeleton loaders and restore content
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} newContent - New content to show (optional)
   */
  hideSkeletons(container, newContent = null) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    if (newContent !== null) {
      el.innerHTML = newContent;
    } else {
      const original = el.getAttribute('data-original-content');
      if (original) {
        el.innerHTML = original;
        el.removeAttribute('data-original-content');
      }
    }
    
    // Add fade-in animation to children
    Array.from(el.children).forEach(child => {
      child.classList.add('fade-in');
    });
  }

  // ==================== SPINNERS ====================
  
  /**
   * Create a spinner element
   * @param {string} size - Size: sm, md, lg
   * @returns {HTMLElement}
   */
  createSpinner(size = 'md') {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    if (size === 'sm') spinner.classList.add('loading-spinner-sm');
    if (size === 'lg') spinner.classList.add('loading-spinner-lg');
    return spinner;
  }

  /**
   * Create an inline loader with text
   * @param {string} text - Loading text
   * @returns {HTMLElement}
   */
  createInlineLoader(text = 'Loading...') {
    const loader = document.createElement('div');
    loader.className = 'inline-loader';
    loader.innerHTML = `
      <div class="loading-spinner"></div>
      <span>${text}</span>
    `;
    return loader;
  }

  /**
   * Show loading state in a container
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} message - Loading message
   */
  showLoading(container, message = 'Loading...') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    
    const originalContent = el.innerHTML;
    el.setAttribute('data-original-content', originalContent);
    
    el.innerHTML = `
      <div class="content-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
      </div>
    `;
  }

  /**
   * Hide loading state
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} newContent - New content to show
   */
  hideLoading(container, newContent = null) {
    this.hideSkeletons(container, newContent);
  }

  // ==================== PROGRESS BAR ====================
  
  /**
   * Create a progress bar
   * @param {boolean} indeterminate - Whether progress is indeterminate
   * @returns {HTMLElement}
   */
  createProgressBar(indeterminate = false) {
    const container = document.createElement('div');
    container.className = 'progress-bar-container';
    
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    if (indeterminate) bar.classList.add('indeterminate');
    
    container.appendChild(bar);
    return container;
  }

  /**
   * Update progress bar
   * @param {HTMLElement} progressBar - Progress bar container element
   * @param {number} percent - Progress percentage (0-100)
   */
  updateProgress(progressBar, percent) {
    const bar = progressBar.querySelector('.progress-bar');
    if (bar) {
      bar.classList.remove('indeterminate');
      bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }

  // ==================== OVERLAY ====================
  
  /**
   * Show full-page loading overlay
   * @param {string} message - Loading message
   * @returns {HTMLElement} - Overlay element
   */
  showOverlay(message = 'Loading...') {
    // Remove existing overlay if any
    this.hideOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'app-loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner loading-spinner-lg"></div>
      <div class="loading-text">${message}</div>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Hide full-page loading overlay
   */
  hideOverlay() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  /**
   * Update overlay message
   * @param {string} message - New message
   */
  updateOverlayMessage(message) {
    const text = document.querySelector('#app-loading-overlay .loading-text');
    if (text) text.textContent = message;
  }

  // ==================== UTILITY ====================
  
  /**
   * Wrap an async operation with loading overlay
   * @param {Function} asyncFn - Async function to execute
   * @param {object} options - Options
   */
  async withOverlay(asyncFn, options = {}) {
    const overlay = this.showOverlay(options.message || 'Loading...');
    try {
      return await asyncFn();
    } finally {
      this.hideOverlay();
    }
  }

  /**
   * Wrap an async operation with container loading
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Function} asyncFn - Async function to execute
   * @param {object} options - Options
   */
  async withLoading(container, asyncFn, options = {}) {
    const { message = 'Loading...', skeletonType = null, skeletonCount = 3 } = options;
    
    if (skeletonType) {
      this.showSkeletons(container, skeletonCount, skeletonType);
    } else {
      this.showLoading(container, message);
    }
    
    try {
      const result = await asyncFn();
      return result;
    } finally {
      // Content should be set by the asyncFn or passed in options.onComplete
      if (options.onComplete) {
        this.hideLoading(container, options.onComplete());
      }
    }
  }
}

// Create and export singleton instance
const loadingStates = new LoadingStates();

export { LoadingStates, loadingStates };

console.log('⏳ Loading states utility loaded');