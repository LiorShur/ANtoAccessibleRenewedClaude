/**
 * Community Challenges
 * Time-limited community goals and challenges for gamification
 * 
 * Access Nature - Gamification Enhancement
 * Created: December 2025
 */

import { userService } from '../services/userService.js';
import { toast } from '../utils/toast.js';

/**
 * Challenge Types
 */
export const CHALLENGE_TYPES = {
  DOCUMENT_TRAILS: 'document_trails',
  SUBMIT_REPORTS: 'submit_reports',
  VERIFY_REPORTS: 'verify_reports',
  SURVEY_COMPLETION: 'survey_completion',
  PHOTO_UPLOADS: 'photo_uploads',
  DISTANCE_TRACKED: 'distance_tracked',
  PARK_COVERAGE: 'park_coverage'
};

/**
 * Active Challenges - These would typically come from Firebase
 * For now, hardcoded examples
 */
export const ACTIVE_CHALLENGES = [
  {
    id: 'december_explorer',
    title: 'December Explorer',
    description: 'Document 5 new trails this month',
    icon: '🌲',
    type: CHALLENGE_TYPES.DOCUMENT_TRAILS,
    target: 5,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    reward: {
      points: 200,
      badge: 'december_champion'
    },
    isActive: true
  },
  {
    id: 'accessibility_advocate',
    title: 'Accessibility Advocate',
    description: 'Complete 10 accessibility surveys',
    icon: '♿',
    type: CHALLENGE_TYPES.SURVEY_COMPLETION,
    target: 10,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    reward: {
      points: 150,
      badge: null
    },
    isActive: true
  },
  {
    id: 'community_verifier',
    title: 'Community Verifier',
    description: 'Verify 15 accessibility reports',
    icon: '✓',
    type: CHALLENGE_TYPES.VERIFY_REPORTS,
    target: 15,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    reward: {
      points: 100,
      badge: null
    },
    isActive: true
  },
  {
    id: 'photo_journalist',
    title: 'Photo Journalist',
    description: 'Upload 20 trail photos',
    icon: '📷',
    type: CHALLENGE_TYPES.PHOTO_UPLOADS,
    target: 20,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    reward: {
      points: 100,
      badge: null
    },
    isActive: true
  },
  {
    id: 'distance_warrior',
    title: 'Distance Warrior',
    description: 'Track 50km of trails',
    icon: '🏃',
    type: CHALLENGE_TYPES.DISTANCE_TRACKED,
    target: 50000, // meters
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    reward: {
      points: 250,
      badge: 'endurance_badge'
    },
    isActive: true
  }
];

/**
 * Community Challenges UI
 */
class CommunityChallengesUI {
  constructor() {
    this.challenges = ACTIVE_CHALLENGES;
    this.userProgress = {};
  }

