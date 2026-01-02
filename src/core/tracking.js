// GPS tracking with proper save prompt
import { haversineDistance } from '../utils/calculations.js';
import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';
import { userService } from '../services/userService.js';
import { trailGuideGeneratorV2 } from '../features/trailGuideGeneratorV2.js';
import { getElevation } from '../utils/geolocation.js';

export class TrackingController {
  constructor(appState) {
    this.appState = appState;
    this.watchId = null;
    this.isTracking = false;
    this.isPaused = false;
    this.dependencies = {};
    this.lastElevationFetch = 0;
    this.elevationFetchInterval = 10000; // Fetch from API max every 10 seconds
    this.lastApiElevation = null;
  }

  setDependencies(deps) {
    this.dependencies = deps;
  }

async start() {
  if (this.isTracking) return false;

  if (!navigator.geolocation) {
    throw new Error('Geolocation not supported by this browser');
  }

  console.log('🚀 Starting GPS tracking...');

  // FIXED: Check if we're resuming a restored route
  const currentElapsed = this.appState.getElapsedTime();
  const isResuming = currentElapsed > 0 && this.appState.getRouteData().length > 0;

  if (!isResuming) {
  // Starting fresh - clear any previous route data and set start time
  this.appState.clearRouteData();
  this.appState.setStartTime(Date.now());
  // Clear restore handled flag for future sessions
  sessionStorage.removeItem('restore_handled');
  
  // Clear previous accessibility data for fresh route
  localStorage.removeItem('accessibilityData');
  
  // Show accessibility survey reminder after a short delay
  setTimeout(() => {
    this.showAccessibilitySurveyReminder();
  }, 3000); // Show after 3 seconds to let user get oriented
  
} else {
  // FIXED: Resuming - use more precise timing calculation
  const currentTime = Date.now();
  const adjustedStartTime = currentTime - currentElapsed;
  this.appState.setStartTime(adjustedStartTime);
  console.log(`🔄 Resuming route with ${this.formatTime(currentElapsed)} elapsed`);
  
  // IMPORTANT: Also update the app state's elapsed time to match
  this.appState.setElapsedTime(currentElapsed);
}

  this.isTracking = true;
  this.isPaused = false;
  this.appState.setTrackingState(true);
  
  // Add body class to disable pull-to-refresh
  document.body.classList.add('tracking-active');

  // Start GPS watch
  this.watchId = navigator.geolocation.watchPosition(
    (position) => this.handlePositionUpdate(position),
    (error) => this.handlePositionError(error),
    {
      enableHighAccuracy: true,
      maximumAge: 5000,  // Allow cached position up to 5 seconds old for faster initial lock
      timeout: 30000    // Increased timeout to 30 seconds for slow GPS
    }
  );

  // FIXED: Start timer with current elapsed time (if resuming)
  if (this.dependencies.timer) {
  if (isResuming) {
    // FIXED: Get the actual elapsed time from app state
    const restoredElapsed = this.appState.getElapsedTime();
    console.log(`⏱️ Starting timer with restored elapsed: ${restoredElapsed}ms`);
    this.dependencies.timer.start(restoredElapsed);
  } else {
    this.dependencies.timer.start();
  }
}

  this.updateTrackingButtons();
  
  if (isResuming) {
    console.log('✅ GPS tracking resumed successfully');
  } else {
    console.log('✅ GPS tracking started successfully');
  }
  
  // Dispatch tracking started event for other modules (trail alerts, etc.)
  window.dispatchEvent(new CustomEvent('trackingStarted', { 
    detail: { isResuming } 
  }));
  
  return true;
}

// NEW: Format time helper method
formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Show accessibility survey reminder when starting a new route
 */
showAccessibilitySurveyReminder() {
  // Check if survey already has data (maybe from previous interaction)
  const existingData = localStorage.getItem('accessibilityData');
  if (existingData) {
    console.log('Accessibility data already exists, skipping reminder');
    return;
  }

  // Create reminder banner
  const reminder = document.createElement('div');
  reminder.id = 'accessibility-reminder';
  reminder.style.cssText = `
    position: fixed;
    top: calc(var(--nav-height, 56px) + 130px);
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 16px;
    z-index: 9999;
    max-width: 320px;
    width: calc(100% - 40px);
    box-shadow: 0 8px 32px rgba(33, 150, 243, 0.4);
    animation: slideDown 0.4s ease;
  `;

  reminder.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="font-size: 32px; line-height: 1;">♿</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px;">
          📋 Accessibility Survey
        </div>
        <div style="font-size: 13px; opacity: 0.95; line-height: 1.4;">
          Help others by documenting this trail's accessibility features as you go!
        </div>
      </div>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 14px;">
      <button id="open-survey-btn" style="
        flex: 1;
        padding: 10px 16px;
        background: white;
        color: #1976D2;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
      ">Open Survey</button>
      <button id="remind-later-btn" style="
        padding: 10px 16px;
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
      ">Later</button>
    </div>
  `;

  // Add animation styles if not present
  if (!document.getElementById('reminder-animation-style')) {
    const style = document.createElement('style');
    style.id = 'reminder-animation-style';
    style.textContent = `
      @keyframes slideDown {
        from { transform: translate(-50%, -20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -20px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(reminder);

  // Handle button clicks
  const openBtn = reminder.querySelector('#open-survey-btn');
  const laterBtn = reminder.querySelector('#remind-later-btn');

  const closeReminder = () => {
    reminder.style.animation = 'slideUp 0.3s ease forwards';
    setTimeout(() => reminder.remove(), 300);
  };

  openBtn.addEventListener('click', () => {
    closeReminder();
    // Open the accessibility form
    if (window.openAccessibilityForm) {
      window.openAccessibilityForm();
    }
  });

  laterBtn.addEventListener('click', () => {
    closeReminder();
    // Show a subtle toast reminder
    toast.info('Tap the ♿ button anytime to fill the survey', { duration: 4000 });
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.getElementById('accessibility-reminder')) {
      closeReminder();
    }
  }, 15000);
}

/**
 * Prompt user to fill accessibility survey before saving
 * Returns: 'fill' (open survey), 'skip' (save without), or 'cancel' (abort save)
 */
async promptForAccessibilitySurvey() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'survey-prompt-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: white;
        border-radius: 20px;
        max-width: 340px;
        width: calc(100% - 40px);
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: scaleIn 0.3s ease;
      ">
        <div style="
          background: linear-gradient(135deg, #2196F3 0%, #1565C0 100%);
          padding: 24px 20px;
          text-align: center;
        ">
          <div style="font-size: 48px; margin-bottom: 8px;">♿</div>
          <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">
            Accessibility Survey
          </h3>
        </div>
        
        <div style="padding: 20px;">
          <p style="margin: 0 0 8px; color: #333; font-size: 15px; line-height: 1.5; text-align: center;">
            You haven't filled the accessibility survey for this trail yet.
          </p>
          <p style="margin: 0 0 20px; color: #666; font-size: 14px; line-height: 1.4; text-align: center;">
            Your input helps others with mobility challenges discover accessible trails!
          </p>
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="survey-fill-btn" style="
              width: 100%;
              padding: 14px 20px;
              background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            ">
              <span style="font-size: 18px;">📋</span>
              Fill Survey Now
            </button>
            
            <button id="survey-skip-btn" style="
              width: 100%;
              padding: 12px 20px;
              background: #f5f5f5;
              color: #666;
              border: none;
              border-radius: 12px;
              font-size: 14px;
              cursor: pointer;
            ">
              Skip & Save Without Survey
            </button>
            
            <button id="survey-cancel-btn" style="
              width: 100%;
              padding: 10px 20px;
              background: transparent;
              color: #999;
              border: none;
              font-size: 13px;
              cursor: pointer;
            ">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    // Add animations if not present
    if (!document.getElementById('survey-prompt-animations')) {
      const style = document.createElement('style');
      style.id = 'survey-prompt-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
    };

    overlay.querySelector('#survey-fill-btn').addEventListener('click', () => {
      cleanup();
      resolve('fill');
    });

    overlay.querySelector('#survey-skip-btn').addEventListener('click', () => {
      cleanup();
      resolve('skip');
    });

    overlay.querySelector('#survey-cancel-btn').addEventListener('click', () => {
      cleanup();
      resolve('cancel');
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve('cancel');
      }
    });
  });
}

