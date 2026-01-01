/**
 * Accessibility Survey Form V2 - Comprehensive
 * Option B: All original fields with improved visual design
 * 
 * Features:
 * - Progress indicator
 * - Visual card selections instead of radio buttons
 * - Collapsible sections with completion indicators
 * - Better mobile layout
 * - Same data structure as original
 * 
 * Access Nature - Phase 2 Redesign
 * Created: December 2025
 */

import { toast } from '../utils/toast.js';
import { userService } from '../services/userService.js';

export class AccessibilityFormV2Full {
  constructor() {
    this.isOpen = false;
    this.currentCallback = null;
    this.formData = {};
    this.sections = [
      { id: 'basic', icon: '🗺️', title: 'Basic Trail Information', required: true },
      { id: 'mobility', icon: '♿', title: 'Mobility Accessibility', required: false },
      { id: 'surface', icon: '🛤️', title: 'Trail Surface & Quality', required: false },
      { id: 'visual', icon: '👁️', title: 'Visual & Environmental', required: false },
      { id: 'facilities', icon: '🚰', title: 'Facilities & Amenities', required: false },
      { id: 'signage', icon: '🪧', title: 'Signage & Navigation', required: false },
      { id: 'additional', icon: '📝', title: 'Additional Information', required: false }
    ];
    this.expandedSection = 'basic';
  }

  initialize() {
    this.injectStyles();
    this.loadFormHTML();
    this.setupEventListeners();
  }

