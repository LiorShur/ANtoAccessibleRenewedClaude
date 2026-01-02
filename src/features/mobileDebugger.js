/**
 * Mobile Debugger - On-Screen Console for Mobile Devices
 * Access Nature App
 * 
 * Features:
 * - Floating draggable console panel
 * - Captures console.log, console.error, console.warn, console.info
 * - Filterable by log type
 * - Export logs to file
 * - Minimize/maximize toggle
 * - Auto-scroll with pause option
 * 
 * Usage:
 *   import { mobileDebugger } from './mobileDebugger.js';
 *   mobileDebugger.show();  // Show the debug panel
 *   mobileDebugger.hide();  // Hide it
 *   mobileDebugger.log('Custom message');  // Add custom log
 */

class MobileDebugger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500;
    this.isVisible = false;
    this.isMinimized = false;
    this.autoScroll = true;
    this.filter = 'all'; // all, log, error, warn, info
    this.panel = null;
    this.originalConsole = {};
    this.initialized = false;
  }

  /**
   * Initialize the debugger - intercepts console methods
   */
  initialize() {
    if (this.initialized) return;
    
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };

    // Intercept console methods
    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.addLog('log', args);
    };

    console.error = (...args) => {
      this.originalConsole.error(...args);
      this.addLog('error', args);
    };

    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      this.addLog('warn', args);
    };

    console.info = (...args) => {
      this.originalConsole.info(...args);
      this.addLog('info', args);
    };

    console.debug = (...args) => {
      this.originalConsole.debug(...args);
      this.addLog('debug', args);
    };

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.addLog('error', [`Uncaught: ${event.message}`, `at ${event.filename}:${event.lineno}`]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', [`Unhandled Promise: ${event.reason}`]);
    });

    this.initialized = true;
    this.originalConsole.log('📱 Mobile Debugger initialized');
  }

  /**
   * Add a log entry
   */
  addLog(type, args) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const message = args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    this.logs.push({ type, message, timestamp, id: Date.now() });
    
    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Update UI if visible
    if (this.isVisible && this.panel) {
      this.renderLogs();
    }
  }

  /**
   * Custom log method for direct logging
   */
  log(message, type = 'info') {
    this.addLog(type, [message]);
  }

  /**
   * Create and inject the debug panel
   */
  createPanel() {
    if (this.panel) return;

    const panel = document.createElement('div');
    panel.id = 'mobile-debugger';
    panel.innerHTML = `
      <style>
        #mobile-debugger {
          position: fixed;
          bottom: 60px;
          left: 10px;
          right: 10px;
          max-height: 50vh;
          background: rgba(0, 0, 0, 0.95);
          border-radius: 12px;
          z-index: 99999;
          font-family: 'SF Mono', Monaco, 'Courier New', monospace;
          font-size: 11px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          touch-action: none;
        }
        
        #mobile-debugger.minimized {
          max-height: 44px;
        }
        
        #mobile-debugger.minimized .debug-body,
        #mobile-debugger.minimized .debug-filters {
          display: none;
        }
        
        .debug-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-bottom: 1px solid #333;
          cursor: move;
        }
        
        .debug-title {
          color: #00d4ff;
          font-weight: 600;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .debug-title::before {
          content: '🐛';
        }
        
        .debug-actions {
          display: flex;
          gap: 8px;
        }
        
        .debug-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .debug-btn:hover, .debug-btn:active {
          background: rgba(255,255,255,0.2);
        }
        
        .debug-btn.active {
          background: #00d4ff;
          color: #000;
        }
        
        .debug-filters {
          display: flex;
          gap: 4px;
          padding: 6px 12px;
          background: #111;
          border-bottom: 1px solid #333;
          flex-wrap: wrap;
        }
        
        .filter-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid #333;
          color: #888;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 10px;
          cursor: pointer;
        }
        
        .filter-btn.active {
          border-color: #00d4ff;
          color: #00d4ff;
        }
        
        .filter-btn[data-filter="error"] { color: #ff6b6b; border-color: #ff6b6b33; }
        .filter-btn[data-filter="warn"] { color: #ffd93d; border-color: #ffd93d33; }
        .filter-btn[data-filter="info"] { color: #6bcb77; border-color: #6bcb7733; }
        .filter-btn[data-filter="log"] { color: #4d96ff; border-color: #4d96ff33; }
        
        .debug-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          max-height: 40vh;
        }
        
        .log-entry {
          padding: 4px 8px;
          margin: 2px 0;
          border-radius: 4px;
          word-break: break-word;
          white-space: pre-wrap;
          line-height: 1.4;
        }
        
        .log-entry.log {
          background: rgba(77, 150, 255, 0.1);
          color: #4d96ff;
          border-left: 2px solid #4d96ff;
        }
        
        .log-entry.error {
          background: rgba(255, 107, 107, 0.15);
          color: #ff6b6b;
          border-left: 2px solid #ff6b6b;
        }
        
        .log-entry.warn {
          background: rgba(255, 217, 61, 0.1);
          color: #ffd93d;
          border-left: 2px solid #ffd93d;
        }
        
        .log-entry.info {
          background: rgba(107, 203, 119, 0.1);
          color: #6bcb77;
          border-left: 2px solid #6bcb77;
        }
        
        .log-entry.debug {
          background: rgba(150, 150, 150, 0.1);
          color: #999;
          border-left: 2px solid #666;
        }
        
        .log-time {
          color: #666;
          font-size: 9px;
          margin-right: 6px;
        }
        
        .log-count {
          background: #333;
          color: #fff;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          margin-left: 8px;
        }
        
        .debug-empty {
          color: #666;
          text-align: center;
          padding: 20px;
        }
        
        .debug-footer {
          padding: 6px 12px;
          background: #111;
          border-top: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #666;
        }
      </style>
      
      <div class="debug-header">
        <div class="debug-title">Debug Console</div>
        <div class="debug-actions">
          <button class="debug-btn" id="debug-clear" title="Clear logs">🗑️</button>
          <button class="debug-btn" id="debug-export" title="Export logs">📥</button>
          <button class="debug-btn" id="debug-scroll" title="Auto-scroll">⬇️</button>
          <button class="debug-btn" id="debug-minimize" title="Minimize">➖</button>
          <button class="debug-btn" id="debug-close" title="Close">✕</button>
        </div>
      </div>
      
      <div class="debug-filters">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="log">Log</button>
        <button class="filter-btn" data-filter="info">Info</button>
        <button class="filter-btn" data-filter="warn">Warn</button>
        <button class="filter-btn" data-filter="error">Error</button>
      </div>
      
      <div class="debug-body" id="debug-logs">
        <div class="debug-empty">No logs yet...</div>
      </div>
      
      <div class="debug-footer">
        <span id="debug-count">0 logs</span>
        <span id="debug-memory"></span>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;
    this.setupEventListeners();
    this.renderLogs();
  }

  /**
   * Setup event listeners for panel controls
   */
  setupEventListeners() {
    // Clear logs
    document.getElementById('debug-clear').addEventListener('click', () => {
      this.logs = [];
      this.renderLogs();
    });

    // Export logs
    document.getElementById('debug-export').addEventListener('click', () => {
      this.exportLogs();
    });

    // Toggle auto-scroll
    document.getElementById('debug-scroll').addEventListener('click', (e) => {
      this.autoScroll = !this.autoScroll;
      e.target.classList.toggle('active', this.autoScroll);
    });

    // Minimize
    document.getElementById('debug-minimize').addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.panel.classList.toggle('minimized', this.isMinimized);
    });

    // Close
    document.getElementById('debug-close').addEventListener('click', () => {
      this.hide();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filter = e.target.dataset.filter;
        this.renderLogs();
      });
    });

    // Make header draggable
    this.setupDragging();
  }

  /**
   * Setup touch dragging for mobile
   */
  setupDragging() {
    const header = this.panel.querySelector('.debug-header');
    let isDragging = false;
    let startY = 0;
    let startBottom = 0;

    header.addEventListener('touchstart', (e) => {
      isDragging = true;
      startY = e.touches[0].clientY;
      startBottom = parseInt(getComputedStyle(this.panel).bottom) || 60;
    });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const deltaY = startY - e.touches[0].clientY;
      const newBottom = Math.max(10, Math.min(window.innerHeight - 100, startBottom + deltaY));
      this.panel.style.bottom = newBottom + 'px';
    });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  /**
   * Render logs to the panel
   */
  renderLogs() {
    const logsContainer = document.getElementById('debug-logs');
    if (!logsContainer) return;

    const filteredLogs = this.filter === 'all' 
      ? this.logs 
      : this.logs.filter(log => log.type === this.filter);

    if (filteredLogs.length === 0) {
      logsContainer.innerHTML = '<div class="debug-empty">No logs matching filter...</div>';
    } else {
      logsContainer.innerHTML = filteredLogs.map(log => `
        <div class="log-entry ${log.type}">
          <span class="log-time">${log.timestamp}</span>
          ${log.message}
        </div>
      `).join('');

      if (this.autoScroll) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }

    // Update count
    const countEl = document.getElementById('debug-count');
    if (countEl) {
      countEl.textContent = `${this.logs.length} logs (${filteredLogs.length} shown)`;
    }

    // Update memory if available
    const memoryEl = document.getElementById('debug-memory');
    if (memoryEl && performance.memory) {
      const usedMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
      memoryEl.textContent = `${usedMB} MB`;
    }
  }

  /**
   * Export logs to a text file
   */
  exportLogs() {
    const content = this.logs.map(log => 
      `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Show the debug panel
   */
  show() {
    this.initialize();
    this.createPanel();
    this.isVisible = true;
    this.panel.style.display = 'flex';
    this.renderLogs();
  }

  /**
   * Hide the debug panel
   */
  hide() {
    if (this.panel) {
      this.isVisible = false;
      this.panel.style.display = 'none';
    }
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Add a floating toggle button to show/hide debugger
   */
  addToggleButton() {
    const btn = document.createElement('button');
    btn.id = 'debug-toggle-btn';
    btn.innerHTML = '🐛';
    btn.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #00d4ff;
      color: #fff;
      font-size: 20px;
      z-index: 99998;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.addEventListener('click', () => this.toggle());
    document.body.appendChild(btn);
    
    return btn;
  }
}

// Create and export singleton
export const mobileDebugger = new MobileDebugger();

// Auto-initialize on load and add toggle button
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mobileDebugger.initialize();
      mobileDebugger.addToggleButton();
    });
  } else {
    mobileDebugger.initialize();
    mobileDebugger.addToggleButton();
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.mobileDebugger = mobileDebugger;
}

export default mobileDebugger;
