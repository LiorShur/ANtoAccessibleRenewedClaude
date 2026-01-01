/**
 * Heading Indicator Component
 * Gaia GPS-style sliding scale showing compass heading
 * 
 * Features:
 * - Sliding scale with tick marks every 10°
 * - Cardinal directions highlighted (N, E, S, W)
 * - Green center marker showing current heading
 * - Smooth animation on heading changes
 * 
 * @file src/ui/headingIndicator.js
 * @version 1.0
 */

export class HeadingIndicator {
  constructor(options = {}) {
    this.container = null;
    this.scaleElement = null;
    this.valueElement = null;
    this.currentHeading = 0;
    this.targetHeading = 0;
    this.animationFrame = null;
    this.isVisible = true;
    
    // Configuration
    this.options = {
      width: options.width || 200,
      tickSpacing: options.tickSpacing || 10,  // Degrees between ticks
      majorTickInterval: options.majorTickInterval || 30,  // Major tick every N degrees
      cardinalInterval: options.cardinalInterval || 90,  // Cardinal every N degrees
      smoothing: options.smoothing || 0.15,
      showValue: options.showValue !== false,
      ...options
    };
    
    // Cardinal direction labels
    this.cardinals = {
      0: 'N',
      90: 'E',
      180: 'S',
      270: 'W'
    };
  }

  /**
   * Create and mount the heading indicator
   * @param {string|HTMLElement} target - Container element or selector
   */
  mount(target) {
    const container = typeof target === 'string' 
      ? document.querySelector(target) 
      : target;
    
    if (!container) {
      console.error('[HeadingIndicator] Container not found:', target);
      return null;
    }

    this.container = container;
    this.render();
    return this;
  }

  /**
   * Render the heading indicator
   */
  render() {
    // Create main container
    const indicator = document.createElement('div');
    indicator.className = 'tracker-heading';
    indicator.setAttribute('role', 'img');
    indicator.setAttribute('aria-label', 'Compass heading indicator');
    indicator.style.width = `${this.options.width}px`;

    // Create scale container
    const scale = document.createElement('div');
    scale.className = 'tracker-heading-scale';
    
    // Generate tick marks for 0-360 degrees (plus buffer for wrapping)
    // We create ticks from -360 to 720 to allow smooth wrapping
    for (let deg = -360; deg <= 720; deg += this.options.tickSpacing) {
      const normalizedDeg = ((deg % 360) + 360) % 360;
      const tick = this.createTick(normalizedDeg);
      tick.style.transform = `translateX(${(deg / this.options.tickSpacing) * 40}px)`;
      scale.appendChild(tick);
    }

    this.scaleElement = scale;
    indicator.appendChild(scale);

    // Create current value display
    if (this.options.showValue) {
      const value = document.createElement('div');
      value.className = 'tracker-heading-value';
      value.setAttribute('aria-live', 'polite');
      value.textContent = '0°';
      this.valueElement = value;
      indicator.appendChild(value);
    }

    // Clear and append
    this.container.innerHTML = '';
    this.container.appendChild(indicator);

    // Initial position
    this.updateDisplay(this.currentHeading);
  }

  /**
   * Create a tick mark element
   * @param {number} degrees - The degree value for this tick
   */
  createTick(degrees) {
    const tick = document.createElement('div');
    tick.className = 'tracker-heading-tick';
    
    // Check if this is a cardinal direction
    const isCardinal = this.cardinals[degrees] !== undefined;
    const isMajor = degrees % this.options.majorTickInterval === 0;
    
    if (isCardinal) {
      tick.classList.add('cardinal');
    } else if (isMajor) {
      tick.classList.add('major');
    }

    // Create tick line
    const line = document.createElement('div');
    line.className = 'line';
    tick.appendChild(line);

    // Create label for major ticks
    if (isMajor || isCardinal) {
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = isCardinal ? this.cardinals[degrees] : degrees.toString();
      tick.appendChild(label);
    }

    return tick;
  }

  /**
   * Update the heading
   * @param {number} heading - New heading in degrees (0-360)
   * @param {boolean} animate - Whether to animate the transition
   */
  setHeading(heading, animate = true) {
    // Normalize to 0-360
    this.targetHeading = ((heading % 360) + 360) % 360;
    
    if (animate) {
      this.animateToHeading();
    } else {
      this.currentHeading = this.targetHeading;
      this.updateDisplay(this.currentHeading);
    }
  }

  /**
   * Animate heading changes smoothly
   */
  animateToHeading() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const animate = () => {
      // Calculate shortest rotation direction
      let diff = this.targetHeading - this.currentHeading;
      
      // Handle wraparound (e.g., 350° to 10° should go +20°, not -340°)
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      // Apply smoothing
      this.currentHeading += diff * this.options.smoothing;
      
      // Normalize
      this.currentHeading = ((this.currentHeading % 360) + 360) % 360;

      this.updateDisplay(this.currentHeading);

      // Continue animation if not close enough
      if (Math.abs(diff) > 0.1) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Update the visual display
   * @param {number} heading - Current heading to display
   */
  updateDisplay(heading) {
    if (!this.scaleElement) return;

    // Calculate position: center the current heading under the marker
    // Each tick is 40px apart, and tickSpacing degrees apart
    const pxPerDegree = 40 / this.options.tickSpacing;
    const offset = heading * pxPerDegree;
    
    // Offset by half width to center, and account for the 0-degree position
    this.scaleElement.style.transform = `translateX(calc(-50% - ${offset}px))`;

    // Update value display
    if (this.valueElement) {
      this.valueElement.textContent = `${Math.round(heading)}°`;
      this.valueElement.setAttribute('aria-label', `Heading ${Math.round(heading)} degrees`);
    }
  }

  /**
   * Get the current heading
   * @returns {number} Current heading in degrees
   */
  getCurrentHeading() {
    return this.currentHeading;
  }

  /**
   * Get cardinal direction from heading
   * @returns {string} Cardinal direction (N, NE, E, etc.)
   */
  getCardinalDirection() {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(this.currentHeading / 45) % 8;
    return directions[index];
  }

  /**
   * Show the indicator
   */
  show() {
    if (this.container) {
      this.container.style.display = '';
      this.isVisible = true;
    }
  }

  /**
   * Hide the indicator
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.scaleElement = null;
    this.valueElement = null;
    this.container = null;
  }
}

// Export singleton factory
export function createHeadingIndicator(options) {
  return new HeadingIndicator(options);
}

export default HeadingIndicator;
