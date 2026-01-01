// Landing page controller
import { auth, db } from '../firebase-setup.js';
import { toast } from './utils/toast.js';
import { modal } from './utils/modal.js';
import { offlineIndicator } from './ui/offlineIndicator.js';
import { loadingStates } from './ui/loadingStates.js';
import { gamificationUI } from './ui/gamificationUI.js';
import { mobilityProfileUI } from './ui/mobilityProfileUI.js';
import { communityChallenges } from './features/communityChallenges.js';
import { accessibilityRating } from './features/accessibilityRating.js';
import { trailSearch } from './features/trailSearch.js';
import { showError, getErrorMessage } from './utils/errorMessages.js';
import { userService } from './services/userService.js';
import { betaFeedback } from './utils/betaFeedback.js';
// import { initializeAccessReport } from './js/modules/access-report-main.js';

// Early global function stubs (replaced once controller initializes)
window.openTrailBrowser = () => {
  console.log('⏳ Landing controller not ready yet, retrying...');
  setTimeout(() => window.landingController?.openTrailBrowser(), 100);
};
window.closeTrailBrowser = () => window.landingController?.closeTrailBrowser();
window.openTracker = () => { window.location.href = 'tracker.html'; };
window.quickSearch = () => window.landingController?.quickSearch();
window.searchTrails = () => window.landingController?.searchTrails();
window.applyFilters = () => window.landingController?.applyFilters();
window.loadMoreResults = () => window.landingController?.loadMoreResults();
window.loadMoreFeatured = () => window.landingController?.loadMoreFeatured();
window.viewTrailGuide = (guideId) => window.landingController?.viewTrailGuide(guideId);
window.loadMyTrailGuides = () => window.landingController?.loadMyTrailGuides();
window.showAbout = () => window.landingController?.showAbout();
window.showPrivacy = () => window.landingController?.showPrivacy();
window.showContact = () => window.landingController?.showContact();
window.showHelp = () => window.landingController?.showHelp();

class LandingPageController {
  constructor() {
    this.authController = null;
    this.currentFilters = {};
    this.currentSearch = '';
    this.lastVisible = null;
    this.isLoading = false;
    this.allFeaturedTrails = [];      // Store ALL trails
    this.filteredTrails = [];         // Store filtered trails
    this.displayedFeaturedCount = 0;  // How many currently shown
    this.featuredBatchSize = 6;       // Load 6 at a time
    this.publicGuidesCache = null;    // Cache for shared queries
  }

  async initialize() {
    console.log('🏠 initialize() method called');
    try {
      console.log('🏠 Initializing landing page...');
      
      // Show loading indicators immediately
      this.showLoadingIndicators();
      
      // Initialize offline indicator
      offlineIndicator.initialize();
      
      // Initialize beta feedback system (non-critical, wrap in try-catch)
      try {
        betaFeedback.initialize();
        console.log('✅ Beta feedback initialized');
      } catch (e) {
        console.warn('⚠️ Beta feedback init failed (non-critical):', e);
      }
      
      // Initialize search UI
      console.log('🏠 About to call initializeTrailSearch()');
      this.initializeTrailSearch();
      console.log('🏠 initializeTrailSearch() completed');
      
      this.setupEventListeners();
      
      // Setup auth state listener FIRST (critical for My Trails)
      console.log('🏠 Setting up auth listener...');
      await this.setupAuthListener();
      
      // Update auth status and show My Trails if logged in
      console.log('🏠 About to call updateLandingAuthStatus()');
      await this.updateLandingAuthStatus();
      console.log('🏠 updateLandingAuthStatus() completed');
      
      // Load data with retry wrapper
      await this.loadDataWithRetry();
      
      // Make this instance globally available for modal functions
      window.landingAuth = this;
      
      console.log('✅ Landing page initialized');
    } catch (error) {
      console.error('❌ Landing page initialization failed:', error);
      showError(error);
      this.hideLoadingIndicators();
    }
  }
  
