// ==============================================
// ACCESS NATURE - MODAL SYSTEM
// Beautiful modals replacing confirm() and prompt()
// 
// File: src/utils/modal.js
// Version: 2.0 - Standalone with inline styles
// ==============================================

class ModalManager {
  constructor() {
    this.activeModals = new Map();
    this.modalCounter = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    // Inject styles if not already present
    if (!document.getElementById('modal-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-styles';
      style.textContent = `
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 100000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow: hidden;
          box-sizing: border-box;
        }
        
        .modal-backdrop.active {
          opacity: 1;
          visibility: visible;
        }
        
        .modal-dialog {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: min(420px, calc(100vw - 32px));
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          transform: scale(0.9) translateY(-20px);
          transition: transform 0.2s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .modal-backdrop.active .modal-dialog {
          transform: scale(1) translateY(0);
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-icon {
          font-size: 28px;
          line-height: 1;
        }
        
        .modal-title {
          flex: 1;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        
        .modal-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: #9ca3af;
          font-size: 24px;
          transition: all 0.2s;
        }
        
        .modal-close:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        .modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          max-height: 60vh;
        }
        
        .modal-message {
          color: #4b5563;
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 16px;
          white-space: pre-wrap;
        }
        
        .modal-message:last-child {
          margin-bottom: 0;
        }
        
        .modal-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        
        .modal-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 16px 24px 20px;
          border-top: 1px solid #e5e7eb;
          flex-wrap: wrap;
          max-height: 50vh;
          overflow-y: auto;
          overflow-x: hidden;
        }
        
        .modal-btn {
          flex: 1;
          min-width: 100px;
          max-width: 100%;
          padding: 12px 20px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          white-space: normal;
          overflow: hidden;
          text-overflow: ellipsis;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* When there are many buttons (like route choices), stack them */
        .modal-footer.many-choices {
          flex-direction: column;
          gap: 8px;
          max-height: 60vh;
          padding-bottom: 24px;
        }
        
        .modal-footer.many-choices .modal-btn {
          flex: none;
          width: 100%;
          min-width: unset;
          text-align: left;
          padding: 14px 16px;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.3;
        }
        
        .modal-btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        
        .modal-btn-secondary:hover {
          background: #e5e7eb;
        }
        
        .modal-btn-primary {
          background: #667eea;
          color: #ffffff;
        }
        
        .modal-btn-primary:hover {
          background: #5a67d8;
        }
        
        .modal-btn-danger {
          background: #ef4444;
          color: #ffffff;
        }
        
        .modal-btn-danger:hover {
          background: #dc2626;
        }
        
        .modal-btn-success {
          background: #10b981;
          color: #ffffff;
        }
        
        .modal-btn-success:hover {
          background: #059669;
        }
        
        /* Mobile responsive */
        @media (max-width: 480px) {
          .modal-backdrop {
            padding: 0;
            align-items: flex-end;
          }
          
          .modal-dialog {
            max-width: none;
            width: 100%;
            border-radius: 20px 20px 0 0;
            max-height: 85vh;
          }
          
          .modal-footer {
            flex-direction: column;
            max-height: 50vh;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          .modal-footer .modal-btn {
            width: 100%;
            flex: none;
            min-width: unset;
          }
          
          .modal-footer.many-choices {
            padding: 12px 16px 24px;
            max-height: 55vh;
          }
          
          .modal-footer.many-choices .modal-btn {
            padding: 12px 14px;
            font-size: 14px;
            white-space: normal;
          }
        }
        
        /* Type-specific colors */
        .modal-success .modal-header { border-bottom-color: #10b981; }
        .modal-error .modal-header { border-bottom-color: #ef4444; }
        .modal-warning .modal-header { border-bottom-color: #f59e0b; }
        .modal-info .modal-header { border-bottom-color: #3b82f6; }
        .modal-confirm .modal-header { border-bottom-color: #8b5cf6; }
      `;
      document.head.appendChild(style);
    }
    
    this.initialized = true;
  }

  show(options = {}) {
    this.init();
    
    return new Promise((resolve) => {
      const config = {
        type: 'info',
        title: '',
        message: '',
        input: null, // { placeholder, defaultValue, type }
        closable: true,
        buttons: null,
        icon: null,
        ...options
      };

      const modalId = `modal-${++this.modalCounter}`;
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        confirm: '❓'
      };

      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.id = modalId;

      // Create dialog
      const dialog = document.createElement('div');
      dialog.className = `modal-dialog modal-${config.type}`;

      // Build HTML
      let html = `
        <div class="modal-header">
          <span class="modal-icon">${config.icon || icons[config.type] || icons.info}</span>
          <h3 class="modal-title">${this.escapeHtml(config.title)}</h3>
          ${config.closable ? '<button class="modal-close" data-action="close">×</button>' : ''}
        </div>
        <div class="modal-body">
      `;

      if (config.message) {
        html += `<p class="modal-message">${this.escapeHtml(config.message)}</p>`;
      }
      
      // Support raw HTML content (use with caution - only for trusted content)
      if (config.html) {
        html += `<div class="modal-html-content">${config.html}</div>`;
      }

      if (config.input) {
        const inputType = config.input.type || 'text';
        const placeholder = config.input.placeholder || '';
        const defaultValue = config.input.defaultValue || '';
        html += `<input type="${inputType}" class="modal-input" id="${modalId}-input" 
                  placeholder="${this.escapeHtml(placeholder)}" 
                  value="${this.escapeHtml(defaultValue)}">`;
      }

      html += '</div>';
      
      // Add many-choices class if there are more than 2 buttons
      const buttons = config.buttons || this.getDefaultButtons(config.type, config.input);
      const manyChoices = buttons.length > 2 ? ' many-choices' : '';
      html += `<div class="modal-footer${manyChoices}">`;

      // Buttons
      buttons.forEach(btn => {
        const variant = btn.variant || 'secondary';
        html += `<button class="modal-btn modal-btn-${variant}" data-action="${btn.action}">
          ${this.escapeHtml(btn.label)}
        </button>`;
      });

      html += '</div>';
      dialog.innerHTML = html;
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      // Store reference
      this.activeModals.set(modalId, { backdrop, resolve });

      // Event listeners
      this.attachEvents(backdrop, dialog, config, modalId, resolve);

      // Show with animation
      requestAnimationFrame(() => {
        backdrop.classList.add('active');
        // Focus input or first button
        const input = dialog.querySelector('.modal-input');
        const firstBtn = dialog.querySelector('.modal-btn');
        if (input) {
          input.focus();
          input.select();
        } else if (firstBtn) {
          firstBtn.focus();
        }
      });

      // Prevent body scroll and pull-to-refresh
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    });
  }

