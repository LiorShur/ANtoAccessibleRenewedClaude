/**
 * Reports Page - Main JavaScript
 * Handles geographic filtering, map controls, clustering, and timeline
 */

import { auth, db } from './src/firebase-setup.js';
import { accessReportController } from './src/controllers/access-report-controller.js';
import { 
  initializeReportsPageIntegration, 
  viewReportDetails as viewReportDetailsIntegration,
  openReportModal as openReportModalIntegration,
  upvoteReport as upvoteReportIntegration
} from './reports-integration.js';
import { reverseGeocodeWithCache, getLocationDisplayName } from './src/helpers/geocoding.js';
import toast from './src/helpers/toasts.js';
import modal from './src/helpers/modals.js';
import { offlineIndicator } from './src/ui/offlineIndicator.js';
import { showError, getErrorMessage } from './src/utils/errorMessages.js';

// Global state
let map = null;
let userLocationMarker = null;
let currentLocation = null;
let allReports = [];
let filteredReports = [];
let markerClusterGroup = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 Reports page initializing...');
  
  // Initialize offline indicator
  offlineIndicator.initialize();
  
  // Wait for auth to be ready
  await initializeAuth();
  
  // Initialize map
  initializeMap();
  
  // Initialize AccessReport module integration
  await initializeReportsPageIntegration(map);
  
  // Get user location
  await getUserLocation();
  
  // Load reports
  await loadReports();
  
  // Setup event listeners
  setupEventListeners();
  
  // Hide loading overlay
  document.getElementById('loadingOverlay').classList.add('hidden');
  
  // Make utilities available for debugging
  window.offlineIndicator = offlineIndicator;
  window.showError = showError;
  window.getErrorMessage = getErrorMessage;
  
  console.log('✅ Reports page initialized');
});

/**
 * Initialize authentication
 */
async function initializeAuth() {
  console.log('🔐 Checking authentication...');
  
  return new Promise((resolve) => {
    // Import auth functions
    import('https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js')
      .then(({ onAuthStateChanged, signInAnonymously }) => {
        
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log('✅ User signed in:', user.uid);
            resolve();
          } else {
            console.log('⚠️ No user signed in, signing in anonymously...');
            try {
              await signInAnonymously(auth);
              console.log('✅ Signed in anonymously');
              resolve();
            } catch (error) {
              console.error('❌ Failed to sign in:', error);
              resolve(); // Continue anyway
            }
          }
        });
        
      });
  });
}

/**
 * Initialize Leaflet map
 */
function initializeMap() {
  console.log('🗺️ Initializing map...');
  
  map = L.map('reportMap').setView([-33.9249, 18.4241], 12); // Default: Cape Town
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Initialize marker cluster group
  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false, // We'll handle this custom
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count > 10) size = 'large';
      else if (count > 5) size = 'medium';
      
      return L.divIcon({
        html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
        className: 'marker-cluster-custom',
        iconSize: L.point(40, 40)
      });
    }
  });
  
  // Add cluster styles
  const style = document.createElement('style');
  style.textContent = `
    .marker-cluster-custom {
      background: transparent;
    }
    .cluster-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      background: #667eea;
    }
    .cluster-icon.cluster-medium {
      width: 50px;
      height: 50px;
      background: #f59e0b;
    }
    .cluster-icon.cluster-large {
      width: 60px;
      height: 60px;
      background: #ef4444;
    }
  `;
  document.head.appendChild(style);
  
  // Handle cluster clicks to show list of reports
  markerClusterGroup.on('clusterclick', function(e) {
    const cluster = e.layer;
    const markers = cluster.getAllChildMarkers();
    const reports = markers.map(m => m.report);
    showClusteredReportsPopup(reports, e.latlng);
  });
  
  map.addLayer(markerClusterGroup);
  
  console.log('✅ Map initialized');
}

/**
 * Get user's current location
 */
async function getUserLocation() {
  console.log('📍 Getting user location...');
  
  if (!navigator.geolocation) {
    console.warn('⚠️ Geolocation not supported');
    return;
  }
  
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      });
    });
    
    currentLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    
    console.log('✅ User location:', currentLocation);
    
    // Center map on user location
    map.setView([currentLocation.lat, currentLocation.lng], 13);
    
    // Add user location marker
    addUserLocationMarker();
    
    // Get location name (reverse geocode)
    await getLocationName(currentLocation.lat, currentLocation.lng);
    
  } catch (error) {
    console.error('❌ Error getting location:', error);
    toast.warning('Could not get your location. Using default location.');
  }
}

/**
 * Add marker for user's current location
 */
