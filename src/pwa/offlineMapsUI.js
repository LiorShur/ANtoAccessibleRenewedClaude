/**
 * Offline Maps UI
 * Access Nature - UI for downloading and managing offline map tiles
 */

import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';
import { pwaManager } from './pwaManager.js';

class OfflineMapsUI {
  constructor() {
    this.currentMap = null;
    this.cachedRegions = [];
    this.storageKey = 'accessNature_offlineMaps';
    this.isDownloading = false;
  }

  /**
   * Initialize offline maps UI
   */
  initialize() {
    this.loadCachedRegions();
    this.injectStyles();
    console.log('✅ Offline Maps UI initialized');
  }

  /**
   * Set the current Leaflet map reference
   * @param {L.Map} map - Leaflet map instance
   */
  setMap(map) {
    this.currentMap = map;
  }

  /**
   * Load cached regions from storage
   */
  loadCachedRegions() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.cachedRegions = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load cached regions:', e);
    }
  }

  /**
   * Save cached regions to storage
   */
  saveCachedRegions() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cachedRegions));
    } catch (e) {
      console.warn('Failed to save cached regions:', e);
    }
  }

  /**
   * Inject any additional styles
   */
  injectStyles() {
    // Styles are in pwa.css, but we can add dynamic ones here if needed
  }

  /**
   * Open offline maps management panel
   * @param {string} containerId - Container element ID
   */
  openPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      this.openModal();
      return;
    }

    container.innerHTML = this.renderPanel();
    this.attachEventListeners(container);
  }

  /**
   * Open as modal
   */
  async openModal() {
    const overlay = document.createElement('div');
    overlay.className = 'safety-overlay open'; // Reuse existing modal styles
    overlay.id = 'offlineMapsOverlay';
    
    overlay.innerHTML = `
      <div class="safety-modal" style="max-width: 450px;">
        <div class="safety-header" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
          <h2>📥 Offline Maps</h2>
          <p>Download maps for use without internet</p>
        </div>
        <div class="safety-body" style="max-height: 60vh; overflow-y: auto;">
          ${this.renderPanelContent()}
        </div>
        <div class="safety-footer">
          <button class="safety-cancel" onclick="document.getElementById('offlineMapsOverlay').remove()">
            Close
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.attachEventListeners(overlay);
    
    // Update cache size display
    this.updateCacheSize();
  }

  /**
   * Render panel HTML
   */
  renderPanel() {
    return `
      <div class="offline-maps-panel">
        ${this.renderPanelContent()}
      </div>
    `;
  }

  /**
   * Render panel content
   */
  renderPanelContent() {
    return `
      <div class="offline-maps-header">
        <h3>📥 Offline Maps</h3>
        <div class="offline-maps-status">
          <span class="status-dot ${this.cachedRegions.length > 0 ? '' : 'warning'}"></span>
          <span>${this.cachedRegions.length} region(s) saved</span>
        </div>
      </div>
      
      <div class="offline-maps-actions">
        <button class="offline-maps-btn primary" id="downloadCurrentArea">
          📍 Download Current View
        </button>
        <button class="offline-maps-btn secondary" id="downloadTrailArea">
          🥾 Download Trail Area
        </button>
      </div>
      
      <div class="download-progress" id="downloadProgress">
        <div class="download-progress-bar">
          <div class="download-progress-fill" id="downloadProgressFill"></div>
        </div>
        <div class="download-progress-text" id="downloadProgressText">
          Preparing download...
        </div>
      </div>
      
      ${this.renderCachedRegions()}
      
      <div class="cache-storage-info">
        <div class="cache-storage-header">
          <span class="cache-storage-title">Storage Used</span>
          <span class="cache-storage-total" id="cacheStorageTotal">Calculating...</span>
        </div>
        <div class="cache-storage-breakdown">
          <div class="cache-storage-item">
            <span class="cache-storage-item-name">🗺️ Map Tiles</span>
            <span class="cache-storage-item-size" id="mapCacheSize">--</span>
          </div>
          <div class="cache-storage-item">
            <span class="cache-storage-item-name">📄 App Data</span>
            <span class="cache-storage-item-size" id="appCacheSize">--</span>
          </div>
        </div>
        <button class="offline-maps-btn danger" id="clearAllCache" style="margin-top: 12px; width: 100%;">
          🗑️ Clear All Cached Data
        </button>
      </div>
    `;
  }

  /**
   * Render cached regions list
   */
  renderCachedRegions() {
    if (this.cachedRegions.length === 0) {
      return `
        <div class="cached-regions">
          <h4>Saved Regions</h4>
          <p style="color: #6b7280; font-size: 0.85rem; text-align: center; padding: 16px;">
            No offline maps downloaded yet
          </p>
        </div>
      `;
    }

    return `
      <div class="cached-regions">
        <h4>Saved Regions</h4>
        ${this.cachedRegions.map((region, index) => `
          <div class="cached-region-item">
            <div class="cached-region-info">
              <span class="cached-region-icon">🗺️</span>
              <div>
                <div class="cached-region-name">${region.name}</div>
                <div class="cached-region-size">${region.tileCount} tiles • ${this.formatDate(region.downloadedAt)}</div>
              </div>
            </div>
            <button class="cached-region-remove" data-index="${index}" title="Remove">×</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(container) {
    // Download current area
    container.querySelector('#downloadCurrentArea')?.addEventListener('click', () => {
      this.downloadCurrentArea();
    });

    // Download trail area
    container.querySelector('#downloadTrailArea')?.addEventListener('click', () => {
      this.downloadTrailArea();
    });

    // Clear cache
    container.querySelector('#clearAllCache')?.addEventListener('click', () => {
      this.clearAllCache();
    });

    // Remove region buttons
    container.querySelectorAll('.cached-region-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeRegion(index);
      });
    });

    // Listen for progress updates from service worker
    this.setupProgressListener();
  }

  /**
   * Setup progress listener for downloads
   */
  setupProgressListener() {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'MAP_CACHE_PROGRESS') {
        this.updateProgress(event.data.data);
      } else if (event.data?.type === 'MAP_CACHE_COMPLETE') {
        this.downloadComplete(event.data.data);
      }
    });

    // Also listen for SW messages via pwaManager
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'MAP_CACHE_PROGRESS') {
        this.updateProgress(event.data.data);
      } else if (event.data?.type === 'MAP_CACHE_COMPLETE') {
        this.downloadComplete(event.data.data);
      }
    });
  }

  /**
   * Download current map view
   */
  async downloadCurrentArea() {
    if (!this.currentMap) {
      toast.error('Map not available. Open the tracker first.');
      return;
    }

    if (this.isDownloading) {
      toast.warning('Download already in progress');
      return;
    }

    const bounds = this.currentMap.getBounds();
    const zoom = this.currentMap.getZoom();
    const center = this.currentMap.getCenter();

    // Estimate tiles
    const tileCount = this.estimateTiles(bounds, zoom, Math.min(zoom + 3, 17));
    const estimatedSize = this.formatBytes(tileCount * 15000);

    const confirm = await modal.confirm(
      `Download approximately ${tileCount} tiles (~${estimatedSize}) for this area?`,
      '📥 Download Map Area'
    );

    if (!confirm) return;

    // Get region name
    const name = await this.getRegionName(center.lat, center.lng);

    this.startDownload({
      name,
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      },
      zoom,
      maxZoom: Math.min(zoom + 3, 17),
      tileCount
    });
  }

  /**
   * Download area around a specific trail
   */
  async downloadTrailArea() {
    // For now, use current view. In future, could select from saved trails
    await this.downloadCurrentArea();
  }

  /**
   * Start the download process
   */
  async startDownload(config) {
    this.isDownloading = true;

    // Show progress UI
    const progressContainer = document.getElementById('downloadProgress');
    if (progressContainer) {
      progressContainer.classList.add('active');
    }

    this.updateProgress({ cached: 0, total: config.tileCount });

    try {
      // Send to service worker via pwaManager
      if (window.pwaManager?.swRegistration?.active) {
        window.pwaManager.swRegistration.active.postMessage({
          type: 'CACHE_MAP_REGION',
          payload: {
            bounds: config.bounds,
            zoom: config.zoom,
            maxZoom: config.maxZoom
          }
        });

        // Store region info locally
        this.cachedRegions.push({
          name: config.name,
          bounds: config.bounds,
          zoom: config.zoom,
          maxZoom: config.maxZoom,
          tileCount: config.tileCount,
          downloadedAt: new Date().toISOString()
        });
        this.saveCachedRegions();
      } else {
        throw new Error('Service worker not available');
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download maps. Is the service worker ready?');
      this.isDownloading = false;
      
      const progressContainer = document.getElementById('downloadProgress');
      if (progressContainer) {
        progressContainer.classList.remove('active');
      }
    }
  }

  /**
   * Update download progress UI
   */
  updateProgress(data) {
    const percent = Math.round((data.cached / data.total) * 100);
    
    const fill = document.getElementById('downloadProgressFill');
    const text = document.getElementById('downloadProgressText');
    
    if (fill) {
      fill.style.width = `${percent}%`;
    }
    
    if (text) {
      text.textContent = `Downloading: ${data.cached} / ${data.total} tiles (${percent}%)`;
    }
  }

  /**
   * Handle download complete
   */
  downloadComplete(data) {
    this.isDownloading = false;

    const progressContainer = document.getElementById('downloadProgress');
    if (progressContainer) {
      progressContainer.classList.remove('active');
    }

    toast.success(`Map downloaded! ${data.cached} tiles saved.`);

    // Refresh the UI
    this.updateCacheSize();
    
    // Refresh regions list if modal is open
    const overlay = document.getElementById('offlineMapsOverlay');
    if (overlay) {
      const regionsContainer = overlay.querySelector('.cached-regions');
      if (regionsContainer) {
        regionsContainer.outerHTML = this.renderCachedRegions();
        // Re-attach remove listeners
        overlay.querySelectorAll('.cached-region-remove').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            this.removeRegion(index);
          });
        });
      }
    }
  }

  /**
   * Remove a cached region
   */
  async removeRegion(index) {
    const region = this.cachedRegions[index];
    if (!region) return;

    const confirm = await modal.confirm(
      `Remove "${region.name}" from offline storage?`,
      '🗑️ Remove Offline Map'
    );

    if (!confirm) return;

    this.cachedRegions.splice(index, 1);
    this.saveCachedRegions();

    // Note: This doesn't actually remove tiles from cache (would need SW enhancement)
    // For now, just remove from our tracking
    toast.success('Region removed');

    // Refresh UI
    const overlay = document.getElementById('offlineMapsOverlay');
    if (overlay) {
      const regionsContainer = overlay.querySelector('.cached-regions');
      if (regionsContainer) {
        regionsContainer.outerHTML = this.renderCachedRegions();
      }
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache() {
    const confirm = await modal.confirm(
      'This will remove all offline maps and cached app data. Continue?',
      '🗑️ Clear All Cache'
    );

    if (!confirm) return;

    try {
      await pwaManager.clearCache();
      this.cachedRegions = [];
      this.saveCachedRegions();
      this.updateCacheSize();
      toast.success('All cache cleared');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  }

  /**
   * Update cache size display
   */
  async updateCacheSize() {
    try {
      const size = await pwaManager.getCacheSize();
      
      const totalEl = document.getElementById('cacheStorageTotal');
      if (totalEl) {
        totalEl.textContent = this.formatBytes(size);
      }

      // Rough estimates for breakdown
      const mapEl = document.getElementById('mapCacheSize');
      const appEl = document.getElementById('appCacheSize');
      
      if (mapEl) {
        mapEl.textContent = this.formatBytes(size * 0.8); // Assume 80% is maps
      }
      if (appEl) {
        appEl.textContent = this.formatBytes(size * 0.2); // Assume 20% is app
      }
    } catch (error) {
      console.warn('Failed to get cache size:', error);
    }
  }

  /**
   * Estimate tile count for a region
   */
  estimateTiles(bounds, minZoom, maxZoom) {
    let count = 0;
    
    for (let z = minZoom; z <= maxZoom; z++) {
      const n = Math.pow(2, z);
      const minX = Math.floor((bounds.getWest() + 180) / 360 * n);
      const maxX = Math.floor((bounds.getEast() + 180) / 360 * n);
      
      const minLatRad = bounds.getSouth() * Math.PI / 180;
      const maxLatRad = bounds.getNorth() * Math.PI / 180;
      
      const minY = Math.floor((1 - Math.log(Math.tan(maxLatRad) + 1 / Math.cos(maxLatRad)) / Math.PI) / 2 * n);
      const maxY = Math.floor((1 - Math.log(Math.tan(minLatRad) + 1 / Math.cos(minLatRad)) / Math.PI) / 2 * n);
      
      count += (maxX - minX + 1) * (maxY - minY + 1);
    }
    
    return count;
  }

  /**
   * Get region name from coordinates (reverse geocoding)
   */
  async getRegionName(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.address?.city || 
               data.address?.town || 
               data.address?.village ||
               data.address?.county ||
               `Area at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
    
    return `Area at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Format date
   */
  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  }
}

// Create singleton instance
export const offlineMapsUI = new OfflineMapsUI();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => offlineMapsUI.initialize());
} else {
  offlineMapsUI.initialize();
}

// Make available globally
window.offlineMapsUI = offlineMapsUI;

export default offlineMapsUI;