  /**
   * Initialize the challenges UI
   */
  initialize() {
    this.injectStyles();
    this.loadUserProgress();
    console.log('🏆 Community Challenges initialized');
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('challenges-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'challenges-styles';
    styles.textContent = `
      /* ========== Challenges Panel ========== */
      .challenges-panel {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        margin-bottom: 20px;
      }

      .challenges-header {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .challenges-header h3 {
        margin: 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .challenges-header .time-remaining {
        font-size: 0.85rem;
        opacity: 0.9;
      }

      .challenges-list {
        padding: 12px;
      }

      /* ========== Challenge Card ========== */
      .challenge-card {
        background: #f9fafb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        border: 1px solid #e5e7eb;
        transition: all 0.2s;
      }

      .challenge-card:last-child {
        margin-bottom: 0;
      }

      .challenge-card:hover {
        border-color: #f59e0b;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
      }

      .challenge-card.completed {
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        border-color: #10b981;
      }

      .challenge-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      .challenge-icon {
        font-size: 2rem;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .challenge-info {
        flex: 1;
      }

      .challenge-title {
        font-weight: 600;
        font-size: 1rem;
        color: #111827;
        margin-bottom: 4px;
      }

      .challenge-desc {
        font-size: 0.85rem;
        color: #6b7280;
      }

      .challenge-reward {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.8rem;
        color: #f59e0b;
        font-weight: 600;
      }

      /* ========== Progress Bar ========== */
      .challenge-progress {
        margin-top: 12px;
      }

      .progress-bar-container {
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 6px;
      }

      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      .challenge-card.completed .progress-bar-fill {
        background: linear-gradient(90deg, #10b981, #34d399);
      }

      .progress-text {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #6b7280;
      }

      .progress-text .current {
        font-weight: 600;
        color: #111827;
      }

      /* ========== Completed Badge ========== */
      .completed-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: #10b981;
        color: white;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      /* ========== Mobile Responsive ========== */
      @media (max-width: 600px) {
        .challenges-panel {
          border-radius: 12px;
        }

        .challenges-header {
          padding: 12px 16px;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }

        .challenge-card {
          padding: 12px;
        }

        .challenge-icon {
          width: 40px;
          height: 40px;
          font-size: 1.5rem;
        }
      }

      /* ========== High Contrast Mode ========== */
      .high-contrast .challenges-panel {
        background: #000;
        border: 2px solid #fff;
      }

      .high-contrast .challenges-header {
        background: #000;
        border-bottom: 2px solid #ffff00;
      }

      .high-contrast .challenge-card {
        background: #111;
        border-color: #fff;
      }

      .high-contrast .challenge-title,
      .high-contrast .challenge-desc,
      .high-contrast .progress-text {
        color: #fff;
      }

      .high-contrast .progress-bar-container {
        background: #333;
        border: 1px solid #fff;
      }

      .high-contrast .progress-bar-fill {
        background: #ffff00;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Load user's challenge progress
   */
  async loadUserProgress() {
    // Get progress from userService engagement data
    if (userService.isInitialized) {
      const engagement = userService.getEngagementSummary();
      
      this.userProgress = {
        [CHALLENGE_TYPES.DOCUMENT_TRAILS]: engagement.publicGuides || 0,
        [CHALLENGE_TYPES.SURVEY_COMPLETION]: engagement.surveysCompleted || 0,
        [CHALLENGE_TYPES.VERIFY_REPORTS]: 0, // Would need to track this
        [CHALLENGE_TYPES.PHOTO_UPLOADS]: engagement.photosUploaded || 0,
        [CHALLENGE_TYPES.DISTANCE_TRACKED]: engagement.totalDistance || 0,
        [CHALLENGE_TYPES.SUBMIT_REPORTS]: engagement.reportsSubmitted || 0
      };
    }
  }

  /**
   * Get user's progress for a challenge
   * @param {object} challenge 
   * @returns {number}
   */
  getProgress(challenge) {
    return this.userProgress[challenge.type] || 0;
  }

  /**
   * Check if challenge is completed
   * @param {object} challenge 
   * @returns {boolean}
   */
  isCompleted(challenge) {
    return this.getProgress(challenge) >= challenge.target;
  }

  /**
   * Get days remaining for challenge
   * @param {object} challenge 
   * @returns {number}
   */
  getDaysRemaining(challenge) {
    const now = new Date();
    const end = new Date(challenge.endDate);
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Format target for display
   * @param {object} challenge 
   * @returns {string}
   */
  formatTarget(challenge) {
    if (challenge.type === CHALLENGE_TYPES.DISTANCE_TRACKED) {
      return `${(challenge.target / 1000).toFixed(0)}km`;
    }
    return challenge.target.toString();
  }

  /**
   * Format progress for display
   * @param {object} challenge 
   * @returns {string}
   */
  formatProgress(challenge) {
    const progress = this.getProgress(challenge);
    if (challenge.type === CHALLENGE_TYPES.DISTANCE_TRACKED) {
      return `${(progress / 1000).toFixed(1)}km`;
    }
    return progress.toString();
  }

  /**
   * Render challenges panel HTML
   * @returns {string}
   */
  renderPanel() {
    const activeChallenges = this.challenges.filter(c => {
      const now = new Date();
      return c.isActive && now >= c.startDate && now <= c.endDate;
    });

    if (activeChallenges.length === 0) {
      return `
        <div class="challenges-panel">
          <div class="challenges-header">
            <h3>🏆 Community Challenges</h3>
          </div>
          <div class="challenges-list" style="padding: 24px; text-align: center; color: #6b7280;">
            <p>No active challenges right now.</p>
            <p style="font-size: 0.85rem;">Check back soon for new challenges!</p>
          </div>
        </div>
      `;
    }

    const daysRemaining = this.getDaysRemaining(activeChallenges[0]);

    return `
      <div class="challenges-panel">
        <div class="challenges-header">
          <h3>🏆 Community Challenges</h3>
          <span class="time-remaining">⏰ ${daysRemaining} days left</span>
        </div>
        <div class="challenges-list">
          ${activeChallenges.map(challenge => this.renderChallengeCard(challenge)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual challenge card
   * @param {object} challenge 
   * @returns {string}
   */
  renderChallengeCard(challenge) {
    const progress = this.getProgress(challenge);
    const target = challenge.target;
    const percentage = Math.min(100, (progress / target) * 100);
    const completed = this.isCompleted(challenge);

    return `
      <div class="challenge-card ${completed ? 'completed' : ''}">
        <div class="challenge-header">
          <div class="challenge-icon">${challenge.icon}</div>
          <div class="challenge-info">
            <div class="challenge-title">
              ${challenge.title}
              ${completed ? '<span class="completed-badge">✓ Complete</span>' : ''}
            </div>
            <div class="challenge-desc">${challenge.description}</div>
          </div>
          <div class="challenge-reward">
            🎁 +${challenge.reward.points}
          </div>
        </div>
        <div class="challenge-progress">
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="progress-text">
            <span class="current">${this.formatProgress(challenge)}</span>
            <span>${this.formatTarget(challenge)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Mount challenges panel to a container
   * @param {HTMLElement|string} container - Container element or selector
   */
  mount(container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) {
      el.innerHTML = this.renderPanel();
    }
  }

  /**
   * Create and return challenges panel element
   * @returns {HTMLElement}
   */
  createElement() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.renderPanel();
    return wrapper.firstElementChild;
  }

  /**
   * Update progress for a challenge type
   * @param {string} type - Challenge type
   * @param {number} newValue - New progress value
   */
  updateProgress(type, newValue) {
    const oldValue = this.userProgress[type] || 0;
    this.userProgress[type] = newValue;

    // Check if any challenge was just completed
    this.challenges.forEach(challenge => {
      if (challenge.type === type) {
        const wasCompleted = oldValue >= challenge.target;
        const isNowCompleted = newValue >= challenge.target;
        
        if (!wasCompleted && isNowCompleted) {
          this.onChallengeComplete(challenge);
        }
      }
    });
  }

  /**
   * Handle challenge completion
   * @param {object} challenge 
   */
  async onChallengeComplete(challenge) {
    console.log('🎉 Challenge completed:', challenge.title);
    
    // Show celebration toast
    toast.success(`🏆 Challenge Complete: ${challenge.title}! +${challenge.reward.points} points`);

    // Award points
    if (userService.isInitialized) {
      try {
        await userService.addPoints(challenge.reward.points, `Completed challenge: ${challenge.title}`);
      } catch (e) {
        console.error('Failed to award challenge points:', e);
      }
    }

    // Show celebration popup
    this.showCompletionPopup(challenge);
  }

  /**
   * Show challenge completion popup
   * @param {object} challenge 
   */
  showCompletionPopup(challenge) {
    // Remove existing popup
    const existing = document.querySelector('.challenge-complete-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'challenge-complete-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <div class="popup-icon">${challenge.icon}</div>
        <h2>Challenge Complete!</h2>
        <p>${challenge.title}</p>
        <div class="popup-reward">+${challenge.reward.points} points</div>
        <button onclick="this.parentElement.parentElement.remove()">Awesome! 🎉</button>
      </div>
    `;
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20000;
      animation: fadeIn 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .challenge-complete-popup .popup-content {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 320px;
        animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .challenge-complete-popup .popup-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
      .challenge-complete-popup h2 {
        margin: 0 0 8px 0;
        font-size: 1.5rem;
      }
      .challenge-complete-popup p {
        margin: 0 0 16px 0;
        opacity: 0.9;
      }
      .challenge-complete-popup .popup-reward {
        font-size: 1.25rem;
        font-weight: bold;
        margin-bottom: 24px;
      }
      .challenge-complete-popup button {
        background: white;
        color: #d97706;
        border: none;
        padding: 12px 32px;
        border-radius: 25px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
      }
      @keyframes scaleIn {
        from { transform: scale(0.5); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(popup);

    // Auto-close after 5 seconds
    setTimeout(() => popup.remove(), 5000);
  }
}

// Create and export singleton
export const communityChallenges = new CommunityChallengesUI();

// Make available globally
window.communityChallenges = communityChallenges;

console.log('🏆 Community Challenges module loaded');