function addUserLocationMarker() {
  if (!currentLocation) return;
  
  // Remove existing marker
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }
  
  // Create custom icon
  const icon = L.divIcon({
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
      <div style="
        width: 50px;
        height: 50px;
        background: rgba(59, 130, 246, 0.2);
        border: 2px solid rgba(59, 130, 246, 0.5);
        border-radius: 50%;
        position: absolute;
        top: -15px;
        left: -15px;
        animation: pulse 2s ease-in-out infinite;
      "></div>
    `,
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  
  // Add pulse animation
  if (!document.getElementById('pulse-animation')) {
    const style = document.createElement('style');
    style.id = 'pulse-animation';
    style.textContent = `
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.5;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  userLocationMarker = L.marker([currentLocation.lat, currentLocation.lng], { icon })
    .addTo(map)
    .bindPopup('📍 You are here');
}

/**
 * Get location name from coordinates (reverse geocode)
 */
async function getLocationName(lat, lng) {
  try {
    const displayName = await getLocationDisplayName(lat, lng);
    document.getElementById('yourLocation').textContent = displayName;
    console.log('📍 Location:', displayName);
  } catch (error) {
    console.error('Error getting location name:', error);
    document.getElementById('yourLocation').textContent = 'Unknown';
  }
}

/**
 * Load all reports
 */
async function loadReports() {
  console.log('📥 Loading reports...');
  
  try {
    // Simplified query to avoid index requirement
    // Load all reports and filter client-side
    allReports = await accessReportController.getReports({
      limit: 500,
      orderBy: 'createdAt',
      orderDirection: 'desc'
      // Removed isPublic filter to avoid index requirement
    });
    
    // Filter public reports client-side
    allReports = allReports.filter(report => report.isPublic !== false);
    
    console.log(`✅ Loaded ${allReports.length} reports`);
    
    // Extract unique countries and cities
    populateLocationFilters(allReports);
    
    // Apply default filter (user location)
    if (currentLocation) {
      filterByProximity(currentLocation, 50); // 50km radius
    } else {
      filteredReports = allReports;
      displayReports();
    }
    
    // Update stats
    updateStats();
    
  } catch (error) {
    console.error('❌ Error loading reports:', error);
    
    if (error.message?.includes('index')) {
      console.log('💡 Tip: Create Firebase composite index for better performance');
      console.log('💡 Link provided in error message above');
    }
    
    toast.error('Failed to load reports. Check console for details.');
  }
}

/**
 * Populate country and city filters
 */
function populateLocationFilters(reports) {
  const countries = new Set();
  const cities = new Set();
  
  reports.forEach(report => {
    if (report.location?.country) countries.add(report.location.country);
    if (report.location?.city) cities.add(report.location.city);
  });
  
  // Populate country dropdown
  const countrySelect = document.getElementById('countryFilter');
  Array.from(countries).sort().forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });
  
  // Populate city dropdown
  const citySelect = document.getElementById('cityFilter');
  Array.from(cities).sort().forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });
}

/**
 * Filter reports by proximity to location
 */
