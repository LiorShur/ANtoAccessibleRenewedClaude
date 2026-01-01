/**
 * Open311 Integration
 * Formats accessibility reports for municipal 311 system submission
 * Based on Open311 GeoReport v2 specification
 * 
 * Access Nature - AccessReport Enhancement
 * Created: December 2025
 */

/**
 * Open311 Service Codes - Map our issue types to standard 311 categories
 * These codes vary by municipality - these are common examples
 */
export const SERVICE_CODES = {
  curb_ramp: {
    code: 'CURB_RAMP',
    name: 'Curb Ramp Issue',
    description: 'Missing, damaged, or non-compliant curb ramp',
    group: 'Sidewalk & Accessibility',
    keywords: ['ADA', 'accessibility', 'wheelchair', 'ramp']
  },
  sidewalk_blocked: {
    code: 'SIDEWALK_OBSTRUCTION',
    name: 'Sidewalk Obstruction',
    description: 'Sidewalk blocked by object, vegetation, or other obstruction',
    group: 'Sidewalk & Accessibility',
    keywords: ['blocked', 'obstruction', 'accessibility']
  },
  damaged_sidewalk: {
    code: 'SIDEWALK_REPAIR',
    name: 'Sidewalk Repair Needed',
    description: 'Cracked, uneven, or damaged sidewalk surface',
    group: 'Sidewalk & Accessibility',
    keywords: ['repair', 'damage', 'crack', 'trip hazard']
  },
  tactile_paving: {
    code: 'TACTILE_PAVING',
    name: 'Tactile Paving Issue',
    description: 'Missing, damaged, or incorrect tactile paving for visually impaired',
    group: 'Sidewalk & Accessibility',
    keywords: ['blind', 'tactile', 'detectable warning']
  },
  inaccessible_entrance: {
    code: 'BUILDING_ACCESS',
    name: 'Inaccessible Building Entrance',
    description: 'Building entrance not accessible to people with disabilities',
    group: 'Building Accessibility',
    keywords: ['ADA', 'entrance', 'door', 'accessibility']
  },
  broken_elevator: {
    code: 'ELEVATOR_REPAIR',
    name: 'Elevator/Lift Out of Service',
    description: 'Elevator or accessibility lift not functioning',
    group: 'Building Accessibility',
    keywords: ['elevator', 'lift', 'out of service']
  },
  heavy_doors: {
    code: 'DOOR_ACCESSIBILITY',
    name: 'Door Accessibility Issue',
    description: 'Door too heavy or difficult to open for accessibility',
    group: 'Building Accessibility',
    keywords: ['door', 'heavy', 'ADA']
  },
  stairs_only: {
    code: 'NO_RAMP_ACCESS',
    name: 'No Ramp/Elevator Access',
    description: 'Location has stairs only with no accessible alternative',
    group: 'Building Accessibility',
    keywords: ['stairs', 'no ramp', 'no elevator']
  },
  parking_blocked: {
    code: 'PARKING_VIOLATION',
    name: 'Accessible Parking Blocked',
    description: 'Accessible parking space blocked or misused',
    group: 'Parking',
    keywords: ['parking', 'handicap', 'blocked']
  },
  no_parking: {
    code: 'PARKING_MISSING',
    name: 'No Accessible Parking',
    description: 'Required accessible parking not available',
    group: 'Parking',
    keywords: ['parking', 'ADA', 'missing']
  },
  trail_obstacle: {
    code: 'TRAIL_HAZARD',
    name: 'Trail Obstacle/Hazard',
    description: 'Obstacle or hazard blocking trail accessibility',
    group: 'Parks & Trails',
    keywords: ['trail', 'obstacle', 'hazard']
  },
  trail_erosion: {
    code: 'TRAIL_EROSION',
    name: 'Trail Erosion/Damage',
    description: 'Trail surface eroded or damaged',
    group: 'Parks & Trails',
    keywords: ['trail', 'erosion', 'damage']
  },
  overgrown: {
    code: 'VEGETATION',
    name: 'Overgrown Vegetation',
    description: 'Vegetation blocking path or accessibility',
    group: 'Parks & Trails',
    keywords: ['vegetation', 'overgrown', 'blocked']
  },
  missing_sign: {
    code: 'SIGNAGE',
    name: 'Missing/Damaged Signage',
    description: 'Accessibility signage missing or damaged',
    group: 'Signage',
    keywords: ['sign', 'signage', 'wayfinding']
  },
  other: {
    code: 'OTHER_ACCESS',
    name: 'Other Accessibility Issue',
    description: 'Other accessibility-related issue',
    group: 'Other',
    keywords: ['accessibility', 'other']
  }
};