  showLoadingIndicators() {
    // Community stats loading indicators
    const statIds = ['publicGuides', 'totalKm', 'accessibleTrails', 'totalUsers', 'totalRoutes', 'totalDistance'];
    statIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '<span class="stat-loading"></span>';
      }
    });
    
    // Featured trails loading skeleton
    const featuredContainer = document.getElementById('featuredTrails');
    if (featuredContainer) {
      featuredContainer.innerHTML = `
        <div class="featured-loading">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      `;
    }
  }
  
  hideLoadingIndicators() {
    // Set defaults if still showing loading
    const statIds = ['publicGuides', 'totalKm', 'accessibleTrails', 'totalUsers', 'totalRoutes', 'totalDistance'];
    statIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.querySelector('.stat-loading')) {
        el.textContent = '0';
      }
    });
  }
  
  async loadDataWithRetry(retryCount = 0) {
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 15000; // 15 second timeout per operation
    
    try {
      console.log('📊 Loading data (attempt ' + (retryCount + 1) + ')...');
      
      // Helper to add timeout to promises
      const withTimeout = (promise, name) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${name} timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
          )
        ]);
      };
      
      // Track results
      let totalItems = 0;
      let warnings = [];
      
      // Load sequentially to avoid overwhelming the connection
      console.log('📊 Step 1/3: Loading community stats...');
      const communityResult = await withTimeout(this.loadCommunityStats(), 'Community stats');
      if (communityResult?.count) totalItems += communityResult.count;
      if (communityResult?.warning) warnings.push('community');
      
      console.log('📊 Step 2/3: Loading featured trails...');
      await withTimeout(this.loadFeaturedTrails(), 'Featured trails');
      
      console.log('📊 Step 3/3: Loading user stats...');
      const userResult = await withTimeout(this.updateUserStats(), 'User stats');
      if (userResult?.count) totalItems += userResult.count;
      if (userResult?.warning) warnings.push('user');
      
      // Check if we actually got data
      if (totalItems === 0 && warnings.length > 0) {
        console.warn('⚠️ All queries returned 0 items - likely offline or empty cache');
        toast.warning('Unable to load data. Check your connection.');
      } else if (totalItems > 0) {
        console.log(`✅ All data loaded successfully (${totalItems} items)`);
      } else {
        console.log('✅ Data loading complete');
      }
      
    } catch (error) {
      console.error(`❌ Data loading failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < MAX_RETRIES && (
        error.message?.includes('Target ID') ||
        error.message?.includes('unavailable') ||
        error.message?.includes('timeout') ||
        error.code === 'unavailable'
      )) {
        console.log(`🔄 Retrying data load... (${retryCount + 1}/${MAX_RETRIES})`);
        // Exponential backoff
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.loadDataWithRetry(retryCount + 1);
      }
      
      // Show defaults on final failure
      this.hideLoadingIndicators();
      toast.error('Some data failed to load. Pull to refresh.');
    }
  }

  /**
   * Initialize trail search UI
   */
  initializeTrailSearch() {
    console.log('🔍 initializeTrailSearch() called');
    const searchContainer = document.getElementById('trailSearchContainer');
    console.log('🔍 searchContainer:', searchContainer);
    if (!searchContainer) {
      console.log('⚠️ Trail search container not found');
      return;
    }
    
    // Create search UI
    const searchUI = trailSearch.createSearchUI({
      showSort: true,
      showFilters: true,
      expandedByDefault: false,
      placeholder: 'Search trails by name or location...'
    });
    
    searchContainer.appendChild(searchUI);
    
    // Set up filter change callback
    trailSearch.onFilterChange = (filters, sortBy) => {
      console.log('🔍 Filters changed:', filters, 'Sort:', sortBy);
      this.applyTrailFilters();
    };
    
    console.log('🔍 Trail search UI initialized');
  }

  /**
   * Apply trail filters and update display
   */
  applyTrailFilters() {
    // Filter and sort trails
    this.filteredTrails = trailSearch.filterAndSort(this.allFeaturedTrails);
    
    // Update results header
    const headerContainer = document.getElementById('trailResultsHeader');
    if (headerContainer) {
      headerContainer.innerHTML = '';
      const header = trailSearch.createResultsHeader(
        this.filteredTrails.length,
        this.allFeaturedTrails.length
      );
      headerContainer.appendChild(header);
    }
    
    // Reset displayed count and show filtered results
    this.displayedFeaturedCount = 0;
    this.displayFilteredTrails();
  }

  /**
   * Display filtered trails
   */
  displayFilteredTrails() {
    const container = document.getElementById('featuredTrails');
    if (!container) return;
    
    // Use filtered trails if we have them, otherwise use all
    const trailsToUse = this.filteredTrails.length > 0 || trailSearch.getActiveFilterCount() > 0
      ? this.filteredTrails 
      : this.allFeaturedTrails;
    
    // No results
    if (trailsToUse.length === 0) {
      container.innerHTML = '';
      container.appendChild(trailSearch.createNoResults());
      this.updateLoadMoreButtonFiltered(0, 0);
      return;
    }
    
    // Calculate what to show
    const startIndex = this.displayedFeaturedCount;
    const endIndex = Math.min(
      startIndex + this.featuredBatchSize,
      trailsToUse.length
    );
    
    const trailsToShow = trailsToUse.slice(startIndex, endIndex);
    
    // First batch: replace content
    if (this.displayedFeaturedCount === 0) {
      const featuredHTML = trailsToShow
        .map(trail => this.createFeaturedTrailCard(trail))
        .join('');
      container.innerHTML = featuredHTML;
    } else {
      // Subsequent batches: append content
      const featuredHTML = trailsToShow
        .map(trail => this.createFeaturedTrailCard(trail))
        .join('');
      container.insertAdjacentHTML('beforeend', featuredHTML);
    }
    
    this.displayedFeaturedCount = endIndex;
    this.updateLoadMoreButtonFiltered(this.displayedFeaturedCount, trailsToUse.length);
  }

  /**
   * Update load more button for filtered results
   */
  updateLoadMoreButtonFiltered(displayed, total) {
    const button = document.getElementById('loadMoreBtn') || document.querySelector('.load-more-btn');
    if (!button) return;
    
    const remaining = total - displayed;
    
    if (remaining > 0) {
      button.style.display = 'block';
      button.textContent = `Load More Trails (${remaining} more)`;
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    } else if (total > 0) {
      button.textContent = `All ${total} trails shown ✓`;
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    } else {
      button.style.display = 'none';
    }
  }

  setupEventListeners() {
    // Quick search
    const quickSearchInput = document.getElementById('quickSearch');
    if (quickSearchInput) {
      quickSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.quickSearch();
        }
      });
      window.viewTrailGuide = (guideId) => this.viewTrailGuide(guideId);
    }

    // Make functions global
    window.openTrailBrowser = () => this.openTrailBrowser();
    window.closeTrailBrowser = () => this.closeTrailBrowser();
    window.openTracker = () => this.openTracker();
    window.quickSearch = () => this.quickSearch();
    window.searchTrails = () => this.searchTrails();
    window.applyFilters = () => this.applyFilters();
    window.loadMoreResults = () => this.loadMoreResults();
    window.loadMoreFeatured = () => this.loadMoreFeatured();
    window.viewTrailGuide = (guideId) => this.viewTrailGuide(guideId);
    window.loadMyTrailGuides = () => this.loadMyTrailGuides();
    
    // Social functions
    window.likeTrail = (trailId) => this.likeTrail(trailId);
    window.shareTrail = (trailId, trailName) => this.shareTrail(trailId, trailName);
    
    // Info functions
    window.showAbout = () => this.showAbout();
    window.showPrivacy = () => this.showPrivacy();
    window.showContact = () => this.showContact();
    window.showHelp = () => this.showHelp();
  }

  // Navigation Functions
  openTrailBrowser() {
    const modal = document.getElementById('trailBrowserModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.searchTrails(); // Load initial results
    }
  }

  closeTrailBrowser() {
    const modal = document.getElementById('trailBrowserModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  openTracker() {
    // Redirect to main tracker app
    window.location.href = 'tracker.html';
  }

  // Search Functions
  async quickSearch() {
    const searchInput = document.getElementById('quickSearch');
    const searchTerm = searchInput?.value?.trim();
    
    if (!searchTerm) {
      toast.warning('Please enter a search term');
      return;
    }

    this.currentSearch = searchTerm;
    this.openTrailBrowser();
  }

// UPDATED: Search with better error handling
async searchTrails() {
  if (this.isLoading) return;
  
  this.isLoading = true;
  this.showLoading('trailResults');
  
  try {
    const searchInput = document.getElementById('trailSearch');
    const searchTerm = searchInput?.value?.trim() || this.currentSearch;
    
    console.log('Searching trails:', searchTerm || 'all trails');
    
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Simple query without orderBy
    let guidesQuery = query(
      collection(db, 'trail_guides'),
      where('isPublic', '==', true)
    );
    
    const querySnapshot = await getDocs(guidesQuery);
    const guides = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Apply text search filter on client side
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = data.routeName?.toLowerCase().includes(searchLower);
        const locationMatch = data.accessibility?.location?.toLowerCase().includes(searchLower);
        const authorMatch = data.userEmail?.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !locationMatch && !authorMatch) {
          return; // Skip this result
        }
      }
      
      // Apply other filters on client side
      if (this.currentFilters.wheelchairAccess && 
          data.accessibility?.wheelchairAccess !== this.currentFilters.wheelchairAccess) {
        return;
      }
      
      if (this.currentFilters.difficulty && 
          data.accessibility?.difficulty !== this.currentFilters.difficulty) {
        return;
      }
      
      if (this.currentFilters.distance) {
        const distance = data.metadata?.totalDistance || 0;
        const [min, max] = this.parseDistanceFilter(this.currentFilters.distance);
        if (distance < min || (max && distance > max)) {
          return;
        }
      }
      
      guides.push({
        id: doc.id,
        ...data
      });
    });
    
    // Sort client-side by creation date (newest first)
    guides.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    
    console.log(`Found ${guides.length} trails matching criteria`);
    this.displayTrailResults(guides);
    this.updateResultsCount(guides.length);
    
  } catch (error) {
    console.error('Search failed:', error);
    
    const resultsContainer = document.getElementById('trailResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Search temporarily unavailable</h3>
          <p>Please try again in a moment, or check your connection.</p>
          <button onclick="searchTrails()" class="nav-card-button primary">Retry Search</button>
        </div>
      `;
    }
  } finally {
    this.isLoading = false;
  }
}

  applyFilters() {
    // Collect filter values
    this.currentFilters = {
      wheelchairAccess: document.getElementById('wheelchairFilter')?.value || '',
      difficulty: document.getElementById('difficultyFilter')?.value || '',
      distance: document.getElementById('distanceFilter')?.value || ''
    };
    
    console.log('🎯 Applying filters:', this.currentFilters);
    this.searchTrails();
  }

  displayTrailResults(guides) {
    const resultsContainer = document.getElementById('trailResults');
    if (!resultsContainer) return;
    
    if (guides.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No trails found</h3>
          <p>Try adjusting your search terms or filters</p>
          <button onclick="clearFilters()" class="nav-card-button primary">Clear Filters</button>
        </div>
      `;
      return;
    }
    
    const resultsHTML = guides.map(guide => this.createTrailResultCard(guide)).join('');
    resultsContainer.innerHTML = resultsHTML;
  }

  createTrailResultCard(guide) {
    const date = new Date(guide.generatedAt).toLocaleDateString();
    const accessibility = guide.accessibility || {};
    const metadata = guide.metadata || {};
    const community = guide.community || {};
    
    return `
      <div class="trail-result-card" onclick="viewTrailGuide('${guide.id}')">
        <div class="trail-result-header">
          <div class="trail-result-name">${guide.routeName}</div>
          <div class="trail-result-author">by ${guide.userEmail}</div>
          <div class="trail-result-date">${date}</div>
        </div>
        
        <div class="trail-result-body">
          <div class="trail-result-stats">
            <div class="trail-stat">
              <span class="trail-stat-value">${(metadata.totalDistance || 0).toFixed(1)}</span>
              <span class="trail-stat-label">km</span>
            </div>
            <div class="trail-stat">
              <span class="trail-stat-value">${metadata.locationCount || 0}</span>
              <span class="trail-stat-label">GPS Points</span>
            </div>
          </div>
          
          <div class="trail-accessibility-tags">
            ${accessibility.wheelchairAccess ? `<span class="accessibility-tag">♿ ${accessibility.wheelchairAccess}</span>` : ''}
            ${accessibility.difficulty ? `<span class="accessibility-tag">🥾 ${accessibility.difficulty}</span>` : ''}
            ${accessibility.trailSurface ? `<span class="accessibility-tag">🛤️ ${accessibility.trailSurface}</span>` : ''}
          </div>
          
          <div class="trail-community-stats">
            <span>👁️ ${community.views || 0} views</span>
            <span>📷 ${metadata.photoCount || 0} photos</span>
            <span>📝 ${metadata.noteCount || 0} notes</span>
          </div>
        </div>
      </div>
    `;
  }

  async viewTrailGuide(guideId) {
    try {
      console.log('👁️ Viewing trail guide:', guideId);
      
      // Import Firestore functions
      const { doc, getDoc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      const { db, auth } = await import('../firebase-setup.js');
      
      // Get the trail guide document
      const guideRef = doc(db, 'trail_guides', guideId);
      const guideSnap = await getDoc(guideRef);
      
      if (!guideSnap.exists()) {
        toast.error('Trail guide not found');
        return;
      }
      
      const guideData = { id: guideId, ...guideSnap.data() };
      
      // Check if it's public or user owns it
      const currentUser = auth.currentUser;
      const canView = guideData.isPublic || (currentUser && currentUser.uid === guideData.userId);
      
      if (!canView) {
        toast.error('This trail guide is private');
        return;
      }
      
      // Increment view count (only for public guides and if not the owner)
      if (guideData.isPublic && (!currentUser || currentUser.uid !== guideData.userId)) {
        try {
          await updateDoc(guideRef, {
            'community.views': increment(1)
          });
        } catch (error) {
          console.warn('Failed to increment view count:', error);
        }
      }
      
      // Show the trail guide in overlay
      if (guideData.htmlContent) {
        this.showTrailGuide(guideData);
      } else {
        toast.error('Trail guide content not available');
      }
      
    } catch (error) {
      console.error('❌ Failed to view trail guide:', error);
      toast.error('Failed to load trail guide');
    }
  }

  // Stats Functions
// UPDATED: Load community stats without count queries
async loadCommunityStats(retryCount = 0) {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 12000; // 12 second timeout
  
  try {
    console.log('📈 Loading community stats...');
    
    // If we already loaded public guides, use cached data
    if (this.publicGuidesCache && this.publicGuidesCache.length > 0) {
      console.log('📈 Using cached public guides for stats');
      this.calculateAndDisplayStats(this.publicGuidesCache);
      return { success: true, count: this.publicGuidesCache.length };
    }
    
    // Wait for any other Firebase operations to complete
    await new Promise(resolve => setTimeout(resolve, 100 + (retryCount * 500)));
    
    const { collection, query, where, getDocs, getDocsFromServer } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Query public guides
    const publicGuidesQuery = query(
      collection(db, 'trail_guides'), 
      where('isPublic', '==', true)
    );
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), TIMEOUT_MS)
    );
    
    // Try getDocsFromServer first to avoid cache conflicts, fall back to getDocs
    let guidesSnapshot;
    let source = 'unknown';
    
    try {
      console.log('   Trying server...');
      const serverPromise = getDocsFromServer(publicGuidesQuery);
      guidesSnapshot = await Promise.race([serverPromise, timeoutPromise]);
      source = 'server';
    } catch (serverError) {
      console.log('   Server failed:', serverError.message, '- trying cache...');
      const cachePromise = getDocs(publicGuidesQuery);
      guidesSnapshot = await Promise.race([cachePromise, timeoutPromise]);
      source = 'cache';
    }
    
    // Cache the results for loadFeaturedTrails
    this.publicGuidesCache = [];
    guidesSnapshot.forEach(doc => {
      this.publicGuidesCache.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    this.calculateAndDisplayStats(this.publicGuidesCache);
    
    // Warn if cache returned 0 items (likely offline with empty cache)
    if (this.publicGuidesCache.length === 0 && source === 'cache') {
      console.warn('⚠️ Community stats: Cache returned 0 items - may be offline');
      return { success: true, count: 0, warning: 'empty_cache' };
    }
    
    console.log(`✅ Community stats loaded from ${source}: ${this.publicGuidesCache.length} public guides`);
    return { success: true, count: this.publicGuidesCache.length, source };
    
  } catch (error) {
    console.error('❌ Failed to load community stats:', error);
    
    // Retry on Target ID error or timeout
    if ((error.message?.includes('Target ID') || error.message?.includes('timeout')) && retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying community stats... (${retryCount + 1}/${MAX_RETRIES})`);
      // Exponential backoff
      const waitTime = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.loadCommunityStats(retryCount + 1);
    }
    
    // Set default values if failing
    this.updateElement('publicGuides', '0');
    this.updateElement('totalKm', '0');
    this.updateElement('accessibleTrails', '0');
    this.updateElement('totalUsers', '0');
    return { success: false, error: error.message };
  }
}