  injectStyles() {
    if (document.getElementById('accessibility-form-v2f-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'accessibility-form-v2f-styles';
    styles.textContent = `
      /* ========== Form Container ========== */
      .af2f-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: none;
        overflow-y: auto;
        padding: 20px;
      }
      
      .af2f-overlay.open {
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
      
      .af2f-container {
        background: #f5f5f5;
        border-radius: 20px;
        max-width: 700px;
        width: 100%;
        margin: 20px auto;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        animation: af2f-slideUp 0.3s ease;
      }
      
      @keyframes af2f-slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* ========== Header ========== */
      .af2f-header {
        background: linear-gradient(135deg, #2c5530 0%, #4a7c59 100%);
        color: white;
        padding: 24px;
        position: relative;
      }
      
      .af2f-header h1 {
        font-size: 1.4rem;
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .af2f-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 0.9rem;
      }
      
      .af2f-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .af2f-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      /* ========== Progress Bar ========== */
      .af2f-progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.3);
        position: relative;
      }
      
      .af2f-progress-fill {
        height: 100%;
        background: #ffd700;
        transition: width 0.3s ease;
        width: 0%;
      }
      
      .af2f-progress-text {
        text-align: center;
        padding: 8px;
        background: rgba(0,0,0,0.1);
        font-size: 0.8rem;
        color: white;
      }
      
      /* ========== Form Body ========== */
      .af2f-body {
        padding: 16px;
        max-height: 65vh;
        overflow-y: auto;
      }
      
      /* ========== Section Accordion ========== */
      .af2f-section {
        background: white;
        border-radius: 12px;
        margin-bottom: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      
      .af2f-section:last-child {
        margin-bottom: 0;
      }
      
      .af2f-section-header {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: background 0.2s;
        user-select: none;
      }
      
      .af2f-section-header:hover {
        background: #f8f9fa;
      }
      
      .af2f-section-icon {
        font-size: 1.5rem;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f0f0;
        border-radius: 10px;
      }
      
      .af2f-section.expanded .af2f-section-icon {
        background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
      }
      
      .af2f-section-info {
        flex: 1;
      }
      
      .af2f-section-title {
        font-weight: 600;
        color: #333;
        font-size: 0.95rem;
        margin: 0;
      }
      
      .af2f-section-subtitle {
        font-size: 0.8rem;
        color: #666;
        margin-top: 2px;
      }
      
      .af2f-section-status {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .af2f-section-badge {
        font-size: 0.7rem;
        padding: 3px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      
      .af2f-section-badge.required {
        background: #fff3cd;
        color: #856404;
      }
      
      .af2f-section-badge.complete {
        background: #d4edda;
        color: #155724;
      }
      
      .af2f-section-badge.incomplete {
        background: #f8f9fa;
        color: #666;
      }
      
      .af2f-section-arrow {
        font-size: 1.2rem;
        color: #999;
        transition: transform 0.3s;
      }
      
      .af2f-section.expanded .af2f-section-arrow {
        transform: rotate(180deg);
      }
      
      .af2f-section-content {
        display: none;
        padding: 0 16px 16px 16px;
        border-top: 1px solid #f0f0f0;
      }
      
      .af2f-section.expanded .af2f-section-content {
        display: block;
        animation: af2f-fadeIn 0.3s ease;
      }
      
      @keyframes af2f-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      /* ========== Form Fields ========== */
      .af2f-field {
        margin-top: 16px;
      }
      
      .af2f-field:first-child {
        margin-top: 16px;
      }
      
      .af2f-label {
        display: block;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        font-size: 0.9rem;
      }
      
      .af2f-label .required {
        color: #dc3545;
        margin-left: 4px;
      }
      
      .af2f-hint {
        font-size: 0.8rem;
        color: #666;
        margin-top: 4px;
      }
      
      .af2f-input {
        width: 100%;
        padding: 12px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        font-size: 1rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      
      .af2f-input:focus {
        outline: none;
        border-color: #4a7c59;
        box-shadow: 0 0 0 3px rgba(74, 124, 89, 0.1);
      }
      
      .af2f-select {
        width: 100%;
        padding: 12px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        font-size: 1rem;
        background: white;
        cursor: pointer;
      }
      
      .af2f-textarea {
        width: 100%;
        padding: 12px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        font-size: 1rem;
        min-height: 80px;
        resize: vertical;
        font-family: inherit;
        box-sizing: border-box;
      }
      
      /* Row layout */
      .af2f-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      
      .af2f-row-3 {
        grid-template-columns: 1fr 1fr 1fr;
      }
      
      /* ========== Visual Selection Cards ========== */
      .af2f-card-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      
      .af2f-card-grid.cols-3 {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .af2f-card-grid.cols-4 {
        grid-template-columns: repeat(4, 1fr);
      }
      
      .af2f-select-card {
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        padding: 12px 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
      }
      
      .af2f-select-card:hover {
        border-color: #4a7c59;
        background: #f8fff8;
      }
      
      .af2f-select-card.selected {
        border-color: #4a7c59;
        background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
      }
      
      .af2f-select-card .card-icon {
        font-size: 1.5rem;
        display: block;
        margin-bottom: 4px;
      }
      
      .af2f-select-card .card-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #333;
        display: block;
        line-height: 1.2;
      }
      
      /* Chip selections */
      .af2f-chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .af2f-chip {
        padding: 8px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 20px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
      }
      
      .af2f-chip:hover {
        border-color: #4a7c59;
      }
      
      .af2f-chip.selected {
        border-color: #4a7c59;
        background: #4a7c59;
        color: white;
      }
      
      /* Checkbox styled */
      .af2f-checkbox {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
      }
      
      .af2f-checkbox:hover {
        border-color: #4a7c59;
      }
      
      .af2f-checkbox.checked {
        border-color: #4a7c59;
        background: #f8fff8;
      }
      
      .af2f-checkbox .check-box {
        width: 22px;
        height: 22px;
        border: 2px solid #ccc;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: transparent;
        transition: all 0.2s;
      }
      
      .af2f-checkbox.checked .check-box {
        background: #4a7c59;
        border-color: #4a7c59;
        color: white;
      }
      
      .af2f-checkbox .check-label {
        font-size: 0.9rem;
        color: #333;
      }
      
      /* Number input with label */
      .af2f-number-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .af2f-number-input {
        width: 80px;
        text-align: center;
        padding: 8px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
      }
      
      /* ========== Footer ========== */
      .af2f-footer {
        padding: 16px 24px;
        background: white;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 12px;
      }
      
      .af2f-btn {
        flex: 1;
        padding: 14px 20px;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .af2f-btn-primary {
        background: linear-gradient(135deg, #4a7c59 0%, #2c5530 100%);
        color: white;
      }
      
      .af2f-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(74, 124, 89, 0.4);
      }
      
      .af2f-btn-secondary {
        background: white;
        color: #666;
        border: 2px solid #e0e0e0;
      }
      
      .af2f-btn-secondary:hover {
        border-color: #4a7c59;
        color: #4a7c59;
      }
      
      /* ========== Mobile Responsive ========== */
      @media (max-width: 480px) {
        .af2f-container {
          margin: 10px;
          border-radius: 16px;
        }
        
        .af2f-body {
          padding: 12px;
        }
        
        .af2f-row,
        .af2f-row-3 {
          grid-template-columns: 1fr;
        }
        
        .af2f-card-grid,
        .af2f-card-grid.cols-3,
        .af2f-card-grid.cols-4 {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .af2f-section-header {
          padding: 12px;
        }
        
        .af2f-section-icon {
          width: 36px;
          height: 36px;
          font-size: 1.2rem;
        }
        
        .af2f-footer {
          flex-direction: column;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  loadFormHTML() {
    let overlay = document.getElementById('af2f-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'af2f-overlay';
      overlay.className = 'af2f-overlay';
      document.body.appendChild(overlay);
    }
    
    const sectionsHTML = this.sections.map(s => this.renderSection(s)).join('');
    
    overlay.innerHTML = `
      <div class="af2f-container">
        <!-- Header -->
        <div class="af2f-header">
          <h1>🌲 Comprehensive Trail Accessibility Survey</h1>
          <p>Help create detailed accessibility information for outdoor spaces</p>
          <button class="af2f-close" onclick="window.closeAccessibilityFormV2Full()">×</button>
          <div class="af2f-progress-bar">
            <div class="af2f-progress-fill" id="af2f-progress"></div>
          </div>
          <div class="af2f-progress-text" id="af2f-progress-text">0 of 7 sections complete</div>
        </div>
        
        <!-- Form Body -->
        <div class="af2f-body">
          ${sectionsHTML}
        </div>
        
        <!-- Footer -->
        <div class="af2f-footer">
          <button class="af2f-btn af2f-btn-secondary" onclick="window.closeAccessibilityFormV2Full()">Cancel</button>
          <button class="af2f-btn af2f-btn-primary" onclick="window.af2fSave()">Save Survey ✓</button>
        </div>
      </div>
    `;
  }

  renderSection(section) {
    const isExpanded = section.id === this.expandedSection;
    const content = this.getSectionContent(section.id);
    
    return `
      <div class="af2f-section ${isExpanded ? 'expanded' : ''}" data-section="${section.id}">
        <div class="af2f-section-header" onclick="window.af2fToggleSection('${section.id}')">
          <div class="af2f-section-icon">${section.icon}</div>
          <div class="af2f-section-info">
            <div class="af2f-section-title">${section.title}</div>
            <div class="af2f-section-subtitle" id="af2f-subtitle-${section.id}">Tap to expand</div>
          </div>
          <div class="af2f-section-status">
            ${section.required ? '<span class="af2f-section-badge required">Required</span>' : ''}
            <span class="af2f-section-badge incomplete" id="af2f-badge-${section.id}">0 filled</span>
          </div>
          <span class="af2f-section-arrow">▼</span>
        </div>
        <div class="af2f-section-content">
          ${content}
        </div>
      </div>
    `;
  }

  getSectionContent(sectionId) {
    switch (sectionId) {
      case 'basic':
        return `
          <div class="af2f-row">
            <div class="af2f-field">
              <label class="af2f-label">Trail Name <span class="required">*</span></label>
              <input type="text" class="af2f-input" name="trailName" placeholder="e.g., Riverside Nature Path" required>
            </div>
            <div class="af2f-field">
              <label class="af2f-label">Location/Address <span class="required">*</span></label>
              <input type="text" class="af2f-input" name="location" placeholder="e.g., Central Park, NYC" required>
            </div>
          </div>
          
          <div class="af2f-row">
            <div class="af2f-field">
              <label class="af2f-label">Trail Length (km)</label>
              <input type="number" class="af2f-input" name="trailLength" step="0.1" min="0" placeholder="e.g., 2.5">
            </div>
            <div class="af2f-field">
              <label class="af2f-label">Estimated Duration</label>
              <select class="af2f-select" name="estimatedTime">
                <option value="">Select duration</option>
                <option value="Under 30 minutes">Under 30 minutes</option>
                <option value="30-60 minutes">30-60 minutes</option>
                <option value="1-2 hours">1-2 hours</option>
                <option value="2-4 hours">2-4 hours</option>
                <option value="Half day">Half day</option>
                <option value="Full day">Full day</option>
              </select>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Trip Type</label>
            <div class="af2f-chip-grid" data-field="tripType" data-type="single">
              <div class="af2f-chip" data-value="Beach Promenade">🏖️ Beach</div>
              <div class="af2f-chip" data-value="Stream Path">🌊 Stream</div>
              <div class="af2f-chip" data-value="Park Route">🌳 Park</div>
              <div class="af2f-chip" data-value="Forest Trail">🌲 Forest</div>
              <div class="af2f-chip" data-value="Urban Route">🏙️ Urban</div>
              <div class="af2f-chip" data-value="Scenic Drive">🚗 Scenic</div>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Route Type</label>
            <div class="af2f-card-grid" data-field="routeType" data-type="single">
              <div class="af2f-select-card" data-value="Circular">
                <span class="card-icon">🔄</span>
                <span class="card-label">Circular Loop</span>
              </div>
              <div class="af2f-select-card" data-value="Round Trip">
                <span class="card-icon">↔️</span>
                <span class="card-label">Round Trip</span>
              </div>
            </div>
          </div>
        `;
        
      case 'mobility':
        return `
          <div class="af2f-field">
            <label class="af2f-label">Wheelchair Accessibility Level</label>
            <div class="af2f-card-grid cols-4" data-field="wheelchairAccess" data-type="single">
              <div class="af2f-select-card" data-value="Fully accessible">
                <span class="card-icon">♿</span>
                <span class="card-label">Fully Accessible</span>
              </div>
              <div class="af2f-select-card" data-value="Partially accessible">
                <span class="card-icon">⚠️</span>
                <span class="card-label">Partially</span>
              </div>
              <div class="af2f-select-card" data-value="Accessible with assistance">
                <span class="card-icon">🤝</span>
                <span class="card-label">With Assistance</span>
              </div>
              <div class="af2f-select-card" data-value="Not accessible">
                <span class="card-icon">🚫</span>
                <span class="card-label">Not Accessible</span>
              </div>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Disabled Parking</label>
            <div class="af2f-checkbox" data-field="disabledParking" data-value="Available">
              <span class="check-box">✓</span>
              <span class="check-label">Accessible parking available</span>
            </div>
          </div>
          
          <div class="af2f-field">
            <div class="af2f-number-row">
              <label class="af2f-label" style="margin-bottom:0">Number of accessible parking spaces:</label>
              <input type="number" class="af2f-number-input" name="parkingSpaces" min="0" value="0">
            </div>
          </div>
        `;
        
      case 'surface':
        return `
          <div class="af2f-field">
            <label class="af2f-label">Trail Surface Types (select all that apply)</label>
            <div class="af2f-chip-grid" data-field="trailSurface" data-type="multi">
              <div class="af2f-chip" data-value="Asphalt">🛣️ Asphalt</div>
              <div class="af2f-chip" data-value="Concrete">⬜ Concrete</div>
              <div class="af2f-chip" data-value="Stone">🪨 Stone</div>
              <div class="af2f-chip" data-value="Wood/Plastic Deck">🪵 Wood/Deck</div>
              <div class="af2f-chip" data-value="Compacted Gravel">⚪ Compacted Gravel</div>
              <div class="af2f-chip" data-value="Mixed Surfaces">🔀 Mixed</div>
              <div class="af2f-chip" data-value="Grass">🌿 Grass</div>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Surface Quality</label>
            <div class="af2f-card-grid" data-field="surfaceQuality" data-type="single">
              <div class="af2f-select-card" data-value="Excellent - smooth and well maintained">
                <span class="card-icon">✨</span>
                <span class="card-label">Excellent</span>
              </div>
              <div class="af2f-select-card" data-value="Fair - minor disruptions, rough patches, bumps, cracks">
                <span class="card-icon">👍</span>
                <span class="card-label">Fair</span>
              </div>
              <div class="af2f-select-card" data-value="Poor - serious disruptions, protruding stones, large grooves">
                <span class="card-icon">⚠️</span>
                <span class="card-label">Poor</span>
              </div>
              <div class="af2f-select-card" data-value="Vegetation blocks passage">
                <span class="card-icon">🌿</span>
                <span class="card-label">Overgrown</span>
              </div>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Trail Slopes</label>
            <div class="af2f-card-grid cols-3" data-field="trailSlopes" data-type="single">
              <div class="af2f-select-card" data-value="No slopes to mild slopes (up to 5%)">
                <span class="card-icon">➡️</span>
                <span class="card-label">Flat/Mild (&lt;5%)</span>
              </div>
              <div class="af2f-select-card" data-value="Moderate slopes - assistance recommended (5%-10%)">
                <span class="card-icon">📐</span>
                <span class="card-label">Moderate (5-10%)</span>
              </div>
              <div class="af2f-select-card" data-value="Steep slopes - not accessible (over 10%)">
                <span class="card-icon">⛰️</span>
                <span class="card-label">Steep (&gt;10%)</span>
              </div>
            </div>
          </div>
        `;
        
      case 'visual':
        return `
          <div class="af2f-field">
            <label class="af2f-label">Visual Impairment Adaptations (select all that apply)</label>
            <div class="af2f-chip-grid" data-field="visualAdaptations" data-type="multi">
              <div class="af2f-chip" data-value="Raised/protruding borders">Raised borders</div>
              <div class="af2f-chip" data-value="Texture/tactile differences">Tactile surfaces</div>
              <div class="af2f-chip" data-value="Color contrast differences">Color contrast</div>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Shade Coverage on Trail</label>
            <div class="af2f-card-grid cols-3" data-field="shadeCoverage" data-type="single">
              <div class="af2f-select-card" data-value="Plenty of shade">
                <span class="card-icon">🌳</span>
                <span class="card-label">Plenty of shade</span>
              </div>
              <div class="af2f-select-card" data-value="Intermittent shade">
                <span class="card-icon">⛅</span>
                <span class="card-label">Intermittent</span>
              </div>
              <div class="af2f-select-card" data-value="No shade">
                <span class="card-icon">☀️</span>
                <span class="card-label">No shade</span>
              </div>
            </div>
          </div>
          
          <div class="af2f-field">
            <div class="af2f-checkbox" data-field="lighting" data-value="Trail is lit in darkness">
              <span class="check-box">✓</span>
              <span class="check-label">💡 Trail is lit in darkness</span>
            </div>
          </div>
        `;
        
      case 'facilities':
        return `
          <div class="af2f-field">
            <label class="af2f-label">Accessible Water Fountains</label>
            <div class="af2f-card-grid cols-3" data-field="waterFountains" data-type="single">
              <div class="af2f-select-card" data-value="None">
                <span class="card-icon">🚫</span>
                <span class="card-label">None</span>
              </div>
              <div class="af2f-select-card" data-value="One accessible fountain">
                <span class="card-icon">🚰</span>
                <span class="card-label">One</span>
              </div>
              <div class="af2f-select-card" data-value="Multiple fountains along route">
                <span class="card-icon">🚰🚰</span>
                <span class="card-label">Multiple</span>
              </div>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Accessible Seating (select all that apply)</label>
            <div class="af2f-chip-grid" data-field="seating" data-type="multi">
              <div class="af2f-chip" data-value="No accessible benches">No benches</div>
              <div class="af2f-chip" data-value="One accessible bench">One bench</div>
              <div class="af2f-chip" data-value="Multiple benches along route">Multiple benches</div>
              <div class="af2f-chip" data-value="Benches without handrails">Without handrails</div>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Accessible Picnic Areas</label>
            <div class="af2f-checkbox" data-field="picnicAreas" data-value="Available">
              <span class="check-box">✓</span>
              <span class="check-label">🧺 Accessible picnic areas available</span>
            </div>
          </div>
          
          <div class="af2f-row af2f-row-3">
            <div class="af2f-field">
              <label class="af2f-label">Number of areas</label>
              <input type="number" class="af2f-input" name="picnicCount" min="0" value="0">
            </div>
            <div class="af2f-field">
              <label class="af2f-label">In shade</label>
              <input type="number" class="af2f-input" name="picnicShade" min="0" value="0">
            </div>
            <div class="af2f-field">
              <label class="af2f-label">In sun</label>
              <input type="number" class="af2f-input" name="picnicSun" min="0" value="0">
            </div>
          </div>
          
          <div class="af2f-field">
            <div class="af2f-checkbox" data-field="accessibleViewpoint" data-value="Available">
              <span class="check-box">✓</span>
              <span class="check-label">🏔️ Accessible viewpoint available</span>
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Accessible Restrooms</label>
            <div class="af2f-card-grid cols-3" data-field="restrooms" data-type="single">
              <div class="af2f-select-card" data-value="None">
                <span class="card-icon">🚫</span>
                <span class="card-label">None</span>
              </div>
              <div class="af2f-select-card" data-value="One unisex accessible restroom">
                <span class="card-icon">🚻</span>
                <span class="card-label">Unisex</span>
              </div>
              <div class="af2f-select-card" data-value="Separate accessible restrooms for men and women">
                <span class="card-icon">🚹🚺</span>
                <span class="card-label">Separate M/F</span>
              </div>
            </div>
          </div>
        `;
        
      case 'signage':
        return `
          <div class="af2f-field">
            <label class="af2f-label">Available Signage (select all that apply)</label>
            <div class="af2f-chip-grid" data-field="signage" data-type="multi">
              <div class="af2f-chip" data-value="Route map available">🗺️ Route map</div>
              <div class="af2f-chip" data-value="Clear directional signage">➡️ Directional signs</div>
              <div class="af2f-chip" data-value="Simple language signage">📖 Simple language</div>
              <div class="af2f-chip" data-value="Large, high-contrast accessible signage">🔤 High contrast</div>
              <div class="af2f-chip" data-value="Audio explanation compatible with T-mode hearing devices">🔊 Audio/T-mode</div>
            </div>
          </div>
          
          <div class="af2f-field">
            <div class="af2f-checkbox" data-field="qrCode" data-value="Available">
              <span class="check-box">✓</span>
              <span class="check-label">📱 QR code with site information available</span>
            </div>
          </div>
        `;
        
      case 'additional':
        return `
          <div class="af2f-field">
            <label class="af2f-label">Additional accessibility notes</label>
            <textarea class="af2f-textarea" name="additionalNotes" placeholder="Please provide additional details about accessibility features, challenges, or recommendations..."></textarea>
          </div>
          
          <div class="af2f-row">
            <div class="af2f-field">
              <label class="af2f-label">Surveyor Name (Optional)</label>
              <input type="text" class="af2f-input" name="surveyorName" placeholder="Your name">
            </div>
            <div class="af2f-field">
              <label class="af2f-label">Survey Date</label>
              <input type="date" class="af2f-input" name="surveyDate">
            </div>
          </div>
          
          <div class="af2f-field">
            <label class="af2f-label">Overall Accessibility Summary</label>
            <div class="af2f-card-grid cols-3" data-field="accessibilitySummary" data-type="single">
              <div class="af2f-select-card" data-value="Accessible">
                <span class="card-icon">✅</span>
                <span class="card-label">Accessible</span>
              </div>
              <div class="af2f-select-card" data-value="Partially accessible">
                <span class="card-icon">⚠️</span>
                <span class="card-label">Partial</span>
              </div>
              <div class="af2f-select-card" data-value="Not accessible">
                <span class="card-icon">❌</span>
                <span class="card-label">Not Accessible</span>
              </div>
            </div>
          </div>
        `;
        
      default:
        return '';
    }
  }

  setupEventListeners() {
    window.closeAccessibilityFormV2Full = () => this.close();
    window.af2fToggleSection = (id) => this.toggleSection(id);
    window.af2fSave = () => this.saveForm();
    
    const overlay = document.getElementById('af2f-overlay');
    if (!overlay) return;
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    
    // Card selections
    overlay.addEventListener('click', (e) => {
      const card = e.target.closest('.af2f-select-card');
      if (card) {
        const grid = card.closest('[data-field]');
        if (grid) {
          const type = grid.dataset.type;
          if (type === 'single') {
            grid.querySelectorAll('.af2f-select-card').forEach(c => c.classList.remove('selected'));
          }
          card.classList.toggle('selected');
          this.updateProgress();
        }
      }
      
      // Chip selections
      const chip = e.target.closest('.af2f-chip');
      if (chip) {
        const grid = chip.closest('[data-field]');
        if (grid) {
          const type = grid.dataset.type;
          if (type === 'single') {
            grid.querySelectorAll('.af2f-chip').forEach(c => c.classList.remove('selected'));
          }
          chip.classList.toggle('selected');
          this.updateProgress();
        }
      }
      
      // Checkbox toggle
      const checkbox = e.target.closest('.af2f-checkbox');
      if (checkbox) {
        checkbox.classList.toggle('checked');
        this.updateProgress();
      }
    });
    
    // Input changes
    overlay.addEventListener('input', () => {
      this.updateProgress();
    });
  }

  toggleSection(sectionId) {
    const overlay = document.getElementById('af2f-overlay');
    const section = overlay.querySelector(`[data-section="${sectionId}"]`);
    
    if (section.classList.contains('expanded')) {
      section.classList.remove('expanded');
      this.expandedSection = null;
    } else {
      overlay.querySelectorAll('.af2f-section').forEach(s => s.classList.remove('expanded'));
      section.classList.add('expanded');
      this.expandedSection = sectionId;
    }
  }

  updateProgress() {
    const overlay = document.getElementById('af2f-overlay');
    let completedSections = 0;
    
    this.sections.forEach(section => {
      const sectionEl = overlay.querySelector(`[data-section="${section.id}"]`);
      const content = sectionEl.querySelector('.af2f-section-content');
      
      // Count filled fields
      let filledCount = 0;
      let totalFields = 0;
      
      // Text inputs
      content.querySelectorAll('input[type="text"], input[type="date"], textarea, select').forEach(input => {
        totalFields++;
        if (input.value && input.value.trim()) filledCount++;
      });
      
      // Number inputs (count if > 0)
      content.querySelectorAll('input[type="number"]').forEach(input => {
        totalFields++;
        if (parseInt(input.value) > 0) filledCount++;
      });
      
      // Selections
      content.querySelectorAll('[data-field]').forEach(grid => {
        totalFields++;
        if (grid.querySelector('.selected')) filledCount++;
      });
      
      // Checkboxes
      content.querySelectorAll('.af2f-checkbox').forEach(cb => {
        totalFields++;
        if (cb.classList.contains('checked')) filledCount++;
      });
      
      // Update badge
      const badge = document.getElementById(`af2f-badge-${section.id}`);
      if (badge) {
        if (filledCount > 0) {
          badge.textContent = `${filledCount} filled`;
          badge.className = 'af2f-section-badge complete';
          completedSections++;
        } else {
          badge.textContent = '0 filled';
          badge.className = 'af2f-section-badge incomplete';
        }
      }
    });
    
    // Update progress bar
    const progress = (completedSections / this.sections.length) * 100;
    const progressBar = document.getElementById('af2f-progress');
    const progressText = document.getElementById('af2f-progress-text');
    
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${completedSections} of ${this.sections.length} sections complete`;
  }

  collectFormData() {
    const data = {};
    const overlay = document.getElementById('af2f-overlay');
    
    // Text inputs
    overlay.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], select, textarea').forEach(input => {
      if (input.name && input.value) {
        data[input.name] = input.value;
      }
    });
    