/**
 * Severity mapping to Open311 priority
 */
const SEVERITY_TO_PRIORITY = {
  1: 'low',
  2: 'low', 
  3: 'medium',
  4: 'high',
  5: 'urgent',
  // Legacy text values
  minor: 'low',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'urgent'
};

/**
 * Open311 Integration Class
 */
class Open311Integration {
  constructor() {
    this.endpoints = new Map(); // Store configured municipality endpoints
  }

  /**
   * Convert Access Nature report to Open311 format
   * @param {object} report - Access Nature report object
   * @returns {object} Open311 formatted request
   */
  formatForOpen311(report) {
    const serviceInfo = SERVICE_CODES[report.issueType] || SERVICE_CODES.other;
    const severity = report.severity || 3;
    const priority = SEVERITY_TO_PRIORITY[severity] || 'medium';
    
    // Build description with all relevant details
    const descriptionParts = [
      report.title,
      report.description,
      `Severity: ${severity}/5 (${priority})`,
      report.isTemporary ? `Duration: Temporary${report.expectedResolution ? ` - Expected resolution: ${new Date(report.expectedResolution).toLocaleDateString()}` : ''}` : 'Duration: Permanent/Ongoing',
      report.address ? `Address: ${report.address}` : null,
      `Reported via Access Nature app`,
      `Community verifications: ${report.verificationCount || 0}`
    ].filter(Boolean).join('\n\n');

    const open311Request = {
      // Required fields
      service_code: serviceInfo.code,
      lat: report.latitude,
      long: report.longitude,
      description: descriptionParts,
      
      // Optional but recommended
      address_string: report.address || null,
      
      // Extended attributes
      attribute: {
        // Custom attributes many 311 systems support
        issue_type: report.issueType,
        severity_level: severity,
        priority: priority,
        is_temporary: report.isTemporary || false,
        expected_resolution: report.expectedResolution || null,
        
        // Accessibility-specific
        accessibility_category: serviceInfo.group,
        ada_related: serviceInfo.keywords.includes('ADA'),
        
        // Source tracking
        source_app: 'Access Nature',
        source_report_id: report.id,
        community_verified: (report.verificationCount || 0) >= 3,
        verification_count: report.verificationCount || 0,
        
        // Reporter info (anonymized option)
        reporter_type: 'community_member'
      },
      
      // Media attachments
      media_url: report.photos && report.photos.length > 0 ? 
        this.getFirstPhotoUrl(report.photos) : null,
      
      // Metadata
      requested_datetime: report.createdAt?.toDate ? 
        report.createdAt.toDate().toISOString() : 
        new Date().toISOString()
    };

    return open311Request;
  }

  /**
   * Get first photo URL from photos array
   * @param {array} photos 
   * @returns {string|null}
   */
  getFirstPhotoUrl(photos) {
    if (!photos || photos.length === 0) return null;
    
    const photo = photos[0];
    if (typeof photo === 'string') return photo;
    if (photo.url) return photo.url;
    if (photo.content) return photo.content;
    return null;
  }