// Helper to calculate and display stats
calculateAndDisplayStats(guides) {
  let totalKm = 0;
  let accessibleTrails = 0;
  const uniqueUsers = new Set();
  const publicGuidesCount = guides.length;
  
  guides.forEach(data => {
    totalKm += data.metadata?.totalDistance || 0;
    uniqueUsers.add(data.userId);
    
    if (data.accessibility?.wheelchairAccess === 'Fully Accessible') {
      accessibleTrails++;
    }
  });
  
  // Update display with animation
  this.animateNumber('publicGuides', publicGuidesCount);
  this.animateNumber('totalKm', Math.round(totalKm));
  this.animateNumber('accessibleTrails', accessibleTrails);
  this.animateNumber('totalUsers', uniqueUsers.size);
}

// UPDATED: Load featured trails using cached data if available
async loadFeaturedTrails() {
  const TIMEOUT_MS = 12000;
  
  try {
    console.log('📍 Loading featured trails...');
    
    let guides;
    
    // Use cached data if available (from loadCommunityStats)
    if (this.publicGuidesCache && this.publicGuidesCache.length > 0) {
      console.log('📍 Using cached public guides for featured trails');
      guides = this.publicGuidesCache;
    } else {
      // Load fresh if no cache
      const { collection, query, where, getDocs, getDocsFromServer } = 
        await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      
      const featuredQuery = query(
        collection(db, 'trail_guides'),
        where('isPublic', '==', true)
      );
      
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), TIMEOUT_MS)
      );
    
      // Try getDocsFromServer first to avoid cache conflicts
      let querySnapshot;
      let source = 'unknown';
      
      try {
        console.log('   Trying server...');
        const serverPromise = getDocsFromServer(featuredQuery);
        querySnapshot = await Promise.race([serverPromise, timeoutPromise]);
        source = 'server';
      } catch (serverError) {
        console.log('   Server failed:', serverError.message, '- trying cache...');
        const cachePromise = getDocs(featuredQuery);
        querySnapshot = await Promise.race([cachePromise, timeoutPromise]);
        source = 'cache';
      }
      
      guides = [];
      
      querySnapshot.forEach(doc => {
        guides.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Cache for future use
      this.publicGuidesCache = guides;
      console.log(`📍 Loaded ${guides.length} guides from ${source}`);
    }
    
    this.allFeaturedTrails = guides;
    
    // Sort by date
    this.allFeaturedTrails.sort((a, b) => 
      new Date(b.generatedAt) - new Date(a.generatedAt)
    );
    
    console.log(`✅ Found ${this.allFeaturedTrails.length} total public trail guides`);
    
    // Initialize filtered trails as all trails (no filters active yet)
    this.filteredTrails = [...this.allFeaturedTrails];
    
    // Update results header
    const headerContainer = document.getElementById('trailResultsHeader');
    if (headerContainer) {
      const header = trailSearch.createResultsHeader(
        this.allFeaturedTrails.length,
        this.allFeaturedTrails.length
      );
      headerContainer.appendChild(header);
    }
    
    // Display first batch
    this.displayedFeaturedCount = 0;
    this.displayFeaturedBatch();
    
  } catch (error) {
    console.error('❌ Failed to load featured trails:', error);
    
    // Retry on Target ID error or timeout
    if ((error.message?.includes('Target ID') || error.message?.includes('timeout')) && !this._featuredRetried) {
      console.log('🔄 Retrying featured trails...');
      this._featuredRetried = true;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return this.loadFeaturedTrails();
    }
    
    this.showFeaturedPlaceholder();
  }
}