// UPDATED: Stop method to preserve elapsed time
async stop() {
  if (!this.isTracking) {
    console.warn('Tracking not active');
    return false;
  }

  console.log('🛑 Stopping GPS tracking...');

  // Stop GPS watch
  if (this.watchId) {
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  // Stop timer and get final elapsed time
  let finalElapsed = 0;
  if (this.dependencies.timer) {
    finalElapsed = this.dependencies.timer.stop();
    this.appState.setElapsedTime(finalElapsed);
  }

  this.isTracking = false;
  this.isPaused = false;
  this.appState.setTrackingState(false);
  
  // Remove body class to re-enable pull-to-refresh
  document.body.classList.remove('tracking-active');
  
  this.updateTrackingButtons();

  // Track user engagement (distance and time)
  const totalDistanceMeters = this.appState.getTotalDistance() * 1000; // Convert km to meters
  if (totalDistanceMeters > 0 && userService.isInitialized) {
    try {
      await userService.trackDistance(totalDistanceMeters, finalElapsed);
      console.log('📊 Engagement tracked: distance and time');
    } catch (error) {
      console.warn('⚠️ Failed to track engagement:', error.message);
    }
  }

  // Prompt for save (await to ensure proper sequencing)
  await this.promptForSave();

  // Dispatch tracking stopped event for other modules
  window.dispatchEvent(new CustomEvent('trackingStopped'));

  console.log('✅ GPS tracking stopped');
  return true;
}

  togglePause() {
    if (!this.isTracking) {
      console.warn('Cannot pause - tracking not active');
      return false;
    }

    if (this.isPaused) {
      // Resume
      console.log('▶️ Resuming tracking...');
      this.isPaused = false;
      
      if (this.dependencies.timer) {
        this.dependencies.timer.resume();
      }

      // Restart GPS watch
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position),
        (error) => this.handlePositionError(error),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );

    } else {
      // Pause
      console.log('⏸️ Pausing tracking...');
      this.isPaused = true;
      
      if (this.dependencies.timer) {
        this.dependencies.timer.pause();
      }

      // Stop GPS watch but keep tracking state
      if (this.watchId) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
    }

    this.appState.setTrackingState(this.isTracking, this.isPaused);
    this.updateTrackingButtons();
    return true;
  }

  handlePositionUpdate(position) {
    if (!this.isTracking || this.isPaused) return;

    const { latitude, longitude, accuracy, altitude, altitudeAccuracy } = position.coords;
    
    // Filter out inaccurate readings
    if (accuracy > 100) {
      console.warn(`GPS accuracy too low: ${accuracy}m`);
      return;
    }

    const currentCoords = { lat: latitude, lng: longitude };
    const lastCoords = this.appState.getLastCoords();

    // Calculate distance if we have a previous point
    if (lastCoords) {
      const distance = haversineDistance(lastCoords, currentCoords);
      
      // Ignore micro-movements (less than 3 meters)
      if (distance < 0.003) return;

      // Update total distance
      const newTotal = this.appState.getTotalDistance() + distance;
      this.appState.updateDistance(newTotal);
      this.updateDistanceDisplay(newTotal);

      // Draw route segment on map
      if (this.dependencies.map) {
        this.dependencies.map.addRouteSegment(lastCoords, currentCoords);
      }
    }

    // Add GPS point to route data (including elevation if available)
    const routePoint = {
      type: 'location',
      coords: currentCoords,
      timestamp: Date.now(),
      accuracy: accuracy
    };
    
    // Check for device altitude first
    const hasDeviceAltitude = altitude !== null && altitude !== undefined && !isNaN(altitude);
    
    if (hasDeviceAltitude) {
      // Use device GPS/barometer altitude
      routePoint.elevation = altitude;
      routePoint.elevationAccuracy = altitudeAccuracy || null;
      routePoint.elevationSource = 'device';
      this.lastApiElevation = null; // Reset API cache when device has altitude
      
      // Dispatch elevation update immediately
      this.dispatchElevationUpdate(altitude, 'device');
    } else {
      // Try API fallback (throttled)
      this.fetchElevationFromAPI(latitude, longitude, routePoint);
    }
    
    // Add the route point to state
    this.appState.addRoutePoint(routePoint);

    this.appState.addPathPoint(currentCoords);

    // Update map marker
    if (this.dependencies.map) {
      this.dependencies.map.updateMarkerPosition(currentCoords);
    }

    // Dispatch position update event for trail alerts and other modules
    window.dispatchEvent(new CustomEvent('positionUpdate', {
      detail: { 
        lat: latitude, 
        lng: longitude, 
        accuracy,
        elevation: routePoint.elevation || null
      }
    }));

    // Log with elevation if available
    const elevStr = routePoint.elevation ? ` 📐${routePoint.elevation.toFixed(1)}m` : '';
    console.log(`📍 GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy.toFixed(1)}m)${elevStr}`);
  }

  /**
   * Fetch elevation from API with throttling
   */
  async fetchElevationFromAPI(lat, lng, routePoint) {
    const now = Date.now();
    
    // Throttle API calls
    if (now - this.lastElevationFetch < this.elevationFetchInterval) {
      // Use cached API elevation if available
      if (this.lastApiElevation !== null) {
        routePoint.elevation = this.lastApiElevation;
        routePoint.elevationSource = 'api-cached';
        this.dispatchElevationUpdate(this.lastApiElevation, 'api');
      }
      return;
    }
    
    this.lastElevationFetch = now;
    
    try {
      const elevation = await getElevation(lat, lng);
      
      if (elevation !== null) {
        routePoint.elevation = elevation;
        routePoint.elevationSource = 'api';
        this.lastApiElevation = elevation;
        
        // Update the route point in state (it was already added, so update last point)
        const routeData = this.appState.getRouteData();
        const lastPoint = routeData[routeData.length - 1];
        if (lastPoint && lastPoint.coords.lat === lat && lastPoint.coords.lng === lng) {
          lastPoint.elevation = elevation;
          lastPoint.elevationSource = 'api';
        }
        
        this.dispatchElevationUpdate(elevation, 'api');
        console.log(`📐 API Elevation: ${elevation.toFixed(1)}m`);
      }
    } catch (error) {
      console.warn('Elevation API fallback failed:', error);
    }
  }

  /**
   * Dispatch elevation update event for UI
   */
  dispatchElevationUpdate(elevation, source) {
    window.dispatchEvent(new CustomEvent('elevationUpdate', {
      detail: { elevation, source }
    }));
  }

  handlePositionError(error) {
    console.error('🚨 GPS error:', error);
    
    let errorMessage = 'GPS error: ';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage += 'Location permission denied. Please enable location access and try again.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage += 'Location information unavailable. Please check your GPS settings.';
        break;
      case error.TIMEOUT:
        errorMessage += 'Location request timed out. Please try again.';
        break;
      default:
        errorMessage += 'An unknown error occurred.';
        break;
    }

    toast.error(errorMessage, { title: 'GPS Error', duration: 6000 });

    if (error.code === error.PERMISSION_DENIED) {
      this.stop(); // Stop tracking if permission denied
    }
  }

  updateTrackingButtons() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (startBtn) {
      startBtn.disabled = this.isTracking;
      startBtn.style.opacity = this.isTracking ? '0.5' : '1';
    }

    if (pauseBtn) {
      pauseBtn.disabled = !this.isTracking;
      pauseBtn.style.opacity = this.isTracking ? '1' : '0.5';
      
      // Update pause button text/icon based on state
      if (this.isPaused) {
        pauseBtn.innerHTML = '▶'; // Resume icon
        pauseBtn.title = 'Resume Tracking';
      } else {
        pauseBtn.innerHTML = '⏸'; // Pause icon
        pauseBtn.title = 'Pause Tracking';
      }
    }

    if (stopBtn) {
      stopBtn.disabled = !this.isTracking;
      stopBtn.style.opacity = this.isTracking ? '1' : '0.5';
    }
  }

  updateDistanceDisplay(distance) {
    const distanceElement = document.getElementById('distance');
    if (distanceElement) {
      if (distance < 1) {
        distanceElement.textContent = `${(distance * 1000).toFixed(0)} m`;
      } else {
        distanceElement.textContent = `${distance.toFixed(2)} km`;
      }
    }
  }

  // FIXED: Enhanced save prompt with better UI
  async promptForSave() {
    const routeData = this.appState.getRouteData();
    const totalDistance = this.appState.getTotalDistance();
    const elapsedTime = this.appState.getElapsedTime();
    
    // Only prompt if we actually have route data
    if (!routeData || routeData.length === 0) {
      console.log('No route data to save');
      return;
    }

    const locationPoints = routeData.filter(point => point.type === 'location').length;
    const photos = routeData.filter(point => point.type === 'photo').length;
    const notes = routeData.filter(point => point.type === 'text').length;

    // Create a detailed save dialog
    const routeStats = `📍 GPS Points: ${locationPoints}
📏 Distance: ${totalDistance.toFixed(2)} km
⏱️ Duration: ${this.formatTime(elapsedTime)}
📷 Photos: ${photos}
📝 Notes: ${notes}`;

    const wantsToSave = await modal.confirm(routeStats, 'Save Route?');
    
    if (wantsToSave) {
      await this.saveRoute();
    } else {
      // Ask if they want to discard
      const confirmDiscard = await modal.confirm('All route data will be lost!', '⚠️ Discard Route?');
      if (confirmDiscard) {
        this.discardRoute();
      } else {
        // Give them another chance to save
        await this.saveRoute();
      }
    }
  }

