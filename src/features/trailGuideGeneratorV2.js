/**
 * Trail Guide Generator V2 - Visual-First Design
 * 
 * Features:
 * - Prominent accessibility rating banner
 * - At-a-glance stats with icons
 * - "Good For" badges
 * - Visual progress bars for trail conditions
 * - Integrated timeline with photos and notes
 * - Facilities icon grid
 * - "Heads Up" warnings section
 * 
 * Access Nature - Phase 2 Redesign
 * Created: December 2025
 */

export class TrailGuideGeneratorV2 {
  
  /**
   * Generate the enhanced trail guide HTML
   * @param {Array} routeData - Array of route points (locations, photos, notes)
   * @param {Object} routeInfo - Route metadata (name, distance, time, date)
   * @param {Object} accessibilityData - Accessibility survey data
   * @returns {string} Complete HTML document
   */
  generateHTML(routeData, routeInfo, accessibilityData) {
    // Debug logging
    console.log('🗺️ TrailGuideV2 - Generating HTML with:');
    console.log('  - routeData points:', routeData?.length || 0);
    console.log('  - photos:', routeData?.filter(p => p.type === 'photo').length || 0);
    console.log('  - notes:', routeData?.filter(p => p.type === 'text').length || 0);
    console.log('  - accessibilityData:', accessibilityData);
    
    const locationPoints = routeData.filter(p => p.type === 'location' && p.coords);
    const photos = routeData.filter(p => p.type === 'photo');
    const notes = routeData.filter(p => p.type === 'text');
    
    console.log('  - Filtered photos:', photos);
    console.log('  - Filtered notes:', notes);
    
    const date = new Date(routeInfo.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Determine accessibility level
    const accessLevel = this.getAccessibilityLevel(accessibilityData);
    
    // Build timeline items
    const timelineItems = this.buildTimeline(routeData, routeInfo);
    
    // Calculate route bounds for map
    let bounds = null;
    if (locationPoints.length > 0) {
      const lats = locationPoints.map(p => p.coords.lat);
      const lngs = locationPoints.map(p => p.coords.lng);
      bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
      };
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${routeInfo.name} - Accessible Trail Guide</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="tg-container" id="trailGuideContent">
        <!-- Header -->
        <header class="tg-header">
            <div class="tg-header-content">
                <span class="tg-badge">🌲 Access Nature Trail Guide</span>
                <h1 class="tg-title">${routeInfo.name}</h1>
                <p class="tg-location">${accessibilityData?.location || 'Location not specified'}</p>
                <p class="tg-date">Documented on ${formattedDate}</p>
            </div>
        </header>

        <!-- Accessibility Banner -->
        <div class="tg-access-banner ${accessLevel.class}">
            <div class="tg-access-icon">${accessLevel.icon}</div>
            <div class="tg-access-info">
                <div class="tg-access-level">${accessLevel.label}</div>
                <div class="tg-access-desc">${accessLevel.description}</div>
            </div>
        </div>

        <!-- Action Bar -->
        <div class="tg-action-bar" id="actionBar">
            ${locationPoints.length > 0 ? `
            <div class="tg-action-dropdown">
                <button class="tg-action-btn tg-action-navigate" onclick="toggleNavDropdown(event)">
                    🧭 Navigate to Start
                </button>
                <div id="navDropdown" class="tg-dropdown-content">
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${locationPoints[0].coords.lat},${locationPoints[0].coords.lng}&travelmode=driving" target="_blank" rel="noopener" onclick="closeNavDropdown()">
                        📍 Google Maps
                    </a>
                    <a href="https://waze.com/ul?ll=${locationPoints[0].coords.lat},${locationPoints[0].coords.lng}&navigate=yes" target="_blank" rel="noopener" onclick="closeNavDropdown()">
                        🚗 Waze
                    </a>
                </div>
            </div>
            ` : ''}
            <button class="tg-action-btn tg-action-pdf" id="pdfBtn" onclick="downloadPDF()">
                📥 Download PDF
            </button>
            <button class="tg-action-btn tg-action-details" onclick="closeNavDropdown(); document.getElementById('surveyDetails').classList.toggle('show')">
                📋 Full Survey Details
            </button>
        </div>
        
        <!-- PDF Loading Overlay -->
        <div id="pdfLoadingOverlay" class="tg-pdf-overlay" style="display: none;">
            <div class="tg-pdf-loading">
                <div class="tg-pdf-spinner"></div>
                <p>Generating PDF...</p>
                <p class="tg-pdf-hint">This may take a few seconds</p>
            </div>
        </div>

        <!-- Hidden Survey Details Panel -->
        <div id="surveyDetails" class="tg-survey-panel">
            <h3>📋 Complete Accessibility Survey</h3>
            ${this.renderFullSurveyDetails(accessibilityData)}
        </div>

        <!-- Quick Stats -->
        <div class="tg-stats-row">
            <div class="tg-stat">
                <span class="tg-stat-value">${(routeInfo.totalDistance || 0).toFixed(1)}</span>
                <span class="tg-stat-label">km</span>
            </div>
            <div class="tg-stat">
                <span class="tg-stat-value">${this.formatDuration(routeInfo.elapsedTime || 0)}</span>
                <span class="tg-stat-label">duration</span>
            </div>
            <div class="tg-stat">
                <span class="tg-stat-value">${this.getDifficultyEmoji(accessibilityData)}</span>
                <span class="tg-stat-label">${this.getDifficultyLabel(accessibilityData)}</span>
            </div>
            <div class="tg-stat">
                <span class="tg-stat-value">${this.getSurfaceIcon(accessibilityData)}</span>
                <span class="tg-stat-label">${this.getSurfaceLabel(accessibilityData)}</span>
            </div>
        </div>

        <!-- Good For Section -->
        ${this.renderGoodForSection(accessibilityData)}

        <!-- Trail Conditions -->
        ${this.renderConditionsSection(accessibilityData)}

        <!-- Facilities -->
        ${this.renderFacilitiesSection(accessibilityData)}

        <!-- Map Section -->
        ${locationPoints.length > 0 ? `
        <section class="tg-section">
            <h2 class="tg-section-title">🗺️ Route Map</h2>
            <div class="tg-map-container">
                <div id="map"></div>
            </div>
            <p class="tg-map-hint">Click markers for details</p>
            <div class="tg-map-legend">
                <div class="tg-legend-item"><div class="tg-legend-dot start"></div> Start</div>
                <div class="tg-legend-item"><div class="tg-legend-dot end"></div> End</div>
                <div class="tg-legend-item"><div class="tg-legend-dot photo"></div> Photo</div>
                <div class="tg-legend-item"><div class="tg-legend-dot note"></div> Note</div>
            </div>
        </section>
        ` : ''}

        <!-- Timeline Section -->
        ${timelineItems.length > 0 ? `
        <section class="tg-section">
            <h2 class="tg-section-title">📍 Trail Timeline</h2>
            <div class="tg-timeline">
                ${timelineItems.map(item => this.renderTimelineItem(item)).join('')}
            </div>
        </section>
        ` : ''}

        <!-- Heads Up Section -->
        ${this.renderHeadsUpSection(accessibilityData, notes)}

        <!-- Footer -->
        <footer class="tg-footer">
            <p>Created with 🌲 Access Nature</p>
            <p>Making outdoor spaces accessible for everyone</p>
        </footer>
    </div>

    <!-- Map Script -->
    ${locationPoints.length > 0 ? this.getMapScript(locationPoints, bounds, photos, notes) : ''}
    
    <!-- PDF Download Script -->
    <script>
        // Navigation dropdown handlers
        function toggleNavDropdown(event) {
            event.stopPropagation();
            const dropdown = document.getElementById('navDropdown');
            dropdown.classList.toggle('show');
        }
        
        function closeNavDropdown() {
            const dropdown = document.getElementById('navDropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('navDropdown');
            const navBtn = document.querySelector('.tg-action-navigate');
            if (dropdown && !dropdown.contains(event.target) && !navBtn?.contains(event.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // PDF Download with loading overlay
        function downloadPDF() {
            // Show loading overlay
            const overlay = document.getElementById('pdfLoadingOverlay');
            const btn = document.getElementById('pdfBtn');
            
            if (overlay) overlay.style.display = 'flex';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ Generating...';
            }
            
            // Close any open dropdowns
            closeNavDropdown();
            
            // Hide action bar and show survey details for PDF
            const actionBar = document.getElementById('actionBar');
            const surveyPanel = document.getElementById('surveyDetails');
            if (actionBar) actionBar.style.display = 'none';
            if (surveyPanel) surveyPanel.classList.add('show');
            
            const element = document.getElementById('trailGuideContent');
            const filename = '${routeInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_trail_guide.pdf';
            
            const opt = {
                margin: [10, 10, 10, 10],
                filename: filename,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    scrollY: 0
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait' 
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                // Restore UI
                if (actionBar) actionBar.style.display = 'flex';
                if (surveyPanel) surveyPanel.classList.remove('show');
                if (overlay) overlay.style.display = 'none';
                if (btn) {
                    btn.innerHTML = '📥 Download PDF';
                    btn.disabled = false;
                }
            }).catch(err => {
                console.error('PDF generation failed:', err);
                if (actionBar) actionBar.style.display = 'flex';
                if (surveyPanel) surveyPanel.classList.remove('show');
                if (overlay) overlay.style.display = 'none';
                if (btn) {
                    btn.innerHTML = '📥 Download PDF';
                    btn.disabled = false;
                }
                alert('PDF generation failed. Please try again or use Print to PDF.');
            });
        }
    </script>
</body>
</html>`;
  }

  getAccessibilityLevel(data) {
    const wheelchair = data?.wheelchairAccess || '';
    const summary = data?.accessibilitySummary || '';
    
    // Check wheelchair access first, then summary
    const checkValue = wheelchair || summary;
    
    if (checkValue.toLowerCase().includes('fully') || checkValue.toLowerCase() === 'accessible') {
      return {
        class: 'fully',
        icon: '♿',
        label: 'FULLY ACCESSIBLE',
        description: 'Suitable for wheelchairs, strollers, and mobility aids'
      };
    } else if (checkValue.toLowerCase().includes('partial') || checkValue.toLowerCase().includes('assistance')) {
      return {
        class: 'partial',
        icon: '⚠️',
        label: 'PARTIALLY ACCESSIBLE',
        description: 'Some sections may require assistance or have barriers'
      };
    } else if (checkValue.toLowerCase().includes('not')) {
      return {
        class: 'not',
        icon: '🚫',
        label: 'LIMITED ACCESSIBILITY',
        description: 'Significant barriers present - check details below'
      };
    }
    
    return {
      class: 'unknown',
      icon: '❓',
      label: 'ACCESSIBILITY NOT ASSESSED',
      description: 'No accessibility information available for this trail'
    };
  }

  formatDuration(timeValue) {
    if (!timeValue) return '--';
    
    // Detect if value is in milliseconds (> 100000 means likely ms, not seconds)
    // A route longer than ~28 hours in seconds would be 100000, which is very rare
    // But 100000ms is only ~1.6 minutes, so we can safely assume large values are ms
    let seconds;
    if (timeValue > 86400) {
      // Likely milliseconds - convert to seconds
      seconds = Math.floor(timeValue / 1000);
    } else {
      seconds = Math.floor(timeValue);
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getDifficultyEmoji(data) {
    const slopes = data?.trailSlopes || '';
    const quality = data?.surfaceQuality || '';
    
    if (slopes.includes('Steep') || quality.includes('Poor')) return '😰';
    if (slopes.includes('Moderate') || quality.includes('Fair')) return '😐';
    return '😊';
  }

  getDifficultyLabel(data) {
    const slopes = data?.trailSlopes || '';
    const quality = data?.surfaceQuality || '';
    
    if (slopes.includes('Steep') || quality.includes('Poor')) return 'Challenging';
    if (slopes.includes('Moderate') || quality.includes('Fair')) return 'Moderate';
    return 'Easy';
  }

  getSurfaceIcon(data) {
    const surfaces = data?.trailSurface || '';
    const surfaceStr = Array.isArray(surfaces) ? surfaces.join(' ') : surfaces;
    
    if (surfaceStr.includes('Asphalt') || surfaceStr.includes('Concrete')) return '🛣️';
    if (surfaceStr.includes('Wood') || surfaceStr.includes('Deck')) return '🪵';
    if (surfaceStr.includes('Gravel')) return '⚪';
    if (surfaceStr.includes('Grass')) return '🌿';
    if (surfaceStr.includes('Mixed')) return '🔀';
    return '🛤️';
  }

  getSurfaceLabel(data) {
    const surfaces = data?.trailSurface || '';
    const surfaceStr = Array.isArray(surfaces) ? surfaces[0] : surfaces;
    
    if (!surfaceStr) return 'Unknown';
    if (surfaceStr.includes('Asphalt')) return 'Paved';
    if (surfaceStr.includes('Concrete')) return 'Concrete';
    if (surfaceStr.includes('Wood')) return 'Boardwalk';
    if (surfaceStr.includes('Gravel')) return 'Gravel';
    if (surfaceStr.includes('Grass')) return 'Grass';
    if (surfaceStr.includes('Mixed')) return 'Mixed';
    return surfaceStr.split(' ')[0];
  }

  renderGoodForSection(data) {
    const badges = [];
    const wheelchair = data?.wheelchairAccess || '';
    
    if (wheelchair.toLowerCase().includes('fully')) {
      badges.push({ icon: '♿', label: 'Wheelchairs' });
      badges.push({ icon: '👶', label: 'Strollers' });
    } else if (wheelchair.toLowerCase().includes('partial') || wheelchair.toLowerCase().includes('assistance')) {
      badges.push({ icon: '🦯', label: 'Walkers' });
    }
    
    // Always good for these if accessible
    if (!wheelchair.toLowerCase().includes('not')) {
      badges.push({ icon: '🐕', label: 'Service Dogs' });
      badges.push({ icon: '👴', label: 'Seniors' });
    }
    
    const surfaces = data?.trailSurface || '';
    const surfaceStr = Array.isArray(surfaces) ? surfaces.join(' ') : surfaces;
    if (surfaceStr.includes('Asphalt') || surfaceStr.includes('Concrete')) {
      badges.push({ icon: '🛴', label: 'Scooters' });
    }
    
    if (badges.length === 0) return '';
    
    return `
        <section class="tg-section tg-good-for">
            <h2 class="tg-section-title">✅ Good For</h2>
            <div class="tg-badges">
                ${badges.map(b => `
                    <div class="tg-badge-item">
                        <span class="tg-badge-icon">${b.icon}</span>
                        <span class="tg-badge-label">${b.label}</span>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
  }

  renderConditionsSection(data) {
    const conditions = [];
    
    // Surface quality
    const quality = data?.surfaceQuality || '';
    if (quality) {
      let percent = 50;
      let label = 'Fair';
      if (quality.includes('Excellent')) { percent = 100; label = 'Excellent'; }
      else if (quality.includes('Fair')) { percent = 65; label = 'Fair'; }
      else if (quality.includes('Poor')) { percent = 30; label = 'Poor'; }
      else if (quality.includes('Vegetation')) { percent = 15; label = 'Overgrown'; }
      conditions.push({ label: 'Surface', percent, text: label });
    }
    
    // Slopes
    const slopes = data?.trailSlopes || '';
    if (slopes) {
      let percent = 50;
      let label = 'Moderate';
      if (slopes.includes('No slopes') || slopes.includes('mild')) { percent = 100; label = 'Flat/Mild'; }
      else if (slopes.includes('Moderate')) { percent = 50; label = 'Moderate'; }
      else if (slopes.includes('Steep')) { percent = 20; label = 'Steep'; }
      conditions.push({ label: 'Slope', percent, text: label });
    }
    
    // Shade
    const shade = data?.shadeCoverage || '';
    if (shade) {
      let percent = 50;
      let label = 'Some';
      if (shade.includes('Plenty')) { percent = 100; label = 'Plenty'; }
      else if (shade.includes('Intermittent')) { percent = 50; label = 'Some'; }
      else if (shade.includes('No shade')) { percent = 10; label = 'None'; }
      conditions.push({ label: 'Shade', percent, text: label });
    }
    
    if (conditions.length === 0) return '';
    
    return `
        <section class="tg-section">
            <h2 class="tg-section-title">📊 Trail Conditions</h2>
            <div class="tg-conditions">
                ${conditions.map(c => `
                    <div class="tg-condition-row">
                        <span class="tg-condition-label">${c.label}</span>
                        <div class="tg-condition-bar">
                            <div class="tg-condition-fill ${this.getBarClass(c.percent)}" style="width: ${c.percent}%"></div>
                        </div>
                        <span class="tg-condition-text">${c.text}</span>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
  }

  getBarClass(percent) {
    if (percent >= 70) return 'good';
    if (percent >= 40) return 'moderate';
    return 'poor';
  }

  renderFacilitiesSection(data) {
    console.log('🏛️ Rendering facilities with data:', data);
    const facilities = [];
    
    // Helper function to check if value indicates "available"
    const isAvailable = (value) => {
      if (!value) return false;
      if (typeof value === 'string') return value.toLowerCase().includes('available') || value.toLowerCase().includes('yes');
      if (Array.isArray(value)) return value.some(v => v && (v.toLowerCase?.().includes('available') || v.toLowerCase?.().includes('yes')));
      return !!value;
    };
    
    // Helper to check if value indicates "none" or "not available"
    const isNone = (value) => {
      if (!value) return true;
      if (typeof value === 'string') return value.toLowerCase().includes('none') || value.toLowerCase().includes('not available') || value.toLowerCase().includes('no ');
      return false;
    };
    
    // Parking
    const parking = data?.disabledParking;
    console.log('  - disabledParking:', parking, 'isAvailable:', isAvailable(parking));
    if (isAvailable(parking)) {
      const spaces = data?.parkingSpaces || '?';
      facilities.push({ icon: '🅿️', label: 'Parking', status: `${spaces} spaces`, available: true });
    } else {
      facilities.push({ icon: '🅿️', label: 'Parking', status: 'None', available: false });
    }
    
    // Restrooms
    const restrooms = data?.restrooms || '';
    console.log('  - restrooms:', restrooms, 'isNone:', isNone(restrooms));
    if (restrooms && !isNone(restrooms)) {
      facilities.push({ icon: '🚻', label: 'Restrooms', status: 'Yes', available: true });
    } else {
      facilities.push({ icon: '🚻', label: 'Restrooms', status: 'None', available: false });
    }
    
    // Water
    const water = data?.waterFountains || '';
    console.log('  - waterFountains:', water, 'isNone:', isNone(water));
    if (water && !isNone(water)) {
      facilities.push({ icon: '🚰', label: 'Water', status: 'Yes', available: true });
    } else {
      facilities.push({ icon: '🚰', label: 'Water', status: 'None', available: false });
    }
    
    // Seating
    const seating = data?.seating || [];
    const seatingArr = Array.isArray(seating) ? seating : [seating];
    console.log('  - seating:', seating, 'arr:', seatingArr);
    if (seatingArr.some(s => s && !isNone(s))) {
      facilities.push({ icon: '🪑', label: 'Benches', status: 'Yes', available: true });
    } else {
      facilities.push({ icon: '🪑', label: 'Benches', status: 'None', available: false });
    }
    
    // Picnic
    const picnic = data?.picnicAreas;
    console.log('  - picnicAreas:', picnic, 'isAvailable:', isAvailable(picnic));
    if (isAvailable(picnic)) {
      facilities.push({ icon: '🧺', label: 'Picnic', status: 'Yes', available: true });
    }
    
    // Viewpoint
    const viewpoint = data?.accessibleViewpoint;
    console.log('  - accessibleViewpoint:', viewpoint, 'isAvailable:', isAvailable(viewpoint));
    if (isAvailable(viewpoint)) {
      facilities.push({ icon: '🏔️', label: 'Viewpoint', status: 'Yes', available: true });
    }
    
    // Lighting
    const lighting = data?.lighting;
    console.log('  - lighting:', lighting);
    if (lighting && (typeof lighting === 'string' || (Array.isArray(lighting) && lighting.length > 0))) {
      facilities.push({ icon: '💡', label: 'Lighting', status: 'Yes', available: true });
    }
    
    console.log('  - Final facilities count:', facilities.length);
    
    return `
        <section class="tg-section">
            <h2 class="tg-section-title">🏛️ Facilities</h2>
            <div class="tg-facilities">
                ${facilities.map(f => `
                    <div class="tg-facility ${f.available ? 'available' : 'unavailable'}">
                        <span class="tg-facility-icon">${f.icon}</span>
                        <span class="tg-facility-label">${f.label}</span>
                        <span class="tg-facility-status">${f.status}</span>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
  }

  buildTimeline(routeData, routeInfo) {
    console.log('📍 Building timeline with routeData:', routeData?.length, 'points');
    const items = [];
    const startTime = new Date(routeInfo.date).getTime();
    
    // Add start point
    items.push({
      type: 'start',
      icon: '🟢',
      title: 'Start',
      time: null,
      distance: 0
    });
    
    // Add photos and notes
    routeData.forEach((point, index) => {
      if (point.type === 'photo') {
        // Handle both 'content' (from storage) and 'data' (from live tracking) field names
        const photoContent = point.content || point.data;
        console.log(`  - Photo ${index}: content=${!!point.content}, data=${!!point.data}, result=${!!photoContent}`);
        if (photoContent) {
          items.push({
            type: 'photo',
            icon: '📸',
            title: 'Photo',
            content: photoContent,
            time: point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : null,
            distance: point.distance || null,
            coords: point.coords || null
          });
        }
      } else if (point.type === 'text') {
        // Handle both 'content' (from storage) and 'text'/'data' field names
        const noteContent = point.content || point.text || point.data;
        console.log(`  - Note ${index}: content=${!!point.content}, text=${!!point.text}, data=${!!point.data}, result=${!!noteContent}`);
        if (noteContent) {
          items.push({
            type: 'note',
            icon: '📝',
            title: 'Note',
            content: noteContent,
            time: point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : null,
            distance: point.distance || null,
            coords: point.coords || null
          });
        }
      }
    });
    
    // Add end point
    items.push({
      type: 'end',
      icon: '🔴',
      title: 'End',
      time: null,
      distance: routeInfo.totalDistance || null
    });
    
    console.log('  - Timeline items created:', items.length, '(start + end + photos + notes)');
    return items;
  }

  renderTimelineItem(item) {
    let content = '';
    
    if (item.type === 'photo' && item.content) {
      content = `<img src="${item.content}" class="tg-timeline-photo" alt="Trail photo">`;
    } else if (item.type === 'note' && item.content) {
      content = `<p class="tg-timeline-text">"${item.content}"</p>`;
    }
    
    const distanceText = item.distance ? `${(item.distance / 1000).toFixed(1)} km` : '';
    
    return `
        <div class="tg-timeline-item ${item.type}">
            <div class="tg-timeline-marker">${item.icon}</div>
            <div class="tg-timeline-content">
                <div class="tg-timeline-header">
                    <span class="tg-timeline-title">${item.title}</span>
                    ${distanceText ? `<span class="tg-timeline-distance">${distanceText}</span>` : ''}
                </div>
                ${content}
            </div>
        </div>
    `;
  }

  renderHeadsUpSection(data, notes) {
    const warnings = [];
    
    // Check for accessibility concerns
    const wheelchair = data?.wheelchairAccess || '';
    if (wheelchair.toLowerCase().includes('not') || wheelchair.toLowerCase().includes('assistance')) {
      warnings.push('May require assistance in some areas');
    }
    
    const slopes = data?.trailSlopes || '';
    if (slopes.includes('Steep')) {
      warnings.push('Steep slopes present - not wheelchair accessible');
    } else if (slopes.includes('Moderate')) {
      warnings.push('Moderate slopes - assistance may be needed');
    }
    
    const shade = data?.shadeCoverage || '';
    if (shade.includes('No shade')) {
      warnings.push('No shade - bring sun protection and water');
    }
    
    const quality = data?.surfaceQuality || '';
    if (quality.includes('Poor')) {
      warnings.push('Surface in poor condition - watch for obstacles');
    } else if (quality.includes('Vegetation')) {
      warnings.push('Trail may be overgrown in places');
    }
    
    // Add any notes as potential warnings
    const warningNotes = notes.filter(n => {
      const text = (n.text || n.data || '').toLowerCase();
      return text.includes('watch') || text.includes('careful') || text.includes('warning') || 
             text.includes('caution') || text.includes('avoid') || text.includes('note');
    });
    
    warningNotes.forEach(n => {
      warnings.push(n.text || n.data);
    });
    
    // Additional notes
    if (data?.additionalNotes) {
      warnings.push(data.additionalNotes);
    }
    
    if (warnings.length === 0) return '';
    
    return `
        <section class="tg-section tg-heads-up">
            <h2 class="tg-section-title">⚠️ Heads Up</h2>
            <ul class="tg-warnings">
                ${warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
        </section>
    `;
  }

  renderFullSurveyDetails(data) {
    if (!data) return '<p style="color:#666;">No survey data available.</p>';
    
    const items = [];
    
    // Helper to add item if value exists
    const addItem = (label, value) => {
      if (value && value !== 'Unknown' && value !== '') {
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        items.push({ label, value: displayValue });
      }
    };
    
    // Basic Info
    addItem('Trail Name', data.trailName);
    addItem('Location', data.location);
    addItem('Route Type', data.routeType);
    addItem('Difficulty', data.difficulty);
    
    // Accessibility
    addItem('Wheelchair Access', data.wheelchairAccess);
    addItem('Trail Surface', data.trailSurface);
    addItem('Surface Quality', data.surfaceQuality);
    addItem('Trail Slopes', data.trailSlopes);
    
    // Facilities
    addItem('Accessible Parking', data.disabledParking);
    addItem('Parking Spaces', data.parkingSpaces);
    addItem('Restrooms', data.restrooms);
    addItem('Water Fountains', data.waterFountains);
    addItem('Seating', data.seating);
    
    // Environment
    addItem('Shade Coverage', data.shadeCoverage);
    addItem('Lighting', data.lighting);
    addItem('Signage', data.signage);
    addItem('Visual Access', data.visualAccess);
    addItem('Trail Width', data.trailWidth);
    
    // Extras
    addItem('Picnic Areas', data.picnicAreas);
    addItem('Accessible Viewpoint', data.accessibleViewpoint);
    addItem('Environment', data.environment);
    
    // Notes
    addItem('Additional Notes', data.additionalNotes);
    
    if (items.length === 0) {
      return '<p style="color:#666;">No detailed survey data available.</p>';
    }
    
    return `
      <div class="tg-survey-grid">
        ${items.map(item => `
          <div class="tg-survey-item">
            <div class="tg-survey-label">${item.label}</div>
            <div class="tg-survey-value">${item.value}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  getMapScript(locationPoints, bounds, photos, notes) {
    const pathCoords = locationPoints.map(p => `[${p.coords.lat}, ${p.coords.lng}]`).join(',');
    const startCoord = locationPoints[0]?.coords;
    const endCoord = locationPoints[locationPoints.length - 1]?.coords;
    
    // Filter photos and notes that have coordinates
    const geoPhotos = photos.filter(p => p.coords);
    const geoNotes = notes.filter(n => n.coords);
    
    return `
    <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
    <script>
        const map = L.map('map').setView([${bounds ? (bounds.north + bounds.south) / 2 : 0}, ${bounds ? (bounds.east + bounds.west) / 2 : 0}], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        const pathCoords = [${pathCoords}];
        
        if (pathCoords.length > 0) {
            const polyline = L.polyline(pathCoords, {
                color: '#4a7c59',
                weight: 4,
                opacity: 0.8
            }).addTo(map);
            
            map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
            
            // Start marker
            L.marker([${startCoord?.lat || 0}, ${startCoord?.lng || 0}], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background:#22c55e;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;">S</div>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(map).bindPopup('<strong>🟢 Start</strong>');
            
            // End marker
            L.marker([${endCoord?.lat || 0}, ${endCoord?.lng || 0}], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;">E</div>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(map).bindPopup('<strong>🔴 End</strong>');
            
            // Photo markers
            ${geoPhotos.map(photo => `
            L.marker([${photo.coords.lat}, ${photo.coords.lng}], {
                icon: L.divIcon({
                    className: 'photo-marker',
                    html: '<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">📷</div>',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                })
            }).addTo(map).bindPopup('<div style="text-align:center;"><img src="${photo.content || photo.data}" style="width:200px;max-height:150px;object-fit:cover;border-radius:8px;"><p style="margin:8px 0 0;font-size:12px;color:#666;">${photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString() : ''}</p></div>', { maxWidth: 220 });
            `).join('')}
            
            // Note markers
            ${geoNotes.map(note => `
            L.marker([${note.coords.lat}, ${note.coords.lng}], {
                icon: L.divIcon({
                    className: 'note-marker',
                    html: '<div style="background:#f59e0b;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">📝</div>',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                })
            }).addTo(map).bindPopup('<div style="max-width:200px;"><strong style="color:#92400e;">📝 Note</strong><p style="margin:8px 0 0;font-size:13px;color:#333;">${(note.text || note.content || note.data || '').replace(/'/g, "\\'")}</p></div>');
            `).join('')}
        }
    </script>`;
  }

  getStyles() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .tg-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
        }
        
        /* Header */
        .tg-header {
            background: linear-gradient(135deg, #2c5530 0%, #4a7c59 100%);
            color: white;
            padding: 30px 24px;
            text-align: center;
        }
        
        .tg-header .tg-badge {
            background: rgba(255,255,255,0.2);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            display: inline-block;
            margin-bottom: 16px;
        }
        
        .tg-title {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .tg-location {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        
        .tg-date {
            font-size: 0.9rem;
            opacity: 0.7;
        }
        
        /* Accessibility Banner */
        .tg-access-banner {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
            color: white;
        }
        
        .tg-access-banner.fully {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        }
        
        .tg-access-banner.partial {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        
        .tg-access-banner.not {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        
        .tg-access-banner.unknown {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        }
        
        .tg-access-icon {
            font-size: 2.5rem;
        }
        
        .tg-access-level {
            font-size: 1.2rem;
            font-weight: 700;
            letter-spacing: 1px;
        }
        
        .tg-access-desc {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        /* Stats Row */
        .tg-stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border-bottom: 1px solid #e5e5e5;
        }
        
        .tg-stat {
            text-align: center;
            padding: 16px 8px;
            border-right: 1px solid #e5e5e5;
        }
        
        .tg-stat:last-child {
            border-right: none;
        }
        
        .tg-stat-value {
            display: block;
            font-size: 1.5rem;
            font-weight: 700;
            color: #2c5530;
        }
        
        .tg-stat-label {
            display: block;
            font-size: 0.75rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Sections */
        .tg-section {
            padding: 24px;
            border-bottom: 1px solid #e5e5e5;
        }
        
        .tg-section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 16px;
        }
        
        /* Good For Badges */
        .tg-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        
        .tg-badge-item {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 8px 14px;
            border-radius: 20px;
        }
        
        .tg-badge-icon {
            font-size: 1.2rem;
        }
        
        .tg-badge-label {
            font-size: 0.9rem;
            font-weight: 500;
            color: #166534;
        }
        
        /* Conditions */
        .tg-conditions {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .tg-condition-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .tg-condition-label {
            width: 70px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .tg-condition-bar {
            flex: 1;
            height: 8px;
            background: #e5e5e5;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .tg-condition-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s;
        }
        
        .tg-condition-fill.good {
            background: linear-gradient(to right, #22c55e, #16a34a);
        }
        
        .tg-condition-fill.moderate {
            background: linear-gradient(to right, #f59e0b, #d97706);
        }
        
        .tg-condition-fill.poor {
            background: linear-gradient(to right, #ef4444, #dc2626);
        }
        
        .tg-condition-text {
            width: 80px;
            font-size: 0.85rem;
            font-weight: 500;
            text-align: right;
        }
        
        /* Facilities */
        .tg-facilities {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 12px;
        }
        
        .tg-facility {
            text-align: center;
            padding: 16px 8px;
            border-radius: 12px;
            background: #f9fafb;
        }
        
        .tg-facility.available {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }
        
        .tg-facility.unavailable {
            opacity: 0.5;
        }
        
        .tg-facility-icon {
            display: block;
            font-size: 1.5rem;
            margin-bottom: 4px;
        }
        
        .tg-facility-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: #333;
        }
        
        .tg-facility-status {
            display: block;
            font-size: 0.75rem;
            color: #666;
        }
        
        /* Map */
        .tg-map-container {
            height: 300px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        #map {
            height: 100%;
            width: 100%;
        }
        
        .tg-map-hint {
            text-align: center;
            font-size: 0.85rem;
            color: #666;
            margin-top: 8px;
        }
        
        .tg-map-legend {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-top: 12px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
        }
        
        .tg-legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            color: #555;
        }
        
        .tg-legend-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .tg-legend-dot.start { background: #22c55e; }
        .tg-legend-dot.end { background: #ef4444; }
        .tg-legend-dot.photo { background: #3b82f6; }
        .tg-legend-dot.note { background: #f59e0b; }
        
        /* Timeline */
        .tg-timeline {
            position: relative;
            padding-left: 30px;
        }
        
        .tg-timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #e5e5e5;
        }
        
        .tg-timeline-item {
            position: relative;
            padding-bottom: 20px;
        }
        
        .tg-timeline-item:last-child {
            padding-bottom: 0;
        }
        
        .tg-timeline-marker {
            position: absolute;
            left: -30px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            background: white;
            border-radius: 50%;
            z-index: 1;
        }
        
        .tg-timeline-content {
            background: #f9fafb;
            padding: 12px 16px;
            border-radius: 10px;
        }
        
        .tg-timeline-item.start .tg-timeline-content,
        .tg-timeline-item.end .tg-timeline-content {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }
        
        .tg-timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .tg-timeline-title {
            font-weight: 600;
            color: #333;
        }
        
        .tg-timeline-distance {
            font-size: 0.8rem;
            color: #666;
            background: #e5e5e5;
            padding: 2px 8px;
            border-radius: 10px;
        }
        
        .tg-timeline-photo {
            width: 100%;
            border-radius: 8px;
            margin-top: 8px;
        }
        
        .tg-timeline-text {
            color: #555;
            font-style: italic;
        }
        
        /* Heads Up */
        .tg-heads-up {
            background: #fef3c7;
        }
        
        .tg-warnings {
            list-style: none;
        }
        
        .tg-warnings li {
            padding: 8px 0 8px 24px;
            position: relative;
            color: #92400e;
        }
        
        .tg-warnings li::before {
            content: '•';
            position: absolute;
            left: 8px;
            color: #f59e0b;
            font-weight: bold;
        }
        
        /* Footer */
        .tg-footer {
            padding: 30px 24px;
            text-align: center;
            background: #f9fafb;
        }
        
        .tg-footer p {
            color: #666;
            font-size: 0.9rem;
        }
        
        .tg-footer p:first-child {
            font-weight: 600;
            color: #2c5530;
            margin-bottom: 4px;
        }
        
        /* Mobile */
        @media (max-width: 480px) {
            .tg-stats-row {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .tg-stat:nth-child(2) {
                border-right: none;
            }
            
            .tg-stat:nth-child(1),
            .tg-stat:nth-child(2) {
                border-bottom: 1px solid #e5e5e5;
            }
            
            .tg-title {
                font-size: 1.5rem;
            }
            
            .tg-access-banner {
                flex-direction: column;
                text-align: center;
            }
            
            .tg-facilities {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        /* Print */
        @media print {
            .tg-container {
                max-width: 100%;
            }
            
            .tg-map-container {
                height: 250px;
            }
            
            .tg-action-bar {
                display: none !important;
            }
            
            .tg-survey-panel {
                display: block !important;
                page-break-before: always;
            }
        }
        
        /* Action Bar */
        .tg-action-bar {
            display: flex;
            gap: 10px;
            padding: 16px 24px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e5e5;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .tg-action-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            color: white;
        }
        
        .tg-action-navigate {
            background: #3b82f6;
        }
        
        .tg-action-navigate:hover {
            background: #2563eb;
        }
        
        .tg-action-pdf {
            background: #10b981;
        }
        
        .tg-action-pdf:hover {
            background: #059669;
        }
        
        .tg-action-details {
            background: #8b5cf6;
        }
        
        .tg-action-details:hover {
            background: #7c3aed;
        }
        
        /* Dropdown */
        .tg-action-dropdown {
            position: relative;
            display: inline-block;
        }
        
        .tg-dropdown-content {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            min-width: 160px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            overflow: hidden;
            z-index: 100;
            margin-top: 4px;
        }
        
        .tg-dropdown-content.show {
            display: block;
        }
        
        .tg-dropdown-content a {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            text-decoration: none;
            color: #333;
            transition: background 0.2s;
        }
        
        .tg-dropdown-content a:hover {
            background: #f3f4f6;
        }
        
        /* PDF Loading Overlay */
        .tg-pdf-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        
        .tg-pdf-loading {
            background: white;
            padding: 40px 60px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .tg-pdf-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #e5e7eb;
            border-top-color: #2c5530;
            border-radius: 50%;
            margin: 0 auto 20px;
            animation: tg-spin 1s linear infinite;
        }
        
        @keyframes tg-spin {
            to { transform: rotate(360deg); }
        }
        
        .tg-pdf-loading p {
            margin: 0;
            color: #333;
            font-size: 1.1rem;
            font-weight: 500;
        }
        
        .tg-pdf-hint {
            color: #666 !important;
            font-size: 0.9rem !important;
            font-weight: 400 !important;
            margin-top: 8px !important;
        }
        
        /* Survey Details Panel */
        .tg-survey-panel {
            display: none;
            padding: 24px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            margin: 16px 24px;
            border-radius: 12px;
        }
        
        .tg-survey-panel.show {
            display: block;
        }
        
        .tg-survey-panel h3 {
            margin: 0 0 16px 0;
            color: #0369a1;
            font-size: 1.1rem;
        }
        
        .tg-survey-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
        }
        
        .tg-survey-item {
            background: white;
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 3px solid #0ea5e9;
        }
        
        .tg-survey-label {
            font-size: 0.8rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .tg-survey-value {
            font-weight: 500;
            color: #333;
        }
        
        @media (max-width: 480px) {
            .tg-action-bar {
                flex-direction: column;
                padding: 12px 16px;
            }
            
            .tg-action-btn {
                width: 100%;
                justify-content: center;
            }
            
            .tg-dropdown-content {
                position: static;
                box-shadow: none;
                border: 1px solid #e5e5e5;
                margin-top: 8px;
            }
            
            .tg-survey-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
  }
}

// Create singleton instance
const trailGuideGeneratorV2 = new TrailGuideGeneratorV2();

export { trailGuideGeneratorV2 };

console.log('📄 Trail Guide Generator V2 loaded');