/**
 * Elevation Chart Component
 * Displays elevation profile with gradient analysis and color coding
 */

export class ElevationChart {
  constructor() {
    this.chartInstance = null;
    this.gradientColors = {
      flat: '#4CAF50',      // 0-5% - Green (easy)
      moderate: '#FFC107',   // 5-10% - Yellow (moderate)
      steep: '#FF9800',      // 10-15% - Orange (steep)
      verysteep: '#f44336'   // >15% - Red (very steep)
    };
  }

  /**
   * Extract elevation data from route points
   * @param {Array} routeData - Array of route points
   * @returns {Object} - Elevation data with stats
   */
  extractElevationData(routeData) {
    const locationPoints = routeData.filter(p => 
      p.type === 'location' && 
      p.coords && 
      p.elevation !== undefined && 
      p.elevation !== null
    );

    if (locationPoints.length === 0) {
      return null;
    }

    // For single point, return minimal data
    if (locationPoints.length === 1) {
      const elevation = locationPoints[0].elevation;
      return {
        points: [{
          distance: 0,
          elevation: elevation,
          lat: locationPoints[0].coords.lat,
          lng: locationPoints[0].coords.lng,
          timestamp: locationPoints[0].timestamp
        }],
        segments: [],
        stats: {
          minElevation: Math.round(elevation),
          maxElevation: Math.round(elevation),
          elevationGain: 0,
          elevationLoss: 0,
          totalDistance: 0,
          pointCount: 1
        },
        singlePoint: true
      };
    }

    // Calculate cumulative distance and elevation for each point
    let cumulativeDistance = 0;
    const elevationData = [];
    
    for (let i = 0; i < locationPoints.length; i++) {
      const point = locationPoints[i];
      
      if (i > 0) {
        const prevPoint = locationPoints[i - 1];
        const distance = this.haversineDistance(
          prevPoint.coords.lat, prevPoint.coords.lng,
          point.coords.lat, point.coords.lng
        );
        cumulativeDistance += distance;
      }

      elevationData.push({
        distance: cumulativeDistance,
        elevation: point.elevation,
        lat: point.coords.lat,
        lng: point.coords.lng,
        timestamp: point.timestamp
      });
    }

    // Calculate stats
    const elevations = elevationData.map(p => p.elevation);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    
    // Calculate total ascent and descent
    let totalAscent = 0;
    let totalDescent = 0;
    
    for (let i = 1; i < elevationData.length; i++) {
      const diff = elevationData[i].elevation - elevationData[i - 1].elevation;
      if (diff > 0) {
        totalAscent += diff;
      } else {
        totalDescent += Math.abs(diff);
      }
    }

    // Calculate gradient for each segment
    const segments = this.calculateGradients(elevationData);

    return {
      points: elevationData,
      segments: segments,
      stats: {
        minElevation: Math.round(minElevation),
        maxElevation: Math.round(maxElevation),
        elevationGain: Math.round(totalAscent),
        elevationLoss: Math.round(totalDescent),
        totalDistance: cumulativeDistance,
        pointCount: elevationData.length
      }
    };
  }

  /**
   * Calculate gradients for each segment
   */
  calculateGradients(elevationData) {
    const segments = [];
    
    for (let i = 1; i < elevationData.length; i++) {
      const prev = elevationData[i - 1];
      const curr = elevationData[i];
      
      const horizontalDistance = (curr.distance - prev.distance) * 1000; // Convert to meters
      const elevationChange = curr.elevation - prev.elevation;
      
      // Avoid division by zero
      const gradient = horizontalDistance > 0 
        ? (elevationChange / horizontalDistance) * 100 
        : 0;
      
      segments.push({
        startDistance: prev.distance,
        endDistance: curr.distance,
        startElevation: prev.elevation,
        endElevation: curr.elevation,
        gradient: gradient,
        gradientCategory: this.getGradientCategory(Math.abs(gradient)),
        isAscending: gradient > 0
      });
    }
    
    return segments;
  }

  /**
   * Get gradient category based on percentage
   */
  getGradientCategory(gradientPercent) {
    if (gradientPercent <= 5) return 'flat';
    if (gradientPercent <= 10) return 'moderate';
    if (gradientPercent <= 15) return 'steep';
    return 'verysteep';
  }

  /**
   * Get color for gradient category
   */
  getGradientColor(category) {
    return this.gradientColors[category] || this.gradientColors.flat;
  }

  /**
   * Render elevation chart as HTML (Canvas-based using Chart.js if available, otherwise SVG)
   * @param {Object} elevationData - Data from extractElevationData
   * @param {Object} options - Rendering options
   * @returns {string} - HTML string
   */
  renderChart(elevationData, options = {}) {
    if (!elevationData || !elevationData.points || elevationData.points.length === 0) {
      return this.renderNoDataMessage();
    }

    // Handle single point data
    if (elevationData.singlePoint || elevationData.points.length === 1) {
      return this.renderSinglePointMessage(elevationData.stats);
    }

    const {
      width = 600,
      height = 200,
      showGradientColors = true,
      showStats = true
    } = options;

    const { points, segments, stats } = elevationData;
    
    // Generate SVG chart
    const chartSvg = this.generateSvgChart(points, segments, width, height, showGradientColors);
    
    // Generate stats HTML
    const statsHtml = showStats ? this.renderStats(stats) : '';
    
    // Generate gradient legend
    const legendHtml = showGradientColors ? this.renderLegend() : '';

    return `
      <div class="elevation-chart-container" style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 600;">📈 Elevation Profile</h3>
          ${legendHtml}
        </div>
        ${chartSvg}
        ${statsHtml}
      </div>
    `;
  }

