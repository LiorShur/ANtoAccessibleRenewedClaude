import { toast } from '../utils/toast.js';

/**
 * Compass rotation functionality
 * 
 * Mode: "North-Up" - Map acts like a physical compass
 * - North on the map always points to true north in the real world
 * - When you face east, north appears on the LEFT of your screen
 * - When you face south, north appears at the BOTTOM of your screen
 * 
 * Heading convention: 0° = North, 90° = East, 180° = South, 270° = West
 * (Increases clockwise when viewed from above)
 */
export class CompassController {
  constructor() {
    this.isRotationEnabled = false;
    this.currentHeading = 0;
    this.smoothedHeading = 0;
    this.dependencies = {};
    this.orientationHandler = null;
    this.smoothingFactor = 0.15; // Lower = smoother but slower response
    this.lastUpdateTime = 0;
    this.updateInterval = 50; // Minimum ms between updates
    
    // Lock to one event type to prevent jumping
    this.eventType = null; // Will be set to 'absolute' or 'relative'
    
    // Calibration offset - adjust if compass is consistently off
    this.calibrationOffset = 0;
    
    // Debug mode
    this.debug = false;
  }

  setDependencies(deps) {
    this.dependencies = deps;
  }

  initialize() {
    this.setupToggleButton();
    this.checkDeviceSupport();
    console.log('🧭 Compass controller initialized');
  }

