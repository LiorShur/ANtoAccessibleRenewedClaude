import { toast } from '../utils/toast.js';
import { userService } from '../services/userService.js';
// Enhanced accessibility form functionality with comprehensive survey
export class AccessibilityForm {
  constructor() {
    this.isOpen = false;
    this.currentCallback = null;
    this.formData = {};
  }

  initialize() {
    this.loadFormHTML();
    this.setupEventListeners();
    this.finalMobileFix();    
  }

  finalMobileFix() {
  const container = document.getElementById('accessibilityFormContainer');
  if (!container) return;
  
  const availableWidth = container.clientWidth - 20;
  
  const elements = container.querySelectorAll(`
    .container, .header, h1, p, form, .section, .section-header, 
    .section-content, .submit-section, button, .btn-secondary, .submit-btn
  `);
  
  elements.forEach(el => {
    el.style.setProperty('max-width', availableWidth + 'px', 'important');
    el.style.setProperty('width', '100%', 'important');
    el.style.setProperty('box-sizing', 'border-box', 'important');
    el.style.setProperty('padding-left', '5px', 'important');
    el.style.setProperty('padding-right', '5px', 'important');
    el.style.setProperty('margin-left', '0', 'important');
    el.style.setProperty('margin-right', '0', 'important');
    
    if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'P') {
      el.style.setProperty('white-space', 'normal', 'important');
      el.style.setProperty('word-wrap', 'break-word', 'important');
      el.style.setProperty('overflow-wrap', 'break-word', 'important');
      el.style.setProperty('hyphens', 'auto', 'important');
    }
  });
}

  loadFormHTML() {
    const container = document.getElementById('accessibilityFormContainer');
    if (!container) {
      console.error('Accessibility form container not found');
      return;
    }

    container.innerHTML = `
      <div class="container">
        <div class="header">
          <h1>🌲 Comprehensive Trail Accessibility Survey</h1>
          <p>Help create detailed accessibility information for outdoor spaces</p>
        </div>

        <form class="form-container accessibility-form" id="accessibilityForm">
          <button type="button" class="btn-secondary" onclick="closeAccessibilityForm()">✖ Close</button>
          
          <!-- Basic Trail Information -->
          <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
              <h2>🗺️ Basic Trail Information</h2>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content active">
              <div class="form-row">
                <div class="form-group">
                  <label for="trailName">Trail Name (Required) <span class="required">*</span></label>
                  <input type="text" id="trailName" name="trailName" required>
                </div>
                <div class="form-group">
                  <label for="location">Location/Address (Required) <span class="required">*</span></label>
                  <input type="text" id="location" name="location" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="trailLength">Trail Length (km)</label>
                  <input type="number" id="trailLength" name="trailLength" step="0.1" min="0">
                </div>
                <div class="form-group">
                  <label for="estimatedTime">Estimated Duration</label>
                  <select id="estimatedTime" name="estimatedTime">
                    <option value="">Select duration</option>
                    <option value="Under 30 minutes">Under 30 minutes</option>
                    <option value="30-60 minutes">30-60 minutes</option>
                    <option value="1-2 hours">1-2 hours</option>
                    <option value="2-4 hours">2-4 hours</option>
                    <option value="Half day">Half day</option>
                    <option value="Full day">Full day</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Trip Type</label>
                  <div class="radio-group">
                    <div class="radio-item">
                      <input type="radio" id="tripBeach" name="tripType" value="Beach Promenade">
                      <label for="tripBeach">Beach Promenade</label>
                    </div>
                    <div class="radio-item">
                      <input type="radio" id="tripStream" name="tripType" value="Stream Path">
                      <label for="tripStream">Stream Path</label>
                    </div>
                    <div class="radio-item">
                      <input type="radio" id="tripPark" name="tripType" value="Park Route">
                      <label for="tripPark">Park Route</label>
                    </div>
                    <div class="radio-item">
                      <input type="radio" id="tripForest" name="tripType" value="Forest Trail">
                      <label for="tripForest">Forest Trail</label>
                    </div>
                    <div class="radio-item">
                      <input type="radio" id="tripUrban" name="tripType" value="Urban Route">
                      <label for="tripUrban">Urban Route</label>
                    </div>
                    <div class="radio-item">
                      <input type="radio" id="tripScenic" name="tripType" value="Scenic Drive">
                      <label for="tripScenic">Scenic Drive</label>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label>Route Type</label>
                  <div class="radio-group">
                    <div class="radio-item">
                      <input type="radio" id="routeCircular" name="routeType" value="Circular">
                      <label for="routeCircular">Circular</label>
                    </div>
                    <div class="radio-item">
                      <input type="radio" id="routeRoundTrip" name="routeType" value="Round Trip">
                      <label for="routeRoundTrip">Round Trip</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobility Accessibility -->
          <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
              <h2>♿ Mobility Accessibility</h2>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content">
              <div class="form-group">
                <label>Wheelchair Accessibility Level</label>
                <div class="radio-group">
                  <div class="radio-item">
                    <input type="radio" id="wheelchairFull" name="wheelchairAccess" value="Fully accessible">
                    <label for="wheelchairFull">Fully accessible</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="wheelchairPartial" name="wheelchairAccess" value="Partially accessible">
                    <label for="wheelchairPartial">Partially accessible</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="wheelchairAssist" name="wheelchairAccess" value="Accessible with assistance">
                    <label for="wheelchairAssist">Accessible with assistance</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="wheelchairNot" name="wheelchairAccess" value="Not accessible">
                    <label for="wheelchairNot">Not accessible</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Disabled Parking</label>
                <div class="form-row">
                  <div class="form-group">
                    <label>
                      <input type="checkbox" name="disabledParking" value="Available"> Disabled parking available
                    </label>
                  </div>
                  <div class="form-group">
                    <label for="parkingSpaces">Number of spaces</label>
                    <input type="number" id="parkingSpaces" name="parkingSpaces" min="0">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Trail Surface & Quality -->
          <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
              <h2>🛤️ Trail Surface & Quality</h2>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content">
              <div class="form-group">
                <label>Trail Surface Types (select all that apply)</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="surfaceAsphalt" name="trailSurface" value="Asphalt">
                    <label for="surfaceAsphalt">Asphalt</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="surfaceConcrete" name="trailSurface" value="Concrete">
                    <label for="surfaceConcrete">Concrete</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="surfaceStone" name="trailSurface" value="Stone">
                    <label for="surfaceStone">Stone</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="surfaceWood" name="trailSurface" value="Wood/Plastic Deck">
                    <label for="surfaceWood">Wood/Plastic Deck</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="surfaceGravel" name="trailSurface" value="Compacted Gravel">
                    <label for="surfaceGravel">Compacted Gravel</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="surfaceMixed" name="trailSurface" value="Mixed Surfaces">
                    <label for="surfaceMixed">Mixed Surfaces</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="surfaceGrass" name="trailSurface" value="Grass">
                    <label for="surfaceGrass">Grass</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Surface Quality</label>
                <div class="radio-group">
                  <div class="radio-item">
                    <input type="radio" id="qualityExcellent" name="surfaceQuality" value="Excellent - smooth and well maintained">
                    <label for="qualityExcellent">Excellent - smooth and well maintained</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="qualityFair" name="surfaceQuality" value="Fair - minor disruptions, rough patches, bumps, cracks">
                    <label for="qualityFair">Fair - minor disruptions, rough patches, bumps, cracks</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="qualityPoor" name="surfaceQuality" value="Poor - serious disruptions, protruding stones, large grooves">
                    <label for="qualityPoor">Poor - serious disruptions, protruding stones, large grooves</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="qualityBlocked" name="surfaceQuality" value="Vegetation blocks passage">
                    <label for="qualityBlocked">Vegetation blocks passage</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Trail Slopes</label>
                <div class="radio-group">
                  <div class="radio-item">
                    <input type="radio" id="slopeNone" name="trailSlopes" value="No slopes to mild slopes (up to 5%)">
                    <label for="slopeNone">No slopes to mild slopes (up to 5%)</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="slopeModerate" name="trailSlopes" value="Moderate slopes - assistance recommended (5%-10%)">
                    <label for="slopeModerate">Moderate slopes - assistance recommended (5%-10%)</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="slopeSteep" name="trailSlopes" value="Steep slopes - not accessible (over 10%)">
                    <label for="slopeSteep">Steep slopes - not accessible (over 10%)</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Visual & Environmental Features -->
          <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
              <h2>👁️ Visual & Environmental Features</h2>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content">
              <div class="form-group">
                <label>Visual Impairment Adaptations (select all that apply)</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="visualRaised" name="visualAdaptations" value="Raised/protruding borders">
                    <label for="visualRaised">Raised/protruding borders</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="visualTexture" name="visualAdaptations" value="Texture/tactile differences">
                    <label for="visualTexture">Texture/tactile differences</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="visualColor" name="visualAdaptations" value="Color contrast differences">
                    <label for="visualColor">Color contrast differences</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Shade Coverage on Trail</label>
                <div class="radio-group">
                  <div class="radio-item">
                    <input type="radio" id="shadePlenty" name="shadeCoverage" value="Plenty of shade">
                    <label for="shadePlenty">Plenty of shade</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="shadeIntermittent" name="shadeCoverage" value="Intermittent shade">
                    <label for="shadeIntermittent">Intermittent shade</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="shadeNone" name="shadeCoverage" value="No shade">
                    <label for="shadeNone">No shade</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>
                  <input type="checkbox" name="lighting" value="Trail is lit in darkness"> Trail is lit in darkness
                </label>
              </div>
            </div>
          </div>

          <!-- Facilities & Amenities -->
          <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
              <h2>🚰 Facilities & Amenities</h2>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content">
              <div class="form-group">
                <label>Accessible Water Fountains</label>
                <div class="radio-group">
                  <div class="radio-item">
                    <input type="radio" id="fountainNone" name="waterFountains" value="None">
                    <label for="fountainNone">None</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="fountainOne" name="waterFountains" value="One accessible fountain">
                    <label for="fountainOne">One accessible fountain</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="fountainMultiple" name="waterFountains" value="Multiple fountains along route">
                    <label for="fountainMultiple">Multiple fountains along route</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Accessible Seating</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="benchNone" name="seating" value="No accessible benches">
                    <label for="benchNone">No accessible benches</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="benchOne" name="seating" value="One accessible bench">
                    <label for="benchOne">One accessible bench</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="benchMultiple" name="seating" value="Multiple benches along route">
                    <label for="benchMultiple">Multiple benches along route</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="benchNoRails" name="seating" value="Benches without handrails">
                    <label for="benchNoRails">Benches without handrails</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Accessible Picnic Areas</label>
                <div class="form-row">
                  <div class="form-group">
                    <label>
                      <input type="checkbox" name="picnicAreas" value="Available"> Accessible picnic areas available
                    </label>
                  </div>
                  <div class="form-group">
                    <label for="picnicCount">Number of areas</label>
                    <input type="number" id="picnicCount" name="picnicCount" min="0">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="picnicShade">Areas in shade</label>
                    <input type="number" id="picnicShade" name="picnicShade" min="0">
                  </div>
                  <div class="form-group">
                    <label for="picnicSun">Areas in sun</label>
                    <input type="number" id="picnicSun" name="picnicSun" min="0">
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>
                  <input type="checkbox" name="accessibleViewpoint" value="Available"> Accessible viewpoint available
                </label>
              </div>

              <div class="form-group">
                <label>Accessible Restrooms</label>
                <div class="radio-group">
                  <div class="radio-item">
                    <input type="radio" id="restroomNone" name="restrooms" value="None">
                    <label for="restroomNone">None</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="restroomUnisex" name="restrooms" value="One unisex accessible restroom">
                    <label for="restroomUnisex">One unisex accessible restroom</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="restroomSeparate" name="restrooms" value="Separate accessible restrooms for men and women">
                    <label for="restroomSeparate">Separate accessible restrooms for men and women</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Signage & Navigation -->
          <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
              <h2>🗺️ Signage & Navigation</h2>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content">
              <div class="form-group">
                <label>Available Signage (select all that apply)</label>
                <div class="checkbox-group">
                  <div class="checkbox-item">
                    <input type="checkbox" id="signageMap" name="signage" value="Route map available">
                    <label for="signageMap">Route map available</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="signageDirectional" name="signage" value="Clear directional signage">
                    <label for="signageDirectional">Clear directional signage</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="signageSimple" name="signage" value="Simple language signage">
                    <label for="signageSimple">Simple language signage</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="signageAccessible" name="signage" value="Large, high-contrast accessible signage">
                    <label for="signageAccessible">Large, high-contrast accessible signage</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="signageAudio" name="signage" value="Audio explanation compatible with T-mode hearing devices">
                    <label for="signageAudio">Audio explanation compatible with T-mode hearing devices</label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>
                  <input type="checkbox" name="qrCode" value="Available"> QR code with site information available
                </label>
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
              <h2>📝 Additional Information</h2>
              <span class="toggle-icon">▼</span>
            </div>
            <div class="section-content">
              <div class="form-group">
                <label for="additionalNotes">Additional accessibility notes</label>
                <textarea id="additionalNotes" name="additionalNotes" placeholder="Please provide additional details about accessibility features, challenges, or recommendations..."></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="surveyorName">Surveyor Name (Optional)</label>
                  <input type="text" id="surveyorName" name="surveyorName">
                </div>
                <div class="form-group">
                  <label for="surveyDate">Survey Date</label>
                  <input type="date" id="surveyDate" name="surveyDate">
                </div>
              </div>

              <div class="form-group">
                <label>Overall Accessibility Summary</label>
                <div class="radio-group">
                  <div class="radio-item">
                    <input type="radio" id="summaryAccessible" name="accessibilitySummary" value="Accessible">
                    <label for="summaryAccessible">Accessible</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="summaryPartial" name="accessibilitySummary" value="Partially accessible">
                    <label for="summaryPartial">Partially accessible</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="summaryAssistance" name="accessibilitySummary" value="Accessible with assistance">
                    <label for="summaryAssistance">Accessible with assistance</label>
                  </div>
                  <div class="radio-item">
                    <input type="radio" id="summaryNotAccessible" name="accessibilitySummary" value="Not accessible">
                    <label for="summaryNotAccessible">Not accessible</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="submit-section">
            <button type="submit" class="submit-btn">✅ Save Comprehensive Survey</button>
            <button type="button" class="btn-secondary" onclick="closeAccessibilityForm()">❌ Cancel</button>
            <p style="color: white; margin-top: 15px; opacity: 0.9;">Thank you for contributing detailed accessibility information!</p>
          </div>
        </form>
      </div>
    `;
  }

  // ... rest of the methods remain the same ...
  setupEventListeners() {
    const overlay = document.getElementById('accessibilityOverlay');
    if (!overlay) return;

    const form = overlay.querySelector('#accessibilityForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        this.handleFormSubmit(e);
      });

      // Auto-fill survey date
      const surveyDateField = form.querySelector('#surveyDate');
      if (surveyDateField && !surveyDateField.value) {
        surveyDateField.value = new Date().toISOString().split('T')[0];
      }
    }

    // Make toggle function global
    window.toggleSection = this.toggleSection;
  }

  async handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {};

    // Handle checkboxes specially
    const checkboxes = event.target.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const name = checkbox.name;
      if (checkbox.checked) {
        if (!data[name]) data[name] = [];
        data[name].push(checkbox.value);
      }
    });

    // Handle other inputs
    for (const [key, value] of formData.entries()) {
      if (!data[key]) {
        data[key] = value;
      }
    }

    // Validate required fields
    const requiredFields = ['trailName', 'location'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      toast.warning('Please fill in required fields: ' + missingFields.join(', '));
      return;
    }

    // Store form data
    this.formData = data;
    localStorage.setItem("accessibilityData", JSON.stringify(data));
    
    console.log('Comprehensive accessibility survey data:', data);
    toast.success('Survey saved! Thank you for your detailed contribution.');

    // Track survey completion for engagement
    if (userService.isInitialized) {
      try {
        await userService.trackSurveyCompleted();
        console.log('📊 Survey completion tracked');
      } catch (error) {
        console.warn('⚠️ Failed to track survey:', error.message);
      }
    }

    if (this.currentCallback) {
      const callback = this.currentCallback;
      this.currentCallback = null;
      callback(data);
    }

    this.close();
  }

  toggleSection(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.toggle-icon');
    
    if (content.classList.contains('active')) {
      content.classList.remove('active');
      content.style.display = 'none';
      icon.classList.remove('rotated');
    } else {
      content.classList.add('active');
      content.style.display = 'block';
      icon.classList.add('rotated');
    }
  }

  open(callback) {
    if (this.isOpen) return;

    this.currentCallback = callback;
    this.isOpen = true;

    const overlay = document.getElementById('accessibilityOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }

    this.prefillForm();
    setTimeout(() => this.finalMobileFix(), 100);
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.currentCallback = null;

    const overlay = document.getElementById('accessibilityOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  prefillForm() {
    try {
      const savedData = localStorage.getItem('accessibilityData');
      if (!savedData) return;

      const data = JSON.parse(savedData);
      const form = document.getElementById('accessibilityForm');
      if (!form) return;

      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Handle checkbox arrays
          value.forEach(val => {
            const checkbox = form.querySelector(`input[name="${key}"][value="${val}"]`);
            if (checkbox) checkbox.checked = true;
          });
        } else {
          const field = form.elements[key];
          if (field) {
            if (field.type === 'radio') {
              const radio = form.querySelector(`input[name="${key}"][value="${value}"]`);
              if (radio) radio.checked = true;
            } else if (field.type === 'checkbox') {
              field.checked = true;
            } else {
              field.value = value;
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to prefill form:', error);
    }
  }

  getFormData() {
    return { ...this.formData };
  }
}