    // Single selections
    overlay.querySelectorAll('[data-field][data-type="single"]').forEach(grid => {
      const selected = grid.querySelector('.selected');
      if (selected) {
        data[grid.dataset.field] = selected.dataset.value;
      }
    });
    
    // Multi selections
    overlay.querySelectorAll('[data-field][data-type="multi"]').forEach(grid => {
      const selected = grid.querySelectorAll('.selected');
      if (selected.length > 0) {
        data[grid.dataset.field] = Array.from(selected).map(s => s.dataset.value);
      }
    });
    
    // Checkboxes
    overlay.querySelectorAll('.af2f-checkbox.checked').forEach(cb => {
      data[cb.dataset.field] = cb.dataset.value;
    });
    
    return data;
  }

  saveForm() {
    const data = this.collectFormData();
    
    // Validate required
    if (!data.trailName || !data.location) {
      toast.error('Please fill in Trail Name and Location');
      this.toggleSection('basic');
      return;
    }
    
    console.log('📋 Survey data collected:', data);
    
    if (userService.isInitialized) {
      userService.trackSurveyCompleted();
    }
    
    toast.success('✅ Accessibility survey saved!');
    
    if (this.currentCallback) {
      this.currentCallback(data);
    }
    
    this.close();
  }

  open(callback) {
    this.currentCallback = callback;
    this.initialize();
    
    const overlay = document.getElementById('af2f-overlay');
    if (overlay) {
      overlay.classList.add('open');
      this.isOpen = true;
      
      // Prevent pull-to-refresh while form is open
      document.body.classList.add('modal-open');
      
      // Reset form
      overlay.querySelectorAll('input, select, textarea').forEach(i => {
        if (i.type === 'number') {
          i.value = 0;
        } else {
          i.value = '';
        }
      });
      overlay.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
      overlay.querySelectorAll('.checked').forEach(c => c.classList.remove('checked'));
      
      // Expand first section
      overlay.querySelectorAll('.af2f-section').forEach(s => s.classList.remove('expanded'));
      overlay.querySelector('[data-section="basic"]')?.classList.add('expanded');
      
      this.updateProgress();
    }
  }

  close() {
    const overlay = document.getElementById('af2f-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      this.isOpen = false;
      
      // Re-enable pull-to-refresh
      document.body.classList.remove('modal-open');
    }
  }
}

// Create singleton instance
const accessibilityFormV2Full = new AccessibilityFormV2Full();

export { accessibilityFormV2Full };

console.log('📋 Accessibility Form V2 (Full) loaded');