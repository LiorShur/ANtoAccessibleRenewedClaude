/**
 * Accessibility Rating System
 * 3-tier rating system for trail accessibility
 * 
 * Access Nature - Phase 2: Beta Features
 * Created: December 2025
 */

/**
 * Rating Definitions
 * 🟢 Fully Accessible - Paved/firm surface, <5% grade, no steps, accessible facilities
 * 🟡 Partially Accessible - Some barriers but navigable, assistance may be needed
 * 🔴 Not Accessible - Significant barriers, not recommended for mobility devices
 */

// Rating constants
export const ACCESSIBILITY_RATINGS = {
  fully: {
    id: 'fully',
    level: 3,
    label: 'Fully Accessible',
    shortLabel: 'Accessible',
    icon: '♿',
    color: '#22c55e',
    bgColor: '#dcfce7',
    borderColor: '#86efac',
    description: 'Suitable for wheelchairs and mobility devices. Paved or firm surface, gentle grades, no steps.',
    criteria: [
      'Paved, concrete, or firm packed surface',
      'Grade less than 5% (ADA compliant)',
      'No steps or barriers',
      'Width at least 36 inches',
      'Accessible parking and facilities nearby'
    ]
  },
  partial: {
    id: 'partial',
    level: 2,
    label: 'Partially Accessible',
    shortLabel: 'Partial',
    icon: '⚠️',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: '#fcd34d',
    description: 'Some sections accessible, may have barriers. Assistance may be needed in places.',
    criteria: [
      'Mixed surfaces (some paved, some unpaved)',
      'Moderate grades (5-8%)',
      'May have some steps or narrow sections',
      'Partially accessible with assistance',
      'Some accessible facilities available'
    ]
  },
  not: {
    id: 'not',
    level: 1,
    label: 'Not Accessible',
    shortLabel: 'Difficult',
    icon: '🚫',
    color: '#ef4444',
    bgColor: '#fee2e2',
    borderColor: '#fca5a5',
    description: 'Significant barriers present. Not recommended for wheelchairs or mobility devices.',
    criteria: [
      'Rough, uneven, or loose surfaces',
      'Steep grades (>8%)',
      'Steps, stairs, or obstacles',
      'Narrow passages',
      'No accessible facilities'
    ]
  }
};

// Surface types with accessibility impact
export const SURFACE_TYPES = {
  paved: { label: 'Paved/Concrete', icon: '🛤️', accessibilityScore: 3 },
  boardwalk: { label: 'Boardwalk', icon: '🌉', accessibilityScore: 3 },
  packed_gravel: { label: 'Packed Gravel', icon: '⚪', accessibilityScore: 2 },
  gravel: { label: 'Loose Gravel', icon: '⚫', accessibilityScore: 1 },
  dirt: { label: 'Dirt/Earth', icon: '🟤', accessibilityScore: 1 },
  grass: { label: 'Grass', icon: '🟢', accessibilityScore: 1 },
  sand: { label: 'Sand', icon: '🏖️', accessibilityScore: 0 },
  rocks: { label: 'Rocky', icon: '🪨', accessibilityScore: 0 },
  mixed: { label: 'Mixed Surfaces', icon: '🔀', accessibilityScore: 1 }
};

// Facility types
export const FACILITY_TYPES = {
  parking: { label: 'Accessible Parking', icon: '🅿️' },
  restrooms: { label: 'Accessible Restrooms', icon: '🚻' },
  water: { label: 'Water Fountain', icon: '🚰' },
  benches: { label: 'Rest Benches', icon: '🪑' },
  shelter: { label: 'Shelter/Shade', icon: '⛱️' },
  signage: { label: 'Trail Signage', icon: '🪧' }
};

/**
 * Accessibility Rating Calculator
 */
