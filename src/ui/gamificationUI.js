/**
 * Gamification UI Component
 * Displays badges, level progress, achievements, and user stats
 * 
 * Access Nature - Phase 2: Beta Features
 * Created: December 2025
 */

import { userService } from '../services/userService.js';
import { BADGES, LEVELS, getBadge, getBadgesByCategory, getLevel, getLevelProgress, getPointsToNextLevel } from '../config/featureFlags.js';

class GamificationUI {
  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('gamification-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'gamification-styles';
    styles.textContent = `
      /* Achievement Popup */
      .achievement-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 32px 48px;
        border-radius: 20px;
        text-align: center;
        z-index: 10001;
        box-shadow: 0 20px 60px rgba(102, 126, 234, 0.5);
        opacity: 0;
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      .achievement-popup.visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        pointer-events: auto;
      }
      
      .achievement-popup .badge-icon {
        font-size: 64px;
        display: block;
        margin-bottom: 16px;
        animation: badge-bounce 0.6s ease-out;
      }
      
      @keyframes badge-bounce {
        0% { transform: scale(0) rotate(-180deg); }
        50% { transform: scale(1.2) rotate(10deg); }
        70% { transform: scale(0.9) rotate(-5deg); }
        100% { transform: scale(1) rotate(0); }
      }
      
      .achievement-popup .badge-title {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 2px;
        opacity: 0.9;
        margin-bottom: 8px;
      }
      
      .achievement-popup .badge-name {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      
      .achievement-popup .badge-description {
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 16px;
      }
      
      .achievement-popup .badge-points {
        display: inline-block;
        background: rgba(255,255,255,0.2);
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
      }
      
      .achievement-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }
      
      .achievement-overlay.visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      /* Level Up Popup */
      .level-up-popup {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      
      .level-up-popup .level-icon {
        font-size: 72px;
        display: block;
        margin-bottom: 16px;
        animation: level-pulse 1s ease-in-out infinite;
      }
      
      @keyframes level-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      /* Profile Stats Card */
      .profile-stats-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      }
      
      .profile-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }
      
      .profile-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: white;
      }
      
      .profile-info {
        flex: 1;
      }
      
      .profile-name {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 4px;
      }
      
      .profile-level {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
        font-size: 14px;
      }
      
      .profile-level .level-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      
      /* Level Progress */
      .level-progress-section {
        margin-bottom: 24px;
      }
      
      .level-progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .level-progress-label {
        font-size: 14px;
        color: #666;
      }
      
      .level-progress-points {
        font-size: 14px;
        font-weight: 600;
        color: #667eea;
      }
      
      .level-progress-bar {
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .level-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 4px;
        transition: width 0.5s ease;
      }
      
      .level-progress-info {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
        font-size: 12px;
        color: #999;
      }
      
      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      
      .stat-item {
        text-align: center;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 12px;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 4px;
      }
      
      .stat-label {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* Streak Display */
      .streak-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background: linear-gradient(135deg, #ff9a56 0%, #ff6b6b 100%);
        border-radius: 12px;
        color: white;
        margin-bottom: 24px;
      }
      
      .streak-icon {
        font-size: 24px;
      }
      
      .streak-text {
        font-size: 16px;
        font-weight: 600;
      }
      
      .streak-days {
        font-size: 24px;
        font-weight: 700;
      }
      
      /* Badge Grid */
      .badges-section {
        margin-top: 24px;
      }
      
      .badges-section-title {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .badges-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 12px;
      }
      
      .badge-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 8px;
        background: #f8f9fa;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
      }
      
      .badge-item:hover {
        background: #f0f0f0;
        transform: translateY(-2px);
      }
      
      .badge-item.earned {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border-color: #667eea;
      }
      
      .badge-item.locked {
        opacity: 0.5;
      }
      
      .badge-item .badge-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }
      
      .badge-item.locked .badge-icon {
        filter: grayscale(100%);
      }
      
      .badge-item .badge-name {
        font-size: 11px;
        text-align: center;
        color: #666;
        line-height: 1.3;
      }
      
      .badge-item.earned .badge-name {
        color: #667eea;
        font-weight: 600;
      }
      
      /* Category Headers */
      .badge-category {
        margin-bottom: 20px;
      }
      
      .badge-category-title {
        font-size: 14px;
        font-weight: 600;
        color: #666;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      /* Mini Badge Display (for header/nav) */
      .mini-badge-display {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: rgba(102, 126, 234, 0.1);
        border-radius: 20px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .mini-badge-display:hover {
        background: rgba(102, 126, 234, 0.2);
      }
      
      .mini-badge-display .level-icon {
        font-size: 16px;
      }
      
      .mini-badge-display .level-name {
        font-size: 12px;
        font-weight: 600;
        color: #667eea;
      }
      
      .mini-badge-display .points {
        font-size: 11px;
        color: #888;
      }
      
      /* Confetti Animation */
      .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        z-index: 10002;
        pointer-events: none;
      }
      
      @keyframes confetti-fall {
        0% {
          transform: translateY(-100vh) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
      
      /* Mobile Responsive */
      @media (max-width: 480px) {
        .profile-stats-card {
          padding: 16px;
        }
        
        .stats-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .stat-value {
          font-size: 20px;
        }
        
        .badges-grid {
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        
        .badge-item {
          padding: 8px 4px;
        }
        
        .badge-item .badge-icon {
          font-size: 24px;
        }
        
        .badge-item .badge-name {
          font-size: 10px;
        }
        
        .achievement-popup {
          padding: 24px;
          margin: 16px;
          width: calc(100% - 32px);
        }
        
        .achievement-popup .badge-icon {
          font-size: 48px;
        }
        
        .achievement-popup .badge-name {
          font-size: 20px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  // ==================== ACHIEVEMENT POPUPS ====================

  /**
   * Show achievement popup when a badge is earned
   * @param {object} badge - Badge object from BADGES
   */
  showAchievementPopup(badge) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'achievement-overlay';
    overlay.onclick = () => this.hideAchievementPopup();
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
      <span class="badge-icon">${badge.icon}</span>
      <div class="badge-title">🏅 Badge Earned!</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-description">${badge.description}</div>
      <div class="badge-points">+${badge.points} points</div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    
    // Trigger confetti
    this.triggerConfetti();
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      popup.classList.add('visible');
    });
    
    // Auto-hide after 4 seconds
    setTimeout(() => this.hideAchievementPopup(), 4000);
    
    // Store reference for manual close
    this.currentPopup = { overlay, popup };
  }

  /**
   * Show level up popup
   * @param {object} level - Level object from LEVELS
   */
  showLevelUpPopup(level) {
    const overlay = document.createElement('div');
    overlay.className = 'achievement-overlay';
    overlay.onclick = () => this.hideAchievementPopup();
    
    const popup = document.createElement('div');
    popup.className = 'achievement-popup level-up-popup';
    popup.innerHTML = `
      <span class="level-icon">🎉</span>
      <div class="badge-title">Level Up!</div>
      <div class="badge-name">You're now ${level.name}</div>
      <div class="badge-description">Level ${level.level} achieved!</div>
      <div class="badge-points" style="background: rgba(255,255,255,0.3);">
        ${level.minPoints}+ points
      </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    
    this.triggerConfetti(true); // More confetti for level up!
    
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      popup.classList.add('visible');
    });
    
    setTimeout(() => this.hideAchievementPopup(), 5000);
    
    this.currentPopup = { overlay, popup };
  }

  /**
   * Hide current achievement popup
   */
  hideAchievementPopup() {
    if (!this.currentPopup) return;
    
    const { overlay, popup } = this.currentPopup;
    overlay.classList.remove('visible');
    popup.classList.remove('visible');
    
    setTimeout(() => {
      overlay.remove();
      popup.remove();
    }, 400);
    
    this.currentPopup = null;
  }

  /**
   * Trigger confetti animation
   * @param {boolean} extra - More confetti for level up
   */
  triggerConfetti(extra = false) {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#ffd700', '#00d4ff'];
    const count = extra ? 100 : 50;
    
    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animation = `confetti-fall ${2 + Math.random() * 2}s linear forwards`;
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      
      document.body.appendChild(confetti);
      
      // Clean up after animation
      setTimeout(() => confetti.remove(), 4000);
    }
  }

  // ==================== PROFILE STATS CARD ====================

  /**
   * Create full profile stats card
   * @returns {HTMLElement}
   */
  createProfileCard() {
    if (!userService.isInitialized) {
      return this.createSignInPrompt();
    }
    
    const achievements = userService.getAchievementsSummary();
    const engagement = userService.getEngagementSummary();
    const userData = userService.userData || {};
    
    const card = document.createElement('div');
    card.className = 'profile-stats-card';
    
    // Format distance
    const distanceKm = ((engagement.totalDistance || 0) / 1000).toFixed(1);
    const timeHours = Math.floor((engagement.totalTime || 0) / 3600);
    const timeMinutes = Math.floor(((engagement.totalTime || 0) % 3600) / 60);
    
    card.innerHTML = `
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-avatar">
          ${userData.displayName ? userData.displayName.charAt(0).toUpperCase() : '👤'}
        </div>
        <div class="profile-info">
          <div class="profile-name">${userData.displayName || 'Trail Explorer'}</div>
          <div class="profile-level">
            <span class="level-badge">
              Lv.${achievements.level?.level || 1} ${achievements.level?.name || 'Newcomer'}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Level Progress -->
      <div class="level-progress-section">
        <div class="level-progress-header">
          <span class="level-progress-label">Progress to next level</span>
          <span class="level-progress-points">${achievements.points || 0} pts</span>
        </div>
        <div class="level-progress-bar">
          <div class="level-progress-fill" style="width: ${achievements.levelProgress || 0}%"></div>
        </div>
        <div class="level-progress-info">
          <span>${achievements.level?.name || 'Newcomer'}</span>
          <span>${achievements.pointsToNextLevel || 0} pts to next</span>
        </div>
      </div>
      
      <!-- Streak -->
      ${achievements.streakDays > 0 ? `
        <div class="streak-display">
          <span class="streak-icon">🔥</span>
          <span class="streak-text">Day Streak</span>
          <span class="streak-days">${achievements.streakDays}</span>
        </div>
      ` : ''}
      
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${distanceKm}</div>
          <div class="stat-label">km tracked</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${engagement.surveys || 0}</div>
          <div class="stat-label">surveys</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${engagement.publicGuides || 0}</div>
          <div class="stat-label">guides</div>
        </div>
      </div>
      
      <!-- Badges Section -->
      <div class="badges-section">
        <div class="badges-section-title">
          🏅 Badges (${achievements.badgeCount}/${achievements.totalBadges})
        </div>
        ${this.createBadgeGridHTML(achievements.badges)}
      </div>
    `;
    
    // Add click handlers to badges
    setTimeout(() => {
      card.querySelectorAll('.badge-item').forEach(item => {
        item.addEventListener('click', () => {
          const badgeId = item.dataset.badgeId;
          this.showBadgeDetails(badgeId);
        });
      });
    }, 0);
    
    return card;
  }

  /**
   * Create sign-in prompt for non-authenticated users
   * @returns {HTMLElement}
   */
  createSignInPrompt() {
    const div = document.createElement('div');
    div.className = 'profile-stats-card';
    div.innerHTML = `
      <div style="text-align: center; padding: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🏅</div>
        <h3 style="margin-bottom: 8px; color: #1a1a2e;">Track Your Progress</h3>
        <p style="color: #666; margin-bottom: 16px;">Sign in to earn badges, track your achievements, and compete on leaderboards.</p>
        <button onclick="window.showAuthModal && window.showAuthModal()" 
                style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                       color: white; border: none; padding: 12px 24px; 
                       border-radius: 8px; font-weight: 600; cursor: pointer;">
          Sign In to Start
        </button>
      </div>
    `;
    return div;
  }

  /**
   * Create badge grid HTML organized by category
   * @param {Array} earnedBadges - Array of earned badge objects
   * @returns {string} HTML string
   */
  createBadgeGridHTML(earnedBadges = []) {
    const earnedIds = new Set(earnedBadges.map(b => b.id));
    const categories = ['explorer', 'advocate', 'community', 'reporter', 'streak', 'photo', 'special'];
    
    let html = '';
    
    for (const category of categories) {
      const categoryBadges = getBadgesByCategory(category);
      if (!categoryBadges || categoryBadges.length === 0) continue;
      
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      
      html += `
        <div class="badge-category">
          <div class="badge-category-title">${categoryName}</div>
          <div class="badges-grid">
            ${categoryBadges.map(badge => `
              <div class="badge-item ${earnedIds.has(badge.id) ? 'earned' : 'locked'}" 
                   data-badge-id="${badge.id}"
                   title="${badge.description}">
                <span class="badge-icon">${badge.icon}</span>
                <span class="badge-name">${badge.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  /**
   * Show badge details in a popup
   * @param {string} badgeId - Badge ID
   */
  showBadgeDetails(badgeId) {
    const badge = getBadge(badgeId);
    if (!badge) return;
    
    const earned = userService.isInitialized && userService.hasBadge(badgeId);
    
    // Remove existing popup if any
    const existing = document.getElementById('badge-detail-overlay');
    if (existing) existing.remove();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'badge-detail-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10002;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    
    // Create popup
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 300px;
      text-align: center;
      transform: scale(0.9);
      transition: transform 0.3s;
    `;
    
    popup.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 16px;">${badge.icon}</div>
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${badge.name}</div>
      <div style="color: #666; margin-bottom: 12px;">${badge.description}</div>
      <div style="display: inline-block; background: ${earned ? '#667eea' : '#e0e0e0'}; 
                  color: ${earned ? 'white' : '#666'}; 
                  padding: 6px 16px; border-radius: 20px; font-size: 14px;">
        ${earned ? '✅ Earned!' : `🔒 +${badge.points} points`}
      </div>
    `;
    
    // Close on click
    overlay.onclick = () => {
      overlay.style.opacity = '0';
      popup.style.transform = 'scale(0.9)';
      setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      popup.style.transform = 'scale(1)';
    });
  }

  // ==================== MINI DISPLAY ====================

  /**
   * Create mini badge display for header/navigation
   * @returns {HTMLElement}
   */
  createMiniDisplay() {
    if (!userService.isInitialized) {
      return document.createElement('span');
    }
    
    const achievements = userService.getAchievementsSummary();
    
    const display = document.createElement('div');
    display.className = 'mini-badge-display';
    display.innerHTML = `
      <span class="level-icon">⭐</span>
      <span class="level-name">Lv.${achievements.level?.level || 1}</span>
      <span class="points">${achievements.points || 0} pts</span>
    `;
    
    display.addEventListener('click', () => this.showProfileModal());
    
    return display;
  }

  /**
   * Show profile in a modal
   */
  showProfileModal() {
    // Remove existing profile modal if any
    const existing = document.getElementById('profile-modal-overlay');
    if (existing) existing.remove();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'profile-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.style.cssText = `
      background: white;
      border-radius: 16px;
      max-width: 400px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
      transform: scale(0.9);
      transition: transform 0.3s;
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      z-index: 1;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#f0f0f0';
    closeBtn.onmouseout = () => closeBtn.style.background = 'none';
    closeBtn.onclick = () => {
      overlay.style.opacity = '0';
      modalContainer.style.transform = 'scale(0.9)';
      setTimeout(() => overlay.remove(), 300);
    };
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeBtn.click();
      }
    };
    
    // Add profile card
    const profileCard = this.createProfileCard();
    
    modalContainer.appendChild(closeBtn);
    modalContainer.appendChild(profileCard);
    overlay.appendChild(modalContainer);
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modalContainer.style.transform = 'scale(1)';
    });
    
    // ESC to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeBtn.click();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ==================== INTEGRATION HELPERS ====================

  /**
   * Hook into userService to show popups on badge earn
   */
  setupBadgeNotifications() {
    // Override the toast calls in userService with our fancy popups
    const originalAwardBadge = userService.awardBadge?.bind(userService);
    
    if (originalAwardBadge) {
      userService.awardBadge = async (badgeId) => {
        const hadBadge = userService.hasBadge(badgeId);
        await originalAwardBadge(badgeId);
        
        if (!hadBadge) {
          const badge = getBadge(badgeId);
          if (badge) {
            this.showAchievementPopup(badge);
          }
        }
      };
    }
  }

  /**
   * Update mini display when user data changes
   */
  refreshMiniDisplay() {
    const existing = document.querySelector('.mini-badge-display');
    if (existing) {
      const newDisplay = this.createMiniDisplay();
      existing.replaceWith(newDisplay);
    }
  }
}

// Create singleton instance
const gamificationUI = new GamificationUI();

// Export
export { GamificationUI, gamificationUI };

console.log('🏅 Gamification UI loaded');