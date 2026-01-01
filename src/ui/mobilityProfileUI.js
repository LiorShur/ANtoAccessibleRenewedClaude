/**
 * Mobility Profile UI
 * UI component for selecting and displaying user's mobility profile
 * 
 * Access Nature - Enhanced Accessibility Survey System
 * Created: December 2025
 */

import { userService } from '../services/userService.js';
import { MOBILITY_PROFILES, getAllProfiles, getProfile } from '../config/mobilityProfiles.js';
import { toast } from '../utils/toast.js';

class MobilityProfileUI {
  constructor() {
    this.isOpen = false;
    this.onSelectCallback = null;
    this.hasPromptedThisSession = false;
  }

  /**
   * Initialize the mobility profile UI
   */
  initialize() {
    this.injectStyles();
    this.createModal();
    
    // Store profiles data in userService for reference
    userService.setMobilityProfilesData(MOBILITY_PROFILES);
    
    console.log('♿ Mobility Profile UI initialized');
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('mobility-profile-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'mobility-profile-styles';
    styles.textContent = `
      /* ========== Modal Overlay ========== */
      .mp-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 15000;
        display: none;
        overflow-y: auto;
        padding: 20px;
      }

      .mp-overlay.open {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 60px;
      }

      /* ========== Modal Container ========== */
      .mp-container {
        background: white;
        border-radius: 20px;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        animation: mpSlideUp 0.3s ease;
        margin-bottom: 40px;
      }

      @keyframes mpSlideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* ========== Header ========== */
      .mp-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 24px;
        border-radius: 20px 20px 0 0;
        position: relative;
      }

      .mp-header h2 {
        margin: 0 0 8px 0;
        font-size: 1.4rem;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .mp-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 0.95rem;
      }

      .mp-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .mp-close:hover {
        background: rgba(255,255,255,0.3);
      }

      /* ========== Content ========== */
      .mp-content {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }

      .mp-subtitle {
        text-align: center;
        color: #666;
        margin-bottom: 20px;
        font-size: 0.95rem;
      }

      /* ========== Profile Cards ========== */
      .mp-profiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 12px;
      }

      .mp-profile-card {
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;
      }

      .mp-profile-card:hover {
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      }

      .mp-profile-card.selected {
        border-color: #667eea;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
      }

      .mp-profile-card.selected::after {
        content: '✓';
        position: absolute;
        top: 12px;
        right: 12px;
        width: 24px;
        height: 24px;
        background: #667eea;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
      }
      
      .mp-current-badge {
        position: absolute;
        top: -8px;
        left: 12px;
        background: #10b981;
        color: white;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
      }

      .mp-profile-card {
        position: relative;
      }

      .mp-profile-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }

      .mp-profile-icon {
        font-size: 2rem;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        border-radius: 12px;
      }

      .mp-profile-name {
        font-weight: 600;
        font-size: 1rem;
        color: #111827;
      }

      .mp-profile-desc {
        font-size: 0.85rem;
        color: #6b7280;
        margin-bottom: 12px;
      }

      .mp-profile-concerns {
        font-size: 0.8rem;
        color: #9ca3af;
      }

      .mp-profile-concerns strong {
        color: #6b7280;
        display: block;
        margin-bottom: 4px;
      }

      .mp-profile-concerns ul {
        margin: 0;
        padding-left: 16px;
      }

      .mp-profile-concerns li {
        margin-bottom: 2px;
      }

      /* ========== Footer ========== */
      .mp-footer {
        padding: 16px 24px 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        border-top: 1px solid #e5e7eb;
      }

      .mp-btn {
        padding: 12px 24px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .mp-btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .mp-btn-secondary:hover {
        background: #e5e7eb;
      }

      .mp-btn-primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
      }

      .mp-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .mp-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      /* ========== Current Profile Display ========== */
      .mp-current-profile {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mp-current-profile:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
      }

      .mp-current-icon {
        font-size: 1.5rem;
      }

      .mp-current-info {
        flex: 1;
      }

      .mp-current-label {
        font-size: 0.75rem;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .mp-current-name {
        font-weight: 600;
        color: #111827;
      }

      .mp-current-edit {
        color: #667eea;
        font-size: 0.85rem;
      }

      /* ========== Mobile Responsive ========== */
      @media (max-width: 600px) {
        .mp-overlay.open {
          padding: 10px;
          padding-top: 40px;
        }

        .mp-container {
          border-radius: 16px;
        }

        .mp-header {
          padding: 20px;
          border-radius: 16px 16px 0 0;
        }

        .mp-content {
          padding: 16px;
        }

        .mp-profiles {
          grid-template-columns: 1fr;
        }

        .mp-footer {
          flex-direction: column;
        }

        .mp-btn {
          width: 100%;
        }
      }

      /* ========== High Contrast Mode ========== */
      .high-contrast .mp-overlay {
        background: rgba(0, 0, 0, 0.9);
      }

      .high-contrast .mp-container {
        background: #000;
        border: 2px solid #fff;
      }

      .high-contrast .mp-header {
        background: #000;
        border-bottom: 2px solid #fff;
      }

      .high-contrast .mp-profile-card {
        background: #000;
        border-color: #fff;
      }

      .high-contrast .mp-profile-card:hover,
      .high-contrast .mp-profile-card.selected {
        border-color: #ffff00;
      }

      .high-contrast .mp-profile-name,
      .high-contrast .mp-profile-desc,
      .high-contrast .mp-profile-concerns {
        color: #fff;
      }

      .high-contrast .mp-btn-secondary {
        background: #333;
        color: #fff;
        border: 2px solid #fff;
      }

      .high-contrast .mp-btn-primary {
        background: #ffff00;
        color: #000;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Create the modal HTML
   */
  createModal() {
    if (document.getElementById('mobility-profile-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'mobility-profile-modal';
    modal.className = 'mp-overlay';
    modal.innerHTML = `
      <div class="mp-container">
        <div class="mp-header">
          <button class="mp-close" onclick="mobilityProfileUI.close()">&times;</button>
          <h2>♿ Your Mobility Profile</h2>
          <p>Help us personalize trail recommendations for your needs</p>
        </div>
        <div class="mp-content">
          <p class="mp-subtitle">Select the option that best describes your mobility needs</p>
          <div class="mp-profiles" id="mpProfileList">
            <!-- Profiles will be rendered here -->
          </div>
        </div>
        <div class="mp-footer">
          <button class="mp-btn mp-btn-secondary" onclick="mobilityProfileUI.close()">Skip for now</button>
          <button class="mp-btn mp-btn-primary" id="mpSaveBtn" onclick="mobilityProfileUI.save()" disabled>Save Profile</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Render profile cards
   */
  renderProfiles() {
    const container = document.getElementById('mpProfileList');
    if (!container) return;

    const currentProfile = userService.getMobilityProfile();
    const profiles = getAllProfiles();
    
    console.log('♿ Rendering mobility profiles, current:', currentProfile);

    container.innerHTML = profiles.map(profile => `
      <div class="mp-profile-card ${profile.id === currentProfile ? 'selected' : ''}" 
           data-profile="${profile.id}"
           onclick="mobilityProfileUI.selectProfile('${profile.id}')">
        ${profile.id === currentProfile ? '<div class="mp-current-badge">✓ Current</div>' : ''}
        <div class="mp-profile-header">
          <div class="mp-profile-icon">${profile.icon}</div>
          <div class="mp-profile-name">${profile.name}</div>
        </div>
        <div class="mp-profile-desc">${profile.description}</div>
        <div class="mp-profile-concerns">
          <strong>Key concerns:</strong>
          <ul>
            ${profile.concerns.slice(0, 3).map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('');

    this.selectedProfile = currentProfile;
    this.updateSaveButton();
  }

  /**
   * Open the modal
   * @param {Function} onSelect - Callback when profile is selected
   */
  open(onSelect = null) {
    this.onSelectCallback = onSelect;
    this.renderProfiles();
    
    const modal = document.getElementById('mobility-profile-modal');
    if (modal) {
      modal.classList.add('open');
      this.isOpen = true;
    }
  }

  /**
   * Close the modal
   */
  close() {
    const modal = document.getElementById('mobility-profile-modal');
    if (modal) {
      modal.classList.remove('open');
      this.isOpen = false;
    }
  }

  /**
   * Select a profile
   * @param {string} profileId 
   */
  selectProfile(profileId) {
    // Update UI
    document.querySelectorAll('.mp-profile-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.profile === profileId);
    });

    this.selectedProfile = profileId;
    this.updateSaveButton();
  }

  /**
   * Update save button state
   */
  updateSaveButton() {
    const btn = document.getElementById('mpSaveBtn');
    if (btn) {
      btn.disabled = !this.selectedProfile;
    }
  }

  /**
   * Save the selected profile
   */
  async save() {
    if (!this.selectedProfile) return;

    const success = await userService.setMobilityProfile(this.selectedProfile);
    
    if (success) {
      const profile = getProfile(this.selectedProfile);
      toast.success(`${profile.icon} Profile set to: ${profile.name}`);
      
      if (this.onSelectCallback) {
        this.onSelectCallback(this.selectedProfile);
      }
      
      this.close();
    } else {
      toast.error('Failed to save profile. Please try again.');
    }
  }

  /**
   * Prompt user to set profile if not set (called on first login)
   */
  promptIfNeeded() {
    // Only prompt once per session
    if (this.hasPromptedThisSession) return;
    
    // Only prompt logged-in users
    if (!userService.isInitialized) return;
    
    // Only prompt if no profile set
    const currentProfile = userService.getMobilityProfile();
    if (currentProfile) return;

    this.hasPromptedThisSession = true;

    // Show a subtle toast first, then open modal if they want
    setTimeout(() => {
      toast.info('👋 Set up your mobility profile for personalized trail recommendations', {
        duration: 8000,
        action: {
          text: 'Set up',
          onClick: () => this.open()
        }
      });
    }, 2000);
  }

  /**
   * Get a compact display element for showing current profile
   * @returns {HTMLElement}
   */
  getCurrentProfileElement() {
    const profile = userService.getMobilityProfile();
    const profileData = profile ? getProfile(profile) : null;

    const element = document.createElement('div');
    element.className = 'mp-current-profile';
    element.onclick = () => this.open();

    if (profileData) {
      element.innerHTML = `
        <span class="mp-current-icon">${profileData.icon}</span>
        <div class="mp-current-info">
          <div class="mp-current-label">Mobility Profile</div>
          <div class="mp-current-name">${profileData.name}</div>
        </div>
        <span class="mp-current-edit">Edit →</span>
      `;
    } else {
      element.innerHTML = `
        <span class="mp-current-icon">♿</span>
        <div class="mp-current-info">
          <div class="mp-current-label">Mobility Profile</div>
          <div class="mp-current-name">Not set</div>
        </div>
        <span class="mp-current-edit">Set up →</span>
      `;
    }

    return element;
  }

  /**
   * Get profile info for form pre-filling
   * @returns {object|null}
   */
  getProfileForFormPrefill() {
    const profileId = userService.getMobilityProfile();
    if (!profileId) return null;
    return getProfile(profileId);
  }
}

// Create and export singleton
export const mobilityProfileUI = new MobilityProfileUI();

// Make available globally for onclick handlers
window.mobilityProfileUI = mobilityProfileUI;

console.log('♿ Mobility Profile UI module loaded');