/**
 * Feature Flags Configuration
 * Controls feature access based on account tier
 * 
 * Access Nature - Monetization Foundation
 * Created: December 2025
 */

export const FEATURE_FLAGS = {
  free: {
    // Tracking
    gpsTracking: true,
    maxTrackingHours: 8,
    
    // Storage
    maxSavedRoutes: 5,
    maxCloudGuides: 3,
    maxPhotosPerRoute: 10,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json'],
    pdfExports: false,
    
    // Premium Features
    offlineMaps: false,
    advancedFilters: false,
    customRoutes: false,
    apiAccess: false,
    
    // Ads
    showAds: true
  },
  
  plus: {
    // Tracking
    gpsTracking: true,
    maxTrackingHours: -1,       // Unlimited
    
    // Storage
    maxSavedRoutes: 50,
    maxCloudGuides: 25,
    maxPhotosPerRoute: 50,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json', 'gpx', 'pdf', 'html'],
    pdfExports: true,
    
    // Premium Features
    offlineMaps: true,
    advancedFilters: true,
    customRoutes: false,
    apiAccess: false,
    
    // Ads
    showAds: false
  },
  
  pro: {
    // Tracking
    gpsTracking: true,
    maxTrackingHours: -1,
    
    // Storage
    maxSavedRoutes: -1,         // Unlimited
    maxCloudGuides: -1,
    maxPhotosPerRoute: -1,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json', 'gpx', 'pdf', 'html', 'csv', 'kml'],
    pdfExports: true,
    
    // Premium Features
    offlineMaps: true,
    advancedFilters: true,
    customRoutes: true,
    apiAccess: true,
    
    // Ads
    showAds: false
  },
  
  institutional: {
    // Tracking
    gpsTracking: true,
    maxTrackingHours: -1,
    
    // Storage
    maxSavedRoutes: -1,
    maxCloudGuides: -1,
    maxPhotosPerRoute: -1,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json', 'gpx', 'pdf', 'html', 'csv', 'kml'],
    pdfExports: true,
    
    // Premium Features
    offlineMaps: true,
    advancedFilters: true,
    customRoutes: true,
    apiAccess: true,
    
    // Institutional-only
    multiUserManagement: true,
    analyticsDashboard: true,
    whitelabelReports: true,
    prioritySupport: true,
    bulkExport: true,
    
    // Ads
    showAds: false
  }
};

