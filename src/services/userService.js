/**
 * User Service
 * Handles user data, engagement tracking, and achievements
 * 
 * Access Nature - Monetization Foundation
 * Created: December 2025
 */

import { 
  doc, 
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc, 
  increment, 
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { db } from '../../firebase-setup.js';
import { 
  BADGES, 
  getLevel, 
  getPointsToNextLevel,
  getLevelProgress,
  getFeatureValue,
  isWithinLimit,
  getRemainingUsage
} from '../config/featureFlags.js';
import { toast } from '../utils/toast.js';

class UserService {
  constructor() {
    this.currentUser = null;
    this.userData = null;
    this.isInitialized = false;
    this.isInitializing = false;  // Guard against concurrent initialization
    this.pendingUpdates = [];
    this.updateDebounceTimer = null;
  }

  /**
   * Initialize user data on sign in
   * @param {object} firebaseUser - Firebase user object
   */
  async initializeUser(firebaseUser) {
    if (!firebaseUser) {
      console.warn('⚠️ UserService: No user provided');
      return;
    }

    // Guard against concurrent initialization
    if (this.isInitializing) {
      console.log('👤 UserService: Already initializing, skipping duplicate call');
      return;
    }
    
    // If already initialized for this user, skip
    if (this.isInitialized && this.currentUser?.uid === firebaseUser.uid) {
      console.log('👤 UserService: Already initialized for this user');
      return;
    }

    this.isInitializing = true;
    this.currentUser = firebaseUser;
    console.log('👤 UserService: Initializing for', firebaseUser.email);

    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Use getDocFromServer to avoid Target ID conflicts with cached queries
        let userDoc;
        try {
          userDoc = await getDocFromServer(doc(db, 'users', firebaseUser.uid));
        } catch (serverError) {
          // Fallback to cached getDoc if server fetch fails
          console.log('👤 UserService: Server fetch failed, trying cache...');
          userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        }
        
        if (userDoc.exists()) {
          this.userData = userDoc.data();
          console.log('👤 UserService: Loaded existing user data');
          // Ensure all new fields exist (migration)
          await this.migrateUserData();
        } else {
          // New user - create document with all fields
          console.log('👤 UserService: Creating new user document');
          await this.createNewUser(firebaseUser);
        }
        
        // Update last active and check streak
        await this.updateLastActive();
        
        this.isInitialized = true;
        this.isInitializing = false;
        console.log('✅ UserService: Initialization complete');
        return; // Success - exit the retry loop
        
      } catch (error) {
        lastError = error;
        
        // Check if it's the Target ID error - retry with delay
        if (error.message?.includes('Target ID') && attempt < MAX_RETRIES) {
          console.log(`👤 UserService: Retry ${attempt}/${MAX_RETRIES} after Target ID conflict...`);
          await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Exponential backoff
          continue;
        }
        
        // For other errors or final retry, throw
        break;
      }
    }

    // All retries failed
    this.isInitializing = false;
    console.error('❌ UserService: Initialization failed after retries:', lastError);
    // Don't throw - allow app to continue without user tracking
    // throw lastError;
  }

  /**
   * Create new user document with all fields
   */
  async createNewUser(firebaseUser) {
    const newUserData = {
      // Basic info
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || 'Anonymous',
      photoURL: firebaseUser.photoURL || null,
      createdAt: serverTimestamp(),
      
      // Account
      accountTier: 'free',
      organizationId: null,
      organizationRole: null,
      
      // Subscription
      subscription: {
        status: null,
        plan: null,
        startDate: null,
        expiryDate: null,
        paymentProvider: null,
        externalId: null
      },
      
      // Usage
      usage: {
        savedRoutes: 0,
        guidesCreated: 0,
        exportsThisMonth: 0,
        apiCallsThisMonth: 0,
        lastResetDate: serverTimestamp()
      },
      
      // Engagement
      engagement: {
        totalTrackedDistance: 0,
        totalTrackedTime: 0,
        surveysCompleted: 0,
        reportsSubmitted: 0,
        photosUploaded: 0,
        publicGuidesCreated: 0,
        firstTrackDate: null,
        lastActiveDate: serverTimestamp()
      },
      
      // Achievements
      achievements: {
        badges: ['beta_tester'], // Give beta badge to early users
        level: 1,
        points: 50, // Starting points for beta testers
        streakDays: 1,
        longestStreak: 1
      },
      
      // Preferences
      preferences: {
        mobilityProfile: null,
        units: 'metric',
        notifications: true,
        emailUpdates: false,
        theme: 'system'
      }
    };
    
    await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
    this.userData = newUserData;
    
    // Show welcome toast with badge
    setTimeout(() => {
      toast.success('🧪 Welcome, Beta Pioneer! You\'ve earned your first badge!');
    }, 1000);
    
    console.log('✅ UserService: New user created with beta_tester badge');
  }

  /**
   * Migrate existing user data to include new fields
   */
  async migrateUserData() {
    const updates = {};
    let needsMigration = false;
    
    // Check and add missing top-level fields
    if (this.userData.accountTier === undefined) {
      updates.accountTier = 'free';
      needsMigration = true;
    }
    
    if (!this.userData.subscription) {
      updates.subscription = { 
        status: null, 
        plan: null, 
        startDate: null, 
        expiryDate: null, 
        paymentProvider: null, 
        externalId: null 
      };
      needsMigration = true;
    }
    
    if (!this.userData.usage) {
      updates.usage = { 
        savedRoutes: 0, 
        guidesCreated: 0, 
        exportsThisMonth: 0, 
        apiCallsThisMonth: 0, 
        lastResetDate: serverTimestamp() 
      };
      needsMigration = true;
    }
    
    if (!this.userData.engagement) {
      updates.engagement = { 
        totalTrackedDistance: 0, 
        totalTrackedTime: 0, 
        surveysCompleted: 0, 
        reportsSubmitted: 0, 
        photosUploaded: 0,
        publicGuidesCreated: 0,
        firstTrackDate: null, 
        lastActiveDate: serverTimestamp() 
      };
      needsMigration = true;
    }
    
    if (!this.userData.achievements) {
      updates.achievements = { 
        badges: [], 
        level: 1, 
        points: 0, 
        streakDays: 0, 
        longestStreak: 0 
      };
      needsMigration = true;
    }
    
    if (!this.userData.preferences) {
      updates.preferences = { 
        mobilityProfile: null, 
        units: 'metric', 
        notifications: true, 
        emailUpdates: false,
        theme: 'system'
      };
      needsMigration = true;
    }
    
    if (needsMigration) {
      console.log('📦 UserService: Migrating user data with fields:', Object.keys(updates));
      await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
      this.userData = { ...this.userData, ...updates };
    }
  }

  /**
   * Update last active timestamp and streak
   */
  async updateLastActive() {
    if (!this.currentUser) return;
    
    const now = new Date();
    const lastActive = this.userData.engagement?.lastActiveDate?.toDate?.() || 
                       (this.userData.engagement?.lastActiveDate ? new Date(this.userData.engagement.lastActiveDate) : null);
    
    let streakUpdate = {};
    
    if (lastActive) {
      // Calculate days since last active
      const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysSinceActive = Math.floor((todayDay - lastActiveDay) / (1000 * 60 * 60 * 24));
      
      if (daysSinceActive === 1) {
        // Consecutive day - increment streak
        const newStreak = (this.userData.achievements?.streakDays || 0) + 1;
        const longestStreak = Math.max(newStreak, this.userData.achievements?.longestStreak || 0);
        
        streakUpdate = {
          'achievements.streakDays': newStreak,
          'achievements.longestStreak': longestStreak
        };
        
        // Check streak badges
        if (newStreak === 7) {
          const badge = await this.awardBadge('streak_7');
          if (badge) toast.success(`🏅 ${badge.icon} Week Warrior badge earned!`);
        }
        if (newStreak === 30) {
          const badge = await this.awardBadge('streak_30');
          if (badge) toast.success(`🏅 ${badge.icon} Monthly Explorer badge earned!`);
        }
        
        console.log(`🔥 Streak: ${newStreak} days`);
      } else if (daysSinceActive > 1) {
        // Streak broken
        streakUpdate = { 'achievements.streakDays': 1 };
        console.log('💔 Streak reset');
      }
      // Same day (daysSinceActive === 0) - no streak update needed
    } else {
      // First activity ever
      streakUpdate = { 'achievements.streakDays': 1 };
    }
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'engagement.lastActiveDate': serverTimestamp(),
        ...streakUpdate
      });
      
      // Update local cache
      if (streakUpdate['achievements.streakDays']) {
        this.userData.achievements = this.userData.achievements || {};
        this.userData.achievements.streakDays = streakUpdate['achievements.streakDays'];
        if (streakUpdate['achievements.longestStreak']) {
          this.userData.achievements.longestStreak = streakUpdate['achievements.longestStreak'];
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to update last active:', error.message);
    }
  }

  /**
   * Track distance completed
   * @param {number} distance - Distance in meters
   * @param {number} duration - Duration in seconds
   */
  async trackDistance(distance, duration = 0) {
    if (!this.currentUser) return;
    
    const distanceKm = distance / 1000;
    const currentTotal = this.userData.engagement?.totalTrackedDistance || 0;
    const newTotal = currentTotal + distanceKm;
    
    try {
      const updates = {
        'engagement.totalTrackedDistance': newTotal
      };
      
      if (duration > 0) {
        updates['engagement.totalTrackedTime'] = increment(duration);
      }
      
      // Check if first track
      if (!this.userData.engagement?.firstTrackDate) {
        updates['engagement.firstTrackDate'] = serverTimestamp();
        const badge = await this.awardBadge('first_track');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      
      await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
      
      // Update local cache
      this.userData.engagement = this.userData.engagement || {};
      this.userData.engagement.totalTrackedDistance = newTotal;
      
      // Check distance badges
      const badgesToCheck = [
        { threshold: 10, id: 'distance_10k' },
        { threshold: 50, id: 'distance_50k' },
        { threshold: 100, id: 'distance_100k' }
      ];
      
      for (const { threshold, id } of badgesToCheck) {
        if (newTotal >= threshold && !this.hasBadge(id)) {
          const badge = await this.awardBadge(id);
          if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
        }
      }
      
      console.log(`📏 Distance tracked: +${distanceKm.toFixed(2)}km (Total: ${newTotal.toFixed(2)}km)`);
      
    } catch (error) {
      console.error('❌ Failed to track distance:', error);
    }
  }

  /**
   * Track survey completion
   */
  async trackSurveyCompleted() {
    if (!this.currentUser) return;
    
    const currentCount = this.userData.engagement?.surveysCompleted || 0;
    const newCount = currentCount + 1;
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'engagement.surveysCompleted': newCount
      });
      
      // Update local cache
      this.userData.engagement = this.userData.engagement || {};
      this.userData.engagement.surveysCompleted = newCount;
      
      // Check survey badges
      if (newCount === 1) {
        const badge = await this.awardBadge('first_survey');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      if (newCount === 10 && !this.hasBadge('surveys_10')) {
        const badge = await this.awardBadge('surveys_10');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      if (newCount === 50 && !this.hasBadge('surveys_50')) {
        const badge = await this.awardBadge('surveys_50');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      
      console.log(`📋 Surveys completed: ${newCount}`);
      
    } catch (error) {
      console.error('❌ Failed to track survey:', error);
    }
  }

  /**
   * Track barrier report submission
   */
  async trackReportSubmitted() {
    if (!this.currentUser) return;
    
    const currentCount = this.userData.engagement?.reportsSubmitted || 0;
    const newCount = currentCount + 1;
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'engagement.reportsSubmitted': newCount
      });
      
      // Update local cache
      this.userData.engagement = this.userData.engagement || {};
      this.userData.engagement.reportsSubmitted = newCount;
      
      // Check report badges
      if (newCount === 1) {
        const badge = await this.awardBadge('first_report');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      if (newCount === 10 && !this.hasBadge('reports_10')) {
        const badge = await this.awardBadge('reports_10');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      if (newCount === 50 && !this.hasBadge('reports_50')) {
        const badge = await this.awardBadge('reports_50');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      
      console.log(`🚧 Reports submitted: ${newCount}`);
      
    } catch (error) {
      console.error('❌ Failed to track report:', error);
    }
  }

  /**
   * Track guide creation
   * @param {boolean} isPublic - Whether the guide is public
   */
  async trackGuideCreated(isPublic = false) {
    if (!this.currentUser) return;
    
    try {
      const updates = {
        'usage.guidesCreated': increment(1)
      };
      
      if (isPublic) {
        updates['engagement.publicGuidesCreated'] = increment(1);
      }
      
      await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
      
      // Update local cache
      this.userData.usage = this.userData.usage || {};
      this.userData.usage.guidesCreated = (this.userData.usage.guidesCreated || 0) + 1;
      
      if (isPublic) {
        this.userData.engagement = this.userData.engagement || {};
        const publicGuides = (this.userData.engagement.publicGuidesCreated || 0) + 1;
        this.userData.engagement.publicGuidesCreated = publicGuides;
        
        // Check guide badges
        if (publicGuides === 1) {
          const badge = await this.awardBadge('first_guide');
          if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
        }
        if (publicGuides === 5 && !this.hasBadge('guides_5')) {
          const badge = await this.awardBadge('guides_5');
          if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
        }
        if (publicGuides === 25 && !this.hasBadge('guides_25')) {
          const badge = await this.awardBadge('guides_25');
          if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
        }
      }
      
      console.log(`🗺️ Guide created (public: ${isPublic})`);
      
    } catch (error) {
      console.error('❌ Failed to track guide:', error);
    }
  }

  /**
   * Track photo upload
   */
  async trackPhotoUploaded() {
    if (!this.currentUser) return;
    
    const currentCount = this.userData.engagement?.photosUploaded || 0;
    const newCount = currentCount + 1;
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'engagement.photosUploaded': newCount
      });
      
      // Update local cache
      this.userData.engagement = this.userData.engagement || {};
      this.userData.engagement.photosUploaded = newCount;
      
      // Check photo badges
      if (newCount === 1) {
        const badge = await this.awardBadge('first_photo');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      if (newCount === 50 && !this.hasBadge('photos_50')) {
        const badge = await this.awardBadge('photos_50');
        if (badge) toast.success(`🏅 ${badge.icon} ${badge.name} badge earned!`);
      }
      
    } catch (error) {
      console.error('❌ Failed to track photo:', error);
    }
  }

  /**
   * Track export usage
   * @param {string} format - Export format (json, gpx, pdf, html)
   */
  async trackExport(format) {
    if (!this.currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'usage.exportsThisMonth': increment(1)
      });
      
      // Update local cache
      this.userData.usage = this.userData.usage || {};
      this.userData.usage.exportsThisMonth = (this.userData.usage.exportsThisMonth || 0) + 1;
      
      console.log(`📤 Export tracked: ${format}`);
      
    } catch (error) {
      console.error('❌ Failed to track export:', error);
    }
  }

  /**
   * Track route save
   */
  async trackRouteSaved() {
    if (!this.currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'usage.savedRoutes': increment(1)
      });
      
      // Update local cache
      this.userData.usage = this.userData.usage || {};
      this.userData.usage.savedRoutes = (this.userData.usage.savedRoutes || 0) + 1;
      
    } catch (error) {
      console.error('❌ Failed to track route save:', error);
    }
  }

  /**
   * Check if user has a badge
   * @param {string} badgeId - Badge ID
   * @returns {boolean}
   */
  hasBadge(badgeId) {
    return this.userData?.achievements?.badges?.includes(badgeId) || false;
  }

  /**
   * Award a badge to the user
   * @param {string} badgeId - Badge ID
   * @returns {object|null} - Badge object if newly awarded, null if already had
   */
  async awardBadge(badgeId) {
    if (!this.currentUser) return null;
    if (this.hasBadge(badgeId)) return null;
    
    const badge = BADGES[badgeId];
    if (!badge) {
      console.warn(`⚠️ Unknown badge: ${badgeId}`);
      return null;
    }
    
    const newBadges = [...(this.userData.achievements?.badges || []), badgeId];
    const newPoints = (this.userData.achievements?.points || 0) + badge.points;
    const newLevel = getLevel(newPoints);
    const oldLevel = this.userData.achievements?.level || 1;
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'achievements.badges': newBadges,
        'achievements.points': newPoints,
        'achievements.level': newLevel.level
      });
      
      // Update local cache
      this.userData.achievements = this.userData.achievements || {};
      this.userData.achievements.badges = newBadges;
      this.userData.achievements.points = newPoints;
      this.userData.achievements.level = newLevel.level;
      
      console.log(`🏅 Badge awarded: ${badge.name} (+${badge.points} points)`);
      
      // Check for level up
      if (newLevel.level > oldLevel) {
        setTimeout(() => {
          toast.success(`🎉 Level Up! You're now ${newLevel.name} (Level ${newLevel.level})`);
        }, 1500);
      }
      
      return badge;
      
    } catch (error) {
      console.error('❌ Failed to award badge:', error);
      return null;
    }
  }

  /**
   * Get user's current tier
   * @returns {string}
   */
  getTier() {
    return this.userData?.accountTier || 'free';
  }

  /**
   * Check if user can perform an action based on tier limits
   * @param {string} limitType - Type of limit (maxSavedRoutes, maxCloudGuides, etc.)
   * @returns {object} - { allowed: boolean, remaining: number|null, message: string }
   */
  checkLimit(limitType) {
    const tier = this.getTier();
    let currentUsage = 0;
    
    switch (limitType) {
      case 'maxSavedRoutes':
        currentUsage = this.userData?.usage?.savedRoutes || 0;
        break;
      case 'maxCloudGuides':
        currentUsage = this.userData?.usage?.guidesCreated || 0;
        break;
      case 'exportsThisMonth':
        currentUsage = this.userData?.usage?.exportsThisMonth || 0;
        break;
      default:
        return { allowed: true, remaining: null, message: '' };
    }
    
    const allowed = isWithinLimit(limitType, currentUsage, tier);
    const remaining = getRemainingUsage(limitType, currentUsage, tier);
    
    let message = '';
    if (!allowed) {
      message = `You've reached your ${tier} plan limit. Upgrade for more!`;
    } else if (remaining !== null && remaining <= 2) {
      message = `${remaining} remaining on your ${tier} plan`;
    }
    
    return { allowed, remaining, message };
  }

  /**
   * Check if a feature is available for the user
   * @param {string} feature - Feature key
   * @returns {boolean}
   */
  canAccessFeature(feature) {
    const tier = this.getTier();
    const value = getFeatureValue(feature, tier);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }

  /**
   * Get user's achievements summary
   * @returns {object}
   */
  getAchievementsSummary() {
    const achievements = this.userData?.achievements || {};
    const points = achievements.points || 0;
    const level = getLevel(points);
    const pointsToNext = getPointsToNextLevel(points);
    const progress = getLevelProgress(points);
    
    return {
      badges: (achievements.badges || []).map(id => BADGES[id]).filter(Boolean),
      badgeCount: achievements.badges?.length || 0,
      totalBadges: Object.keys(BADGES).length,
      level: level,
      points: points,
      pointsToNextLevel: pointsToNext,
      levelProgress: progress,
      streakDays: achievements.streakDays || 0,
      longestStreak: achievements.longestStreak || 0
    };
  }

  /**
   * Get user's engagement summary
   * @returns {object}
   */
  getEngagementSummary() {
    const engagement = this.userData?.engagement || {};
    return {
      totalDistance: engagement.totalTrackedDistance || 0,
      totalTime: engagement.totalTrackedTime || 0,
      surveysCompleted: engagement.surveysCompleted || 0,
      reportsSubmitted: engagement.reportsSubmitted || 0,
      photosUploaded: engagement.photosUploaded || 0,
      publicGuides: engagement.publicGuidesCreated || 0,
      firstTrackDate: engagement.firstTrackDate,
      lastActiveDate: engagement.lastActiveDate
    };
  }

  /**
   * Get user's usage summary
   * @returns {object}
   */
  getUsageSummary() {
    const usage = this.userData?.usage || {};
    const tier = this.getTier();
    
    return {
      savedRoutes: {
        current: usage.savedRoutes || 0,
        limit: getFeatureValue('maxSavedRoutes', tier),
        remaining: getRemainingUsage('maxSavedRoutes', usage.savedRoutes || 0, tier)
      },
      cloudGuides: {
        current: usage.guidesCreated || 0,
        limit: getFeatureValue('maxCloudGuides', tier),
        remaining: getRemainingUsage('maxCloudGuides', usage.guidesCreated || 0, tier)
      },
      exports: {
        current: usage.exportsThisMonth || 0,
        lastReset: usage.lastResetDate
      }
    };
  }

  /**
   * Update user preferences
   * @param {object} preferences - Preferences to update
   */
  async updatePreferences(preferences) {
    if (!this.currentUser) return;
    
    const updates = {};
    for (const [key, value] of Object.entries(preferences)) {
      updates[`preferences.${key}`] = value;
    }
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
      
      // Update local cache
      this.userData.preferences = { ...this.userData.preferences, ...preferences };
      
      console.log('✅ Preferences updated:', Object.keys(preferences));
      
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   * @returns {object}
   */
  getPreferences() {
    return this.userData?.preferences || {
      mobilityProfile: null,
      units: 'metric',
      notifications: true,
      emailUpdates: false,
      theme: 'system'
    };
  }

  // ==================== Mobility Profile Methods ====================

  /**
   * Get user's current mobility profile
   * @returns {string|null} Profile ID or null
   */
  getMobilityProfile() {
    // First try from userData (Firestore)
    const firestoreProfile = this.userData?.preferences?.mobilityProfile;
    if (firestoreProfile) {
      return firestoreProfile;
    }
    
    // Fallback to localStorage (works offline and before login)
    try {
      const localProfile = localStorage.getItem('accessNature_mobilityProfile');
      if (localProfile) {
        return localProfile;
      }
    } catch (e) {
      console.warn('Could not read mobility profile from localStorage:', e);
    }
    
    return null;
  }

  /**
   * Set user's mobility profile
   * @param {string} profileId - Mobility profile ID
   */
  async setMobilityProfile(profileId) {
    // Always save to localStorage first (works offline)
    try {
      localStorage.setItem('accessNature_mobilityProfile', profileId);
      console.log('💾 Mobility profile saved to localStorage:', profileId);
    } catch (e) {
      console.warn('Could not save mobility profile to localStorage:', e);
    }
    
    // If logged in, also save to Firestore
    if (this.currentUser) {
      try {
        await updateDoc(doc(db, 'users', this.currentUser.uid), {
          'preferences.mobilityProfile': profileId
        });
        
        // Update local cache
        if (!this.userData) {
          this.userData = { preferences: {} };
        }
        if (!this.userData.preferences) {
          this.userData.preferences = {};
        }
        this.userData.preferences.mobilityProfile = profileId;
        
        console.log('☁️ Mobility profile synced to Firestore:', profileId);
      } catch (error) {
        console.warn('⚠️ Could not sync mobility profile to Firestore:', error);
        // Still return true since localStorage save worked
      }
    }
    
    return true;
  }

  /**
   * Check if user has a mobility profile set
   * @returns {boolean}
   */
  hasMobilityProfile() {
    const profile = this.getMobilityProfile();
    return profile !== null && profile !== 'no_mobility_aids';
  }

  /**
   * Get user's mobility concerns based on their profile
   * @returns {string[]} Array of concern strings
   */
  getMobilityConcerns() {
    const profileId = this.getMobilityProfile();
    if (!profileId) return [];
    
    // Dynamic import would be better but for now we'll check the profile data
    // This will be populated when mobilityProfiles.js is loaded
    return this._mobilityProfileData?.[profileId]?.concerns || [];
  }

  /**
   * Store mobility profiles data for reference
   * Called by mobilityProfileUI on initialization
   * @param {object} profilesData 
   */
  setMobilityProfilesData(profilesData) {
    this._mobilityProfileData = profilesData;
  }

  /**
   * Reset user on logout
   */
  reset() {
    this.currentUser = null;
    this.userData = null;
    this.isInitialized = false;
    this.isInitializing = false;
    console.log('👤 UserService: Reset');
  }

  /**
   * Refresh user data from server
   */
  async refresh() {
    if (!this.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userDoc.exists()) {
        this.userData = userDoc.data();
        console.log('🔄 UserService: Data refreshed');
      }
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
    }
  }
}

// Export singleton instance
export const userService = new UserService();

console.log('👤 UserService module loaded');