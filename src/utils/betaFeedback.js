/**
 * Beta Feedback Module
 * Access Nature - Easy feedback collection for beta testers
 * 
 * Features:
 * - Floating feedback button on all pages
 * - Bug reports, feature requests, general feedback
 * - Captures context (page, device, user)
 * - Sends via EmailJS or stores in Firebase
 */

import { toast } from './toast.js';

class BetaFeedback {
  constructor() {
    this.isOpen = false;
    this.initialized = false;
    this.feedbackEmail = 'feedback@accessnature.app'; // Change to your email
  }

  /**
   * Initialize feedback system
   */
  initialize() {
    if (this.initialized) return;
    
    this.injectStyles();
    this.createFeedbackButton();
    this.createFeedbackModal();
    
    this.initialized = true;
    console.log('📝 Beta feedback system initialized');
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('beta-feedback-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'beta-feedback-styles';
    styles.textContent = `
      /* Floating Feedback Button - matches SOS button size */
      .feedback-fab {
        position: fixed;
        bottom: 20px;
        right: 90px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        color: white;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(109, 40, 217, 0.4);
        cursor: pointer;
        z-index: 9990;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: all 0.3s ease;
      }
      
      .feedback-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(109, 40, 217, 0.5);
      }
      
      .feedback-fab:active {
        transform: scale(0.95);
      }
      
      .feedback-fab .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #b91c1c;
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 10px;
        text-transform: uppercase;
      }
      
      /* Expanded state with label */
      .feedback-fab.expanded {
        width: auto;
        padding: 0 20px;
        border-radius: 28px;
      }
      
      .feedback-fab.expanded .fab-label {
        display: inline;
        margin-left: 8px;
        font-size: 14px;
        font-weight: 500;
      }
      
      .feedback-fab .fab-label {
        display: none;
      }
      
      /* Modal Overlay */
      .feedback-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .feedback-overlay.open {
        display: flex;
      }
      
      /* Modal */
      .feedback-modal {
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: feedbackSlideIn 0.3s ease;
      }
      
      @keyframes feedbackSlideIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .feedback-header {
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        color: white;
        padding: 20px 24px;
        position: relative;
      }
      
      .feedback-header h2 {
        margin: 0 0 4px 0;
        font-size: 1.3rem;
        font-weight: 600;
      }
      
      .feedback-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 0.9rem;
      }
      
      .feedback-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .feedback-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .feedback-body {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      /* Category Selection */
      .feedback-categories {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .feedback-category {
        padding: 12px 8px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }
      
      .feedback-category:hover {
        border-color: #8b5cf6;
        background: #faf5ff;
      }
      
      .feedback-category.selected {
        border-color: #8b5cf6;
        background: #f3e8ff;
      }
      
      .feedback-category .icon {
        font-size: 24px;
        display: block;
        margin-bottom: 4px;
      }
      
      .feedback-category .label {
        font-size: 0.8rem;
        color: #374151;
        font-weight: 500;
      }
      
      /* Form Fields */
      .feedback-field {
        margin-bottom: 16px;
      }
      
      .feedback-field label {
        display: block;
        font-weight: 500;
        margin-bottom: 6px;
        color: #374151;
      }
      
      .feedback-field input,
      .feedback-field textarea,
      .feedback-field select {
        width: 100%;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 1rem;
        transition: border-color 0.2s;
        font-family: inherit;
      }
      
      .feedback-field input:focus,
      .feedback-field textarea:focus,
      .feedback-field select:focus {
        outline: none;
        border-color: #8b5cf6;
      }
      
      .feedback-field textarea {
        min-height: 120px;
        resize: vertical;
      }
      
      .feedback-field .hint {
        font-size: 0.8rem;
        color: #6b7280;
        margin-top: 4px;
      }
      
      /* Screenshot option */
      .feedback-screenshot {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 10px;
        margin-bottom: 16px;
      }
      
      .feedback-screenshot input[type="checkbox"] {
        width: 20px;
        height: 20px;
        accent-color: #8b5cf6;
      }
      
      /* Context info */
      .feedback-context {
        background: #f3f4f6;
        border-radius: 8px;
        padding: 12px;
        font-size: 0.8rem;
        color: #6b7280;
        margin-bottom: 16px;
      }
      
      .feedback-context summary {
        cursor: pointer;
        font-weight: 500;
        color: #374151;
      }
      
      .feedback-context pre {
        margin: 8px 0 0 0;
        white-space: pre-wrap;
        word-break: break-all;
      }
      
      /* Footer */
      .feedback-footer {
        padding: 16px 24px;
        background: #f9fafb;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .feedback-btn {
        padding: 12px 24px;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      
      .feedback-btn-cancel {
        background: white;
        border: 2px solid #e5e7eb;
        color: #374151;
      }
      
      .feedback-btn-cancel:hover {
        background: #f3f4f6;
      }
      
      .feedback-btn-submit {
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        color: white;
      }
      
      .feedback-btn-submit:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);
      }
      
      .feedback-btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      
      /* Success state */
      .feedback-success {
        text-align: center;
        padding: 40px 20px;
      }
      
      .feedback-success .icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
      
      .feedback-success h3 {
        margin: 0 0 8px 0;
        color: #166534;
      }
      
      .feedback-success p {
        color: #6b7280;
        margin: 0;
      }
      
      /* Mobile adjustments */
      @media (max-width: 480px) {
        /* Position handled by global-nav.css for bottom nav compatibility */
        
        .feedback-categories {
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .feedback-category {
          padding: 10px 6px;
        }
        
        .feedback-category .icon {
          font-size: 20px;
        }
        
        .feedback-category .label {
          font-size: 0.7rem;
        }
        
        .feedback-modal {
          margin: 10px;
          max-height: 95vh;
        }
        
        .feedback-body {
          max-height: 50vh;
        }
      }
      
      /* High contrast mode */
      .high-contrast .feedback-fab {
        background: #000;
        border: 3px solid #fff;
      }
      
      .high-contrast .feedback-modal {
        border: 3px solid #000;
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Create floating feedback button
   */
  createFeedbackButton() {
    if (document.getElementById('feedbackFab')) return;
    
    const fab = document.createElement('button');
    fab.id = 'feedbackFab';
    fab.className = 'feedback-fab';
    fab.setAttribute('aria-label', 'Feedback');
    fab.innerHTML = `
      <span class="fab-icon" aria-hidden="true">💬</span>
      <span class="fab-label">Feedback</span>
      <span class="badge" aria-hidden="true">BETA</span>
    `;
    
    fab.addEventListener('click', () => this.open());
    
    // Expand on hover (desktop)
    fab.addEventListener('mouseenter', () => fab.classList.add('expanded'));
    fab.addEventListener('mouseleave', () => fab.classList.remove('expanded'));
    
    document.body.appendChild(fab);
  }

  /**
   * Create feedback modal
   */
  createFeedbackModal() {
    if (document.getElementById('feedbackOverlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'feedbackOverlay';
    overlay.className = 'feedback-overlay';
    
    overlay.innerHTML = `
      <div class="feedback-modal">
        <div class="feedback-header">
          <h2>📝 Send Feedback</h2>
          <p>Help us improve Access Nature</p>
          <button class="feedback-close" onclick="betaFeedback.close()">&times;</button>
        </div>
        
        <div class="feedback-body" id="feedbackBody">
          <!-- Category Selection -->
          <div class="feedback-categories">
            <div class="feedback-category" data-category="bug" onclick="betaFeedback.selectCategory('bug')">
              <span class="icon">🐛</span>
              <span class="label">Bug Report</span>
            </div>
            <div class="feedback-category" data-category="feature" onclick="betaFeedback.selectCategory('feature')">
              <span class="icon">💡</span>
              <span class="label">Feature Idea</span>
            </div>
            <div class="feedback-category" data-category="general" onclick="betaFeedback.selectCategory('general')">
              <span class="icon">💭</span>
              <span class="label">General</span>
            </div>
          </div>
          
          <!-- Feedback Form -->
          <div class="feedback-field">
            <label for="feedbackTitle">Summary *</label>
            <input type="text" id="feedbackTitle" placeholder="Brief description of your feedback" maxlength="100">
          </div>
          
          <div class="feedback-field">
            <label for="feedbackDetails">Details *</label>
            <textarea id="feedbackDetails" placeholder="Please provide as much detail as possible. For bugs, include steps to reproduce."></textarea>
            <div class="hint">The more detail, the better we can help!</div>
          </div>
          
          <div class="feedback-field">
            <label for="feedbackEmail">Your Email (optional)</label>
            <input type="email" id="feedbackEmail" placeholder="For follow-up questions">
            <div class="hint">We'll only use this to ask clarifying questions</div>
          </div>
          
          <!-- Context info -->
          <details class="feedback-context">
            <summary>📋 Technical info (auto-captured)</summary>
            <pre id="feedbackContext"></pre>
          </details>
        </div>
        
        <div class="feedback-footer">
          <button class="feedback-btn feedback-btn-cancel" onclick="betaFeedback.close()">Cancel</button>
          <button class="feedback-btn feedback-btn-submit" id="feedbackSubmitBtn" onclick="betaFeedback.submit()">Send Feedback</button>
        </div>
      </div>
    `;
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    
    document.body.appendChild(overlay);
  }

  /**
   * Open feedback modal
   */
  open() {
    const overlay = document.getElementById('feedbackOverlay');
    if (!overlay) return;
    
    // Reset form
    this.selectedCategory = null;
    document.querySelectorAll('.feedback-category').forEach(c => c.classList.remove('selected'));
    document.getElementById('feedbackTitle').value = '';
    document.getElementById('feedbackDetails').value = '';
    
    // Pre-fill email if user is logged in
    try {
      const userEmail = window.userService?.currentUser?.email;
      if (userEmail) {
        document.getElementById('feedbackEmail').value = userEmail;
      }
    } catch (e) {}
    
    // Capture context
    this.captureContext();
    
    // Show modal
    overlay.classList.add('open');
    this.isOpen = true;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Focus first input
    setTimeout(() => {
      document.getElementById('feedbackTitle')?.focus();
    }, 100);
  }

  /**
   * Close feedback modal
   */
  close() {
    const overlay = document.getElementById('feedbackOverlay');
    if (!overlay) return;
    
    overlay.classList.remove('open');
    this.isOpen = false;
    
    // Restore body scroll
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Reset to form view (in case showing success)
    this.resetToForm();
  }

  /**
   * Select feedback category
   */
  selectCategory(category) {
    this.selectedCategory = category;
    
    document.querySelectorAll('.feedback-category').forEach(c => {
      c.classList.toggle('selected', c.dataset.category === category);
    });
    
    // Update placeholder based on category
    const detailsField = document.getElementById('feedbackDetails');
    if (detailsField) {
      const placeholders = {
        bug: 'What happened? What did you expect to happen? Steps to reproduce:\n1. \n2. \n3. ',
        feature: 'Describe the feature you\'d like to see. How would it help you?',
        general: 'Share your thoughts, questions, or suggestions...'
      };
      detailsField.placeholder = placeholders[category] || placeholders.general;
    }
  }

  /**
   * Capture technical context
   */
  captureContext() {
    const context = {
      page: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      platform: navigator.platform,
      language: navigator.language,
      appVersion: '1.0.0-beta' // Update this
    };
    
    // Check if logged in
    try {
      if (window.userService?.isInitialized) {
        context.loggedIn = true;
        context.userId = window.userService.currentUser?.uid?.substring(0, 8) + '...';
      }
    } catch (e) {
      context.loggedIn = false;
    }
    
    // Check tracking state
    try {
      const trackingController = window.AccessNatureApp?.getController?.('tracking');
      if (trackingController) {
        context.isTracking = trackingController.isTracking || false;
        context.isPaused = trackingController.isPaused || false;
      }
    } catch (e) {}
    
    this.contextData = context;
    
    // Display in modal
    const contextEl = document.getElementById('feedbackContext');
    if (contextEl) {
      contextEl.textContent = JSON.stringify(context, null, 2);
    }
  }

  /**
   * Submit feedback
   */
  async submit() {
    const title = document.getElementById('feedbackTitle')?.value.trim();
    const details = document.getElementById('feedbackDetails')?.value.trim();
    const email = document.getElementById('feedbackEmail')?.value.trim();
    
    // Validation
    if (!this.selectedCategory) {
      toast.warning('Please select a feedback category');
      return;
    }
    
    if (!title) {
      toast.warning('Please provide a summary');
      document.getElementById('feedbackTitle')?.focus();
      return;
    }
    
    if (!details) {
      toast.warning('Please provide details');
      document.getElementById('feedbackDetails')?.focus();
      return;
    }
    
    // Disable submit button
    const submitBtn = document.getElementById('feedbackSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }
    
    // Prepare feedback data
    const feedbackData = {
      category: this.selectedCategory,
      title,
      details,
      email: email || null,
      context: this.contextData,
      submittedAt: new Date().toISOString()
    };
    
    console.log('📝 Submitting feedback:', feedbackData);
    
    try {
      // Try multiple methods to ensure feedback is captured
      
      // Method 1: Store in Firebase (if available)
      let savedToFirebase = false;
      try {
        savedToFirebase = await this.saveToFirebase(feedbackData);
      } catch (e) {
        console.warn('Firebase save failed:', e);
      }
      
      // Method 2: Send via EmailJS (if configured)
      let sentEmail = false;
      try {
        sentEmail = await this.sendViaEmail(feedbackData);
      } catch (e) {
        console.warn('Email send failed:', e);
      }
      
      // Method 3: Store locally as backup
      this.saveLocally(feedbackData);
      
      // Show success
      this.showSuccess();
      
      if (savedToFirebase || sentEmail) {
        toast.success('Thank you for your feedback! 🙏');
      } else {
        toast.success('Feedback saved locally. Will sync when online.');
      }
      
    } catch (error) {
      console.error('Feedback submission failed:', error);
      toast.error('Failed to send feedback. Saved locally.');
      this.saveLocally(feedbackData);
    } finally {
      // Re-enable submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Feedback';
      }
    }
  }

  /**
   * Save feedback to Firebase
   */
  async saveToFirebase(data) {
    try {
      // Import Firebase modules dynamically
      const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js');
      
      // Try to get db from window or import it
      let db = window.db;
      
      if (!db) {
        try {
          const firebaseSetup = await import('../../firebase-setup.js');
          db = firebaseSetup.db;
        } catch (e) {
          console.warn('Could not import firebase-setup.js:', e);
        }
      }
      
      if (!db) {
        console.warn('Firebase db not available');
        return false;
      }
      
      await addDoc(collection(db, 'beta_feedback'), {
        ...data,
        status: 'new',
        createdAt: new Date()
      });
      
      console.log('✅ Feedback saved to Firebase');
      return true;
    } catch (error) {
      console.error('Firebase save error:', error);
      return false;
    }
  }

  /**
   * Send feedback via EmailJS
   */
  async sendViaEmail(data) {
    // Check if EmailJS is configured
    const settings = JSON.parse(localStorage.getItem('accessNature_adminSettings') || '{}');
    const config = settings.emailjs || {};
    
    if (!config.publicKey || !config.serviceId || !config.templateId) {
      console.log('EmailJS not configured, skipping email');
      return false;
    }
    
    // Load EmailJS if needed
    if (typeof emailjs === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      emailjs.init(config.publicKey);
    }
    
    // Format message
    const categoryLabels = {
      bug: '🐛 Bug Report',
      feature: '💡 Feature Request',
      general: '💭 General Feedback'
    };
    
    const message = `
${categoryLabels[data.category]}

Summary: ${data.title}

Details:
${data.details}

${data.email ? `User Email: ${data.email}` : 'No email provided'}

--- Technical Context ---
${JSON.stringify(data.context, null, 2)}
    `.trim();
    
    await emailjs.send(config.serviceId, config.templateId, {
      to_email: this.feedbackEmail,
      to_name: 'Access Nature Team',
      from_name: data.email || 'Beta Tester',
      subject: `[Beta Feedback] ${categoryLabels[data.category]}: ${data.title}`,
      message: message,
      maps_url: data.context.page,
      timestamp: data.submittedAt
    });
    
    console.log('✅ Feedback sent via email');
    return true;
  }

  /**
   * Save feedback locally as backup
   */
  saveLocally(data) {
    try {
      const key = 'accessNature_pendingFeedback';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(data);
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('💾 Feedback saved locally');
    } catch (e) {
      console.error('Local save failed:', e);
    }
  }

  /**
   * Show success state
   */
  showSuccess() {
    const body = document.getElementById('feedbackBody');
    if (!body) return;
    
    body.innerHTML = `
      <div class="feedback-success">
        <div class="icon">✅</div>
        <h3>Thank You!</h3>
        <p>Your feedback has been received.<br>We really appreciate you helping us improve!</p>
      </div>
    `;
    
    // Update footer
    const footer = document.querySelector('.feedback-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="feedback-btn feedback-btn-submit" onclick="betaFeedback.close()">Done</button>
      `;
    }
    
    // Auto-close after delay
    setTimeout(() => this.close(), 3000);
  }

  /**
   * Reset modal to form view
   */
  resetToForm() {
    // Recreate modal content
    const overlay = document.getElementById('feedbackOverlay');
    if (overlay) {
      overlay.remove();
    }
    this.createFeedbackModal();
  }
}

// Create singleton instance
const betaFeedback = new BetaFeedback();

// Expose globally
window.betaFeedback = betaFeedback;

export { betaFeedback };