// Badge Definitions
export const BADGES = {
  // Explorer badges
  first_track: {
    id: 'first_track',
    name: 'First Steps',
    description: 'Complete your first tracking session',
    icon: '👣',
    category: 'explorer',
    points: 10
  },
  distance_10k: {
    id: 'distance_10k',
    name: 'Trail Walker',
    description: 'Track 10 kilometers total',
    icon: '🥾',
    category: 'explorer',
    points: 25
  },
  distance_50k: {
    id: 'distance_50k',
    name: 'Trail Runner',
    description: 'Track 50 kilometers total',
    icon: '🏃',
    category: 'explorer',
    points: 50
  },
  distance_100k: {
    id: 'distance_100k',
    name: 'Trail Blazer',
    description: 'Track 100 kilometers total',
    icon: '🔥',
    category: 'explorer',
    points: 100
  },
  
  // Accessibility Advocate badges
  first_survey: {
    id: 'first_survey',
    name: 'Accessibility Scout',
    description: 'Complete your first accessibility survey',
    icon: '📋',
    category: 'advocate',
    points: 15
  },
  surveys_10: {
    id: 'surveys_10',
    name: 'Accessibility Advocate',
    description: 'Complete 10 accessibility surveys',
    icon: '♿',
    category: 'advocate',
    points: 50
  },
  surveys_50: {
    id: 'surveys_50',
    name: 'Accessibility Champion',
    description: 'Complete 50 accessibility surveys',
    icon: '🏆',
    category: 'advocate',
    points: 150
  },
  
  // Community badges
  first_guide: {
    id: 'first_guide',
    name: 'Trail Guide',
    description: 'Share your first public trail guide',
    icon: '🗺️',
    category: 'community',
    points: 20
  },
  guides_5: {
    id: 'guides_5',
    name: 'Community Contributor',
    description: 'Share 5 public trail guides',
    icon: '🤝',
    category: 'community',
    points: 75
  },
  guides_25: {
    id: 'guides_25',
    name: 'Trail Master',
    description: 'Share 25 public trail guides',
    icon: '👑',
    category: 'community',
    points: 200
  },
  
  // Barrier Reporter badges
  first_report: {
    id: 'first_report',
    name: 'Barrier Spotter',
    description: 'Submit your first barrier report',
    icon: '🚧',
    category: 'reporter',
    points: 15
  },
  reports_10: {
    id: 'reports_10',
    name: 'Urban Scout',
    description: 'Submit 10 barrier reports',
    icon: '🔍',
    category: 'reporter',
    points: 50
  },
  reports_50: {
    id: 'reports_50',
    name: 'City Improver',
    description: 'Submit 50 barrier reports',
    icon: '🏙️',
    category: 'reporter',
    points: 150
  },
  
  // Streak badges
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Use the app 7 days in a row',
    icon: '📅',
    category: 'streak',
    points: 30
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Explorer',
    description: 'Use the app 30 days in a row',
    icon: '🌟',
    category: 'streak',
    points: 100
  },
  
  // Special badges
  beta_tester: {
    id: 'beta_tester',
    name: 'Beta Pioneer',
    description: 'Joined during the beta testing phase',
    icon: '🧪',
    category: 'special',
    points: 50
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first 1000 users',
    icon: '🌱',
    category: 'special',
    points: 100
  },
  
  // Photo badges
  first_photo: {
    id: 'first_photo',
    name: 'Photographer',
    description: 'Upload your first trail photo',
    icon: '📸',
    category: 'explorer',
    points: 10
  },
  photos_50: {
    id: 'photos_50',
    name: 'Trail Documentarian',
    description: 'Upload 50 trail photos',
    icon: '🖼️',
    category: 'explorer',
    points: 75
  }
};

// Level thresholds
export const LEVELS = [
  { level: 1, name: 'Newcomer', minPoints: 0, color: '#9e9e9e' },
  { level: 2, name: 'Explorer', minPoints: 50, color: '#8d6e63' },
  { level: 3, name: 'Adventurer', minPoints: 150, color: '#7cb342' },
  { level: 4, name: 'Trailblazer', minPoints: 300, color: '#039be5' },
  { level: 5, name: 'Pathfinder', minPoints: 500, color: '#8e24aa' },
  { level: 6, name: 'Trail Master', minPoints: 800, color: '#fb8c00' },
  { level: 7, name: 'Access Champion', minPoints: 1200, color: '#e53935' },
  { level: 8, name: 'Nature Guardian', minPoints: 1800, color: '#00897b' },
  { level: 9, name: 'Community Hero', minPoints: 2500, color: '#3949ab' },
  { level: 10, name: 'Legend', minPoints: 5000, color: '#ffd700' }
];

// Badge categories for UI grouping
export const BADGE_CATEGORIES = {
  explorer: { name: 'Explorer', icon: '🥾', description: 'Tracking and distance achievements' },
  advocate: { name: 'Accessibility Advocate', icon: '♿', description: 'Accessibility survey achievements' },
  community: { name: 'Community', icon: '🤝', description: 'Sharing and community contributions' },
  reporter: { name: 'Barrier Reporter', icon: '🚧', description: 'Urban accessibility reporting' },
  streak: { name: 'Consistency', icon: '🔥', description: 'Regular app usage' },
  special: { name: 'Special', icon: '⭐', description: 'Limited and exclusive badges' }
};

/**
 * Check if a feature is available for the given account tier
 * @param {string} feature - Feature key to check
 * @param {string} tier - Account tier (default: 'free')
 * @returns {boolean|number|array} - Feature value
 */
export function getFeatureValue(feature, tier = 'free') {
  const tierConfig = FEATURE_FLAGS[tier] || FEATURE_FLAGS.free;
  return tierConfig[feature];
}

/**
 * Check if user can access a feature
 * @param {string} feature - Feature key
 * @param {string} tier - Account tier
 * @returns {boolean}
 */