  getDefaultButtons(type, hasInput) {
    if (hasInput) {
      return [
        { label: 'Cancel', action: 'cancel', variant: 'secondary' },
        { label: 'OK', action: 'ok', variant: 'primary' }
      ];
    }
    
    switch (type) {
      case 'confirm':
        return [
          { label: 'Cancel', action: 'cancel', variant: 'secondary' },
          { label: 'Confirm', action: 'confirm', variant: 'primary' }
        ];
      default:
        return [
          { label: 'OK', action: 'ok', variant: 'primary' }
        ];
    }
  }

  attachEvents(backdrop, dialog, config, modalId, resolve) {
    // Button clicks
    dialog.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        this.close(modalId, action, resolve);
      });
    });

    // Backdrop click
    if (config.closable) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close(modalId, 'cancel', resolve);
        }
      });
    }

    // ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape' && config.closable) {
        this.close(modalId, 'cancel', resolve);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Enter key for input
    const input = dialog.querySelector('.modal-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.close(modalId, 'ok', resolve);
        }
      });
    }
  }

  close(modalId, action, resolve) {
    const modalData = this.activeModals.get(modalId);
    if (!modalData) return;

    const { backdrop } = modalData;
    const input = backdrop.querySelector('.modal-input');
    
    // Get input value if exists
    let result;
    if (action === 'ok' && input) {
      result = input.value;
    } else if (action === 'confirm') {
      result = true;
    } else if (action === 'cancel') {
      result = input ? null : false;
    } else {
      result = action;
    }

    // Hide with animation
    backdrop.classList.remove('active');

    setTimeout(() => {
      backdrop.remove();
      this.activeModals.delete(modalId);

      // Restore body scroll and pull-to-refresh only when all modals are closed
      if (this.activeModals.size === 0) {
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
      }

      resolve(result);
    }, 200);
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Convenience methods

  alert(message, title = 'Notice') {
    return this.show({
      type: 'info',
      title,
      message
    });
  }

  confirm(message, title = 'Confirm') {
    return this.show({
      type: 'confirm',
      title,
      message,
      buttons: [
        { label: 'Cancel', action: 'cancel', variant: 'secondary' },
        { label: 'Confirm', action: 'confirm', variant: 'primary' }
      ]
    });
  }

  prompt(message, title = 'Input', defaultValue = '') {
    return this.show({
      type: 'info',
      title,
      message,
      input: { defaultValue }
    });
  }

  success(message, title = 'Success') {
    return this.show({ type: 'success', title, message });
  }

  error(message, title = 'Error') {
    return this.show({ type: 'error', title, message });
  }

  warning(message, title = 'Warning') {
    return this.show({ type: 'warning', title, message });
  }

  // Custom choice modal
  choice(message, title, choices) {
    const buttons = choices.map((c, i) => ({
      label: c.label,
      // Use nullish coalescing to handle value of 0 correctly
      action: c.value !== undefined && c.value !== null ? c.value : c.label,
      variant: i === choices.length - 1 ? 'primary' : 'secondary'
    }));
    
    return this.show({
      type: 'confirm',
      title,
      message,
      buttons,
      closable: true
    });
  }
}

// Create singleton
const modalManager = new ModalManager();

// Export functions
export const modal = {
  show: (options) => modalManager.show(options),
  alert: (message, title) => modalManager.alert(message, title),
  confirm: (message, title) => modalManager.confirm(message, title),
  prompt: (message, title, defaultValue) => modalManager.prompt(message, title, defaultValue),
  success: (message, title) => modalManager.success(message, title),
  error: (message, title) => modalManager.error(message, title),
  warning: (message, title) => modalManager.warning(message, title),
  choice: (message, title, choices) => modalManager.choice(message, title, choices)
};

// Make globally available
if (typeof window !== 'undefined') {
  window.modal = modal;
}

export default modal;