displayFeaturedBatch() {
  const container = document.getElementById('featuredTrails');
  if (!container) return;
  
  // Empty state
  if (this.allFeaturedTrails.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⭐</div>
        <h3>No featured trails yet</h3>
        <p>Be the first to contribute accessible trail guides!</p>
        <button onclick="openTracker()" class="nav-card-button primary">
          Start Mapping
        </button>
      </div>
    `;
    this.updateLoadMoreButton();
    return;
  }
  
  // Calculate what to show
  const startIndex = this.displayedFeaturedCount;
  const endIndex = Math.min(
    startIndex + this.featuredBatchSize,   // +6
    this.allFeaturedTrails.length          // Don't exceed total
  );
  
  const trailsToShow = this.allFeaturedTrails.slice(startIndex, endIndex);
  
  // First batch: replace content
  if (this.displayedFeaturedCount === 0) {
    const featuredHTML = trailsToShow
      .map(trail => this.createFeaturedTrailCard(trail))
      .join('');
    container.innerHTML = featuredHTML;
  } 
  // Subsequent batches: append content
  else {
    const featuredHTML = trailsToShow
      .map(trail => this.createFeaturedTrailCard(trail))
      .join('');
    container.insertAdjacentHTML('beforeend', featuredHTML);
  }
  
  this.displayedFeaturedCount = endIndex;
  console.log(`📊 Showing ${this.displayedFeaturedCount} of ${this.allFeaturedTrails.length} trails`);
  
  // Update button text
  this.updateLoadMoreButton();
}

updateLoadMoreButton() {
  const button = document.querySelector('.load-more-btn');
  if (!button) return;
  
  const remaining = this.allFeaturedTrails.length - this.displayedFeaturedCount;
  
  if (remaining > 0) {
    // More trails available
    button.style.display = 'block';
    button.textContent = `Load More Trails (${remaining} more available)`;
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  } else {
    // All trails loaded
    if (this.allFeaturedTrails.length > 0) {
      button.textContent = `All ${this.allFeaturedTrails.length} trails loaded ✓`;
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    } else {
      button.style.display = 'none';
    }
  }
}

  displayFeaturedTrails(trails) {
    const container = document.getElementById('featuredTrails');
    if (!container) return;
    
    if (trails.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⭐</div>
          <h3>No featured trails yet</h3>
          <p>Be the first to contribute accessible trail guides!</p>
          <button onclick="openTracker()" class="nav-card-button primary">Start Mapping</button>
        </div>
      `;
      return;
    }
    
    const featuredHTML = trails.map(trail => this.createFeaturedTrailCard(trail)).join('');
    container.innerHTML = featuredHTML;
  }

  createFeaturedTrailCard(trail) {
    const accessibility = trail.accessibility || {};
    const metadata = trail.metadata || {};
    const community = trail.community || {};
    const likes = community.likes || 0;
    const hasLiked = this.userLikedTrails?.includes(trail.id) || false;
    
    return `
      <div class="featured-trail" data-trail-id="${trail.id}">
        <div class="trail-image">🌲</div>
        <div class="trail-info">
          <div class="trail-name">${trail.routeName}</div>
          <div class="trail-meta">
            <span>📍 ${accessibility.location || 'Location not specified'}</span>
            <span>📅 ${new Date(trail.generatedAt).toLocaleDateString()}</span>
          </div>
          <div class="trail-accessibility">
            ${accessibility.wheelchairAccess ? `<span class="accessibility-badge">♿ ${accessibility.wheelchairAccess}</span>` : ''}
            ${accessibility.difficulty ? `<span class="accessibility-badge">🥾 ${accessibility.difficulty}</span>` : ''}
          </div>
          <div class="trail-stats">
            <span>📏 ${(metadata.totalDistance || 0).toFixed(1)} km</span>
            <span>👁️ ${community.views || 0} views</span>
            <span>📷 ${metadata.photoCount || 0} photos</span>
          </div>
          <div class="trail-actions">
            <button class="like-trail-btn ${hasLiked ? 'liked' : ''}" 
                    onclick="event.stopPropagation(); likeTrail('${trail.id}')" 
                    aria-label="${hasLiked ? 'Unlike this trail' : 'Like this trail'}"
                    data-trail-id="${trail.id}">
              <span class="like-icon">${hasLiked ? '❤️' : '🤍'}</span>
              <span class="like-count">${likes}</span>
            </button>
            <button class="share-trail-btn" 
                    onclick="event.stopPropagation(); shareTrail('${trail.id}', '${encodeURIComponent(trail.routeName)}')"
                    aria-label="Share this trail">
              📤 Share
            </button>
            <button class="view-trail-btn" onclick="viewTrailGuide('${trail.id}')">
              View Guide
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Like/unlike a trail guide
   */
  async likeTrail(trailId) {
    try {
      // Check auth
      const { auth, db } = await import('../firebase-setup.js');
      if (!auth.currentUser) {
        toast.info('Please sign in to like trails');
        return;
      }

      const { doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } = 
        await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      
      // Initialize user liked trails array if needed
      if (!this.userLikedTrails) {
        this.userLikedTrails = JSON.parse(localStorage.getItem('accessNature_likedTrails') || '[]');
      }

      const hasLiked = this.userLikedTrails.includes(trailId);
      const trailRef = doc(db, 'trail_guides', trailId);
      
      // Update button immediately for responsiveness
      const likeBtn = document.querySelector(`.like-trail-btn[data-trail-id="${trailId}"]`);
      if (likeBtn) {
        const iconSpan = likeBtn.querySelector('.like-icon');
        const countSpan = likeBtn.querySelector('.like-count');
        const currentCount = parseInt(countSpan.textContent) || 0;
        
        if (hasLiked) {
          // Unlike
          likeBtn.classList.remove('liked');
          iconSpan.textContent = '🤍';
          countSpan.textContent = Math.max(0, currentCount - 1);
        } else {
          // Like
          likeBtn.classList.add('liked');
          iconSpan.textContent = '❤️';
          countSpan.textContent = currentCount + 1;
          // Add small animation
          likeBtn.classList.add('pulse');
          setTimeout(() => likeBtn.classList.remove('pulse'), 300);
        }
      }

      // Update Firebase
      await updateDoc(trailRef, {
        'community.likes': increment(hasLiked ? -1 : 1),
        'community.likedBy': hasLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });

      // Update local state
      if (hasLiked) {
        this.userLikedTrails = this.userLikedTrails.filter(id => id !== trailId);
      } else {
        this.userLikedTrails.push(trailId);
      }
      localStorage.setItem('accessNature_likedTrails', JSON.stringify(this.userLikedTrails));

      // Update cached trail data
      const trailIndex = this.allFeaturedTrails?.findIndex(t => t.id === trailId);
      if (trailIndex >= 0) {
        const trail = this.allFeaturedTrails[trailIndex];
        if (!trail.community) trail.community = {};
        trail.community.likes = (trail.community.likes || 0) + (hasLiked ? -1 : 1);
      }

    } catch (error) {
      console.error('Failed to like trail:', error);
      toast.error('Failed to update like. Please try again.');
      // Revert UI on error
      this.displayFeaturedBatch();
    }
  }

  /**
   * Share a trail guide
   */
  async shareTrail(trailId, trailName) {
    const shareUrl = `${window.location.origin}/index.html?trail=${trailId}`;
    const shareText = `Check out "${decodeURIComponent(trailName)}" on Access Nature - an accessible trail guide!`;
    
    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: decodeURIComponent(trailName),
          text: shareText,
          url: shareUrl
        });
        toast.success('Trail shared!');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Native share failed, falling back to clipboard');
        }
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      // Final fallback - show modal with link
      this.showShareModal(shareUrl, decodeURIComponent(trailName));
    }
  }

  /**
   * Show share modal as fallback
   */
  showShareModal(url, trailName) {
    const modal = document.createElement('div');
    modal.className = 'share-modal-overlay';
    modal.innerHTML = `
      <div class="share-modal">
        <button class="share-modal-close" onclick="this.closest('.share-modal-overlay').remove()">×</button>
        <h3>📤 Share Trail</h3>
        <p>Share "${trailName}" with friends:</p>
        <div class="share-link-container">
          <input type="text" value="${url}" readonly onclick="this.select()">
          <button onclick="navigator.clipboard.writeText('${url}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy', 2000)">Copy</button>
        </div>
        <div class="share-buttons">
          <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Check out this accessible trail!')}" target="_blank" class="share-btn twitter">🐦 Twitter</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="share-btn facebook">📘 Facebook</a>
          <a href="mailto:?subject=${encodeURIComponent(trailName)}&body=${encodeURIComponent('Check out this accessible trail: ' + url)}" class="share-btn email">✉️ Email</a>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  showFeaturedPlaceholder() {
    const container = document.getElementById('featuredTrails');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌲</div>
          <h3>Featured trails coming soon!</h3>
          <p>Help build our community by mapping accessible trails</p>
        </div>
      `;
    }
  }

async updateUserStats() {
  console.log('👤 updateUserStats() called');
  try {
    const authStatus = await this.checkLandingAuth();
    console.log('👤 Auth status:', authStatus.isSignedIn ? 'signed in' : 'not signed in');
    
    if (authStatus.isSignedIn) {
      // User is signed in - load their cloud data
      return await this.loadUserCloudStats();
    } else {
      // User not signed in - check localStorage only
      console.log('👤 Loading local stats (not signed in)');
      this.loadLocalStats();
      return { success: true, source: 'local' };
    }
  } catch (error) {
    console.error('❌ Failed to update user stats:', error);
    // Fallback to local stats
    this.loadLocalStats();
    return { success: false, error: error.message };
  }
}

// Add this new method to load cloud stats
async loadUserCloudStats(retryCount = 0) {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 12000;
  
  try {
    const { collection, query, where, getDocs, getDocsFromServer } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { auth } = await import('../firebase-setup.js');
    
    // Make sure auth is ready
    if (!auth.currentUser) {
      console.log('📊 No current user, using local stats');
      this.loadLocalStats();
      return { success: true, source: 'local' };
    }
    
    console.log('📊 Loading user cloud stats...');
    
    // Get user's routes from Firebase - try server first to avoid cache issues
    const routesQuery = query(
      collection(db, 'routes'),
      where('userId', '==', auth.currentUser.uid)
    );
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), TIMEOUT_MS)
    );
    
    let routesSnapshot;
    let source = 'unknown';
    
    try {
      console.log('   Trying server...');
      const serverPromise = getDocsFromServer(routesQuery);
      routesSnapshot = await Promise.race([serverPromise, timeoutPromise]);
      source = 'server';
    } catch (serverError) {
      console.log('   Server failed:', serverError.message, '- trying cache...');
      const cachePromise = getDocs(routesQuery);
      routesSnapshot = await Promise.race([cachePromise, timeoutPromise]);
      source = 'cache';
    }
    
    let totalDistance = 0;
    
    routesSnapshot.forEach(doc => {
      const data = doc.data();
      totalDistance += data.totalDistance || 0;
    });
    
    // Update display
    this.animateNumber('totalRoutes', routesSnapshot.size);
    this.updateElement('totalDistance', totalDistance.toFixed(1));
    
    // Warn if cache returned 0 items
    if (routesSnapshot.size === 0 && source === 'cache') {
      console.warn('⚠️ User stats: Cache returned 0 items - may be offline or new user');
      return { success: true, count: 0, warning: 'empty_cache', source };
    }
    
    console.log(`✅ User stats loaded from ${source}: ${routesSnapshot.size} routes, ${totalDistance.toFixed(1)} km`);
    return { success: true, count: routesSnapshot.size, source };
    
  } catch (error) {
    console.error('❌ Failed to load cloud stats:', error);
    
    // Retry on Target ID, timeout, or network errors
    if ((error.message?.includes('Target ID') || error.message?.includes('timeout') || error.code === 'unavailable') && retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying cloud stats... (${retryCount + 1}/${MAX_RETRIES})`);
      const waitTime = Math.pow(2, retryCount) * 500;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.loadUserCloudStats(retryCount + 1);
    }
    
    // Fallback to local stats
    this.loadLocalStats();
    return { success: false, error: error.message };
  }
}