  /**
   * Generate a human-readable report for manual submission
   * @param {object} report - Access Nature report
   * @returns {string} Formatted text report
   */
  generateTextReport(report) {
    const serviceInfo = SERVICE_CODES[report.issueType] || SERVICE_CODES.other;
    const severity = report.severity || 3;
    const severityLabels = { 1: 'Minor', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Critical' };
    
    const date = report.createdAt?.toDate ? 
      report.createdAt.toDate().toLocaleString() : 
      'Unknown';
    
    const template = `
═══════════════════════════════════════════════════════════════
               ACCESSIBILITY BARRIER REPORT
                  For Municipal 311 Submission
═══════════════════════════════════════════════════════════════

ISSUE CATEGORY: ${serviceInfo.name}
SERVICE CODE: ${serviceInfo.code}

───────────────────────────────────────────────────────────────
ISSUE DETAILS
───────────────────────────────────────────────────────────────

Title: ${report.title}

Description:
${report.description || 'No additional description provided.'}

Severity Level: ${severity}/5 - ${severityLabels[severity] || 'Medium'}
Priority: ${SEVERITY_TO_PRIORITY[severity] || 'medium'}

Duration: ${report.isTemporary ? 'TEMPORARY' : 'PERMANENT/ONGOING'}
${report.isTemporary && report.expectedResolution ? 
  `Expected Resolution: ${new Date(report.expectedResolution).toLocaleDateString()}` : ''}

───────────────────────────────────────────────────────────────
LOCATION
───────────────────────────────────────────────────────────────

Coordinates: ${report.latitude?.toFixed(6)}, ${report.longitude?.toFixed(6)}
${report.address ? `Address: ${report.address}` : ''}

Google Maps: https://www.google.com/maps?q=${report.latitude},${report.longitude}

───────────────────────────────────────────────────────────────
VERIFICATION & SOURCE
───────────────────────────────────────────────────────────────

Report Date: ${date}
Source: Access Nature Community App
Report ID: ${report.id}

Community Verifications: ${report.verificationCount || 0}
Status: ${(report.verificationCount || 0) >= 3 ? '✓ COMMUNITY VERIFIED' : 'Pending verification'}
Community Upvotes: ${report.upvotes || 0}

${report.photos && report.photos.length > 0 ? 
  `Photos Attached: ${report.photos.length} photo(s)` : 
  'No photos attached'}

───────────────────────────────────────────────────────────────
SUGGESTED DEPARTMENT
───────────────────────────────────────────────────────────────

Category: ${serviceInfo.group}
Keywords: ${serviceInfo.keywords.join(', ')}

═══════════════════════════════════════════════════════════════
Report generated by Access Nature - Making nature accessible
https://accessnature.app
═══════════════════════════════════════════════════════════════
`.trim();

    return template;
  }

  /**
   * Generate CSV row for batch submission
   * @param {object} report 
   * @returns {object} CSV-ready object
   */
  generateCSVRow(report) {
    const serviceInfo = SERVICE_CODES[report.issueType] || SERVICE_CODES.other;
    const severity = report.severity || 3;
    
    return {
      report_id: report.id,
      service_code: serviceInfo.code,
      service_name: serviceInfo.name,
      category: serviceInfo.group,
      title: report.title,
      description: report.description || '',
      severity: severity,
      priority: SEVERITY_TO_PRIORITY[severity] || 'medium',
      latitude: report.latitude,
      longitude: report.longitude,
      address: report.address || '',
      is_temporary: report.isTemporary ? 'Yes' : 'No',
      expected_resolution: report.expectedResolution ? 
        new Date(report.expectedResolution).toLocaleDateString() : '',
      reported_date: report.createdAt?.toDate ? 
        report.createdAt.toDate().toISOString() : '',
      verification_count: report.verificationCount || 0,
      community_verified: (report.verificationCount || 0) >= 3 ? 'Yes' : 'No',
      upvotes: report.upvotes || 0,
      status: report.status || 'new',
      photo_count: report.photos?.length || 0,
      google_maps_link: `https://www.google.com/maps?q=${report.latitude},${report.longitude}`
    };
  }

  /**
   * Generate CSV export for multiple reports
   * @param {array} reports 
   * @returns {string} CSV content
   */
  generateCSVExport(reports) {
    if (!reports || reports.length === 0) return '';
    
    const rows = reports.map(r => this.generateCSVRow(r));
    const headers = Object.keys(rows[0]);
    
    const csvLines = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(h => {
          const val = row[h];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ];
    
    return csvLines.join('\n');
  }

  /**
   * Generate email template for authority notification
   * @param {object} report 
   * @param {string} authorityEmail 
   * @returns {object} Email subject and body
   */
  generateEmailTemplate(report, authorityEmail = '') {
    const serviceInfo = SERVICE_CODES[report.issueType] || SERVICE_CODES.other;
    const severity = report.severity || 3;
    const severityLabels = { 1: 'Minor', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Critical' };
    
    const subject = `[Accessibility Report] ${severityLabels[severity]} Priority: ${report.title}`;
    
    const body = `
Dear ${serviceInfo.group} Department,

I am writing to report an accessibility barrier that has been documented by the Access Nature community.

ISSUE: ${report.title}
CATEGORY: ${serviceInfo.name}
SEVERITY: ${severity}/5 (${severityLabels[severity]})
LOCATION: ${report.address || `Coordinates: ${report.latitude?.toFixed(6)}, ${report.longitude?.toFixed(6)}`}

DESCRIPTION:
${report.description || 'Please see attached report for details.'}

MAP LINK: https://www.google.com/maps?q=${report.latitude},${report.longitude}

This report has been ${(report.verificationCount || 0) >= 3 ? 'verified by multiple community members' : 'submitted'} through the Access Nature accessibility mapping platform.

${report.isTemporary ? `Note: This appears to be a TEMPORARY issue${report.expectedResolution ? ` with expected resolution by ${new Date(report.expectedResolution).toLocaleDateString()}` : ''}.` : ''}

Thank you for your attention to this accessibility matter.

Best regards,
Access Nature Community

---
Report ID: ${report.id}
Generated: ${new Date().toLocaleString()}
    `.trim();

    return {
      subject,
      body,
      mailto: `mailto:${authorityEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    };
  }

  /**
   * Generate a printable HTML report for manual submission
   * @param {object} report 
   * @returns {string} HTML content
   */
  generatePrintableReport(report) {
    const serviceInfo = SERVICE_CODES[report.issueType] || SERVICE_CODES.other;
    const date = report.createdAt?.toDate?.() || new Date();
    const severity = report.severity || 3;
    const severityLabels = { 1: 'Minor', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Critical' };
    const severityColors = { 1: '#22c55e', 2: '#84cc16', 3: '#f59e0b', 4: '#ea580c', 5: '#dc2626' };

    return `<!DOCTYPE html>
<html>
<head>
  <title>Accessibility Issue Report - ${this.escapeHtml(report.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.5; }
    h1 { color: #1f2937; border-bottom: 3px solid #667eea; padding-bottom: 12px; margin-bottom: 8px; }
    .subtitle { color: #6b7280; margin-bottom: 24px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .report-id { background: #f3f4f6; padding: 8px 16px; border-radius: 8px; font-family: monospace; }
    .section { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: #fff; }
    .section-title { font-weight: 700; font-size: 1.1rem; margin-bottom: 16px; color: #374151; display: flex; align-items: center; gap: 8px; }
    .field { margin-bottom: 14px; }
    .field-label { font-weight: 600; color: #6b7280; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .field-value { font-size: 1rem; color: #111827; }
    .severity-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; color: white; font-weight: 700; font-size: 0.9rem; }
    .temp-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #3b82f6; color: white; font-size: 0.8rem; margin-left: 8px; }
    .stats-row { display: flex; gap: 30px; }
    .stat { text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 0.85rem; color: #6b7280; }
    .verified-badge { background: #ecfdf5; border: 2px solid #10b981; color: #059669; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin-top: 12px; display: inline-block; }
    .map-link { color: #667eea; text-decoration: none; }
    .map-link:hover { text-decoration: underline; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 0.85rem; color: #6b7280; }
    .footer strong { color: #374151; }
    .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .photos-grid img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
    @media print { 
      body { padding: 0; } 
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header-row">
    <div>
      <h1>🏛️ Accessibility Issue Report</h1>
      <div class="subtitle">For Municipal 311 Submission</div>
    </div>
    <div class="report-id">
      <strong>ID:</strong> ${report.id?.substring(0, 8) || 'N/A'}
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">📋 Issue Details</div>
    <div class="field">
      <div class="field-label">Report Title</div>
      <div class="field-value" style="font-size: 1.2rem; font-weight: 600;">${this.escapeHtml(report.title)}</div>
    </div>
    <div class="field">
      <div class="field-label">Issue Category</div>
      <div class="field-value">${serviceInfo.name} <span style="color: #6b7280;">(${serviceInfo.group})</span></div>
    </div>
    <div class="field">
      <div class="field-label">Severity Level</div>
      <div class="field-value">
        <span class="severity-badge" style="background: ${severityColors[severity]}">
          ${severity}/5 - ${severityLabels[severity]}
        </span>
        ${report.isTemporary ? '<span class="temp-badge">⏳ TEMPORARY</span>' : ''}
      </div>
    </div>
    <div class="field">
      <div class="field-label">Description</div>
      <div class="field-value">${this.escapeHtml(report.description) || 'No additional description provided'}</div>
    </div>
    <div class="field">
      <div class="field-label">Service Code</div>
      <div class="field-value" style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; display: inline-block;">${serviceInfo.code}</div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">📍 Location Information</div>
    <div class="field">
      <div class="field-label">Address</div>
      <div class="field-value">${this.escapeHtml(report.address) || 'Address not provided'}</div>
    </div>
    <div class="field">
      <div class="field-label">GPS Coordinates</div>
      <div class="field-value">${report.latitude?.toFixed(6) || 'N/A'}, ${report.longitude?.toFixed(6) || 'N/A'}</div>
    </div>
    <div class="field">
      <div class="field-label">View on Map</div>
      <div class="field-value">
        <a class="map-link" href="https://www.google.com/maps?q=${report.latitude},${report.longitude}" target="_blank">
          🗺️ Open in Google Maps →
        </a>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">👥 Community Validation</div>
    <div class="stats-row">
      <div class="stat">
        <div class="stat-value">${report.upvotes || 0}</div>
        <div class="stat-label">Community Upvotes</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.verificationCount || 0}</div>
        <div class="stat-label">User Verifications</div>
      </div>
    </div>
    ${(report.verificationCount || 0) >= 3 ? '<div class="verified-badge">✅ Community Verified Report</div>' : ''}
  </div>
  
  <div class="section">
    <div class="section-title">📅 Timeline & Status</div>
    <div class="field">
      <div class="field-label">Reported On</div>
      <div class="field-value">${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</div>
    </div>
    <div class="field">
      <div class="field-label">Current Status</div>
      <div class="field-value" style="text-transform: uppercase; font-weight: 600;">${report.status || 'NEW'}</div>
    </div>
    ${report.isTemporary && report.expectedResolution ? `
    <div class="field">
      <div class="field-label">Expected Resolution</div>
      <div class="field-value">${new Date(report.expectedResolution).toLocaleDateString()}</div>
    </div>
    ` : ''}
    ${report.statusHistory && report.statusHistory.length > 0 ? `
    <div class="field">
      <div class="field-label">Status History</div>
      <div class="field-value">
        ${report.statusHistory.map(h => `<div style="margin-bottom: 4px;">• ${h.status} - ${new Date(h.timestamp).toLocaleDateString()}</div>`).join('')}
      </div>
    </div>
    ` : ''}
  </div>
  
  ${report.photos && report.photos.length > 0 ? `
  <div class="section">
    <div class="section-title">📷 Photo Evidence (${report.photos.length})</div>
    <div class="photos-grid">
      ${report.photos.slice(0, 6).map((photo, i) => {
        const src = typeof photo === 'string' ? photo : (photo.content || photo.url || '');
        return src ? `<img src="${src}" alt="Evidence photo ${i + 1}">` : '';
      }).join('')}
    </div>
    ${report.photos.length > 6 ? `<p style="color: #6b7280; margin-top: 8px;">+ ${report.photos.length - 6} more photos</p>` : ''}
  </div>
  ` : ''}
  
  <div class="footer">
    <p><strong>Report ID:</strong> ${report.id}</p>
    <p><strong>Source:</strong> Access Nature - Community Accessibility Mapping Platform</p>
    <p><strong>Service Code:</strong> ${serviceInfo.code}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p style="margin-top: 12px;">This report was generated from community-sourced accessibility data. For questions or follow-up, contact the Access Nature platform.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Export multiple reports to CSV format
   * @param {array} reports 
   * @returns {string} CSV content
   */
  exportToCSV(reports) {
    const headers = [
      'Report ID',
      'Title',
      'Issue Type',
      'Service Code',
      'Severity',
      'Priority',
      'Status',
      'Is Temporary',
      'Latitude',
      'Longitude',
      'Address',
      'Description',
      'Upvotes',
      'Verifications',
      'Reported Date',
      'Reporter Name'
    ];

    const severityLabels = { 1: 'Minor', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Critical' };

    const rows = reports.map(report => {
      const serviceInfo = SERVICE_CODES[report.issueType] || SERVICE_CODES.other;
      const date = report.createdAt?.toDate?.() || new Date();
      const severity = report.severity || 3;

      return [
        report.id || '',
        this.escapeCsvField(report.title || ''),
        report.issueType || '',
        serviceInfo.code,
        `${severity} - ${severityLabels[severity]}`,
        severityLabels[severity],
        report.status || 'new',
        report.isTemporary ? 'Yes' : 'No',
        report.latitude?.toFixed(6) || '',
        report.longitude?.toFixed(6) || '',
        this.escapeCsvField(report.address || ''),
        this.escapeCsvField((report.description || '').substring(0, 500)),
        report.upvotes || 0,
        report.verificationCount || 0,
        date.toISOString().split('T')[0],
        this.escapeCsvField(report.userName || 'Anonymous')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Escape CSV field value
   * @param {string} value 
   * @returns {string}
   */
  escapeCsvField(value) {
    if (!value) return '""';
    const escaped = value.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
    return `"${escaped}"`;
  }

  /**
   * Download printable report
   * @param {object} report 
   */
  downloadPrintableReport(report) {
    const html = this.generatePrintableReport(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${report.id?.substring(0, 8) || 'export'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download CSV export
   * @param {array} reports 
   */
  downloadCSV(reports) {
    const csv = this.exportToCSV(reports);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-reports-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Print report directly
   * @param {object} report 
   */
  printReport(report) {
    const html = this.generatePrintableReport(report);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Escape HTML special characters
   * @param {string} str 
   * @returns {string}
   */
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Create and export singleton
export const open311 = new Open311Integration();

// Make available globally
window.open311 = open311;

console.log('📋 Open311 Integration module loaded');