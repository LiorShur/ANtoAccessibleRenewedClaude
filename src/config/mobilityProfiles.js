/**
 * Mobility Profiles Configuration
 * Pre-defined accessibility profiles for users with different mobility needs
 * 
 * Access Nature - Enhanced Accessibility Survey System
 * Created: December 2025
 */

/**
 * Mobility Profile Definitions
 * Each profile includes:
 * - id: unique identifier
 * - name: display name
 * - icon: emoji representation
 * - description: brief explanation
 * - concerns: key accessibility concerns for this profile
 * - formPrefills: suggested pre-fill values for accessibility form
 * - relevantCategories: which form categories are most relevant
 * - timeMultiplier: factor to adjust estimated trail time (1.0 = baseline)
 */
export const MOBILITY_PROFILES = {
  manual_wheelchair: {
    id: 'manual_wheelchair',
    name: 'Manual Wheelchair',
    icon: '🦽',
    description: 'Self-propelled wheelchair user',
    concerns: [
      'Surface type and condition',
      'Slope steepness (max 5% preferred)',
      'Path width (min 36" / 90cm)',
      'Rest areas for arm fatigue',
      'Accessible parking and restrooms'
    ],
    formPrefills: {
      // Phase 1 quick assessment suggestions
      idealSurface: ['Paved', 'Packed gravel'],
      maxSlope: 'gentle', // < 5%
      minWidth: 'standard', // 36"+ / 90cm+
      restAreaImportance: 'high',
      // What to highlight in detailed categories
      priorityCategories: ['parking', 'surface', 'restrooms', 'amenities']
    },
    relevantCategories: ['parking', 'surface', 'restrooms', 'amenities', 'environment'],
    timeMultiplier: 1.3, // 30% more time needed
    maxSlopePercent: 8, // ADA max is 8.33%
    preferredSlopePercent: 5
  },

  power_wheelchair: {
    id: 'power_wheelchair',
    name: 'Power Wheelchair',
    icon: '🦼',
    description: 'Electric/motorized wheelchair user',
    concerns: [
      'Surface stability (avoid loose gravel)',
      'Path width for larger chair',
      'Charging stations or distance limits',
      'Weight capacity of bridges/ramps',
      'Accessible parking with van access'
    ],
    formPrefills: {
      idealSurface: ['Paved', 'Boardwalk'],
      maxSlope: 'moderate', // Can handle more with motor
      minWidth: 'wide', // 48"+ / 120cm+
      restAreaImportance: 'medium',
      priorityCategories: ['parking', 'surface', 'restrooms']
    },
    relevantCategories: ['parking', 'surface', 'restrooms', 'environment'],
    timeMultiplier: 1.1,
    maxSlopePercent: 10,
    preferredSlopePercent: 8
  },

  walker_cane: {
    id: 'walker_cane',
    name: 'Walker / Cane',
    icon: '🦯',
    description: 'Uses walker, cane, crutches, or similar mobility aid',
    concerns: [
      'Uneven surfaces and trip hazards',
      'Frequent rest areas with seating',
      'Handrails on slopes/stairs',
      'Stable ground (not too soft/sandy)',
      'Shorter distances between rest stops'
    ],
    formPrefills: {
      idealSurface: ['Paved', 'Packed gravel', 'Boardwalk'],
      maxSlope: 'moderate',
      minWidth: 'standard',
      restAreaImportance: 'very_high',
      priorityCategories: ['surface', 'amenities', 'environment']
    },
    relevantCategories: ['surface', 'amenities', 'environment', 'parking'],
    timeMultiplier: 1.5,
    maxSlopePercent: 10,
    preferredSlopePercent: 6
  },

  vision_impaired: {
    id: 'vision_impaired',
    name: 'Vision Impaired',
    icon: '👁️',
    description: 'Low vision, blind, or visually impaired',
    concerns: [
      'Tactile trail markers and signage',
      'Audio cues and announcements',
      'High contrast markings',
      'Consistent surface texture',
      'Guide companion allowed'
    ],
    formPrefills: {
      idealSurface: ['Paved', 'Boardwalk'], // Consistent texture
      maxSlope: 'any',
      minWidth: 'standard',
      restAreaImportance: 'medium',
      priorityCategories: ['visual', 'surface', 'environment']
    },
    relevantCategories: ['visual', 'surface', 'environment', 'amenities'],
    timeMultiplier: 1.4,
    maxSlopePercent: 15,
    preferredSlopePercent: 10
  },

  stroller: {
    id: 'stroller',
    name: 'Stroller / Pushchair',
    icon: '👶',
    description: 'Pushing stroller, pram, or similar',
    concerns: [
      'Smooth surface for wheels',
      'Path width for stroller',
      'Shade and weather protection',
      'Family restroom facilities',
      'Picnic areas and seating'
    ],
    formPrefills: {
      idealSurface: ['Paved', 'Packed gravel'],
      maxSlope: 'gentle',
      minWidth: 'standard',
      restAreaImportance: 'high',
      priorityCategories: ['surface', 'amenities', 'environment', 'restrooms']
    },
    relevantCategories: ['surface', 'amenities', 'environment', 'restrooms', 'parking'],
    timeMultiplier: 1.2,
    maxSlopePercent: 10,
    preferredSlopePercent: 5
  },

  limited_stamina: {
    id: 'limited_stamina',
    name: 'Limited Stamina',
    icon: '💪',
    description: 'Chronic fatigue, heart condition, or limited endurance',
    concerns: [
      'Frequent rest areas with seating',
      'Shade availability',
      'Trail length and loop options',
      'Emergency exit points',
      'Level terrain preferred'
    ],
    formPrefills: {
      idealSurface: ['Paved', 'Packed gravel', 'Natural'],
      maxSlope: 'gentle',
      minWidth: 'any',
      restAreaImportance: 'very_high',
      priorityCategories: ['amenities', 'environment', 'surface']
    },
    relevantCategories: ['amenities', 'environment', 'surface', 'parking'],
    timeMultiplier: 1.6,
    maxSlopePercent: 8,
    preferredSlopePercent: 4
  },

  hearing_impaired: {
    id: 'hearing_impaired',
    name: 'Hearing Impaired',
    icon: '🦻',
    description: 'Deaf, hard of hearing, or hearing aid user',
    concerns: [
      'Visual alerts and signage',
      'Cell service for text communication',
      'Group accommodations',
      'Visual trail markers',
      'Emergency visual alerts'
    ],
    formPrefills: {
      idealSurface: ['any'],
      maxSlope: 'any',
      minWidth: 'any',
      restAreaImportance: 'low',
      priorityCategories: ['visual', 'environment']
    },
    relevantCategories: ['visual', 'environment'],
    timeMultiplier: 1.0,
    maxSlopePercent: 20,
    preferredSlopePercent: 15
  },

  no_mobility_aids: {
    id: 'no_mobility_aids',
    name: 'No Specific Needs',
    icon: '🚶',
    description: 'Documenting for others or general trail assessment',
    concerns: [
      'General accessibility documentation',
      'Helping others find suitable trails'
    ],
    formPrefills: {
      idealSurface: ['any'],
      maxSlope: 'any',
      minWidth: 'any',
      restAreaImportance: 'low',
      priorityCategories: []
    },
    relevantCategories: ['parking', 'restrooms', 'surface', 'amenities', 'visual', 'environment'],
    timeMultiplier: 1.0,
    maxSlopePercent: 30,
    preferredSlopePercent: 20
  }
};