export function canAccess(feature, tier = 'free') {
  const value = getFeatureValue(feature, tier);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

/**
 * Check if user is within usage limits
 * @param {string} limitType - Type of limit to check
 * @param {number} currentUsage - Current usage count
 * @param {string} tier - Account tier
 * @returns {boolean}
 */
export function isWithinLimit(limitType, currentUsage, tier = 'free') {
  const limit = getFeatureValue(limitType, tier);
  if (limit === -1) return true; // Unlimited
  return currentUsage < limit;
}

/**
 * Get remaining usage for a limit
 * @param {string} limitType - Type of limit
 * @param {number} currentUsage - Current usage count
 * @param {string} tier - Account tier
 * @returns {number|null} - Remaining count, or null if unlimited
 */
export function getRemainingUsage(limitType, currentUsage, tier = 'free') {
  const limit = getFeatureValue(limitType, tier);
  if (limit === -1) return null; // Unlimited
  return Math.max(0, limit - currentUsage);
}

/**
 * Get user's level based on points
 * @param {number} points - User's total points
 * @returns {object} - Level object
 */
export function getLevel(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

/**
 * Get points needed for next level
 * @param {number} points - Current points
 * @returns {number|null} - Points needed, or null if max level
 */
export function getPointsToNextLevel(points) {
  const currentLevel = getLevel(points);
  const nextLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level + 1);
  if (nextLevelIndex === -1) return null;
  return LEVELS[nextLevelIndex].minPoints - points;
}

/**
 * Get progress percentage to next level
 * @param {number} points - Current points
 * @returns {number} - Progress percentage (0-100)
 */
export function getLevelProgress(points) {
  const currentLevel = getLevel(points);
  const currentLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
  const nextLevelIndex = currentLevelIndex + 1;
  
  if (nextLevelIndex >= LEVELS.length) return 100; // Max level
  
  const currentMin = LEVELS[currentLevelIndex].minPoints;
  const nextMin = LEVELS[nextLevelIndex].minPoints;
  const range = nextMin - currentMin;
  const progress = points - currentMin;
  
  return Math.round((progress / range) * 100);
}

/**
 * Get badge by ID
 * @param {string} badgeId - Badge ID
 * @returns {object|null} - Badge object or null
 */
export function getBadge(badgeId) {
  return BADGES[badgeId] || null;
}

/**
 * Get all badges in a category
 * @param {string} category - Category name
 * @returns {array} - Array of badges
 */
export function getBadgesByCategory(category) {
  return Object.values(BADGES).filter(badge => badge.category === category);
}

/**
 * Get tier display name
 * @param {string} tier - Tier key
 * @returns {string} - Display name
 */
export function getTierDisplayName(tier) {
  const names = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
    institutional: 'Institutional'
  };
  return names[tier] || 'Free';
}

/**
 * Get upgrade benefits for moving to a higher tier
 * @param {string} currentTier - Current tier
 * @param {string} targetTier - Target tier
 * @returns {array} - Array of benefit descriptions
 */
export function getUpgradeBenefits(currentTier, targetTier) {
  const current = FEATURE_FLAGS[currentTier] || FEATURE_FLAGS.free;
  const target = FEATURE_FLAGS[targetTier];
  
  if (!target) return [];
  
  const benefits = [];
  
  // Compare features
  if (!current.pdfExports && target.pdfExports) {
    benefits.push('Export to PDF, GPX, and HTML formats');
  }
  if (!current.offlineMaps && target.offlineMaps) {
    benefits.push('Download maps for offline use');
  }
  if (!current.advancedFilters && target.advancedFilters) {
    benefits.push('Advanced trail search and filters');
  }
  if (current.maxSavedRoutes !== -1 && target.maxSavedRoutes === -1) {
    benefits.push('Unlimited saved routes');
  } else if (target.maxSavedRoutes > current.maxSavedRoutes) {
    benefits.push(`Save up to ${target.maxSavedRoutes} routes`);
  }
  if (current.showAds && !target.showAds) {
    benefits.push('Ad-free experience');
  }
  if (!current.apiAccess && target.apiAccess) {
    benefits.push('API access for developers');
  }
  if (target.multiUserManagement) {
    benefits.push('Multi-user management for teams');
  }
  
  return benefits;
}

console.log('🚀 Feature flags loaded');