/**
 * Accessibility Survey Form V2 - Quick + Deep Approach
 * Option A: Visual-first design with essential questions upfront
 * and optional detailed categories that expand
 * 
 * Access Nature - Phase 2 Redesign
 * Created: December 2025
 */

import { toast } from '../utils/toast.js';
import { userService } from '../services/userService.js';
import { getProfile } from '../config/mobilityProfiles.js';

export class AccessibilityFormV2Quick {
  constructor() {
    this.isOpen = false;
    this.currentCallback = null;
    this.formData = {};
    this.currentPhase = 1; // 1 = Quick, 2 = Detailed
    this.expandedCategories = new Set();
    this.userMobilityProfile = null; // Cache user's mobility profile
  }

  initialize() {
    this.injectStyles();
    this.loadFormHTML();
    this.setupEventListeners();
  }

  injectStyles() {
    if (document.getElementById('accessibility-form-v2-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'accessibility-form-v2-styles';
    styles.textContent = `
      /* ========== Global Reset ========== */
      .af2-overlay *,
      .af2-overlay *::before,
      .af2-overlay *::after {
        box-sizing: border-box;
      }
      
      /* ========== Form Container ========== */
      .af2-overlay {
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
        overflow-x: hidden;
        padding: 80px 20px 20px 20px; /* Account for nav bars at top */
      }
      
      .af2-overlay.open {
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
      
      .af2-container {
        background: white;
        border-radius: 20px;
        max-width: 600px;
        width: 100%;
        margin: 0 auto 20px auto;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        animation: af2-slideUp 0.3s ease;
        max-height: calc(100vh - 100px); /* Ensure it fits in viewport */
        display: flex;
        flex-direction: column;
      }
      
      @keyframes af2-slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* ========== Header ========== */
      .af2-header {
        background: linear-gradient(135deg, #2c5530 0%, #4a7c59 100%);
        color: white;
        padding: 24px;
        position: relative;
      }
      
      .af2-header h1 {
        font-size: 1.5rem;
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .af2-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 0.95rem;
      }
      
      .af2-close {
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
      
      .af2-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      /* ========== Progress ========== */
      .af2-progress {
        display: flex;
        padding: 16px 24px;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        gap: 8px;
      }
      
      .af2-progress-step {
        flex: 1;
        text-align: center;
        padding: 8px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #999;
        background: #e9ecef;
        transition: all 0.3s;
      }
      
      .af2-progress-step.active {
        background: #4a7c59;
        color: white;
      }
      
      .af2-progress-step.completed {
        background: #d4edda;
        color: #155724;
      }
      
      /* ========== Form Body ========== */
      .af2-body {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0; /* Required for flex child scrolling */
      }
      
      .af2-phase {
        display: none;
      }
      
      .af2-phase.active {
        display: block;
        animation: af2-fadeIn 0.3s ease;
      }
      
      @keyframes af2-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      /* ========== Form Fields ========== */
      .af2-field {
        margin-bottom: 24px;
      }
      
      .af2-field:last-child {
        margin-bottom: 0;
      }
      
      .af2-label {
        display: block;
        font-weight: 600;
        color: #333;
        margin-bottom: 10px;
        font-size: 0.95rem;
      }
      
      .af2-label .required {
        color: #dc3545;
        margin-left: 4px;
      }
      
      .af2-input {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        font-size: 1rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      
      .af2-input:focus {
        outline: none;
        border-color: #4a7c59;
        box-shadow: 0 0 0 3px rgba(74, 124, 89, 0.1);
      }
      
      /* ========== Visual Selection Cards ========== */
      .af2-card-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .af2-card-grid.cols-3 {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .af2-card-grid.cols-4 {
        grid-template-columns: repeat(4, 1fr);
      }
      
      .af2-card-grid.cols-5 {
        grid-template-columns: repeat(5, 1fr);
      }
      
      .af2-select-card {
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 16px 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
      }
      
      .af2-select-card:hover {
        border-color: #4a7c59;
        background: #f8fff8;
      }
      
      .af2-select-card.selected {
        border-color: #4a7c59;
        background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
      }
      
      .af2-select-card .card-icon {
        font-size: 2rem;
        margin-bottom: 8px;
        display: block;
      }
      
      .af2-select-card .card-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #333;
        display: block;
      }
      
      .af2-select-card .card-desc {
        font-size: 0.75rem;
        color: #666;
        margin-top: 4px;
        display: block;
      }
      
      /* Multi-select chips */
      .af2-chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        max-width: 100%;
      }
      
      .af2-chip {
        padding: 10px 16px;
        border: 2px solid #e0e0e0;
        border-radius: 25px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 1;
        max-width: 100%;
        box-sizing: border-box;
        word-wrap: break-word;
      }
      
      .af2-chip:hover {
        border-color: #4a7c59;
      }
      
      .af2-chip.selected {
        border-color: #4a7c59;
        background: #4a7c59;
        color: white;
      }
      
      /* ========== Difficulty Slider ========== */
      .af2-slider-container {
        padding: 10px 0;
      }
      
      .af2-slider-labels {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .af2-slider-label {
        font-size: 0.8rem;
        color: #666;
        text-align: center;
      }
      
      .af2-slider-label.active {
        color: #4a7c59;
        font-weight: 600;
      }
      
      .af2-slider {
        width: 100%;
        height: 8px;
        -webkit-appearance: none;
        background: linear-gradient(to right, #22c55e 0%, #f59e0b 50%, #ef4444 100%);
        border-radius: 4px;
        outline: none;
      }
      
      .af2-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 24px;
        height: 24px;
        background: white;
        border: 3px solid #4a7c59;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      
      /* ========== Category Cards (Phase 2) ========== */
      .af2-category-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .af2-category-card {
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
        position: relative;
      }
      
      .af2-category-card:hover {
        border-color: #4a7c59;
      }
      
      .af2-category-card.expanded {
        grid-column: 1 / -1;
        border-color: #4a7c59;
        background: #f8fff8;
      }
      
      .af2-category-card.has-data {
        border-color: #28a745;
      }
      
      .af2-category-card .cat-header {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .af2-category-card .cat-icon {
        font-size: 1.5rem;
      }
      
      .af2-category-card .cat-info {
        flex: 1;
      }
      
      .af2-category-card .cat-title {
        font-weight: 600;
        color: #333;
        font-size: 0.95rem;
      }
      
      .af2-category-card .cat-desc {
        font-size: 0.8rem;
        color: #666;
      }
      
      .af2-category-card .cat-status {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: transparent;
      }
      
      .af2-category-card.has-data .cat-status {
        background: #28a745;
        border-color: #28a745;
        color: white;
      }
      
      .af2-category-content {
        display: none;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
      }
      
      .af2-category-card.expanded .af2-category-content {
        display: block;
      }
      
      /* ========== Subsection in Categories ========== */
      .af2-subsection {
        margin-bottom: 20px;
      }
      
      .af2-subsection:last-child {
        margin-bottom: 0;
      }
      
      .af2-subsection-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: #555;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* ========== Number Input with Stepper ========== */
      .af2-number-input {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .af2-number-input button {
        width: 36px;
        height: 36px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        background: white;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .af2-number-input button:hover {
        border-color: #4a7c59;
        background: #f8fff8;
      }
      
      .af2-number-input input {
        width: 60px;
        text-align: center;
        padding: 8px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 1rem;
      }
      
      .af2-number-input.af2-readonly {
        justify-content: center;
      }
      
      .af2-number-input.af2-readonly input {
        background: #f0f9f0;
        border-color: #4a7c59;
        color: #2c5530;
        font-weight: 600;
        cursor: default;
      }
      
      /* ========== Notes Textarea ========== */
      .af2-textarea {
        width: 100%;
        padding: 14px 16px;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        font-size: 1rem;
        min-height: 100px;
        resize: vertical;
        font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      
      .af2-textarea:focus {
        outline: none;
        border-color: #4a7c59;
        box-shadow: 0 0 0 3px rgba(74, 124, 89, 0.1);
      }
      
      /* ========== Footer Buttons ========== */
      .af2-footer {
        padding: 20px 24px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      
      .af2-btn {
        flex: 1;
        padding: 14px 24px;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        min-width: 140px;
      }
      
      .af2-btn-primary {
        background: linear-gradient(135deg, #4a7c59 0%, #2c5530 100%);
        color: white;
      }
      
      .af2-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(74, 124, 89, 0.4);
      }
      
      .af2-btn-secondary {
        background: white;
        color: #4a7c59;
        border: 2px solid #4a7c59;
      }
      
      .af2-btn-secondary:hover {
        background: #f8fff8;
      }
      
      .af2-btn-text {
        background: transparent;
        color: #666;
        flex: none;
        padding: 14px 16px;
      }
      
      .af2-btn-text:hover {
        color: #333;
      }
      
      /* ========== Divider ========== */
      .af2-divider {
        height: 1px;
        background: #e9ecef;
        margin: 24px 0;
      }
      
      /* Responsive 3-column grid - MUST be before media queries */
      .af2-grid-3col {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        max-width: 100%;
      }
      
      /* ========== Mobile Responsive ========== */
      @media (max-width: 600px) {
        .af2-overlay {
          padding: 0;
          padding-top: calc(60px + env(safe-area-inset-top, 0)); /* Account for nav bar */
        }
        
        .af2-container {
          margin: 0;
          border-radius: 16px 16px 0 0;
          max-width: 100vw;
          width: 100%;
          height: calc(100vh - 60px);
          height: calc(100dvh - 60px); /* Dynamic viewport height for mobile */
          max-height: calc(100vh - 60px);
          max-height: calc(100dvh - 60px);
          overflow: hidden;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        
        .af2-header {
          padding: 16px;
          padding-top: 20px; /* Extra space for close button */
          flex-shrink: 0;
        }
        
        .af2-header h1 {
          font-size: 1.25rem;
        }
        
        .af2-body {
          padding: 16px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
          min-height: 0;
        }
        
        .af2-footer {
          flex-direction: column;
          padding: 16px;
          flex-shrink: 0;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
        }
        
        .af2-card-grid,
        .af2-card-grid.cols-3,
        .af2-card-grid.cols-4,
        .af2-card-grid.cols-5 {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .af2-category-grid {
          grid-template-columns: 1fr;
        }
        
        .af2-category-content {
          max-width: 100%;
          overflow-x: hidden;
          padding: 16px;
          box-sizing: border-box;
        }
        
        .af2-category-card {
          max-width: 100%;
          overflow: hidden;
        }
        
        .af2-btn {
          width: 100%;
        }
        
        /* Fix 3-column grid on mobile - stack vertically */
        .af2-grid-3col {
          grid-template-columns: 1fr !important;
          gap: 16px;
          max-width: 100%;
        }
        
        .af2-number-input {
          justify-content: flex-start;
          max-width: 100%;
        }
        
        .af2-number-input input {
          width: 50px;
        }
        
        .af2-subsection {
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        
        /* Fix chip grids overflow */
        .af2-chip-grid {
          max-width: 100%;
        }
        
        .af2-chip {
          flex-shrink: 1;
          font-size: 0.85rem;
          padding: 8px 12px;
        }
        
        /* Ensure all sections don't overflow */
        .af2-section,
        .af2-category,
        .af2-phase {
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        
        /* Fix textarea width */
        .af2-textarea {
          max-width: 100%;
          box-sizing: border-box;
        }
        
        /* Fix select input */
        .af2-select {
          max-width: 100%;
          box-sizing: border-box;
        }
        
        /* Fix text input */
        .af2-input {
          max-width: 100%;
          box-sizing: border-box;
        }
      }
      
      @media (max-width: 400px) {
        .af2-card-grid,
        .af2-card-grid.cols-3,
        .af2-card-grid.cols-4 {
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        
        .af2-select-card {
          padding: 12px 8px;
        }
        
        .af2-select-card .card-icon {
          font-size: 1.5rem;
        }
        
        .af2-select-card .card-label {
          font-size: 0.75rem;
        }
        
        .af2-chip {
          font-size: 0.8rem;
          padding: 6px 10px;
        }
        
        .af2-number-input button {
          width: 32px;
          height: 32px;
          font-size: 1rem;
        }
        
        .af2-number-input input {
          width: 45px;
          padding: 6px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  loadFormHTML() {
    // Create overlay container if it doesn't exist
    let overlay = document.getElementById('af2-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'af2-overlay';
      overlay.className = 'af2-overlay';
      document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
      <div class="af2-container">
        <!-- Header -->
        <div class="af2-header">
          <h1>🌲 Trail Accessibility Survey</h1>
          <p>Help others discover accessible outdoor spaces</p>
          <button class="af2-close" onclick="window.closeAccessibilityFormV2()">×</button>
        </div>
        
        <!-- Progress -->
        <div class="af2-progress">
          <div class="af2-progress-step active" data-step="1">① Quick Assessment</div>
          <div class="af2-progress-step" data-step="2">② Add Details (Optional)</div>
        </div>
        
        <!-- Form Body -->
        <div class="af2-body">
          <!-- Phase 1: Quick Assessment -->
          <div class="af2-phase active" data-phase="1">
            ${this.renderPhase1()}
          </div>
          
          <!-- Phase 2: Detailed Categories -->
          <div class="af2-phase" data-phase="2">
            ${this.renderPhase2()}
          </div>
        </div>
        
        <!-- Footer -->
        <div class="af2-footer">
          <button class="af2-btn af2-btn-text" onclick="window.closeAccessibilityFormV2()">Cancel</button>
          <button class="af2-btn af2-btn-secondary" id="af2-back-btn" style="display:none" onclick="window.af2GoBack()">← Back</button>
          <button class="af2-btn af2-btn-primary" id="af2-next-btn" onclick="window.af2Next()">Save Quick Assessment ✓</button>
        </div>
      </div>
    `;
  }

  renderPhase1() {
    return `
      <!-- Trail Name -->
      <div class="af2-field">
        <label class="af2-label">Trail Name <span class="required">*</span></label>
        <input type="text" class="af2-input" id="af2-trailName" name="trailName" placeholder="e.g., Riverside Nature Path" required>
      </div>
      
      <!-- Location -->
      <div class="af2-field">
        <label class="af2-label">Location <span class="required">*</span></label>
        <input type="text" class="af2-input" id="af2-location" name="location" placeholder="e.g., Central Park, NYC" required>
      </div>
      
      <div class="af2-divider"></div>
      
      <!-- Wheelchair Accessibility -->
      <div class="af2-field">
        <label class="af2-label">Wheelchair Accessibility</label>
        <div class="af2-card-grid cols-4" data-field="wheelchairAccess" data-type="single">
          <div class="af2-select-card" data-value="Fully accessible">
            <span class="card-icon">♿</span>
            <span class="card-label">Fully Accessible</span>
          </div>
          <div class="af2-select-card" data-value="Partially accessible">
            <span class="card-icon">⚠️</span>
            <span class="card-label">Partial</span>
          </div>
          <div class="af2-select-card" data-value="Accessible with assistance">
            <span class="card-icon">🤝</span>
            <span class="card-label">With Help</span>
          </div>
          <div class="af2-select-card" data-value="Not accessible">
            <span class="card-icon">🚫</span>
            <span class="card-label">Not Accessible</span>
          </div>
        </div>
      </div>
      
      <!-- Surface Type -->
      <div class="af2-field">
        <label class="af2-label">Trail Surface (select all that apply)</label>
        <div class="af2-chip-grid" data-field="trailSurface" data-type="multi">
          <div class="af2-chip" data-value="Asphalt">🛣️ Paved</div>
          <div class="af2-chip" data-value="Concrete">⬜ Concrete</div>
          <div class="af2-chip" data-value="Compacted Gravel">⚪ Gravel</div>
          <div class="af2-chip" data-value="Stone">🪨 Stone</div>
          <div class="af2-chip" data-value="Wood/Plastic Deck">🪵 Boardwalk</div>
          <div class="af2-chip" data-value="Grass">🌿 Grass</div>
          <div class="af2-chip" data-value="Mixed Surfaces">🔀 Mixed</div>
        </div>
      </div>
      
      <!-- Difficulty Slider -->
      <div class="af2-field">
        <label class="af2-label">Overall Difficulty</label>
        <div class="af2-slider-container">
          <div class="af2-slider-labels">
            <span class="af2-slider-label active" data-level="1">😊 Easy</span>
            <span class="af2-slider-label" data-level="2">😐 Moderate</span>
            <span class="af2-slider-label" data-level="3">😰 Challenging</span>
          </div>
          <input type="range" class="af2-slider" id="af2-difficulty" name="difficulty" min="1" max="3" value="1">
        </div>
      </div>
      
      <!-- Route Type Quick -->
      <div class="af2-field">
        <label class="af2-label">Route Type</label>
        <div class="af2-card-grid" data-field="routeType" data-type="single">
          <div class="af2-select-card" data-value="Circular">
            <span class="card-icon">🔄</span>
            <span class="card-label">Loop</span>
            <span class="card-desc">Returns to start</span>
          </div>
          <div class="af2-select-card" data-value="Round Trip">
            <span class="card-icon">↔️</span>
            <span class="card-label">Out & Back</span>
            <span class="card-desc">Same path both ways</span>
          </div>
        </div>
      </div>
    `;
  }

  renderPhase2() {
    return `
      <p style="color: #666; margin-bottom: 20px; text-align: center;">
        Tap a category to add more details. All fields are optional.
      </p>
      
      <div class="af2-category-grid">
        <!-- Parking -->
        <div class="af2-category-card" data-category="parking">
          <div class="cat-header">
            <span class="cat-icon">🅿️</span>
            <div class="cat-info">
              <div class="cat-title">Parking</div>
              <div class="cat-desc">Accessible spaces</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderParkingFields()}
          </div>
        </div>
        
        <!-- Restrooms -->
        <div class="af2-category-card" data-category="restrooms">
          <div class="cat-header">
            <span class="cat-icon">🚻</span>
            <div class="cat-info">
              <div class="cat-title">Restrooms</div>
              <div class="cat-desc">Accessible facilities</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderRestroomFields()}
          </div>
        </div>
        
        <!-- Water & Seating -->
        <div class="af2-category-card" data-category="amenities">
          <div class="cat-header">
            <span class="cat-icon">🚰</span>
            <div class="cat-info">
              <div class="cat-title">Water & Seating</div>
              <div class="cat-desc">Fountains, benches</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderAmenitiesFields()}
          </div>
        </div>
        
        <!-- Surface Details -->
        <div class="af2-category-card" data-category="surface">
          <div class="cat-header">
            <span class="cat-icon">🛤️</span>
            <div class="cat-info">
              <div class="cat-title">Surface Quality</div>
              <div class="cat-desc">Condition, slopes</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderSurfaceFields()}
          </div>
        </div>
        
        <!-- Visual Accessibility -->
        <div class="af2-category-card" data-category="visual">
          <div class="cat-header">
            <span class="cat-icon">👁️</span>
            <div class="cat-info">
              <div class="cat-title">Visual Access</div>
              <div class="cat-desc">Tactile, contrast</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderVisualFields()}
          </div>
        </div>
        
        <!-- Environment -->
        <div class="af2-category-card" data-category="environment">
          <div class="cat-header">
            <span class="cat-icon">⛱️</span>
            <div class="cat-info">
              <div class="cat-title">Environment</div>
              <div class="cat-desc">Shade, lighting</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderEnvironmentFields()}
          </div>
        </div>
        
        <!-- Signage -->
        <div class="af2-category-card" data-category="signage">
          <div class="cat-header">
            <span class="cat-icon">🪧</span>
            <div class="cat-info">
              <div class="cat-title">Signage</div>
              <div class="cat-desc">Maps, directions</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderSignageFields()}
          </div>
        </div>
        
        <!-- Picnic & Views -->
        <div class="af2-category-card" data-category="picnic">
          <div class="cat-header">
            <span class="cat-icon">🧺</span>
            <div class="cat-info">
              <div class="cat-title">Picnic & Views</div>
              <div class="cat-desc">Tables, viewpoints</div>
            </div>
            <div class="cat-status">✓</div>
          </div>
          <div class="af2-category-content">
            ${this.renderPicnicFields()}
          </div>
        </div>
      </div>
      
      <!-- Additional Notes -->
      <div class="af2-field">
        <label class="af2-label">📝 Additional Notes</label>
        <textarea class="af2-textarea" id="af2-additionalNotes" name="additionalNotes" 
          placeholder="Any other accessibility information, tips, or warnings..."></textarea>
      </div>
      
      <!-- Trail Info -->
      <div class="af2-divider"></div>
      
      <div class="af2-field" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <label class="af2-label">Trail Length (km)</label>
          <input type="number" class="af2-input" id="af2-trailLength" name="trailLength" step="0.1" min="0" placeholder="e.g., 2.5">
        </div>
        <div>
          <label class="af2-label">Estimated Duration</label>
          <select class="af2-input" id="af2-estimatedTime" name="estimatedTime">
            <option value="">Select...</option>
            <option value="Under 30 minutes">Under 30 min</option>
            <option value="30-60 minutes">30-60 min</option>
            <option value="1-2 hours">1-2 hours</option>
            <option value="2-4 hours">2-4 hours</option>
            <option value="Half day">Half day</option>
            <option value="Full day">Full day</option>
          </select>
        </div>
      </div>
      
      <!-- Trip Type -->
      <div class="af2-field">
        <label class="af2-label">Trip Type</label>
        <div class="af2-chip-grid" data-field="tripType" data-type="single">
          <div class="af2-chip" data-value="Beach Promenade">🏖️ Beach</div>
          <div class="af2-chip" data-value="Stream Path">🌊 Stream</div>
          <div class="af2-chip" data-value="Park Route">🌳 Park</div>
          <div class="af2-chip" data-value="Forest Trail">🌲 Forest</div>
          <div class="af2-chip" data-value="Urban Route">🏙️ Urban</div>
          <div class="af2-chip" data-value="Scenic Drive">🚗 Scenic</div>
        </div>
      </div>
    `;
  }

  renderParkingFields() {
    return `
      <div class="af2-subsection">
        <div class="af2-chip-grid" data-field="disabledParking" data-type="single">
          <div class="af2-chip" data-value="Available">✓ Accessible parking available</div>
          <div class="af2-chip" data-value="Not available">✗ No accessible parking</div>
        </div>
      </div>
      <div class="af2-subsection">
        <div class="af2-subsection-title">Number of accessible spaces</div>
        <div class="af2-number-input">
          <button type="button" onclick="window.af2NumberStep('parkingSpaces', -1)">−</button>
          <input type="number" id="af2-parkingSpaces" name="parkingSpaces" value="0" min="0">
          <button type="button" onclick="window.af2NumberStep('parkingSpaces', 1)">+</button>
        </div>
      </div>
    `;
  }

  renderRestroomFields() {
    return `
      <div class="af2-card-grid" data-field="restrooms" data-type="single">
        <div class="af2-select-card" data-value="None">
          <span class="card-icon">🚫</span>
          <span class="card-label">None</span>
        </div>
        <div class="af2-select-card" data-value="One unisex accessible restroom">
          <span class="card-icon">🚻</span>
          <span class="card-label">Unisex</span>
        </div>
        <div class="af2-select-card" data-value="Separate accessible restrooms for men and women">
          <span class="card-icon">🚹🚺</span>
          <span class="card-label">Separate</span>
        </div>
      </div>
    `;
  }

  renderAmenitiesFields() {
    return `
      <div class="af2-subsection">
        <div class="af2-subsection-title">Water Fountains</div>
        <div class="af2-card-grid cols-3" data-field="waterFountains" data-type="single">
          <div class="af2-select-card" data-value="None">
            <span class="card-label">None</span>
          </div>
          <div class="af2-select-card" data-value="One accessible fountain">
            <span class="card-label">One</span>
          </div>
          <div class="af2-select-card" data-value="Multiple fountains along route">
            <span class="card-label">Multiple</span>
          </div>
        </div>
      </div>
      <div class="af2-subsection">
        <div class="af2-subsection-title">Seating Options</div>
        <div class="af2-chip-grid" data-field="seating" data-type="single">
          <div class="af2-chip" data-value="No accessible benches">No benches</div>
          <div class="af2-chip" data-value="One accessible bench">One bench</div>
          <div class="af2-chip" data-value="Multiple benches along route">Multiple</div>
        </div>
      </div>
      <div class="af2-subsection">
        <div class="af2-subsection-title">Bench Features</div>
        <div class="af2-chip-grid" data-field="benchFeatures" data-type="multi">
          <div class="af2-chip" data-value="With handrails">With handrails</div>
          <div class="af2-chip" data-value="Without handrails">No handrails</div>
          <div class="af2-chip" data-value="With backrests">With backrests</div>
        </div>
      </div>
    `;
  }

  renderSurfaceFields() {
    return `
      <div class="af2-subsection">
        <div class="af2-subsection-title">Surface Quality</div>
        <div class="af2-card-grid" data-field="surfaceQuality" data-type="single">
          <div class="af2-select-card" data-value="Excellent - smooth and well maintained">
            <span class="card-icon">✨</span>
            <span class="card-label">Excellent</span>
            <span class="card-desc">Smooth, maintained</span>
          </div>
          <div class="af2-select-card" data-value="Fair - minor disruptions, rough patches, bumps, cracks">
            <span class="card-icon">👍</span>
            <span class="card-label">Fair</span>
            <span class="card-desc">Minor bumps</span>
          </div>
          <div class="af2-select-card" data-value="Poor - serious disruptions, protruding stones, large grooves">
            <span class="card-icon">⚠️</span>
            <span class="card-label">Poor</span>
            <span class="card-desc">Rough terrain</span>
          </div>
          <div class="af2-select-card" data-value="Vegetation blocks passage">
            <span class="card-icon">🌿</span>
            <span class="card-label">Overgrown</span>
            <span class="card-desc">Blocked</span>
          </div>
        </div>
      </div>
      <div class="af2-subsection">
        <div class="af2-subsection-title">Trail Slopes</div>
        <div class="af2-card-grid cols-3" data-field="trailSlopes" data-type="single">
          <div class="af2-select-card" data-value="No slopes to mild slopes (up to 5%)">
            <span class="card-icon">➡️</span>
            <span class="card-label">Flat/Mild</span>
            <span class="card-desc">&lt; 5%</span>
          </div>
          <div class="af2-select-card" data-value="Moderate slopes - assistance recommended (5%-10%)">
            <span class="card-icon">📐</span>
            <span class="card-label">Moderate</span>
            <span class="card-desc">5-10%</span>
          </div>
          <div class="af2-select-card" data-value="Steep slopes - not accessible (over 10%)">
            <span class="card-icon">⛰️</span>
            <span class="card-label">Steep</span>
            <span class="card-desc">&gt; 10%</span>
          </div>
        </div>
      </div>
    `;
  }

  renderVisualFields() {
    return `
      <div class="af2-subsection">
        <div class="af2-subsection-title">Visual Impairment Adaptations</div>
        <div class="af2-chip-grid" data-field="visualAdaptations" data-type="multi">
          <div class="af2-chip" data-value="Raised/protruding borders">Raised borders</div>
          <div class="af2-chip" data-value="Texture/tactile differences">Tactile surfaces</div>
          <div class="af2-chip" data-value="Color contrast differences">Color contrast</div>
        </div>
      </div>
    `;
  }

  renderEnvironmentFields() {
    return `
      <div class="af2-subsection">
        <div class="af2-subsection-title">Shade Coverage</div>
        <div class="af2-card-grid cols-3" data-field="shadeCoverage" data-type="single">
          <div class="af2-select-card" data-value="Plenty of shade">
            <span class="card-icon">🌳</span>
            <span class="card-label">Plenty</span>
          </div>
          <div class="af2-select-card" data-value="Intermittent shade">
            <span class="card-icon">⛅</span>
            <span class="card-label">Some</span>
          </div>
          <div class="af2-select-card" data-value="No shade">
            <span class="card-icon">☀️</span>
            <span class="card-label">None</span>
          </div>
        </div>
      </div>
      <div class="af2-subsection">
        <div class="af2-chip-grid" data-field="lighting" data-type="multi">
          <div class="af2-chip" data-value="Trail is lit in darkness">💡 Trail is lit at night</div>
        </div>
      </div>
    `;
  }

  renderSignageFields() {
    return `
      <div class="af2-chip-grid" data-field="signage" data-type="multi">
        <div class="af2-chip" data-value="Route map available">🗺️ Route map</div>
        <div class="af2-chip" data-value="Clear directional signage">➡️ Directions</div>
        <div class="af2-chip" data-value="Simple language signage">📖 Simple text</div>
        <div class="af2-chip" data-value="Large, high-contrast accessible signage">🔤 High contrast</div>
        <div class="af2-chip" data-value="Audio explanation compatible with T-mode hearing devices">🔊 Audio</div>
        <div class="af2-chip" data-value="QR code with site information available">📱 QR codes</div>
      </div>
    `;
  }

  renderPicnicFields() {
    return `
      <div class="af2-subsection">
        <div class="af2-chip-grid" data-field="picnicAreas" data-type="multi">
          <div class="af2-chip" data-value="Available">🧺 Accessible picnic areas</div>
        </div>
      </div>
      <div class="af2-subsection">
        <div class="af2-chip-grid" data-field="accessibleViewpoint" data-type="single">
          <div class="af2-chip" data-value="Available">🏔️ Accessible viewpoint</div>
        </div>
      </div>
      <div class="af2-subsection af2-grid-3col">
        <div>
          <div class="af2-subsection-title">In shade</div>
          <div class="af2-number-input">
            <button type="button" onclick="window.af2NumberStep('picnicShade', -1)">−</button>
            <input type="number" id="af2-picnicShade" name="picnicShade" value="0" min="0">
            <button type="button" onclick="window.af2NumberStep('picnicShade', 1)">+</button>
          </div>
        </div>
        <div>
          <div class="af2-subsection-title">In sun</div>
          <div class="af2-number-input">
            <button type="button" onclick="window.af2NumberStep('picnicSun', -1)">−</button>
            <input type="number" id="af2-picnicSun" name="picnicSun" value="0" min="0">
            <button type="button" onclick="window.af2NumberStep('picnicSun', 1)">+</button>
          </div>
        </div>
        <div>
          <div class="af2-subsection-title">Total areas</div>
          <div class="af2-number-input af2-readonly">
            <input type="number" id="af2-picnicCount" name="picnicCount" value="0" min="0" readonly>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Global functions
    window.closeAccessibilityFormV2 = () => this.close();
    window.af2Next = () => this.handleNext();
    window.af2GoBack = () => this.goToPhase(1);
    window.af2NumberStep = (field, delta) => this.numberStep(field, delta);
    
    const overlay = document.getElementById('af2-overlay');
    if (!overlay) return;
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    
    // Card selections
    overlay.addEventListener('click', (e) => {
      const card = e.target.closest('.af2-select-card');
      if (card) {
        const grid = card.closest('[data-field]');
        if (grid) {
          const type = grid.dataset.type;
          if (type === 'single') {
            grid.querySelectorAll('.af2-select-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
          } else {
            card.classList.toggle('selected');
          }
          this.updateCategoryStatus(card);
        }
      }
      
      // Chip selections
      const chip = e.target.closest('.af2-chip');
      if (chip) {
        const grid = chip.closest('[data-field]');
        if (grid) {
          const type = grid.dataset.type;
          if (type === 'single') {
            grid.querySelectorAll('.af2-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
          } else {
            chip.classList.toggle('selected');
          }
          this.updateCategoryStatus(chip);
        }
      }
      
      // Category card expand
      const catCard = e.target.closest('.af2-category-card');
      if (catCard && !e.target.closest('.af2-category-content')) {
        const wasExpanded = catCard.classList.contains('expanded');
        overlay.querySelectorAll('.af2-category-card').forEach(c => c.classList.remove('expanded'));
        if (!wasExpanded) {
          catCard.classList.add('expanded');
        }
      }
    });
    
    // Difficulty slider
    const slider = overlay.querySelector('#af2-difficulty');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const labels = overlay.querySelectorAll('.af2-slider-label');
        labels.forEach(l => l.classList.remove('active'));
        const activeLabel = overlay.querySelector(`.af2-slider-label[data-level="${e.target.value}"]`);
        if (activeLabel) activeLabel.classList.add('active');
      });
    }
  }

  numberStep(field, delta) {
    const input = document.getElementById(`af2-${field}`);
    if (input) {
      const newVal = Math.max(0, parseInt(input.value || 0) + delta);
      input.value = newVal;
      this.updateCategoryStatus(input);
      
      // Auto-calculate picnic total when shade or sun changes
      if (field === 'picnicShade' || field === 'picnicSun') {
        this.updatePicnicTotal();
      }
      
      // Validate picnic total doesn't go below shade+sun
      if (field === 'picnicCount') {
        const shade = parseInt(document.getElementById('af2-picnicShade')?.value || 0);
        const sun = parseInt(document.getElementById('af2-picnicSun')?.value || 0);
        const total = shade + sun;
        if (newVal < total) {
          input.value = total;
        }
      }
    }
  }
  
  updatePicnicTotal() {
    const shadeInput = document.getElementById('af2-picnicShade');
    const sunInput = document.getElementById('af2-picnicSun');
    const totalInput = document.getElementById('af2-picnicCount');
    
    if (shadeInput && sunInput && totalInput) {
      const shade = parseInt(shadeInput.value || 0);
      const sun = parseInt(sunInput.value || 0);
      totalInput.value = shade + sun;
    }
  }

  updateCategoryStatus(element) {
    const catCard = element.closest('.af2-category-card');
    if (catCard) {
      // Check if any selections made in this category
      const hasSelections = catCard.querySelector('.selected') || 
                          Array.from(catCard.querySelectorAll('input[type="number"]')).some(i => parseInt(i.value) > 0);
      catCard.classList.toggle('has-data', hasSelections);
    }
  }

  handleNext() {
    if (this.currentPhase === 1) {
      // Validate required fields
      const trailName = document.getElementById('af2-trailName')?.value?.trim();
      const location = document.getElementById('af2-location')?.value?.trim();
      
      if (!trailName || !location) {
        toast.error('Please fill in Trail Name and Location');
        return;
      }
      
      // Ask if they want to add details or save now
      this.showSaveOptions();
    } else {
      this.saveForm();
    }
  }

  showSaveOptions() {
    const footer = document.querySelector('.af2-footer');
    footer.innerHTML = `
      <button class="af2-btn af2-btn-text" onclick="window.closeAccessibilityFormV2()">Cancel</button>
      <button class="af2-btn af2-btn-secondary" onclick="window.af2GoToPhase2()">📋 Add More Details</button>
      <button class="af2-btn af2-btn-primary" onclick="window.af2SaveNow()">✓ Save Now</button>
    `;
    
    window.af2GoToPhase2 = () => {
      this.goToPhase(2);
      footer.innerHTML = `
        <button class="af2-btn af2-btn-text" onclick="window.closeAccessibilityFormV2()">Cancel</button>
        <button class="af2-btn af2-btn-secondary" onclick="window.af2GoBack()">← Back</button>
        <button class="af2-btn af2-btn-primary" onclick="window.af2Next()">Save Complete Survey ✓</button>
      `;
    };
    
    window.af2SaveNow = () => this.saveForm();
  }

  goToPhase(phase) {
    this.currentPhase = phase;
    
    // Update progress
    document.querySelectorAll('.af2-progress-step').forEach(step => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.remove('active', 'completed');
      if (stepNum === phase) {
        step.classList.add('active');
      } else if (stepNum < phase) {
        step.classList.add('completed');
      }
    });
    
    // Show correct phase
    document.querySelectorAll('.af2-phase').forEach(p => {
      p.classList.remove('active');
      if (parseInt(p.dataset.phase) === phase) {
        p.classList.add('active');
      }
    });
    
    // Update button
    const backBtn = document.getElementById('af2-back-btn');
    if (backBtn) {
      backBtn.style.display = phase > 1 ? 'block' : 'none';
    }
    
    // Scroll to top
    document.querySelector('.af2-body')?.scrollTo(0, 0);
  }

  collectFormData() {
    const data = {};
    const overlay = document.getElementById('af2-overlay');
    
    // Text inputs
    overlay.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(input => {
      if (input.name && input.value) {
        data[input.name] = input.value;
      }
    });
    
    // Single selections (cards and chips)
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
    
    // Difficulty slider
    const slider = document.getElementById('af2-difficulty');
    if (slider) {
      const levels = ['Easy', 'Moderate', 'Challenging'];
      data.difficulty = levels[parseInt(slider.value) - 1];
    }
    
    return data;
  }

  saveForm() {
    const data = this.collectFormData();
    console.log('📋 Survey data collected:', data);
    
    // Save to localStorage for compatibility with existing system
    localStorage.setItem('accessibilityData', JSON.stringify(data));
    
    // Track survey completion
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
    this.currentPhase = 1;
    
    // Load user's mobility profile for pre-filling and category prioritization
    this.loadMobilityProfile();
    
    const overlay = document.getElementById('af2-overlay');
    if (overlay) {
      overlay.classList.add('open');
      this.isOpen = true;
      
      // Prevent pull-to-refresh while form is open
      document.body.classList.add('modal-open');
      
      // Reset form first
      this.goToPhase(1);
      overlay.querySelectorAll('input, select, textarea').forEach(i => {
        if (i.type === 'range') {
          i.value = 1;
        } else if (i.type === 'number') {
          i.value = 0;
        } else {
          i.value = '';
        }
      });
      overlay.querySelectorAll('.selected').forEach(s => s.classList.remove('selected'));
      overlay.querySelectorAll('.has-data').forEach(c => c.classList.remove('has-data'));
      
      // Show mobility profile indicator if set
      this.showMobilityProfileIndicator();
      
      // Highlight priority categories based on mobility profile
      this.highlightPriorityCategories();
      
      // Then prefill from saved data
      this.prefillForm();
      
      // Reset footer
      const footer = document.querySelector('.af2-footer');
      footer.innerHTML = `
        <button class="af2-btn af2-btn-text" onclick="window.closeAccessibilityFormV2()">Cancel</button>
        <button class="af2-btn af2-btn-secondary" id="af2-back-btn" style="display:none" onclick="window.af2GoBack()">← Back</button>
        <button class="af2-btn af2-btn-primary" id="af2-next-btn" onclick="window.af2Next()">Continue →</button>
      `;
    }
  }

  /**
   * Load user's mobility profile
   */
  loadMobilityProfile() {
    const profileId = userService.getMobilityProfile();
    if (profileId) {
      this.userMobilityProfile = getProfile(profileId);
      console.log('♿ Loaded mobility profile:', this.userMobilityProfile?.name);
    } else {
      this.userMobilityProfile = null;
    }
  }

  /**
   * Show mobility profile indicator in form header
   */
  showMobilityProfileIndicator() {
    const header = document.querySelector('.af2-header');
    if (!header) return;

    // Remove existing indicator
    const existing = header.querySelector('.af2-profile-indicator');
    if (existing) existing.remove();

    if (this.userMobilityProfile) {
      const indicator = document.createElement('div');
      indicator.className = 'af2-profile-indicator';
      indicator.innerHTML = `
        <span class="profile-icon">${this.userMobilityProfile.icon}</span>
        <span class="profile-text">Documenting for: ${this.userMobilityProfile.name}</span>
      `;
      indicator.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(255,255,255,0.15);
        border-radius: 8px;
        font-size: 0.85rem;
      `;
      header.appendChild(indicator);
    }
  }

  /**
   * Highlight priority categories based on mobility profile
   */
  highlightPriorityCategories() {
    if (!this.userMobilityProfile) return;

    const priorityCategories = this.userMobilityProfile.formPrefills?.priorityCategories || [];
    
    // Add visual highlighting to priority categories in Phase 2
    priorityCategories.forEach(categoryId => {
      const card = document.querySelector(`.af2-category-card[data-category="${categoryId}"]`);
      if (card) {
        card.classList.add('priority-category');
        
        // Add priority badge if not exists
        if (!card.querySelector('.priority-badge')) {
          const badge = document.createElement('span');
          badge.className = 'priority-badge';
          badge.textContent = '★ Recommended';
          badge.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
          `;
          card.style.position = 'relative';
          card.appendChild(badge);
        }
      }
    });

    // Reorder categories to show priority ones first
    this.reorderCategories(priorityCategories);
  }

  /**
   * Reorder category cards to show priority ones first
   * @param {string[]} priorityCategories 
   */
  reorderCategories(priorityCategories) {
    const grid = document.querySelector('.af2-category-grid');
    if (!grid || priorityCategories.length === 0) return;

    // Get all category cards
    const cards = Array.from(grid.querySelectorAll('.af2-category-card'));
    
    // Sort: priority categories first, then others
    cards.sort((a, b) => {
      const aPriority = priorityCategories.indexOf(a.dataset.category);
      const bPriority = priorityCategories.indexOf(b.dataset.category);
      
      // Both are priority - sort by priority order
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      // Only a is priority
      if (aPriority !== -1) return -1;
      // Only b is priority
      if (bPriority !== -1) return 1;
      // Neither is priority - keep original order
      return 0;
    });

    // Re-append in new order
    cards.forEach(card => grid.appendChild(card));
  }

  close() {
    const overlay = document.getElementById('af2-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      this.isOpen = false;
      
      // Re-enable pull-to-refresh
      document.body.classList.remove('modal-open');
    }
  }

  /**
   * Get current form data (for compatibility with existing code)
   */
  getFormData() {
    return this.collectFormData();
  }

  /**
   * Prefill form from localStorage (called on open)
   */
  prefillForm() {
    try {
      const savedData = localStorage.getItem('accessibilityData');
      if (!savedData) return;

      const data = JSON.parse(savedData);
      const overlay = document.getElementById('af2-overlay');
      if (!overlay) return;

      // Prefill text inputs
      Object.entries(data).forEach(([key, value]) => {
        // Text/number inputs
        const input = overlay.querySelector(`#af2-${key}, [name="${key}"]`);
        if (input && (input.tagName === 'INPUT' || input.tagName === 'SELECT' || input.tagName === 'TEXTAREA')) {
          input.value = value;
        }

        // Single select cards/chips
        const singleGrid = overlay.querySelector(`[data-field="${key}"][data-type="single"]`);
        if (singleGrid && !Array.isArray(value)) {
          const item = singleGrid.querySelector(`[data-value="${value}"]`);
          if (item) {
            singleGrid.querySelectorAll('.af2-select-card, .af2-chip').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
          }
        }

        // Multi select chips
        const multiGrid = overlay.querySelector(`[data-field="${key}"][data-type="multi"]`);
        if (multiGrid && Array.isArray(value)) {
          value.forEach(val => {
            const item = multiGrid.querySelector(`[data-value="${val}"]`);
            if (item) item.classList.add('selected');
          });
        }
      });

      // Difficulty slider
      if (data.difficulty) {
        const slider = document.getElementById('af2-difficulty');
        if (slider) {
          const levels = { 'Easy': 1, 'Moderate': 2, 'Challenging': 3 };
          slider.value = levels[data.difficulty] || 1;
          // Update label
          overlay.querySelectorAll('.af2-slider-label').forEach(l => l.classList.remove('active'));
          const activeLabel = overlay.querySelector(`.af2-slider-label[data-level="${slider.value}"]`);
          if (activeLabel) activeLabel.classList.add('active');
        }
      }

      console.log('📋 Form prefilled from saved data');
    } catch (error) {
      console.error('Failed to prefill form:', error);
    }
  }
}

// Create singleton instance
const accessibilityFormV2Quick = new AccessibilityFormV2Quick();

export { accessibilityFormV2Quick };

console.log('📋 Accessibility Form V2 (Quick) loaded');