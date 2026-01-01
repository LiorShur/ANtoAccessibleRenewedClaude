/**
 * Trail Search & Filters
 * Search and filter trail guides by various criteria
 * 
 * Access Nature - Phase 2: Beta Features
 * Created: December 2025
 */

import { ACCESSIBILITY_RATINGS, SURFACE_TYPES } from './accessibilityRating.js';

// Sort options
export const SORT_OPTIONS = {
  newest: { id: 'newest', label: 'Newest First', icon: '🆕', field: 'generatedAt', direction: 'desc' },
  oldest: { id: 'oldest', label: 'Oldest First', icon: '📅', field: 'generatedAt', direction: 'asc' },
  distance_asc: { id: 'distance_asc', label: 'Shortest First', icon: '📏', field: 'totalDistance', direction: 'asc' },
  distance_desc: { id: 'distance_desc', label: 'Longest First', icon: '🏃', field: 'totalDistance', direction: 'desc' },
  name_asc: { id: 'name_asc', label: 'Name (A-Z)', icon: '🔤', field: 'name', direction: 'asc' },
  name_desc: { id: 'name_desc', label: 'Name (Z-A)', icon: '🔤', field: 'name', direction: 'desc' }
};

// Distance filter ranges (in meters)
export const DISTANCE_RANGES = {
  any: { id: 'any', label: 'Any Distance', min: 0, max: Infinity },
  short: { id: 'short', label: 'Short (< 2km)', min: 0, max: 2000 },
  medium: { id: 'medium', label: 'Medium (2-5km)', min: 2000, max: 5000 },
  long: { id: 'long', label: 'Long (5-10km)', min: 5000, max: 10000 },
  very_long: { id: 'very_long', label: 'Very Long (> 10km)', min: 10000, max: Infinity }
};

/**
 * Trail Search System
 */