function filterByProximity(location, radiusKm) {
  filteredReports = allReports.filter(report => {
    if (!report.location?.latitude || !report.location?.longitude) return false;
    
    const distance = calculateDistance(
      location.lat,
      location.lng,
      report.location.latitude,
      report.location.longitude
    );
    
    return distance <= radiusKm;
  });
  
  console.log(`🔍 Filtered to ${filteredReports.length} reports within ${radiusKm}km`);
  
  displayReports();
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Display filtered reports on map and timeline
 */
function displayReports() {
  // Clear existing markers
  markerClusterGroup.clearLayers();
  
  // Add markers to cluster group
  filteredReports.forEach(report => {
    if (!report.location?.latitude || !report.location?.longitude) return;
    
    const marker = createReportMarker(report);
    marker.report = report; // Store report ref on marker
    markerClusterGroup.addLayer(marker);
  });
  
  // Fit map to show all markers
  if (filteredReports.length > 0) {
    const bounds = markerClusterGroup.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
  
  // Display timeline
  displayTimeline();
  
  console.log(`✅ Displayed ${filteredReports.length} reports`);
}

/**
 * Create marker for a report
 */
function createReportMarker(report) {
  const severity = report.severity || 'medium';
  const severityColors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#84cc16'
  };
  
  const icon = L.divIcon({
    html: `<div style="
      width: 30px;
      height: 30px;
      background: ${severityColors[severity]};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">⚠️</div>`,
    className: 'report-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
  
  const marker = L.marker(
    [report.location.latitude, report.location.longitude],
    { icon }
  );
  
  // Create popup
  const popupContent = `
    <div style="min-width: 200px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
        ${escapeHtml(report.title)}
      </h3>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
        ${escapeHtml(report.description.substring(0, 100))}${report.description.length > 100 ? '...' : ''}
      </p>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button onclick="window.viewReportDetails('${report.id}')" 
                style="flex: 1; padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          View Details
        </button>
      </div>
    </div>
  `;
  
  marker.bindPopup(popupContent);
  
  return marker;
}

/**
 * Show popup with list of clustered reports
 */
function showClusteredReportsPopup(reports, latlng) {
  const content = `
    <div style="max-width: 300px;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
        📍 ${reports.length} Reports at this location
      </h3>
      <div style="max-height: 300px; overflow-y: auto;">
        ${reports.map(report => `
          <div style="padding: 8px; border-bottom: 1px solid #e5e7eb; cursor: pointer;"
               onclick="window.viewReportDetails('${report.id}')">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">
              ${escapeHtml(report.title)}
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              ${escapeHtml(report.description.substring(0, 60))}${report.description.length > 60 ? '...' : ''}
            </div>
            <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">
              ${report.severity ? report.severity.toUpperCase() : 'MEDIUM'} • 
              ${report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Unknown date'}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  L.popup()
    .setLatLng(latlng)
    .setContent(content)
    .openOn(map);
}

/**
 * Display timeline of reports
 */
function displayTimeline() {
  const timeline = document.getElementById('reportTimeline');
  
  if (filteredReports.length === 0) {
    timeline.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No reports found</p>';
    return;
  }
  
  timeline.innerHTML = filteredReports.map(report => {
    const date = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Unknown date';
    const severity = report.severity || 'medium';
    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#f59e0b',
      low: '#84cc16'
    };
    
    return `
      <div style="padding: 1rem; border-left: 4px solid ${severityColors[severity]}; margin-bottom: 1rem; background: #f9fafb; border-radius: 0 8px 8px 0; cursor: pointer;"
           onclick="window.viewReportDetails('${report.id}')">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <h4 style="margin: 0; font-size: 1rem; font-weight: 600;">
            ${escapeHtml(report.title)}
          </h4>
          <span style="font-size: 0.75rem; color: #6b7280; white-space: nowrap; margin-left: 1rem;">
            ${date}
          </span>
        </div>
        <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
          ${escapeHtml(report.description.substring(0, 150))}${report.description.length > 150 ? '...' : ''}
        </p>
        <div style="display: flex; gap: 1rem; margin-top: 0.5rem; font-size: 0.75rem; color: #9ca3af;">
          <span>📍 ${escapeHtml(report.location?.placeDescription || 'Unknown location')}</span>
          <span>⚠️ ${severity.toUpperCase()}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Update statistics
 */
function updateStats() {
  document.getElementById('totalReports').textContent = allReports.length;
  
  const newReports = allReports.filter(r => r.status === 'new').length;
  document.getElementById('newReports').textContent = newReports;
  
  const resolvedReports = allReports.filter(r => r.status === 'resolved').length;
  document.getElementById('resolvedReports').textContent = resolvedReports;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Apply filters
  document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
  
  // Reset filters
  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
  
  // Use my location
  document.getElementById('useMyLocationBtn').addEventListener('click', async () => {
    await getUserLocation();
    if (currentLocation) {
      filterByProximity(currentLocation, 50);
    }
  });
  
  // Center map
  document.getElementById('centerMapBtn').addEventListener('click', () => {
    if (currentLocation) {
      map.setView([currentLocation.lat, currentLocation.lng], 13);
    }
  });
  
  // Fullscreen toggle
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
  
  // Report FAB
  document.getElementById('reportFabBtn').addEventListener('click', openReportModal);
}

/**
 * Apply filters
 */
function applyFilters() {
  const country = document.getElementById('countryFilter').value;
  const city = document.getElementById('cityFilter').value;
  const status = document.getElementById('statusFilter').value;
  const severity = document.getElementById('severityFilter').value;
  
  filteredReports = allReports.filter(report => {
    if (country && report.location?.country !== country) return false;
    if (city && report.location?.city !== city) return false;
    if (status && report.status !== status) return false;
    if (severity && report.severity !== severity) return false;
    return true;
  });
  
  displayReports();
  toast.success(`Filtered to ${filteredReports.length} reports`);
}

/**
 * Reset filters
 */
function resetFilters() {
  document.getElementById('countryFilter').value = '';
  document.getElementById('cityFilter').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('severityFilter').value = '';
  
  filteredReports = allReports;
  displayReports();
  toast.info('Filters reset');
}

/**
 * Toggle fullscreen map
 */
function toggleFullscreen() {
  const mapElement = document.getElementById('reportMap');
  const btn = document.getElementById('fullscreenBtn');
  
  if (mapElement.classList.contains('fullscreen')) {
    mapElement.classList.remove('fullscreen');
    btn.textContent = '⛶';
    btn.classList.remove('active');
  } else {
    mapElement.classList.add('fullscreen');
    btn.textContent = '✕';
    btn.classList.add('active');
  }
  
  // Invalidate map size after transition
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

/**
 * Open report modal
 */
async function openReportModal() {
  // Get current map center as initial location
  const center = map.getCenter();
  const initialLocation = {
    latitude: center.lat,
    longitude: center.lng
  };
  
  await openReportModalIntegration(map, initialLocation);
  
  // Reload reports after creating new one
  setTimeout(() => {
    loadReports();
  }, 1000);
}

/**
 * View report details (global function)
 * Uses integration module for full AccessReport features including photo lightbox
 */
window.viewReportDetails = async function(reportId) {
  await viewReportDetailsIntegration(reportId);
};

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('📄 Reports page script loaded');