// FIXED: Save route with proper cloud integration
// FIXED: Save route with proper cloud integration
// UPDATED: Save route with public/private choice
async saveRoute(skipSurveyPrompt = false) {
  try {
    // First check if accessibility survey has been completed
    let accessibilityData = null;
    try {
      const storedAccessibilityData = localStorage.getItem('accessibilityData');
      accessibilityData = storedAccessibilityData ? JSON.parse(storedAccessibilityData) : null;
    } catch (error) {
      console.warn('Could not load accessibility data:', error);
    }

    // If accessibility data is missing and we haven't already prompted, prompt to fill it
    if (!accessibilityData && !skipSurveyPrompt) {
      const fillSurvey = await this.promptForAccessibilitySurvey();
      if (fillSurvey === 'fill') {
        // User wants to fill survey - open it and wait for completion
        return new Promise((resolve) => {
          window.openAccessibilityForm((data) => {
            // Callback when form is closed/submitted
            // Continue with save (pass true to skip re-prompting)
            setTimeout(() => {
              this.saveRoute(true).then(resolve);
            }, 500);
          });
        });
      } else if (fillSurvey === 'cancel') {
        // User cancelled entirely
        return;
      }
      // If 'skip', continue with saving without survey data
    }
    
    // Re-check in case they filled it during the prompt
    try {
      const rechecked = localStorage.getItem('accessibilityData');
      accessibilityData = rechecked ? JSON.parse(rechecked) : null;
    } catch (e) {}

    const defaultName = `Route ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    let routeName = await modal.prompt('Enter a name for this route:', 'Name Your Route', defaultName);
    
    // If they cancelled the name dialog, ask if they want to use default
    if (routeName === null) {
      const useDefault = await modal.confirm(`Use default name "${defaultName}"?`, 'Use Default Name?');
      routeName = useDefault ? defaultName : null;
    }

    // If they still don't want to name it, don't save
    if (!routeName) {
      console.log('Route save cancelled by user');
      return;
    }

    // Clean up the name
    routeName = routeName.trim() || defaultName;

    // CRITICAL: Capture all route data BEFORE any async operations that might clear it
    const routeData = [...this.appState.getRouteData()]; // Make a copy
    const routeInfo = {
      name: routeName,
      totalDistance: this.appState.getTotalDistance(),
      elapsedTime: this.appState.getElapsedTime(),
      date: new Date().toISOString()
    };

    // Save to local storage first (for route history)
    const savedSession = await this.appState.saveSession(routeName);
    
    // ALSO save to offlineSync's pending system for cloud sync later
    // This ensures the route appears in "Local Storage" modal and can be uploaded
    const pendingData = {
      routeData: routeData,
      routeInfo: routeInfo,
      accessibilityData: accessibilityData,
      name: routeName,
      totalDistance: routeInfo.totalDistance,
      elapsedTime: routeInfo.elapsedTime
    };
    
    // Import and use offlineSync
    const { offlineSync } = await import('../features/offlineSync.js');
    await offlineSync.saveRoute(pendingData, null); // Save without user - will be linked on upload
    
    console.log('✅ Route saved to both local storage and pending queue');
    
    // Check if user is logged in and offer cloud save
    const app = window.AccessNatureApp;
    const authController = app?.getController('auth');
    
    if (authController?.isAuthenticated()) {
      // Ask about cloud save with public/private option
      const cloudChoice = await this.askCloudSaveOptions(routeName);
      
      if (cloudChoice && cloudChoice !== 'skip') {
        try {
          routeInfo.makePublic = cloudChoice === 'public';
          
          // Save to cloud directly
          await this.saveRouteToCloud(routeData, routeInfo, accessibilityData, authController);
          
          // Mark as uploaded in pending queue
          const pendingRoutes = await offlineSync.getPendingRoutes();
          const justSaved = pendingRoutes.find(r => r.data?.name === routeName && r.status === 'pending');
          if (justSaved) {
            await offlineSync.markRouteUploaded(justSaved.localId, 'cloud-synced');
          }
          
        } catch (cloudError) {
          console.error('❌ Cloud save failed:', cloudError);
          toast.warning('Saved locally! Cloud upload failed - you can retry from Local Storage.', { duration: 6000 });
        }
      }
    } else {
      // User not logged in - route is already saved locally and to pending queue
      toast.success(`"${routeName}" saved locally!`);
      
      const wantsToSignIn = await modal.confirm(
        'Sign in to save routes to the cloud and create shareable trail guides.\n\nYour route is saved locally and will be available to upload after signing in.',
        '💡 Enable Cloud Sync'
      );
      
      if (wantsToSignIn && authController?.showAuthModal) {
        // Store the pending route info so we can prompt after auth
        sessionStorage.setItem('pendingCloudUpload', JSON.stringify({
          routeName: routeName,
          timestamp: Date.now()
        }));
        
        authController.showAuthModal();
      }
    }
    
    // Clear route data after saving
    this.appState.clearRouteData();
    
    // Reset timer controller and display
    const timerController = window.AccessNatureApp?.controllers?.timer;
    if (timerController) {
      timerController.reset();
    } else {
      // Fallback: reset timer display directly
      const timerEl = document.getElementById('timer');
      if (timerEl) timerEl.textContent = '00:00:00';
    }
    
    // Reset distance display
    const distanceEl = document.getElementById('distance');
    if (distanceEl) distanceEl.textContent = '0.00 km';
    
    console.log('✅ Route saved successfully:', savedSession);
    
  } catch (error) {
    console.error('❌ Failed to save route:', error);
    toast.error('Failed to save route: ' + error.message);
  }
}

// NEW: Ask user about cloud save options
async askCloudSaveOptions(routeName) {
  const message = `"${routeName}" saved locally! 

☁️ Would you like to save to cloud and create a trail guide?

🔒 PRIVATE: Only you can see it (you can make it public later)
🌍 PUBLIC: Share with the community immediately  
❌ SKIP: Keep local only`;

  const choice = await modal.choice(message, '☁️ Cloud Save Options', [
    { label: '🔒 Private', value: 'private' },
    { label: '🌍 Public', value: 'public' },
    { label: '❌ Skip', value: 'skip' }
  ]);
  
  return choice || 'skip';
}

// UPDATED: Generate trail guide with public/private setting
async generateTrailGuide(routeId, routeData, routeInfo, accessibilityData, authController) {
  try {
    console.log('🌐 Generating trail guide HTML...');
    
    // Use the new trail guide generator V2
    const htmlContent = trailGuideGeneratorV2.generateHTML(routeData, routeInfo, accessibilityData);
    const user = authController.getCurrentUser();
    
    console.log('🔍 Saving trail guide for userId:', user?.uid);
    
    // Create trail guide document
    const trailGuideDoc = {
      routeId: routeId,
      routeName: routeInfo.name,
      userId: user.uid,
      userEmail: user.email,
      htmlContent: htmlContent,
      generatedAt: new Date().toISOString(),
      isPublic: routeInfo.makePublic || false, // Use the user's choice
      
      // Add publication info if made public
      ...(routeInfo.makePublic && {
        publishedAt: new Date().toISOString()
      }),
      
      // Enhanced metadata for search and discovery
      metadata: {
        totalDistance: routeInfo.totalDistance || 0,
        elapsedTime: routeInfo.elapsedTime || 0,
        originalDate: routeInfo.date,
        locationCount: routeData.filter(p => p.type === 'location').length,
        photoCount: routeData.filter(p => p.type === 'photo').length,
        noteCount: routeData.filter(p => p.type === 'text').length
      },
      
      // Accessibility features for search
      accessibility: accessibilityData ? {
        wheelchairAccess: accessibilityData.wheelchairAccess || 'Unknown',
        trailSurface: accessibilityData.trailSurface || 'Unknown',
        difficulty: accessibilityData.difficulty || 'Unknown',
        facilities: accessibilityData.facilities || [],
        location: accessibilityData.location || 'Unknown'
      } : null,
      
      // Technical info
      stats: {
        fileSize: new Blob([htmlContent]).size,
        version: '1.0',
        generatedBy: 'Access Nature App'
      },
      
      // Community features
      community: {
        views: 0,
        downloads: 0,
        ratings: [],
        averageRating: 0,
        reviews: []
      }
    };
    
    // Import Firestore and save trail guide
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { db } = await import('../../firebase-setup.js');
    
    const guideRef = await addDoc(collection(db, 'trail_guides'), trailGuideDoc);
    
    const visibilityText = routeInfo.makePublic ? 'public' : 'private';
    console.log(`✅ ${visibilityText} trail guide generated with ID:`, guideRef.id);
    
  } catch (error) {
    console.error('❌ Failed to generate trail guide:', error);
  }
}

// NEW: Save route to cloud (separate method)
async saveRouteToCloud(routeData, routeInfo, accessibilityData, authController) {
  try {
    // Check network connectivity first
    if (!navigator.onLine) {
      throw new Error('No internet connection. Route saved locally and will sync when online.');
    }
    
    console.log('☁️ Saving route to cloud...');
    
    // Import Firestore functions
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { db } = await import('../../firebase-setup.js');
    
    const user = authController.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Prepare route document for Firestore
    const routeDoc = {
      userId: user.uid,
      userEmail: user.email,
      routeName: routeInfo.name,
      createdAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      
      // Route statistics
      totalDistance: routeInfo.totalDistance || 0,
      elapsedTime: routeInfo.elapsedTime || 0,
      originalDate: routeInfo.date,
      
      // Route data
      routeData: routeData,
      
      // Statistics for quick access
      stats: {
        locationPoints: routeData.filter(p => p.type === 'location').length,
        photos: routeData.filter(p => p.type === 'photo').length,
        notes: routeData.filter(p => p.type === 'text').length,
        totalDataPoints: routeData.length
      },
      
      // Accessibility information
      accessibilityData: accessibilityData,
      
      // Technical info
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        appVersion: '1.0'
      }
    };

    // Save route to cloud with timeout
    const savePromise = addDoc(collection(db, 'routes'), routeDoc);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Cloud save timed out')), 30000)
    );
    
    const docRef = await Promise.race([savePromise, timeoutPromise]);
    console.log('✅ Route saved to cloud with ID:', docRef.id);
    
    // Generate trail guide HTML
    await this.generateTrailGuide(docRef.id, routeData, routeInfo, accessibilityData, authController);
    
    this.showSuccessMessage(`✅ "${routeInfo.name}" saved to cloud with trail guide! ☁️`);
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Cloud save failed:', error);
    
    // Check if it's a network-related error
    const isNetworkError = !navigator.onLine || 
      error.message.includes('network') || 
      error.message.includes('timeout') ||
      error.message.includes('Failed to fetch') ||
      error.code === 'unavailable';
    
    if (isNetworkError) {
      toast.warning('Network error - route saved locally. Will sync when online.', { duration: 5000 });
    }
    
    throw error;
  }
}

  discardRoute() {
    this.appState.clearRouteData();
    
    // Reset timer controller and display
    const timerController = window.AccessNatureApp?.controllers?.timer;
    if (timerController) {
      timerController.reset();
    } else {
      // Fallback: reset timer display directly
      const timerEl = document.getElementById('timer');
      if (timerEl) timerEl.textContent = '00:00:00';
    }
    
    // Reset distance display
    const distanceEl = document.getElementById('distance');
    if (distanceEl) distanceEl.textContent = '0.00 km';
    
    this.showSuccessMessage('Route discarded');
    console.log('🗑️ Route data discarded');
  }

  showSuccessMessage(message) {
    // Create and show success notification
    const successDiv = document.createElement('div');
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 25px;
      z-index: 9999;
      font-size: 16px;
      font-weight: 500;
      box-shadow: 0 6px 25px rgba(76, 175, 80, 0.4);
      animation: slideDown 0.4s ease;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translate(-50%, -100%);
          opacity: 0;
        }
        to {
          transform: translate(-50%, 0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(successDiv);
    
    // Remove after 4 seconds
    setTimeout(() => {
      successDiv.style.animation = 'slideDown 0.4s ease reverse';
      setTimeout(() => {
        successDiv.remove();
        style.remove();
      }, 400);
    }, 4000);
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Getters
  isTrackingActive() {
    return this.isTracking;
  }

  isPausedState() {
    return this.isPaused;
  }

  getTrackingStats() {
    return {
      isTracking: this.isTracking,
      isPaused: this.isPaused,
      totalDistance: this.appState.getTotalDistance(),
      elapsedTime: this.appState.getElapsedTime(),
      pointCount: this.appState.getRouteData().length
    };
  }

  cleanup() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.dependencies.timer) {
      this.dependencies.timer.stop();
    }
    
    this.isTracking = false;
    this.isPaused = false;
  }
}