  /**
   * Generate SVG elevation chart
   */
  generateSvgChart(points, segments, width, height, showGradientColors) {
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const elevations = points.map(p => p.elevation);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const elevRange = maxElev - minElev || 1;
    
    const maxDist = points[points.length - 1].distance;

    // Scale functions
    const xScale = (dist) => padding.left + (dist / maxDist) * chartWidth;
    const yScale = (elev) => padding.top + chartHeight - ((elev - minElev) / elevRange) * chartHeight;

    // Build path
    let pathD = `M ${xScale(points[0].distance)} ${yScale(points[0].elevation)}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${xScale(points[i].distance)} ${yScale(points[i].elevation)}`;
    }

    // Build filled area path
    const areaD = pathD + 
      ` L ${xScale(points[points.length - 1].distance)} ${padding.top + chartHeight}` +
      ` L ${xScale(points[0].distance)} ${padding.top + chartHeight} Z`;

    // Generate colored segments if enabled
    let segmentPaths = '';
    if (showGradientColors && segments.length > 0) {
      segments.forEach((seg, i) => {
        const x1 = xScale(seg.startDistance);
        const y1 = yScale(seg.startElevation);
        const x2 = xScale(seg.endDistance);
        const y2 = yScale(seg.endElevation);
        const color = this.getGradientColor(seg.gradientCategory);
        
        segmentPaths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
          stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
      });
    }

    // Y-axis labels
    const yAxisLabels = this.generateYAxisLabels(minElev, maxElev, 5, yScale, padding);
    
    // X-axis labels
    const xAxisLabels = this.generateXAxisLabels(maxDist, 5, xScale, height, padding);

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="display: block;">
        <!-- Grid lines -->
        <g stroke="#333" stroke-width="1" stroke-dasharray="3,3">
          ${this.generateGridLines(width, height, padding, 5)}
        </g>
        
        <!-- Filled area under curve -->
        <path d="${areaD}" fill="rgba(76, 175, 80, 0.2)" stroke="none"/>
        
        <!-- Main elevation line or colored segments -->
        ${showGradientColors ? segmentPaths : `<path d="${pathD}" fill="none" stroke="#4CAF50" stroke-width="2"/>`}
        
        <!-- Axis labels -->
        ${yAxisLabels}
        ${xAxisLabels}
        