// Add this method for local stats fallback
loadLocalStats() {
  console.log('👤 Loading local stats from localStorage...');
  const totalRoutes = localStorage.getItem('sessions') ? JSON.parse(localStorage.getItem('sessions')).length : 0;
  this.updateElement('totalRoutes', totalRoutes);
  
  let totalDistance = 0;
  try {
    const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    totalDistance = sessions.reduce((sum, session) => sum + (session.totalDistance || 0), 0);
  } catch (error) {
    console.warn('Error calculating total distance:', error);
  }
  
  this.updateElement('totalDistance', totalDistance.toFixed(1));
  console.log(`👤 Local stats: ${totalRoutes} routes, ${totalDistance.toFixed(1)} km`);
}

  // Utility Functions
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  updateResultsCount(count) {
    const element = document.getElementById('resultsCount');
    if (element) {
      element.textContent = `${count} trail${count !== 1 ? 's' : ''} found`;
    }
  }

  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading">
          Loading trails... <span class="loading-spinner">⏳</span>
        </div>
      `;
    }
  }

  showError(message) {
    toast.error(message);
  }

  // Info Functions
  showAbout() {
    toast.info(`🌲 About Access Nature

Making outdoor spaces accessible for everyone.

Our mission is to create a comprehensive database of accessible trail information, documented by the community for the community.

Features:
- GPS tracking and route documentation
- Detailed accessibility surveys
- Photo and note sharing
- Community trail guide database
- Export and sharing capabilities

Join us in making nature accessible to all!`);
  }

  // Info Functions (continued)
  showPrivacy() {
    toast.info(`🔒 Privacy Policy

Access Nature Privacy Commitment:

DATA COLLECTION:
- We only collect data you choose to share
- Route data is stored locally by default
- Cloud sync is optional and user-controlled
- No tracking or analytics without consent

YOUR CONTROL:
- You own all your route data
- Delete data anytime from your device
- Make trail guides public/private as you choose
- Export your data in multiple formats

SHARING:
- Only public trail guides are visible to others
- Personal information is never shared
- Location data is only in routes you publish

SECURITY:
- Data encrypted in transit and at rest
- Firebase security rules protect your data
- Regular security updates and monitoring

Questions? Contact us through the app.`);
  }

  showContact() {
    toast.info(`📧 Contact Access Nature

Get in touch with our team:

SUPPORT:
- Email: support@accessnature.app
- Response time: 24-48 hours
- Include device info for technical issues

FEEDBACK:
- Feature requests welcome
- Bug reports appreciated
- Accessibility suggestions prioritized

PARTNERSHIPS:
- Trail organizations
- Accessibility advocates
- Technology collaborators

COMMUNITY:
- Join our monthly virtual meetups
- Share your accessibility mapping stories
- Help improve trail documentation