class AccessibilityRatingSystem {
  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('accessibility-rating-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'accessibility-rating-styles';
    styles.textContent = `
      /* Rating Badge */
      .accessibility-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        border: 2px solid;
      }
      
      .accessibility-badge.rating-fully {
        background: ${ACCESSIBILITY_RATINGS.fully.bgColor};
        color: ${ACCESSIBILITY_RATINGS.fully.color};
        border-color: ${ACCESSIBILITY_RATINGS.fully.borderColor};
      }
      
      .accessibility-badge.rating-partial {
        background: ${ACCESSIBILITY_RATINGS.partial.bgColor};
        color: ${ACCESSIBILITY_RATINGS.partial.color};
        border-color: ${ACCESSIBILITY_RATINGS.partial.borderColor};
      }
      
      .accessibility-badge.rating-not {
        background: ${ACCESSIBILITY_RATINGS.not.bgColor};
        color: ${ACCESSIBILITY_RATINGS.not.color};
        border-color: ${ACCESSIBILITY_RATINGS.not.borderColor};
      }
      
      .accessibility-badge .badge-icon {
        font-size: 16px;
      }
      
      /* Rating Card */
      .accessibility-rating-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin-bottom: 16px;
      }
      
      .rating-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      
      .rating-card-title {
        font-size: 16px;
        font-weight: 600;
        color: #1a1a2e;
      }
      
      .rating-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 12px;
      }
      
      .rating-detail-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #666;
      }
      
      .rating-detail-item .detail-icon {
        font-size: 16px;
      }
      
      .rating-detail-item.positive {
        color: #22c55e;
      }
      
      .rating-detail-item.negative {
        color: #ef4444;
      }
      
      .rating-detail-item.neutral {
        color: #f59e0b;
      }
      
      /* Criteria List */
      .criteria-list {
        list-style: none;
        padding: 0;
        margin: 12px 0 0 0;
      }
      
      .criteria-list li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        font-size: 13px;
        color: #444;
      }
      
      .criteria-list li:last-child {
        border-bottom: none;
      }
      
      .criteria-list li .criteria-icon {
        font-size: 14px;
      }
      
      /* Facilities Grid */
      .facilities-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      
      .facility-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: #f0f0f0;
        border-radius: 12px;
        font-size: 12px;
        color: #666;
      }
      
      .facility-tag.available {
        background: #dcfce7;
        color: #22c55e;
      }
      
      .facility-tag.unavailable {
        background: #fee2e2;
        color: #ef4444;
        text-decoration: line-through;
        opacity: 0.7;
      }
      
      /* Rating Selector */
      .rating-selector {
        display: flex;
        gap: 12px;
        margin: 16px 0;
      }
      
      .rating-option {
        flex: 1;
        padding: 16px;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }
      
      .rating-option:hover {
        border-color: #667eea;
        transform: translateY(-2px);
      }
      
      .rating-option.selected {
        border-width: 3px;
      }
      
      .rating-option.selected.rating-fully {
        border-color: ${ACCESSIBILITY_RATINGS.fully.color};
        background: ${ACCESSIBILITY_RATINGS.fully.bgColor};
      }
      
      .rating-option.selected.rating-partial {
        border-color: ${ACCESSIBILITY_RATINGS.partial.color};
        background: ${ACCESSIBILITY_RATINGS.partial.bgColor};
      }
      
      .rating-option.selected.rating-not {
        border-color: ${ACCESSIBILITY_RATINGS.not.color};
        background: ${ACCESSIBILITY_RATINGS.not.bgColor};
      }
      
      .rating-option .option-icon {
        font-size: 32px;
        display: block;
        margin-bottom: 8px;
      }
      
      .rating-option .option-label {
        font-size: 14px;
        font-weight: 600;
        color: #1a1a2e;
      }
      
      .rating-option .option-description {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
      }
      
      /* Compact Rating Display */
      .rating-compact {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
      }
      
      .rating-compact .rating-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      
      .rating-compact .rating-dot.fully { background: ${ACCESSIBILITY_RATINGS.fully.color}; }
      .rating-compact .rating-dot.partial { background: ${ACCESSIBILITY_RATINGS.partial.color}; }
      .rating-compact .rating-dot.not { background: ${ACCESSIBILITY_RATINGS.not.color}; }
      
      /* Grade Indicator */
      .grade-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .grade-bar {
        flex: 1;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .grade-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s;
      }
      
      .grade-fill.easy { background: #22c55e; }
      .grade-fill.moderate { background: #f59e0b; }
      .grade-fill.steep { background: #ef4444; }
      
      /* Mobile Responsive */
      @media (max-width: 480px) {
        .rating-selector {
          flex-direction: column;
        }
        
        .rating-details {
          grid-template-columns: 1fr;
        }
        
        .rating-option {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          padding: 12px;
        }
        
        .rating-option .option-icon {
          font-size: 24px;
          margin-bottom: 0;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  // ==================== RATING CALCULATION ====================

  /**
   * Calculate accessibility rating from survey data
   * @param {object} surveyData - Survey responses
   * @returns {object} Rating result
   */
  calculateRating(surveyData) {
    let score = 100; // Start with perfect score
    const factors = [];
    
    // Surface type impact (major factor)
    if (surveyData.surface) {
      const surfaceType = SURFACE_TYPES[surveyData.surface];
      if (surfaceType) {
        if (surfaceType.accessibilityScore === 0) {
          score -= 40;
          factors.push({ factor: 'Surface', impact: 'negative', note: `${surfaceType.label} - difficult for mobility devices` });
        } else if (surfaceType.accessibilityScore === 1) {
          score -= 25;
          factors.push({ factor: 'Surface', impact: 'neutral', note: `${surfaceType.label} - may be challenging` });
        } else if (surfaceType.accessibilityScore === 2) {
          score -= 10;
          factors.push({ factor: 'Surface', impact: 'neutral', note: `${surfaceType.label} - generally accessible` });
        } else {
          factors.push({ factor: 'Surface', impact: 'positive', note: `${surfaceType.label} - excellent for accessibility` });
        }
      }
    }
    
    // Grade/slope impact
    if (surveyData.maxGrade !== undefined) {
      const grade = surveyData.maxGrade;
      if (grade > 8) {
        score -= 30;
        factors.push({ factor: 'Grade', impact: 'negative', note: `${grade}% - steep, exceeds ADA guidelines` });
      } else if (grade > 5) {
        score -= 15;
        factors.push({ factor: 'Grade', impact: 'neutral', note: `${grade}% - moderate slope` });
      } else {
        factors.push({ factor: 'Grade', impact: 'positive', note: `${grade}% - ADA compliant` });
      }
    }
    
    // Steps/stairs impact
    if (surveyData.hasSteps) {
      score -= 35;
      factors.push({ factor: 'Steps', impact: 'negative', note: 'Steps or stairs present' });
    } else {
      factors.push({ factor: 'Steps', impact: 'positive', note: 'No steps or stairs' });
    }
    
    // Width impact
    if (surveyData.minWidth !== undefined) {
      const width = surveyData.minWidth;
      if (width < 36) {
        score -= 25;
        factors.push({ factor: 'Width', impact: 'negative', note: `${width}" - too narrow for wheelchairs` });
      } else if (width < 48) {
        score -= 10;
        factors.push({ factor: 'Width', impact: 'neutral', note: `${width}" - minimum accessible width` });
      } else {
        factors.push({ factor: 'Width', impact: 'positive', note: `${width}" - comfortable width` });
      }
    }
    
    // Obstacles impact
    if (surveyData.hasObstacles) {
      score -= 15;
      factors.push({ factor: 'Obstacles', impact: 'negative', note: 'Obstacles present on trail' });
    }
    
    // Determine rating based on score
    let rating;
    if (score >= 70) {
      rating = ACCESSIBILITY_RATINGS.fully;
    } else if (score >= 40) {
      rating = ACCESSIBILITY_RATINGS.partial;
    } else {
      rating = ACCESSIBILITY_RATINGS.not;
    }
    
    return {
      rating: rating.id,
      ratingInfo: rating,
      score,
      factors,
      surface: surveyData.surface,
      maxGrade: surveyData.maxGrade,
      hasSteps: surveyData.hasSteps,
      facilities: surveyData.facilities || {}
    };
  }

  /**
   * Get rating from pre-calculated rating ID
   * @param {string} ratingId - Rating ID (fully, partial, not)
   * @returns {object} Rating info
   */
  getRating(ratingId) {
    return ACCESSIBILITY_RATINGS[ratingId] || ACCESSIBILITY_RATINGS.partial;
  }

  // ==================== UI COMPONENTS ====================

  /**
   * Create a rating badge
   * @param {string} ratingId - Rating ID
   * @param {boolean} showLabel - Whether to show text label
   * @returns {HTMLElement}
   */
  createBadge(ratingId, showLabel = true) {
    const rating = this.getRating(ratingId);
    
    const badge = document.createElement('span');
    badge.className = `accessibility-badge rating-${ratingId}`;
    badge.innerHTML = `
      <span class="badge-icon">${rating.icon}</span>
      ${showLabel ? `<span class="badge-label">${rating.shortLabel}</span>` : ''}
    `;
    badge.title = rating.description;
    
    return badge;
  }

  /**
   * Create a compact rating display (dot + label)
   * @param {string} ratingId - Rating ID
   * @returns {HTMLElement}
   */
  createCompactRating(ratingId) {
    const rating = this.getRating(ratingId);
    
    const compact = document.createElement('span');
    compact.className = 'rating-compact';
    compact.innerHTML = `
      <span class="rating-dot ${ratingId}"></span>
      <span>${rating.shortLabel}</span>
    `;
    compact.title = rating.description;
    
    return compact;
  }

  /**
   * Create a full rating card with details
   * @param {object} ratingData - Rating data from calculateRating()
   * @returns {HTMLElement}
   */
  createRatingCard(ratingData) {
    const rating = this.getRating(ratingData.rating);
    
    const card = document.createElement('div');
    card.className = 'accessibility-rating-card';
    
    // Header with badge
    let html = `
      <div class="rating-card-header">
        <span class="rating-card-title">Accessibility Rating</span>
        ${this.createBadge(ratingData.rating).outerHTML}
      </div>
      <p style="color: #666; font-size: 13px; margin: 0 0 12px 0;">${rating.description}</p>
    `;
    
    // Details grid
    if (ratingData.factors && ratingData.factors.length > 0) {
      html += '<div class="rating-details">';
      for (const factor of ratingData.factors) {
        const icon = factor.impact === 'positive' ? '✅' : factor.impact === 'negative' ? '❌' : '⚠️';
        html += `
          <div class="rating-detail-item ${factor.impact}">
            <span class="detail-icon">${icon}</span>
            <span>${factor.note}</span>
          </div>
        `;
      }
      html += '</div>';
    }
    
    // Facilities
    if (ratingData.facilities && Object.keys(ratingData.facilities).length > 0) {
      html += `
        <div style="margin-top: 16px;">
          <strong style="font-size: 13px; color: #666;">Facilities:</strong>
          <div class="facilities-grid">
      `;
      for (const [facilityId, available] of Object.entries(ratingData.facilities)) {
        const facility = FACILITY_TYPES[facilityId];
        if (facility) {
          html += `
            <span class="facility-tag ${available ? 'available' : 'unavailable'}">
              ${facility.icon} ${facility.label}
            </span>
          `;
        }
      }
      html += '</div></div>';
    }
    
    card.innerHTML = html;
    return card;
  }

  /**
   * Create a rating selector for user input
   * @param {string} currentRating - Currently selected rating
   * @param {function} onChange - Callback when rating changes
   * @returns {HTMLElement}
   */
  createRatingSelector(currentRating = null, onChange = null) {
    const container = document.createElement('div');
    container.className = 'rating-selector';
    
    for (const [id, rating] of Object.entries(ACCESSIBILITY_RATINGS)) {
      const option = document.createElement('div');
      option.className = `rating-option rating-${id} ${currentRating === id ? 'selected' : ''}`;
      option.dataset.rating = id;
      option.innerHTML = `
        <span class="option-icon">${rating.icon}</span>
        <div>
          <span class="option-label">${rating.label}</span>
          <p class="option-description">${rating.description}</p>
        </div>
      `;
      
      option.addEventListener('click', () => {
        container.querySelectorAll('.rating-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        if (onChange) onChange(id);
      });
      
      container.appendChild(option);
    }
    
    return container;
  }

  /**
   * Create a grade indicator bar
   * @param {number} grade - Grade percentage
   * @returns {HTMLElement}
   */
  createGradeIndicator(grade) {
    const container = document.createElement('div');
    container.className = 'grade-indicator';
    
    let className = 'easy';
    let label = 'Gentle';
    if (grade > 8) {
      className = 'steep';
      label = 'Steep';
    } else if (grade > 5) {
      className = 'moderate';
      label = 'Moderate';
    }
    
    // Normalize grade to percentage of bar (max 15% = full bar)
    const fillPercent = Math.min(100, (grade / 15) * 100);
    
    container.innerHTML = `
      <span style="font-size: 12px; color: #666; min-width: 60px;">${grade}% grade</span>
      <div class="grade-bar">
        <div class="grade-fill ${className}" style="width: ${fillPercent}%"></div>
      </div>
      <span style="font-size: 12px; color: #666;">${label}</span>
    `;
    
    return container;
  }

  // ==================== HELPERS ====================

  /**
   * Get rating color for use in other components
   * @param {string} ratingId - Rating ID
   * @returns {string} Hex color
   */
  getRatingColor(ratingId) {
    return this.getRating(ratingId).color;
  }

  /**
   * Get rating icon
   * @param {string} ratingId - Rating ID
   * @returns {string} Emoji icon
   */
  getRatingIcon(ratingId) {
    return this.getRating(ratingId).icon;
  }

  /**
   * Convert survey responses to rating data structure
   * @param {object} surveyResponses - Raw survey form responses
   * @returns {object} Normalized data for calculateRating()
   */
  normalizeSurveyData(surveyResponses) {
    return {
      surface: surveyResponses.surface_type || surveyResponses.surface || 'mixed',
      maxGrade: parseInt(surveyResponses.max_grade || surveyResponses.grade || 0),
      hasSteps: surveyResponses.steps === true || surveyResponses.steps === 'yes',
      minWidth: parseInt(surveyResponses.min_width || surveyResponses.width || 48),
      hasObstacles: surveyResponses.obstacles === true || surveyResponses.obstacles === 'yes',
      facilities: {
        parking: surveyResponses.parking === true || surveyResponses.parking === 'yes',
        restrooms: surveyResponses.restrooms === true || surveyResponses.restrooms === 'yes',
        water: surveyResponses.water === true || surveyResponses.water === 'yes',
        benches: surveyResponses.benches === true || surveyResponses.benches === 'yes'
      }
    };
  }
}

// Create singleton instance
const accessibilityRating = new AccessibilityRatingSystem();

// Export (constants already exported above with export const)
export { 
  AccessibilityRatingSystem, 
  accessibilityRating
};

console.log('♿ Accessibility Rating System loaded');