class TrailSearch {
  constructor() {
    this.filters = {
      query: '',
      accessibility: null,
      distance: 'any',
      surface: null,
      hasPhotos: false
    };
    this.sortBy = 'newest';
    this.onFilterChange = null;
    this.injectStyles();
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('trail-search-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'trail-search-styles';
    styles.textContent = `
      /* Search Container */
      .trail-search-container {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }
      
      /* Search Input */
      .search-input-wrapper {
        position: relative;
        margin-bottom: 12px;
      }
      
      .search-input {
        width: 100%;
        padding: 12px 16px 12px 44px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        font-size: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      
      .search-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .search-input::placeholder {
        color: #999;
      }
      
      .search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 18px;
        pointer-events: none;
      }
      
      .search-clear {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: #e0e0e0;
        border: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        display: none;
        align-items: center;
        justify-content: center;
        color: #666;
      }
      
      .search-clear:hover {
        background: #ccc;
      }
      
      .search-input:not(:placeholder-shown) + .search-icon + .search-clear {
        display: flex;
      }
      
      /* Filter Toggle */
      .filter-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        cursor: pointer;
        user-select: none;
      }
      
      .filter-toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #666;
      }
      
      .filter-toggle-icon {
        transition: transform 0.2s;
      }
      
      .filter-toggle.expanded .filter-toggle-icon {
        transform: rotate(180deg);
      }
      
      .active-filters-count {
        background: #667eea;
        color: white;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      
      /* Filter Panel */
      .filter-panel {
        display: none;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;
        margin-top: 8px;
      }
      
      .filter-panel.expanded {
        display: block;
      }
      
      .filter-section {
        margin-bottom: 16px;
      }
      
      .filter-section:last-child {
        margin-bottom: 0;
      }
      
      .filter-label {
        font-size: 12px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        display: block;
      }
      
      /* Filter Chips */
      .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .filter-chip {
        padding: 6px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 20px;
        background: white;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .filter-chip:hover {
        border-color: #667eea;
        background: #f8f9ff;
      }
      
      .filter-chip.selected {
        border-color: #667eea;
        background: #667eea;
        color: white;
      }
      
      .filter-chip .chip-icon {
        font-size: 14px;
      }
      
      /* Accessibility Filter Chips */
      .filter-chip.accessibility-fully.selected {
        background: #22c55e;
        border-color: #22c55e;
      }
      
      .filter-chip.accessibility-partial.selected {
        background: #f59e0b;
        border-color: #f59e0b;
      }
      
      .filter-chip.accessibility-not.selected {
        background: #ef4444;
        border-color: #ef4444;
      }
      
      /* Sort Dropdown */
      .sort-dropdown {
        position: relative;
      }
      
      .sort-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        background: white;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .sort-button:hover {
        border-color: #667eea;
      }
      
      .sort-menu {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 4px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 100;
        min-width: 180px;
        display: none;
      }
      
      .sort-menu.open {
        display: block;
      }
      
      .sort-option {
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      }
      
      .sort-option:first-child {
        border-radius: 8px 8px 0 0;
      }
      
      .sort-option:last-child {
        border-radius: 0 0 8px 8px;
      }
      
      .sort-option:hover {
        background: #f0f0f0;
      }
      
      .sort-option.selected {
        background: #667eea;
        color: white;
      }
      
      /* Results Header */
      .search-results-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      
      .results-count {
        font-size: 14px;
        color: #666;
      }
      
      .results-count strong {
        color: #1a1a2e;
      }
      
      /* Clear Filters */
      .clear-filters-btn {
        background: none;
        border: none;
        color: #667eea;
        font-size: 13px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background 0.2s;
      }
      
      .clear-filters-btn:hover {
        background: rgba(102, 126, 234, 0.1);
      }
      
      /* Toggle Switch for boolean filters */
      .toggle-filter {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }
      
      .toggle-switch {
        width: 44px;
        height: 24px;
        background: #e0e0e0;
        border-radius: 12px;
        position: relative;
        transition: background 0.2s;
      }
      
      .toggle-switch::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      
      .toggle-filter.active .toggle-switch {
        background: #667eea;
      }
      
      .toggle-filter.active .toggle-switch::after {
        transform: translateX(20px);
      }
      
      .toggle-label {
        font-size: 13px;
        color: #444;
      }
      
      /* No Results */
      .no-results {
        text-align: center;
        padding: 40px 20px;
        color: #666;
      }
      
      .no-results-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      .no-results-title {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 8px;
      }
      
      .no-results-message {
        font-size: 14px;
        margin-bottom: 16px;
      }
      
      /* Mobile Responsive */
      @media (max-width: 480px) {
        .trail-search-container {
          padding: 12px;
        }
        
        .filter-chips {
          gap: 6px;
        }
        
        .filter-chip {
          padding: 5px 10px;
          font-size: 12px;
        }
        
        .search-results-header {
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  // ==================== FILTERING ====================

  /**
   * Apply filters to a list of trails
   * @param {Array} trails - Array of trail objects
   * @returns {Array} Filtered trails
   */
  applyFilters(trails) {
    if (!trails || !Array.isArray(trails)) return [];
    
    return trails.filter(trail => {
      // Text search
      if (this.filters.query) {
        const query = this.filters.query.toLowerCase();
        const searchFields = [
          trail.routeName || trail.name || '',
          trail.description || '',
          trail.accessibility?.location || '',
          trail.userEmail || ''
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(query)) {
          return false;
        }
      }
      
      // Accessibility filter
      // Survey values: "Fully accessible", "Partially accessible", "Accessible with assistance", "Not accessible"
      // Filter IDs: "fully", "partial", "not"
      if (this.filters.accessibility) {
        const wheelchairAccess = trail.accessibility?.wheelchairAccess || '';
        const accessLower = wheelchairAccess.toLowerCase();
        
        let matches = false;
        if (this.filters.accessibility === 'fully') {
          matches = accessLower.includes('fully');
        } else if (this.filters.accessibility === 'partial') {
          matches = accessLower.includes('partial') || accessLower.includes('assistance');
        } else if (this.filters.accessibility === 'not') {
          matches = accessLower.includes('not accessible') || accessLower === '' || accessLower === 'unknown';
        }
        
        if (!matches) {
          return false;
        }
      }
      
      // Distance filter - check metadata.totalDistance
      if (this.filters.distance && this.filters.distance !== 'any') {
        const range = DISTANCE_RANGES[this.filters.distance];
        const distance = trail.metadata?.totalDistance || trail.totalDistance || 0;
        if (distance < range.min || distance >= range.max) {
          return false;
        }
      }
      
      // Surface filter
      // Survey values: "Asphalt", "Concrete", "Stone", "Wood/Plastic Deck", "Compacted Gravel", "Mixed Surfaces", "Grass"
      // Filter IDs: "paved", "packed_gravel", "dirt", "mixed"
      if (this.filters.surface) {
        const trailSurface = trail.accessibility?.trailSurface || '';
        const surfaceLower = trailSurface.toLowerCase();
        
        let matches = false;
        if (this.filters.surface === 'paved') {
          matches = surfaceLower.includes('asphalt') || surfaceLower.includes('concrete') || surfaceLower.includes('wood');
        } else if (this.filters.surface === 'packed_gravel') {
          matches = surfaceLower.includes('gravel') || surfaceLower.includes('stone');
        } else if (this.filters.surface === 'dirt') {
          matches = surfaceLower.includes('grass') || surfaceLower.includes('dirt');
        } else if (this.filters.surface === 'mixed') {
          matches = surfaceLower.includes('mixed');
        }
        
        if (!matches) {
          return false;
        }
      }
      
      // Has photos filter - check metadata.photoCount
      if (this.filters.hasPhotos) {
        const photoCount = trail.metadata?.photoCount || trail.photos?.length || 0;
        if (photoCount === 0) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Apply sorting to filtered trails
   * @param {Array} trails - Filtered trails
   * @returns {Array} Sorted trails
   */
  applySort(trails) {
    if (!trails || trails.length === 0) return trails;
    
    const sortOption = SORT_OPTIONS[this.sortBy] || SORT_OPTIONS.newest;
    
    return [...trails].sort((a, b) => {
      let aVal, bVal;
      
      // Handle nested fields
      if (sortOption.field === 'totalDistance') {
        aVal = a.metadata?.totalDistance || a.totalDistance || 0;
        bVal = b.metadata?.totalDistance || b.totalDistance || 0;
      } else if (sortOption.field === 'name') {
        aVal = a.routeName || a.name || '';
        bVal = b.routeName || b.name || '';
      } else {
        aVal = a[sortOption.field];
        bVal = b[sortOption.field];
      }
      
      // Handle timestamps
      if (aVal?.toDate) aVal = aVal.toDate();
      if (bVal?.toDate) bVal = bVal.toDate();
      
      // Handle dates
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      
      // Handle strings
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      // Handle undefined/null
      if (aVal == null) aVal = sortOption.direction === 'asc' ? Infinity : -Infinity;
      if (bVal == null) bVal = sortOption.direction === 'asc' ? Infinity : -Infinity;
      
      // Compare
      if (sortOption.direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  /**
   * Filter and sort trails
   * @param {Array} trails - All trails
   * @returns {Array} Filtered and sorted trails
   */
  filterAndSort(trails) {
    const filtered = this.applyFilters(trails);
    return this.applySort(filtered);
  }

  /**
   * Set a filter value
   * @param {string} key - Filter key
   * @param {any} value - Filter value
   */
  setFilter(key, value) {
    this.filters[key] = value;
    this.triggerChange();
  }

  /**
   * Set sort option
   * @param {string} sortId - Sort option ID
   */
  setSort(sortId) {
    this.sortBy = sortId;
    this.triggerChange();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = {
      query: '',
      accessibility: null,
      distance: 'any',
      surface: null,
      hasPhotos: false
    };
    this.triggerChange();
  }

  /**
   * Get count of active filters
   * @returns {number}
   */
  getActiveFilterCount() {
    let count = 0;
    if (this.filters.query) count++;
    if (this.filters.accessibility) count++;
    if (this.filters.distance && this.filters.distance !== 'any') count++;
    if (this.filters.surface) count++;
    if (this.filters.hasPhotos) count++;
    return count;
  }

  /**
   * Trigger filter change callback
   */
  triggerChange() {
    if (this.onFilterChange) {
      this.onFilterChange(this.filters, this.sortBy);
    }
  }

  /**
   * Debug: Log trail data structure
   * Call this in console: trailSearch.debugTrails(landingAuth.allFeaturedTrails)
   */
  debugTrails(trails) {
    if (!trails || trails.length === 0) {
      console.log('🔍 No trails to debug');
      return;
    }
    
    console.log(`🔍 Debugging ${trails.length} trails:`);
    trails.forEach((trail, i) => {
      console.log(`\n--- Trail ${i + 1}: ${trail.routeName || trail.name || 'Unknown'} ---`);
      console.log('  Photos:', trail.metadata?.photoCount || 0);
      console.log('  Distance:', trail.metadata?.totalDistance || 0, 'm');
      console.log('  Wheelchair:', trail.accessibility?.wheelchairAccess || 'Not set');
      console.log('  Surface:', trail.accessibility?.trailSurface || 'Not set');
      console.log('  Full accessibility obj:', trail.accessibility);
      console.log('  Full metadata obj:', trail.metadata);
    });
  }

  // ==================== UI COMPONENTS ====================

  /**
   * Create the full search UI
   * @param {object} options - Options
   * @returns {HTMLElement}
   */
  createSearchUI(options = {}) {
    const {
      showSort = true,
      showFilters = true,
      expandedByDefault = false,
      placeholder = 'Search trails by name or location...'
    } = options;

    const container = document.createElement('div');
    container.className = 'trail-search-container';
    
    // Search input
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'search-input-wrapper';
    inputWrapper.innerHTML = `
      <input type="text" class="search-input" placeholder="${placeholder}" value="${this.filters.query}">
      <span class="search-icon">🔍</span>
      <button class="search-clear" type="button">×</button>
    `;
    
    const searchInput = inputWrapper.querySelector('.search-input');
    const clearBtn = inputWrapper.querySelector('.search-clear');
    
    // Debounced search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.setFilter('query', e.target.value);
      }, 300);
      
      // Show/hide clear button
      clearBtn.style.display = e.target.value ? 'flex' : 'none';
    });
    
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      this.setFilter('query', '');
      searchInput.focus();
    });
    
    container.appendChild(inputWrapper);
    
    // Filters section
    if (showFilters) {
      const filterToggle = document.createElement('div');
      filterToggle.className = `filter-toggle ${expandedByDefault ? 'expanded' : ''}`;
      filterToggle.innerHTML = `
        <span class="filter-toggle-label">
          <span>⚙️ Filters</span>
          <span class="active-filters-count" style="display: none;">0</span>
        </span>
        <span class="filter-toggle-icon">▼</span>
      `;
      
      const filterPanel = document.createElement('div');
      filterPanel.className = `filter-panel ${expandedByDefault ? 'expanded' : ''}`;
      
      // Accessibility filter
      filterPanel.appendChild(this.createAccessibilityFilter());
      
      // Distance filter
      filterPanel.appendChild(this.createDistanceFilter());
      
      // Surface filter
      filterPanel.appendChild(this.createSurfaceFilter());
      
      // Has photos toggle
      filterPanel.appendChild(this.createPhotosToggle());
      
      // Clear filters button
      const clearSection = document.createElement('div');
      clearSection.style.cssText = 'margin-top: 12px; text-align: right;';
      const clearBtn2 = document.createElement('button');
      clearBtn2.className = 'clear-filters-btn';
      clearBtn2.textContent = '✕ Clear All Filters';
      clearBtn2.addEventListener('click', () => {
        this.clearFilters();
        this.updateUI(container);
        searchInput.value = '';
      });
      clearSection.appendChild(clearBtn2);
      filterPanel.appendChild(clearSection);
      
      // Toggle expand/collapse
      filterToggle.addEventListener('click', () => {
        filterToggle.classList.toggle('expanded');
        filterPanel.classList.toggle('expanded');
      });
      
      container.appendChild(filterToggle);
      container.appendChild(filterPanel);
      
      // Update active filter count
      this.updateFilterCount(container);
    }
    
    // Sort dropdown
    if (showSort) {
      const sortSection = document.createElement('div');
      sortSection.style.cssText = 'display: flex; justify-content: flex-end; margin-top: 12px;';
      sortSection.appendChild(this.createSortDropdown());
      container.appendChild(sortSection);
    }
    
    // Store reference for updates
    container._trailSearch = this;
    
    return container;
  }

  /**
   * Create accessibility filter chips
   */
  createAccessibilityFilter() {
    const section = document.createElement('div');
    section.className = 'filter-section';
    section.innerHTML = '<label class="filter-label">Accessibility</label>';
    
    const chips = document.createElement('div');
    chips.className = 'filter-chips';
    
    for (const [id, rating] of Object.entries(ACCESSIBILITY_RATINGS)) {
      const chip = document.createElement('button');
      chip.className = `filter-chip accessibility-${id} ${this.filters.accessibility === id ? 'selected' : ''}`;
      chip.dataset.value = id;
      chip.innerHTML = `<span class="chip-icon">${rating.icon}</span> ${rating.shortLabel}`;
      
      chip.addEventListener('click', () => {
        const isSelected = chip.classList.contains('selected');
        chips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));
        
        if (!isSelected) {
          chip.classList.add('selected');
          this.setFilter('accessibility', id);
        } else {
          this.setFilter('accessibility', null);
        }
        this.updateFilterCount(chip.closest('.trail-search-container'));
      });
      
      chips.appendChild(chip);
    }
    
    section.appendChild(chips);
    return section;
  }

  /**
   * Create distance filter chips
   */
  createDistanceFilter() {
    const section = document.createElement('div');
    section.className = 'filter-section';
    section.innerHTML = '<label class="filter-label">Distance</label>';
    
    const chips = document.createElement('div');
    chips.className = 'filter-chips';
    
    for (const [id, range] of Object.entries(DISTANCE_RANGES)) {
      const chip = document.createElement('button');
      chip.className = `filter-chip ${this.filters.distance === id ? 'selected' : ''}`;
      chip.dataset.value = id;
      chip.textContent = range.label;
      
      chip.addEventListener('click', () => {
        chips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        this.setFilter('distance', id);
        this.updateFilterCount(chip.closest('.trail-search-container'));
      });
      
      chips.appendChild(chip);
    }
    
    section.appendChild(chips);
    return section;
  }

  /**
   * Create surface type filter
   */
  createSurfaceFilter() {
    const section = document.createElement('div');
    section.className = 'filter-section';
    section.innerHTML = '<label class="filter-label">Surface Type</label>';
    
    const chips = document.createElement('div');
    chips.className = 'filter-chips';
    
    // Only show main surface types
    const mainSurfaces = ['paved', 'packed_gravel', 'dirt', 'mixed'];
    
    for (const id of mainSurfaces) {
      const surface = SURFACE_TYPES[id];
      if (!surface) continue;
      
      const chip = document.createElement('button');
      chip.className = `filter-chip ${this.filters.surface === id ? 'selected' : ''}`;
      chip.dataset.value = id;
      chip.innerHTML = `<span class="chip-icon">${surface.icon}</span> ${surface.label}`;
      
      chip.addEventListener('click', () => {
        const isSelected = chip.classList.contains('selected');
        chips.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));
        
        if (!isSelected) {
          chip.classList.add('selected');
          this.setFilter('surface', id);
        } else {
          this.setFilter('surface', null);
        }
        this.updateFilterCount(chip.closest('.trail-search-container'));
      });
      
      chips.appendChild(chip);
    }
    
    section.appendChild(chips);
    return section;
  }

  /**
   * Create photos toggle filter
   */
  createPhotosToggle() {
    const section = document.createElement('div');
    section.className = 'filter-section';
    
    const toggle = document.createElement('label');
    toggle.className = `toggle-filter ${this.filters.hasPhotos ? 'active' : ''}`;
    toggle.innerHTML = `
      <span class="toggle-switch"></span>
      <span class="toggle-label">📷 Has Photos</span>
    `;
    
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggle.classList.toggle('active');
      this.setFilter('hasPhotos', toggle.classList.contains('active'));
      this.updateFilterCount(toggle.closest('.trail-search-container'));
    });
    
    section.appendChild(toggle);
    return section;
  }

  /**
   * Create sort dropdown
   */
  createSortDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'sort-dropdown';
    
    const currentSort = SORT_OPTIONS[this.sortBy];
    
    const button = document.createElement('button');
    button.className = 'sort-button';
    button.innerHTML = `
      <span>${currentSort.icon}</span>
      <span>${currentSort.label}</span>
      <span>▼</span>
    `;
    
    const menu = document.createElement('div');
    menu.className = 'sort-menu';
    
    for (const [id, option] of Object.entries(SORT_OPTIONS)) {
      const item = document.createElement('div');
      item.className = `sort-option ${this.sortBy === id ? 'selected' : ''}`;
      item.innerHTML = `<span>${option.icon}</span> ${option.label}`;
      
      item.addEventListener('click', () => {
        menu.querySelectorAll('.sort-option').forEach(o => o.classList.remove('selected'));
        item.classList.add('selected');
        this.setSort(id);
        
        // Update button text
        button.innerHTML = `
          <span>${option.icon}</span>
          <span>${option.label}</span>
          <span>▼</span>
        `;
        
        menu.classList.remove('open');
      });
      
      menu.appendChild(item);
    }
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    
    // Close on outside click
    document.addEventListener('click', () => {
      menu.classList.remove('open');
    });
    
    dropdown.appendChild(button);
    dropdown.appendChild(menu);
    
    return dropdown;
  }

  /**
   * Update active filter count badge
   */
  updateFilterCount(container) {
    if (!container) return;
    
    const count = this.getActiveFilterCount();
    const badge = container.querySelector('.active-filters-count');
    
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  /**
   * Update UI to reflect current filter state
   */
  updateUI(container) {
    if (!container) return;
    
    // Update accessibility chips
    container.querySelectorAll('.filter-chip[data-value]').forEach(chip => {
      const value = chip.dataset.value;
      const filterType = chip.classList.contains('accessibility-fully') || 
                         chip.classList.contains('accessibility-partial') || 
                         chip.classList.contains('accessibility-not') 
                         ? 'accessibility' : null;
      
      if (filterType === 'accessibility') {
        chip.classList.toggle('selected', this.filters.accessibility === value);
      }
    });
    
    // Update toggle
    const toggle = container.querySelector('.toggle-filter');
    if (toggle) {
      toggle.classList.toggle('active', this.filters.hasPhotos);
    }
    
    // Update filter count
    this.updateFilterCount(container);
  }

  /**
   * Create results header with count
   * @param {number} count - Number of results
   * @param {number} total - Total number of trails
   * @returns {HTMLElement}
   */
  createResultsHeader(count, total) {
    const header = document.createElement('div');
    header.className = 'search-results-header';
    
    const activeFilters = this.getActiveFilterCount();
    
    header.innerHTML = `
      <span class="results-count">
        Showing <strong>${count}</strong> of ${total} trails
        ${activeFilters > 0 ? `<span style="color: #667eea;">(${activeFilters} filter${activeFilters > 1 ? 's' : ''} active)</span>` : ''}
      </span>
    `;
    
    return header;
  }

  /**
   * Create no results message
   * @returns {HTMLElement}
   */
  createNoResults() {
    const div = document.createElement('div');
    div.className = 'no-results';
    div.innerHTML = `
      <div class="no-results-icon">🔍</div>
      <div class="no-results-title">No trails found</div>
      <div class="no-results-message">Try adjusting your search or filters</div>
      <button class="clear-filters-btn" style="font-size: 14px;">✕ Clear All Filters</button>
    `;
    
    div.querySelector('.clear-filters-btn').addEventListener('click', () => {
      this.clearFilters();
    });
    
    return div;
  }
}

// Create singleton instance
const trailSearch = new TrailSearch();

// Export
export { TrailSearch, trailSearch };

console.log('🔍 Trail Search & Filters loaded');