  setupToggleButton() {
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleRotation();
      });
    }
  }

  async checkDeviceSupport() {
    if (!window.DeviceOrientationEvent) {
      console.warn('🧭 Device orientation not supported');
      return false;
    }

    // For iOS 13+, request permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('🧭 Permission request failed:', error);
        return false;
      }
    }

    return true;
  }

  async toggleRotation() {
    if (!await this.checkDeviceSupport()) {
      toast.warning('Compass rotation requires device orientation access. Please enable it in browser settings.');
      return;
    }

    if (this.isRotationEnabled) {
      this.disableRotation();
    } else {
      this.enableRotation();
    }
  }

  enableRotation() {
    if (this.isRotationEnabled) return;

    this.orientationHandler = (event) => {
      this.handleOrientationChange(event);
    };

    // Reset event type lock
    this.eventType = null;

    // Try absolute first (preferred - gives true north)
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', this.orientationHandler);
      console.log('🧭 Listening for deviceorientationabsolute');
    }
    
    // Also listen for regular deviceorientation as fallback
    window.addEventListener('deviceorientation', this.orientationHandler);
    console.log('🧭 Listening for deviceorientation');
    
    this.isRotationEnabled = true;
    this.updateToggleButton();
    toast.success('Compass rotation enabled');
    console.log('🧭 Compass rotation enabled');
  }

  disableRotation() {
    if (!this.isRotationEnabled) return;

    if (this.orientationHandler) {
      window.removeEventListener('deviceorientationabsolute', this.orientationHandler);
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }

    this.isRotationEnabled = false;
    this.eventType = null;
    
    // Reset map rotation only - compass needle stays active via tracker UI
    this.resetMapRotation();
    // NOTE: Don't reset compass needle - heading display is always active
    
    this.updateToggleButton();
    toast.show('Map rotation disabled');
    console.log('🧭 Map rotation disabled (compass still active)');
  }

  /**
   * Handle device orientation change
   */
  handleOrientationChange(event) {
    if (!this.isRotationEnabled) return;

    // Lock to first event type we receive to prevent jumping
    const isAbsolute = event.type === 'deviceorientationabsolute' || event.absolute === true;
    const eventType = isAbsolute ? 'absolute' : 'relative';
    
    // Once we get absolute, stick with it (it's more reliable)
    if (this.eventType === null) {
      this.eventType = eventType;
      console.log(`🧭 Locked to ${eventType} orientation`);
    } else if (this.eventType === 'absolute' && eventType === 'relative') {
      // Ignore relative events once we've locked to absolute
      return;
    } else if (this.eventType === 'relative' && eventType === 'absolute') {
      // Upgrade from relative to absolute if it becomes available
      this.eventType = 'absolute';
      console.log('🧭 Upgraded to absolute orientation');
    }

    // Throttle updates for performance
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    let heading = this.calculateHeading(event);
    
    if (heading !== null) {
      // Apply calibration offset
      heading = (heading + this.calibrationOffset + 360) % 360;
      
      // Apply smoothing to reduce jitter
      this.smoothedHeading = this.smoothAngle(this.smoothedHeading, heading, this.smoothingFactor);
      this.currentHeading = this.smoothedHeading;
      this.updateRotations();
    }
  }

  /**
   * Calculate compass heading from device orientation event
   * Returns heading in degrees: 0 = North, 90 = East, 180 = South, 270 = West
   */
  calculateHeading(event) {
    let heading = null;

    // iOS Safari: webkitCompassHeading gives direct compass heading
    // Already follows convention: 0=N, 90=E, 180=S, 270=W, increases clockwise
    if (typeof event.webkitCompassHeading !== 'undefined' && event.webkitCompassHeading !== null) {
      heading = event.webkitCompassHeading;
    }
    // Android/Other: Use alpha value
    else if (event.alpha !== null && event.alpha !== undefined) {
      // Device orientation alpha:
      // - alpha = 0 when device points north
      // - alpha INCREASES counter-clockwise (as per W3C spec)
      // - So: turn RIGHT (clockwise toward east) → alpha DECREASES
      //
      // To convert to compass heading (increases clockwise):
      // heading = (360 - alpha) % 360
      //
      // This gives:
      // - alpha=0 → heading=0 (N)
      // - alpha=270 (turned right/clockwise) → heading=90 (E)
      // - alpha=180 → heading=180 (S)
      // - alpha=90 (turned left/counter-clockwise) → heading=270 (W)
      
      heading = (360 - event.alpha) % 360;
      
      // Adjust for screen orientation if device is in landscape
      heading = this.adjustForScreenOrientation(heading);
    }

    return heading;
  }

  /**
   * Adjust heading based on screen orientation (landscape/portrait)
   */
  adjustForScreenOrientation(heading) {
    const screenOrientation = window.screen?.orientation?.angle || 
                              window.orientation || 
                              0;
    
    // Subtract screen rotation from heading
    heading = (heading - screenOrientation + 360) % 360;
    
    return heading;
  }

  /**
   * Smooth angle transitions to reduce jitter
   * Handles the 0/360 wraparound correctly
   */
  smoothAngle(current, target, factor) {
    // Calculate the shortest angular distance
    let diff = target - current;
    
    // Handle wraparound (e.g., going from 350° to 10°)
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    // Apply smoothing
    let smoothed = current + diff * factor;
    
    // Normalize to 0-360
    return ((smoothed % 360) + 360) % 360;
  }

  updateRotations() {
    this.updateMapRotation();
    this.updateCompassRotation();
  }

  /**
   * Update map rotation - "North-Up" mode
   * Map acts like a physical compass - north always points to true north
   * 
   * When heading = 90 (facing east):
   * - True north is to the LEFT of the user
   * - Map must rotate -90° so north points LEFT on screen
   */
  updateMapRotation() {
    if (!this.dependencies.map || !this.isRotationEnabled) return;

    try {
      // Rotate map OPPOSITE to heading so north stays pointing north
      // heading=0 (facing N) → rotate 0° (north at top)
      // heading=90 (facing E) → rotate -90° (north at left)
      // heading=180 (facing S) → rotate -180° (north at bottom)
      // heading=270 (facing W) → rotate -270° = +90° (north at right)
      this.dependencies.map.setRotation(this.currentHeading);
    } catch (error) {
      console.error('🧭 Failed to update map rotation:', error);
    }
  }

  /**
   * Update compass needle to point toward north on screen
   * The needle visual shows where north IS on the screen
   */
  updateCompassRotation() {
    const needleElement = document.getElementById('compass-needle');
    if (!needleElement) return;

    // Needle points to where north is on screen after map rotation
    // If map rotated -heading, north is at angle -heading from top
    const needleRotation = -this.currentHeading;
    needleElement.style.transform = `rotate(${needleRotation}deg)`;
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('toggleBtn');
    if (!toggleBtn) return;

    if (this.isRotationEnabled) {
      toggleBtn.style.background = '#4CAF50';
      toggleBtn.title = 'Disable Rotation';
      toggleBtn.setAttribute('aria-pressed', 'true');
    } else {
      toggleBtn.style.background = 'rgba(0, 0, 0, 0.8)';
      toggleBtn.title = 'Enable Rotation';
      toggleBtn.setAttribute('aria-pressed', 'false');
    }
  }

  resetMapRotation() {
    if (!this.dependencies.map) return;

    try {
      this.dependencies.map.resetRotation();
    } catch (error) {
      console.error('🧭 Failed to reset map rotation:', error);
    }
  }

  resetCompassRotation() {
    const needleElement = document.getElementById('compass-needle');
    if (!needleElement) return;
    
    needleElement.style.transform = 'rotate(0deg)';
  }

  getCurrentHeading() {
    return this.currentHeading;
  }

  isRotationActive() {
    return this.isRotationEnabled;
  }

  /**
   * Get cardinal direction from heading
   */
  getCardinalDirection() {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(this.currentHeading / 45) % 8;
    return directions[index];
  }

  /**
   * Set calibration offset to correct for compass errors
   * @param {number} offset - Offset in degrees (positive = clockwise)
   */
  setCalibrationOffset(offset) {
    this.calibrationOffset = ((offset % 360) + 360) % 360;
    console.log(`🧭 Calibration offset set to ${this.calibrationOffset}°`);
  }

  /**
   * Adjust calibration by adding degrees
   */
  adjustCalibration(degrees) {
    this.calibrationOffset = ((this.calibrationOffset + degrees) % 360 + 360) % 360;
    console.log(`🧭 Calibration adjusted to ${this.calibrationOffset}°`);
  }

  /**
   * Auto-calibrate by setting current direction as north
   */
  calibrateToNorth() {
    // What offset would make current heading = 0?
    // If current shows 90 but should be 0, offset should be -90 (or +270)
    const currentRaw = (this.currentHeading - this.calibrationOffset + 360) % 360;
    this.calibrationOffset = (360 - currentRaw) % 360;
    console.log(`🧭 Calibrated to north. Offset: ${this.calibrationOffset}°`);
    toast.success(`Compass calibrated! Offset: ${this.calibrationOffset.toFixed(0)}°`);
  }

  /**
   * Get current event type being used
   */
  getEventType() {
    return this.eventType || 'none';
  }

  cleanup() {
    this.disableRotation();
    console.log('🧭 Compass controller cleaned up');
  }
}