        <!-- Axis titles -->
        <text x="${padding.left - 35}" y="${height / 2}" 
          transform="rotate(-90, ${padding.left - 35}, ${height / 2})"
          fill="#888" font-size="11" text-anchor="middle">Elevation (m)</text>
        <text x="${width / 2}" y="${height - 5}" 
          fill="#888" font-size="11" text-anchor="middle">Distance (km)</text>
      </svg>
    `;
  }

  /**
   * Generate Y-axis labels
   */
  generateYAxisLabels(minElev, maxElev, count, yScale, padding) {
    const range = maxElev - minElev;
    const step = range / (count - 1);
    let labels = '';
    
    for (let i = 0; i < count; i++) {
      const elev = minElev + step * i;
      const y = yScale(elev);
      labels += `<text x="${padding.left - 8}" y="${y + 4}" 
        fill="#888" font-size="10" text-anchor="end">${Math.round(elev)}</text>`;
    }
    
    return labels;
  }

  /**
   * Generate X-axis labels
   */
  generateXAxisLabels(maxDist, count, xScale, height, padding) {
    const step = maxDist / (count - 1);
    let labels = '';
    
    for (let i = 0; i < count; i++) {
      const dist = step * i;
      const x = xScale(dist);
      labels += `<text x="${x}" y="${height - padding.bottom + 18}" 
        fill="#888" font-size="10" text-anchor="middle">${dist.toFixed(1)}</text>`;
    }
    
    return labels;
  }

  /**
   * Generate grid lines
   */
  generateGridLines(width, height, padding, count) {
    let lines = '';
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Horizontal lines
    for (let i = 0; i < count; i++) {
      const y = padding.top + (chartHeight / (count - 1)) * i;
      lines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/>`;
    }
    
    // Vertical lines
    for (let i = 0; i < count; i++) {
      const x = padding.left + (chartWidth / (count - 1)) * i;
      lines += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}"/>`;
    }
    
    return lines;
  }

  /**
   * Render elevation stats
   */
  renderStats(stats) {
    return `
      <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;">
        <div style="flex: 1; min-width: 100px; text-align: center;">
          <div style="color: #4CAF50; font-size: 18px; font-weight: 700;">↑ ${stats.elevationGain}m</div>
          <div style="color: #888; font-size: 11px;">Total Ascent</div>
        </div>
        <div style="flex: 1; min-width: 100px; text-align: center;">
          <div style="color: #f44336; font-size: 18px; font-weight: 700;">↓ ${stats.elevationLoss}m</div>
          <div style="color: #888; font-size: 11px;">Total Descent</div>
        </div>
        <div style="flex: 1; min-width: 100px; text-align: center;">
          <div style="color: #2196F3; font-size: 18px; font-weight: 700;">${stats.minElevation}m</div>
          <div style="color: #888; font-size: 11px;">Min Elevation</div>
        </div>
        <div style="flex: 1; min-width: 100px; text-align: center;">
          <div style="color: #FF9800; font-size: 18px; font-weight: 700;">${stats.maxElevation}m</div>
          <div style="color: #888; font-size: 11px;">Max Elevation</div>
        </div>
      </div>
    `;
  }

  /**
   * Render gradient legend
   */
  renderLegend() {
    return `
      <div style="display: flex; gap: 8px; font-size: 10px;">
        <span style="display: flex; align-items: center; gap: 3px;">
          <span style="width: 12px; height: 3px; background: ${this.gradientColors.flat}; border-radius: 2px;"></span>
          <span style="color: #888;">0-5%</span>
        </span>
        <span style="display: flex; align-items: center; gap: 3px;">
          <span style="width: 12px; height: 3px; background: ${this.gradientColors.moderate}; border-radius: 2px;"></span>
          <span style="color: #888;">5-10%</span>
        </span>
        <span style="display: flex; align-items: center; gap: 3px;">
          <span style="width: 12px; height: 3px; background: ${this.gradientColors.steep}; border-radius: 2px;"></span>
          <span style="color: #888;">10-15%</span>
        </span>
        <span style="display: flex; align-items: center; gap: 3px;">
          <span style="width: 12px; height: 3px; background: ${this.gradientColors.verysteep}; border-radius: 2px;"></span>
          <span style="color: #888;">>15%</span>
        </span>
      </div>
    `;
  }

  /**
   * Render no data message
   */
  renderNoDataMessage() {
    return `
      <div class="elevation-chart-container" style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin: 16px 0; text-align: center;">
        <div style="color: #888; font-size: 14px;">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">📐</span>
          <p style="margin: 0;">Elevation data not available</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
            Your device may not support altitude tracking,<br>
            or insufficient GPS points were recorded.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render single point message with elevation value
   */
  renderSinglePointMessage(stats) {
    const elevation = stats?.maxElevation || stats?.minElevation || 0;
    return `
      <div class="elevation-chart-container" style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin: 16px 0; text-align: center;">
        <h3 style="margin: 0 0 16px; color: white; font-size: 16px; font-weight: 600;">📈 Elevation</h3>
        <div style="color: white; font-size: 14px;">
          <span style="font-size: 48px; display: block; margin-bottom: 8px; color: #4CAF50;">⛰️</span>
          <p style="margin: 0; font-size: 32px; font-weight: 700;">${elevation}m</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #888;">
            Single point recorded.<br>
            Track longer routes for elevation profile chart.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Haversine distance calculation
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Analyze steep sections and return summary
   */
  analyzeSteepSections(segments) {
    const steepSections = segments.filter(s => 
      s.gradientCategory === 'steep' || s.gradientCategory === 'verysteep'
    );

    if (steepSections.length === 0) {
      return { hasSteepSections: false, summary: 'No steep sections detected.' };
    }

    // Group consecutive steep sections
    const groups = [];
    let currentGroup = null;

    steepSections.forEach(section => {
      if (!currentGroup) {
        currentGroup = { ...section, sections: [section] };
      } else if (Math.abs(section.startDistance - currentGroup.endDistance) < 0.05) {
        // Consecutive sections (within 50m)
        currentGroup.endDistance = section.endDistance;
        currentGroup.endElevation = section.endElevation;
        currentGroup.sections.push(section);
      } else {
        groups.push(currentGroup);
        currentGroup = { ...section, sections: [section] };
      }
    });
    
    if (currentGroup) groups.push(currentGroup);

    const summary = groups.map(g => {
      const length = ((g.endDistance - g.startDistance) * 1000).toFixed(0);
      const elevChange = Math.abs(g.endElevation - g.startElevation).toFixed(0);
      const direction = g.isAscending ? '↗️ Climb' : '↘️ Descent';
      const maxGradient = Math.max(...g.sections.map(s => Math.abs(s.gradient)));
      return `${direction}: ${length}m (${elevChange}m, max ${maxGradient.toFixed(1)}%)`;
    }).join('\n');

    return {
      hasSteepSections: true,
      steepSectionCount: groups.length,
      summary: summary,
      groups: groups
    };
  }
}

// Create singleton instance
export const elevationChart = new ElevationChart();

// Make available globally
window.elevationChart = elevationChart;

export default elevationChart;