/**
 * Get all profiles as an array for UI rendering
 */
export function getAllProfiles() {
  return Object.values(MOBILITY_PROFILES);
}

/**
 * Get a specific profile by ID
 * @param {string} profileId 
 * @returns {object|null}
 */
export function getProfile(profileId) {
  return MOBILITY_PROFILES[profileId] || null;
}

/**
 * Get recommended trails based on mobility profile
 * @param {string} profileId 
 * @param {array} trails - Array of trail objects with accessibility data
 * @returns {array} Sorted trails with compatibility scores
 */
export function getRecommendedTrails(profileId, trails) {
  const profile = getProfile(profileId);
  if (!profile) return trails;

  return trails.map(trail => {
    let score = 0;
    const maxScore = 100;

    // Score based on surface type
    const trailSurface = trail.accessibility?.surface_type?.toLowerCase() || '';
    if (profile.formPrefills.idealSurface.some(s => 
      trailSurface.includes(s.toLowerCase())
    )) {
      score += 30;
    }

    // Score based on slope
    const avgSlope = trail.accessibility?.average_slope || 0;
    if (avgSlope <= profile.preferredSlopePercent) {
      score += 25;
    } else if (avgSlope <= profile.maxSlopePercent) {
      score += 15;
    }

    // Score based on accessibility rating
    const rating = trail.accessibility?.overall_rating;
    if (rating === 'fully_accessible') score += 30;
    else if (rating === 'partially_accessible') score += 15;
    else if (rating === 'not_accessible') score -= 20;

    // Score based on amenities matching profile needs
    if (profile.formPrefills.restAreaImportance === 'very_high' || 
        profile.formPrefills.restAreaImportance === 'high') {
      if (trail.accessibility?.rest_areas?.available) {
        score += 15;
      }
    }

    return {
      ...trail,
      compatibilityScore: Math.max(0, Math.min(maxScore, score)),
      compatibilityLevel: score >= 70 ? 'excellent' : score >= 40 ? 'good' : 'challenging'
    };
  }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

/**
 * Calculate adjusted time estimate based on profile
 * @param {number} baseTimeMinutes - Base estimated time in minutes
 * @param {string} profileId 
 * @returns {number} Adjusted time in minutes
 */
export function getAdjustedTime(baseTimeMinutes, profileId) {
  const profile = getProfile(profileId);
  if (!profile) return baseTimeMinutes;
  return Math.round(baseTimeMinutes * profile.timeMultiplier);
}

/**
 * Get form pre-fill suggestions based on profile
 * @param {string} profileId 
 * @returns {object} Suggested form values
 */
export function getFormSuggestions(profileId) {
  const profile = getProfile(profileId);
  if (!profile) return {};
  
  return {
    priorityCategories: profile.formPrefills.priorityCategories,
    concerns: profile.concerns,
    suggestions: {
      ...profile.formPrefills
    }
  };
}

/**
 * Check if a trail meets minimum requirements for a profile
 * @param {object} trail 
 * @param {string} profileId 
 * @returns {object} { suitable: boolean, issues: string[] }
 */
export function checkTrailSuitability(trail, profileId) {
  const profile = getProfile(profileId);
  if (!profile) return { suitable: true, issues: [] };

  const issues = [];
  const accessibility = trail.accessibility || {};

  // Check slope
  const maxSlope = accessibility.max_slope || accessibility.average_slope || 0;
  if (maxSlope > profile.maxSlopePercent) {
    issues.push(`Slope (${maxSlope}%) exceeds recommended maximum (${profile.maxSlopePercent}%)`);
  }

  // Check surface for wheelchair users
  if (profileId.includes('wheelchair')) {
    const surface = (accessibility.surface_type || '').toLowerCase();
    if (surface.includes('rocky') || surface.includes('sand') || surface.includes('mud')) {
      issues.push(`Surface type (${accessibility.surface_type}) may be difficult for wheelchair`);
    }
  }

  // Check for rest areas if high importance
  if (profile.formPrefills.restAreaImportance === 'very_high' || 
      profile.formPrefills.restAreaImportance === 'high') {
    if (!accessibility.rest_areas?.available) {
      issues.push('Limited or no rest areas reported');
    }
  }

  return {
    suitable: issues.length === 0,
    issues
  };
}

// Export for ES6 module use
export default {
  MOBILITY_PROFILES,
  getAllProfiles,
  getProfile,
  getRecommendedTrails,
  getAdjustedTime,
  getFormSuggestions,
  checkTrailSuitability
};