We're here to help make nature accessible!`);
  }

  showHelp() {
    toast.info(`❓ Access Nature Help

GETTING STARTED:
1. Sign up for cloud sync (optional)
2. Start tracking a trail
3. Take photos and notes along the way
4. Fill out accessibility survey
5. Save and share your trail guide

TRAIL MAPPING TIPS:
- Keep GPS enabled for accurate tracking
- Take photos of key accessibility features
- Note surface types, obstacles, facilities
- Include gradient and width information

SEARCHING TRAILS:
- Use filters for specific accessibility needs
- Browse by location or difficulty
- Read community reviews and ratings
- Download trail guides for offline use

TROUBLESHOOTING:
- Ensure location permissions enabled
- Use strong internet for cloud sync
- Clear browser cache if issues persist
- Contact support for technical problems

Happy trail mapping! 🥾`);
  }

  // Additional utility functions
  async loadMoreResults() {
    // Implement pagination for search results
    console.log('📄 Loading more results...');
    // This would extend the current search with more results
  }

  async loadMoreFeatured() {
  console.log('⭐ Loading more featured trails...');
  
  // Determine which trails array to use
  const trailsToUse = trailSearch.getActiveFilterCount() > 0 
    ? this.filteredTrails 
    : this.allFeaturedTrails;
  
  // Check if all loaded
  if (this.displayedFeaturedCount >= trailsToUse.length) {
    console.log('✅ All trails already displayed');
    return;
  }
  
  // Show loading state
  const button = document.getElementById('loadMoreBtn') || document.querySelector('.load-more-btn');
  if (button) {
    button.textContent = 'Loading...';
    button.disabled = true;
    
    // Small delay for UX
    setTimeout(() => {
      // Use filtered display if filters are active
      if (trailSearch.getActiveFilterCount() > 0) {
        this.displayFilteredTrails();
      } else {
        this.displayFeaturedBatch();
      }
      button.disabled = false;
    }, 300);
  } else {
    if (trailSearch.getActiveFilterCount() > 0) {
      this.displayFilteredTrails();
    } else {
      this.displayFeaturedBatch();
    }
  }
}

  clearFilters() {
    // Clear all filters and search
    document.getElementById('wheelchairFilter').value = '';
    document.getElementById('difficultyFilter').value = '';
    document.getElementById('distanceFilter').value = '';
    document.getElementById('trailSearch').value = '';
    
    this.currentFilters = {};
    this.currentSearch = '';
    this.searchTrails();
  }

  // Make clearFilters available globally
  setupGlobalFunctions() {
    window.clearFilters = () => this.clearFilters();
  }

  // NEW: Animate number changes for better UX
  animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutCubic);
      
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // NEW: Parse distance filter range
  parseDistanceFilter(distanceFilter) {
    switch (distanceFilter) {
      case '0-2': return [0, 2];
      case '2-5': return [2, 5];
      case '5-10': return [5, 10];
      case '10+': return [10, null];
      default: return [0, null];
    }
  }

  // ADD this debug function to your LandingPageController class
  async debugTrailGuides() {
    try {
      console.log('🐛 Debugging trail guides...');
      
      const { collection, getDocs, query, limit } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      
      // Check ALL trail guides (public and private)
      const allGuidesQuery = query(collection(db, 'trail_guides'), limit(10));
      const allSnapshot = await getDocs(allGuidesQuery);
      
      console.log('📊 Total trail guides in database:', allSnapshot.size);
      
      if (allSnapshot.size > 0) {
        allSnapshot.forEach(doc => {
          const data = doc.data();
          console.log('📄 Trail guide:', {
            id: doc.id,
            name: data.routeName,
            isPublic: data.isPublic,
            userId: data.userId,
            generatedAt: data.generatedAt
          });
        });
        
        // Check specifically for public guides
        const { where } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
        const publicQuery = query(
          collection(db, 'trail_guides'), 
          where('isPublic', '==', true),
          limit(10)
        );
        const publicSnapshot = await getDocs(publicQuery);
        console.log('🌍 Public trail guides:', publicSnapshot.size);
        
      } else {
        console.log('❌ No trail guides found in database');
      }
      
    } catch (error) {
      console.error('🐛 Debug failed:', error);
    }
  }

  // UPDATED: Check authentication status for landing page
  async checkLandingAuth() {
    try {
      const { auth } = await import('../firebase-setup.js');
      return {
        isSignedIn: !!auth.currentUser,
        user: auth.currentUser,
        email: auth.currentUser?.email
      };
    } catch (error) {
      console.error('Auth check failed:', error);
      return { isSignedIn: false, user: null, email: null };
    }
  }

  // Update landing auth status
  async updateLandingAuthStatus() {
    console.log('🔐 updateLandingAuthStatus called');
    const authStatus = await this.checkLandingAuth();
    console.log('👤 Auth status:', authStatus.isSignedIn ? `signed in as ${authStatus.email}` : 'not signed in');
    
    const userInfo = document.getElementById('userInfo');
    const authPrompt = document.getElementById('authPrompt');
    const userEmail = document.getElementById('userEmail');
    const myTrailsSection = document.getElementById('myTrailsSection');
    const profileNavLink = document.getElementById('profileNavLink');
    const navAuthBtn = document.getElementById('navAuthBtn');
    
    console.log('📍 myTrailsSection element:', myTrailsSection ? 'found' : 'NOT FOUND');
    console.log('📍 profileNavLink element:', profileNavLink ? 'found' : 'NOT FOUND');
    
    if (authStatus.isSignedIn) {
      userInfo?.classList.remove('hidden');
      authPrompt?.classList.add('hidden');
      if (userEmail) userEmail.textContent = authStatus.displayName || authStatus.email;
      
      // Show profile link in nav
      if (profileNavLink) {
        profileNavLink.style.display = 'block';
        console.log('📍 Profile nav link shown');
      }
      if (navAuthBtn) navAuthBtn.textContent = 'Sign Out';
      
      // Show My Trails section
      if (myTrailsSection) {
        console.log('📍 Before: myTrailsSection.style.display =', myTrailsSection.style.display);
        myTrailsSection.style.display = 'block';
        console.log('📍 After: myTrailsSection.style.display =', myTrailsSection.style.display);
        console.log('📍 My Trails section shown');
        
        // Show loading state
        const grid = document.getElementById('myTrailsGrid');
        if (grid) {
          grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6b7280;">Loading your trails...</div>';
        }
      } else {
        console.warn('⚠️ myTrailsSection element not found in DOM - are you on index.html?');
      }
      
      // Initialize userService for gamification
      if (!userService.isInitialized) {
        try {
          await userService.initializeUser(authStatus.user);
          console.log('🏅 UserService initialized for gamification');
        } catch (error) {
          console.warn('⚠️ UserService initialization failed:', error);
        }
      }
      
      // Load user's trails
      this.loadMyTrails();
      
    } else {
      userInfo?.classList.add('hidden');
      authPrompt?.classList.remove('hidden');
      
      // Hide profile link in nav
      if (profileNavLink) {
        profileNavLink.style.display = 'none';
      }
      if (navAuthBtn) navAuthBtn.textContent = 'Sign In';
      
      // Hide My Trails section
      if (myTrailsSection) {
        myTrailsSection.style.display = 'none';
      }
      
      userService.reset();
    }
  }

  // Listen for auth state changes
  async setupAuthListener() {
    try {
      const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
      const { auth } = await import('../firebase-setup.js');
      
      console.log('🔐 Auth listener setup, current user:', auth.currentUser?.email || 'none');
      
      onAuthStateChanged(auth, async (user) => {
        console.log('🔐 Auth state changed:', user ? user.email : 'signed out');
        await this.updateLandingAuthStatus();
      });
      
      console.log('✅ Auth listener active');
    } catch (error) {
      console.warn('⚠️ Failed to setup auth listener:', error);
    }
  }

  /**
   * Load and display user's trail guides in the My Trails section
   */
  async loadMyTrails() {
    try {
      console.log('📍 loadMyTrails() called');
      
      const authStatus = await this.checkLandingAuth();
      console.log('📍 Auth check result:', authStatus.isSignedIn ? 'signed in' : 'not signed in');
      
      if (!authStatus.isSignedIn) {
        console.log('📍 User not signed in, skipping trails load');
        return;
      }
      
      console.log('📍 Importing Firebase modules...');
      const { collection, query, where, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      const { db, auth } = await import('../firebase-setup.js');
      console.log('📍 Firebase imported, auth.currentUser:', auth.currentUser?.uid);
      
      if (!auth.currentUser) {
        console.warn('📍 auth.currentUser is null');
        return;
      }
      
      // Load all user's trail guides (no limit, sorted newest first)
      const guidesQuery = query(
        collection(db, 'trail_guides'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('generatedAt', 'desc')
      );
      
      const guidesSnapshot = await getDocs(guidesQuery);
      const guides = [];
      
      guidesSnapshot.forEach(doc => {
        guides.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📍 Found ${guides.length} trail guides`);
      
      // Debug: Check first guide's HTML for distance pattern
      if (guides.length > 0 && guides[0].htmlContent) {
        const sampleHtml = guides[0].htmlContent;
        // Find the stats row section
        const statsMatch = sampleHtml.match(/tg-stats-row[\s\S]{0,500}/);
        console.log('📍 Sample stats HTML:', statsMatch ? statsMatch[0].substring(0, 300) : 'not found');
      }
      
      // Store guides data for modal
      this.myTrailGuides = guides;
      
      // Calculate total distance by extracting from htmlContent
      const totalDistance = guides.reduce((sum, g) => {
        // Try to extract distance from the generated HTML
        if (g.htmlContent) {
          // Look for the distance stat - the first tg-stat-value followed by km label
          const match = g.htmlContent.match(/<span class="tg-stat-value">(\d+\.?\d*)<\/span>\s*[\r\n\s]*<span class="tg-stat-label">km<\/span>/i);
          if (match && match[1]) {
            const dist = parseFloat(match[1]);
            if (dist > 0) {
              return sum + dist;
            }
          }
        }
        // Fallback to stats or metadata
        return sum + (g.stats?.totalDistance || g.metadata?.totalDistance || 0);
      }, 0);
      
      console.log(`📍 Total distance calculated: ${totalDistance.toFixed(1)} km`);
      
      // Update stats display
      this.displayMyTrailsStats(guides.length, totalDistance);
      
      // Show/hide empty state and button
      const emptyState = document.getElementById('myTrailsEmpty');
      const actionsDiv = document.querySelector('.my-trails-actions');
      const statsDiv = document.getElementById('myTrailsStats');
      
      if (guides.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (actionsDiv) actionsDiv.style.display = 'none';
        if (statsDiv) statsDiv.style.display = 'none';
      } else {
        if (emptyState) emptyState.style.display = 'none';
        if (actionsDiv) actionsDiv.style.display = 'block';
        if (statsDiv) statsDiv.style.display = 'flex';
      }
      
      console.log(`✅ Loaded ${guides.length} trail guides, total distance: ${totalDistance.toFixed(1)} km`);
      
    } catch (error) {
      console.error('❌ Failed to load My Trails:', error);
      const emptyState = document.getElementById('myTrailsEmpty');
      if (emptyState) emptyState.style.display = 'block';
    }
  }

  /**
   * Display My Trails stats (guides count and total distance)
   */
  displayMyTrailsStats(guideCount, totalDistance) {
    const statsContainer = document.getElementById('myTrailsStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
      <div class="my-stat-card">
        <span class="icon">📚</span>
        <div>
          <div class="value">${guideCount}</div>
          <div class="label">Trail Guides</div>
        </div>
      </div>
      <div class="my-stat-card">
        <span class="icon">📏</span>
        <div>
          <div class="value">${totalDistance.toFixed(1)} km</div>
          <div class="label">Total Distance</div>
        </div>
      </div>
    `;
  }

  /**
   * Show list of user's trail guides in a modal
   */
  showMyTrailGuides() {
    if (!this.myTrailGuides || this.myTrailGuides.length === 0) {
      toast.warning('No trail guides found. Record a trail first!');
      return;
    }
    
    console.log(`📚 Showing ${this.myTrailGuides.length} trail guides in modal`);
    
    // Store guides globally for onclick access
    window._tempGuides = this.myTrailGuides;
    
    // Create modal content - list of guides sorted by date (newest first)
    const modalContent = this.myTrailGuides.map((guide, index) => {
      const name = guide.routeName || guide.title || guide.name || 'Unnamed Trail';
      
      // Extract distance from htmlContent
      let distance = 0;
      if (guide.htmlContent) {
        const match = guide.htmlContent.match(/<span class="tg-stat-value">(\d+\.?\d*)<\/span>\s*[\r\n\s]*<span class="tg-stat-label">km<\/span>/i);
        if (match && match[1]) {
          distance = parseFloat(match[1]);
        }
      }
      // Fallback
      if (distance === 0) {
        distance = guide.stats?.totalDistance || guide.metadata?.totalDistance || 0;
      }
      
      // Handle Firestore Timestamp
      let date;
      if (guide.generatedAt?.toDate) {
        date = guide.generatedAt.toDate();
      } else if (guide.generatedAt?.seconds) {
        date = new Date(guide.generatedAt.seconds * 1000);
      } else {
        date = new Date();
      }
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      
      const isPublic = guide.visibility === 'public' || guide.isPublic;
      
      // Use index to access from window._tempGuides
      return `
        <div class="guide-list-item" 
             onclick="window.landingController?.openGuideByIndex(${index})"
             style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: background 0.2s;"
             onmouseover="this.style.background='#f0fdf4'" 
             onmouseout="this.style.background=''">
          <span style="font-size: 1.8rem;">📚</span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(name)}</div>
            <div style="font-size: 0.85rem; color: #6b7280;">
              📏 ${distance.toFixed(1)} km • 📅 ${dateStr} • ${isPublic ? '🌍 Public' : '🔒 Private'}
            </div>
          </div>
          <span style="color: #2c5530; font-size: 1.2rem;">→</span>
        </div>
      `;
    }).join('');
    
    // Use html property for proper rendering
    modal.show({
      title: '📚 My Trail Guides',
      html: `
        <div id="guideListContainer" style="max-height: 60vh; overflow-y: auto; margin: -16px; margin-top: 0;">
          ${modalContent}
        </div>
        <p style="text-align: center; color: #6b7280; font-size: 0.85rem; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
          Click a trail guide to view full details
        </p>
      `,
      buttons: [{ label: 'Close', action: 'close', variant: 'secondary' }]
    });
  }

  /**
   * Open guide by index from the temp guides array
   */
  openGuideByIndex(index) {
    console.log('📚 openGuideByIndex called:', index);
    
    // Close modal first - try multiple methods
    const closeModal = () => {
      // Try backdrop
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
        return true;
      }
      // Try modal container
      const modalContainer = document.querySelector('.modal-container');
      if (modalContainer) {
        modalContainer.remove();
        return true;
      }
      return false;
    };
    
    // Close immediately
    closeModal();
    // Also try after a frame (for async rendering)
    requestAnimationFrame(() => closeModal());
    
    // Get guide from temp array
    const guide = window._tempGuides?.[index];
    if (guide) {
      console.log('📚 Opening guide:', guide.routeName || guide.id);
      // Small delay to ensure modal is closed
      setTimeout(() => this.showTrailGuide(guide), 50);
    } else {
      console.error('📚 Guide not found at index:', index);
      toast.error('Guide not found');
    }
  }

  /**
   * Display a trail guide in a fullscreen overlay
   */
  showTrailGuide(guideData) {
    try {
      console.log('📚 showTrailGuide called with data:', guideData?.id);
      const guideName = guideData?.routeName || guideData?.title || guideData?.name || 'Trail Guide';
      console.log('📚 Guide name:', guideName);
      
      // Use the pre-generated htmlContent if available
      let guideHTML = guideData.htmlContent;
      
      if (!guideHTML) {
        console.log('📚 No htmlContent found, using fallback');
        // Fallback to simple display
        const distance = guideData.stats?.totalDistance || guideData.metadata?.totalDistance || 0;
        guideHTML = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: system-ui, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #2c5530;">${this.escapeHtml(guideName)}</h2>
            <p><strong>Distance:</strong> ${distance.toFixed(1)} km</p>
            ${guideData.accessibility ? `<p><strong>Accessibility:</strong> ${JSON.stringify(guideData.accessibility)}</p>` : ''}
            <p style="color: #666; margin-top: 20px;">Full guide content is not available.</p>
          </body>
          </html>
        `;
      }
      
      console.log('📚 HTML content length:', guideHTML?.length || 0);
      
      // Create fullscreen overlay with iframe for proper script execution (maps, etc.)
      const overlay = document.createElement('div');
      overlay.className = 'trail-guide-overlay';
      overlay.innerHTML = `
        <div class="trail-guide-overlay-header">
          <button class="close-overlay-btn" id="closeGuideOverlay">
            ✕ Close
          </button>
          <h2>${this.escapeHtml(guideName)}</h2>
        </div>
        <iframe class="trail-guide-iframe" id="guideIframe" sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"></iframe>
      `;
      
      // Add styles if not already present
      if (!document.getElementById('trail-guide-overlay-styles')) {
        const style = document.createElement('style');
        style.id = 'trail-guide-overlay-styles';
        style.textContent = `
          .trail-guide-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .trail-guide-overlay-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #2c5530, #4a7c59);
            color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            flex-shrink: 0;
          }
          .trail-guide-overlay-header h2 {
            flex: 1;
            margin: 0;
            font-size: 1.2rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .close-overlay-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
          }
          .close-overlay-btn:hover {
            background: rgba(255,255,255,0.3);
          }
          .trail-guide-iframe {
            flex: 1;
            width: 100%;
            border: none;
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(overlay);
      
      // Write content to iframe
      const iframe = overlay.querySelector('#guideIframe');
      if (iframe) {
        iframe.onload = () => {
          console.log('📚 Iframe loaded');
        };
        // Use srcdoc for inline HTML or write to contentDocument
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(guideHTML);
        iframeDoc.close();
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Close button handler
      const closeBtn = overlay.querySelector('#closeGuideOverlay');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          overlay.remove();
          document.body.style.overflow = '';
        });
      }
      
      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          overlay.remove();
          document.body.style.overflow = '';
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
    } catch (error) {
      console.error('Failed to display trail guide:', error);
      toast.error('Failed to display trail guide');
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async loadMyTrailGuides() {
    try {
      console.log('🌐 Loading trail guides from landing page...');
      
      // Check if user is signed in
      const authStatus = await this.checkLandingAuth();
      if (!authStatus.isSignedIn) {
        toast.error('Please sign in first to view your trail guides');
        return;
      }

      // Import Firestore functions
      const { collection, query, where, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      const { db, auth } = await import('../firebase-setup.js');
      
      // Query user's trail guides
      const guidesQuery = query(
        collection(db, 'trail_guides'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('generatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(guidesQuery);
      const guides = [];
      
      querySnapshot.forEach(doc => {
        guides.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Found ${guides.length} trail guides`);
      
      if (guides.length === 0) {
        toast.error('No trail guides found.\n\nTo create trail guides:\n• Record a route in the tracker\n• Save it to cloud\n• Trail guide will be auto-generated');
        return;
      }
      
      await this.displayLandingGuides(guides);
      
    } catch (error) {
      console.error('Failed to load trail guides:', error);
      toast.error('Failed to load trail guides: ' + error.message);
    }
  }

  // Display landing guides
  async displayLandingGuides(guides) {
    const choices = guides.map((guide, index) => {
      const date = new Date(guide.generatedAt).toLocaleDateString();
      const visibility = guide.isPublic ? '🌍' : '🔒';
      const distance = guide.metadata ? (guide.metadata.totalDistance || 0).toFixed(1) : '0';
      
      return {
        label: `${visibility} ${guide.routeName} (${date}, ${distance} km)`,
        value: index
      };
    });
    
    choices.push({ label: '❌ Cancel', value: 'cancel' });
    
    const choice = await modal.choice('Select a guide to view:', '🌐 Your Trail Guides', choices);
    
    if (choice !== null && choice !== 'cancel') {
      await this.viewTrailGuide(guides[choice].id);
    }
  }
}



// FIXED: Landing page authentication integration
// Add this to the bottom of your landing.js file or create a separate auth-landing.js

class LandingAuthController {
  constructor() {
    this.authModal = null;
    this.currentUser = null;
  }

  async initialize() {
    console.log('🔐 Initializing landing page authentication...');
    
    // Set up auth state listener first
    await this.setupAuthStateListener();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI based on current auth state
    await this.updateAuthStatus();
    
    console.log('✅ Landing page authentication initialized');
  }

  setupEventListeners() {
    // FIXED: Sign in button event listener
    const showAuthBtn = document.getElementById('showAuthBtn');
    if (showAuthBtn) {
      console.log('🔧 Setting up sign-in button listener...');
      
      // Remove any existing listeners
      const newBtn = showAuthBtn.cloneNode(true);
      showAuthBtn.parentNode.replaceChild(newBtn, showAuthBtn);
      
      // Add our listener
      newBtn.addEventListener('click', (e) => {
        console.log('🔑 Sign in button clicked');
        e.preventDefault();
        e.stopPropagation();
        this.showAuthModal();
      });
      
      console.log('✅ Sign-in button listener attached');
    } else {
      console.error('❌ Sign-in button not found');
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
      });
    }

    // Modal close handlers
    this.setupModalEventListeners();
  }

setupModalEventListeners() {
  // Handle login form
  const loginForm = document.getElementById('loginFormEl');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => this.handleLogin(e));
  }
  
  // Handle signup form
  const signupForm = document.getElementById('signupFormEl');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => this.handleSignup(e));
  }
  
  // Close modal when clicking background
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'authModal') {
        this.closeAuthModal();
      }
    });
  }
}

  async setupAuthStateListener() {
    try {
      // Import Firebase auth
      const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
      const { auth } = await import('../firebase-setup.js');
      
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        this.updateAuthStatus();
        
        if (user) {
          console.log('✅ User signed in:', user.email);
          
          // Initialize userService for gamification
          try {
            await userService.initializeUser(user);
            console.log('🏅 UserService initialized for gamification');
          } catch (error) {
            console.warn('⚠️ UserService initialization failed:', error);
          }
        } else {
          console.log('👋 User signed out');
          userService.reset();
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to setup auth listener:', error);
    }
  }

showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('hidden');
    this.showLoginForm();
  }
}

showLoginForm() {
  const loginForm = document.getElementById('loginFormContent');
  const signupForm = document.getElementById('signupFormContent');
  const title = document.getElementById('authTitle');
  
  if (loginForm) loginForm.style.display = 'block';
  if (signupForm) signupForm.style.display = 'none';
  if (title) title.textContent = 'Welcome Back!';
}

showSignupForm() {
  const loginForm = document.getElementById('loginFormContent');
  const signupForm = document.getElementById('signupFormContent');
  const title = document.getElementById('authTitle');
  
  if (signupForm) signupForm.style.display = 'block';
  if (loginForm) loginForm.style.display = 'none';
  if (title) title.textContent = 'Join Access Nature';
}

closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('hidden');
    this.clearAuthForms();
  }
}

  switchToLogin() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authModalTitle');

    if (loginForm) loginForm.classList.add('active');
    if (signupForm) signupForm.classList.remove('active');
    if (title) title.textContent = 'Welcome Back!';
  }

  switchToSignup() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authModalTitle');

    if (signupForm) signupForm.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    if (title) title.textContent = 'Join Access Nature';
  }

async handleLogin(event) {
  event.preventDefault();
  
  const loginBtn = document.getElementById('loginSubmitBtn');
  const emailInput = document.getElementById('loginEmailInput');
  const passwordInput = document.getElementById('loginPasswordInput');
  
  if (!emailInput?.value || !passwordInput?.value) {
    this.showAuthError('Please fill in all fields');
    return;
  }

  try {
    this.setButtonLoading(loginBtn, true);
    
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
    const { auth } = await import('../firebase-setup.js');
    
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      emailInput.value, 
      passwordInput.value
    );
    
    console.log('✅ Login successful:', userCredential.user.email);
    this.closeAuthModal();
    this.showSuccessMessage('Welcome back! 🎉');
    
  } catch (error) {
    console.error('❌ Login failed:', error);
    this.showAuthError(this.getFriendlyErrorMessage(error.code));
  } finally {
    this.setButtonLoading(loginBtn, false);
  }
}

async handleSignup(event) {
  event.preventDefault();
  
  const signupBtn = document.getElementById('signupSubmitBtn');
  const nameInput = document.getElementById('signupNameInput');
  const emailInput = document.getElementById('signupEmailInput');
  const passwordInput = document.getElementById('signupPasswordInput');
  
  if (!nameInput?.value || !emailInput?.value || !passwordInput?.value) {
    this.showAuthError('Please fill in all fields');
    return;
  }

  if (passwordInput.value.length < 6) {
    this.showAuthError('Password must be at least 6 characters');
    return;
  }

  try {
    this.setButtonLoading(signupBtn, true);
    
    const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { auth, db } = await import('../firebase-setup.js');
    
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      emailInput.value, 
      passwordInput.value
    );
    
    const user = userCredential.user;
    
    // Save user profile to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: nameInput.value,
      createdAt: new Date().toISOString(),
      routesCount: 0,
      totalDistance: 0
    });
    
    console.log('✅ Signup successful:', user.email);
    this.closeAuthModal();
    this.showSuccessMessage('Account created successfully! Welcome to Access Nature! 🌲');
    
  } catch (error) {
    console.error('❌ Signup failed:', error);
    this.showAuthError(this.getFriendlyErrorMessage(error.code));
  } finally {
    this.setButtonLoading(signupBtn, false);
  }
}

async handleGoogleAuth() {
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { auth, db } = await import('../firebase-setup.js');
    
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if this is a new user and save profile
    if (result._tokenResponse?.isNewUser) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'Google User',
        createdAt: new Date().toISOString(),
        routesCount: 0,
        totalDistance: 0,
        provider: 'google'
      });
    }
    
    console.log('✅ Google sign-in successful:', user.email);
    this.closeAuthModal();
    this.showSuccessMessage('Successfully connected with Google! 🎉');
    
  } catch (error) {
    console.error('❌ Google sign-in failed:', error);
    
    if (error.code === 'auth/popup-closed-by-user') {
      this.showAuthError('Sign-in was cancelled');
    } else {
      this.showAuthError('Google sign-in failed. Please try again.');
    }
  }
}


async updateAuthStatus() {
  const userInfo = document.getElementById('userInfo');
  const authPrompt = document.getElementById('authPrompt');
  const userEmail = document.getElementById('userEmail');
  const profileNavLink = document.getElementById('profileNavLink');
  const navAuthBtn = document.getElementById('navAuthBtn');

  if (this.currentUser) {
    // User is signed in
    if (userInfo) userInfo.classList.remove('hidden');
    if (authPrompt) authPrompt.classList.add('hidden');
    if (userEmail) userEmail.textContent = this.currentUser.displayName || this.currentUser.email;
    if (profileNavLink) profileNavLink.style.display = 'block';
    if (navAuthBtn) navAuthBtn.textContent = 'Sign Out';
  } else {
    // User is signed out
    if (userInfo) userInfo.classList.add('hidden');
    if (authPrompt) authPrompt.classList.remove('hidden');
    if (profileNavLink) profileNavLink.style.display = 'none';
    if (navAuthBtn) navAuthBtn.textContent = 'Sign In';
  }
}


  showAuthError(message) {
    this.clearAuthError();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #ffebee;
      color: #c62828;
      padding: 12px 20px;
      border-radius: 8px;
      margin: 15px 0;
      font-size: 14px;
      border: 1px solid #ffcdd2;
      animation: slideIn 0.3s ease;
    `;

    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
      activeForm.insertBefore(errorDiv, activeForm.firstChild);
    }

    setTimeout(() => this.clearAuthError(), 5000);
  }

  clearAuthError() {
    const existingError = document.querySelector('.auth-error');
    if (existingError) {
      existingError.remove();
    }
  }

  clearAuthForms() {
    const inputs = document.querySelectorAll('#authModal input');
    inputs.forEach(input => input.value = '');
    this.clearAuthError();
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
      animation: slideDown 0.3s ease;
    `;

    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 4000);
  }

  getFriendlyErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection'
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  }
}

async function initAccessReport() {
  const mapContainer = document.getElementById('accessReportMap');
  if (!mapContainer) return;

  const accessReportMap = L.map('accessReportMap').setView([-33.9249, 18.4241], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(accessReportMap);

  await initializeAccessReport({
    map: accessReportMap,
    mapContainer: mapContainer,
    timelineContainer: document.getElementById('accessReportTimeline'),
    enableTimeline: true,
    enableFilters: true,
    autoLoadReports: true
  });
}

// Initialize landing page when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOM Content Loaded - starting landing page init');
  try {
    // Initialize landing page controller
    const landingController = new LandingPageController();
    console.log('📄 LandingPageController created');
    await landingController.initialize();
    console.log('📄 LandingPageController.initialize() completed');
    landingController.setupGlobalFunctions();
    
    // Make controller available globally
    window.LandingPageController = landingController;
    window.landingController = landingController;
    
    // Make utilities available for debugging
    window.offlineIndicator = offlineIndicator;
    window.loadingStates = loadingStates;
    window.gamificationUI = gamificationUI;
    window.mobilityProfileUI = mobilityProfileUI;
    window.communityChallenges = communityChallenges;
    window.accessibilityRating = accessibilityRating;
    window.trailSearch = trailSearch;
    window.userService = userService;
    window.showError = showError;
    window.getErrorMessage = getErrorMessage;
    
    // Setup badge notification popups
    gamificationUI.setupBadgeNotifications();
    
    // Initialize mobility profile UI
    mobilityProfileUI.initialize();
    
    // Initialize community challenges
    communityChallenges.initialize();
    const challengesContainer = document.getElementById('communityChallengesPanel');
    if (challengesContainer) {
      communityChallenges.mount(challengesContainer);
    }
    
    // Initialize access report if available
    await initAccessReport();
    
    // Setup pull-to-refresh handler
    window.refreshPageData = async () => {
      console.log('🔄 Pull-to-refresh triggered');
      try {
        // Clear cache to force fresh data
        landingController.publicGuidesCache = null;
        
        // Show loading indicators
        landingController.showLoadingIndicators();
        
        // Reload data
        await landingController.loadDataWithRetry();
        
        toast.success('Data refreshed!');
      } catch (error) {
        console.error('Refresh failed:', error);
        toast.error('Refresh failed. Please try again.');
      }
    };
    
    // Listen for pull-to-refresh event
    window.addEventListener('pullToRefresh', window.refreshPageData);
    
  } catch (error) {
    console.error('Failed to initialize landing page:', error);
  }
});

// Export for use in other modules
export { LandingAuthController, LandingPageController };