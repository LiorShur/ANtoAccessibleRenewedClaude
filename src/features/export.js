// Export functionality - Fixed to handle both current and saved routes
import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';
import { userService } from '../services/userService.js';
import { trailGuideGeneratorV2 } from './trailGuideGeneratorV2.js';

export class ExportController {
  constructor(appState) {
    this.appState = appState;
    this.dependencies = {};
  }

  setDependencies(deps) {
    this.dependencies = deps;
  }

  initialize() {
    this.setupExportButtons();
    this.setupFileImport();
  }

  setupExportButtons() {
    const buttons = [
      { id: 'prepareAndExportBtn', handler: () => this.showExportOptions() }, // Changed this
      { id: 'exportGPXBtn', handler: () => this.exportGPX() },
      { id: 'exportPDFBtn', handler: () => this.exportPDF() }
    ];

    buttons.forEach(({ id, handler }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
      }
    });
  }

  setupFileImport() {
    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.addEventListener('change', (e) => {
        this.handleFileImport(e);
      });
    }
  }

  // NEW: Show export options - current route or saved routes
  async showExportOptions() {
    const currentRouteData = this.appState.getRouteData();
    const savedSessions = this.appState.getSessions();
    
    let message = '📦 Export Options:\n\n';
    let options = [];

    // Option 1: Current route data
    if (currentRouteData && currentRouteData.length > 0) {
      const locationPoints = currentRouteData.filter(p => p.type === 'location').length;
      const photos = currentRouteData.filter(p => p.type === 'photo').length;
      const notes = currentRouteData.filter(p => p.type === 'text').length;
      
      message += `1. Current Route (${locationPoints} GPS points, ${photos} photos, ${notes} notes)\n`;
      options.push('current');
    }

    // Option 2: Saved routes
    if (savedSessions && savedSessions.length > 0) {
      message += `2. Saved Routes (${savedSessions.length} available)\n`;
      options.push('saved');
    }

    // Option 3: All routes
    if (savedSessions && savedSessions.length > 0) {
      options.push({ label: '📂 All Saved Routes', value: 'all' });
    }

    if (options.length === 0) {
      toast.warning('No route data available to export. Start tracking or load a saved route first.');
      return;
    }

    const choice = await modal.choice('Select which route(s) to export:', '📤 Export Route', options);
    
    if (choice) {
      switch (choice) {
        case 'current':
          this.exportCurrentRoute();
          break;
        case 'saved':
          await this.showSavedRoutesForExport();
          break;
        case 'all':
          this.exportAllRoutes();
          break;
      }
    }
  }

  // Export current active route
  exportCurrentRoute() {
    const routeData = this.appState.getRouteData();
    if (!routeData || routeData.length === 0) {
      toast.warning('No current route data to export');
      return;
    }

    const exportData = {
      exportType: 'current_route',
      exportDate: new Date().toISOString(),
      totalDistance: this.appState.getTotalDistance(),
      elapsedTime: this.appState.getElapsedTime(),
      route: routeData
    };

    this.downloadJSON(exportData, `current-route-${Date.now()}.json`);
    this.showSuccessMessage('✅ Current route exported successfully!');
  }

  // Show list of saved routes for export selection
  async showSavedRoutesForExport() {
    const sessions = this.appState.getSessions();
    if (!sessions || sessions.length === 0) {
      toast.info('No saved routes available');
      return;
    }

    const choices = sessions.map((session, index) => {
      const date = new Date(session.date).toLocaleDateString();
      const distance = session.totalDistance ? `${session.totalDistance.toFixed(2)} km` : '0 km';
      const points = session.data ? session.data.length : 0;
      
      return {
        label: `${session.name} (${date}, ${distance}, ${points} pts)`,
        value: index
      };
    });
    
    choices.push({ label: '❌ Cancel', value: 'cancel' });
    
    const choice = await modal.choice('Select a route to export:', '📂 Export Saved Route', choices);
    
    if (choice !== null && choice !== 'cancel') {
      this.exportSavedRoute(sessions[choice]);
    }
  }

  // Export a specific saved route
  exportSavedRoute(session) {
    const exportData = {
      exportType: 'saved_route',
      exportDate: new Date().toISOString(),
      routeInfo: {
        id: session.id,
        name: session.name,
        originalDate: session.date,
        totalDistance: session.totalDistance,
        elapsedTime: session.elapsedTime
      },
      route: session.data || []
    };

    const filename = `${session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${session.id}.json`;
    this.downloadJSON(exportData, filename);
    this.showSuccessMessage(`✅ "${session.name}" exported successfully!`);
  }

  // Export all saved routes
  exportAllRoutes() {
    const sessions = this.appState.getSessions();
    if (!sessions || sessions.length === 0) {
      toast.info('No saved routes to export');
      return;
    }

    const exportData = {
      exportType: 'all_routes',
      exportDate: new Date().toISOString(),
      totalRoutes: sessions.length,
      routes: sessions.map(session => ({
        id: session.id,
        name: session.name,
        date: session.date,
        totalDistance: session.totalDistance,
        elapsedTime: session.elapsedTime,
        dataPoints: session.data ? session.data.length : 0,
        route: session.data || []
      }))
    };

    this.downloadJSON(exportData, `all-routes-export-${Date.now()}.json`);
    this.showSuccessMessage(`✅ All ${sessions.length} routes exported successfully!`);
  }

  // Updated GPX export to handle both current and saved routes
  async exportGPX() {
    const currentRouteData = this.appState.getRouteData();
    const savedSessions = this.appState.getSessions();
    
    let routeDataToExport = null;
    let filename = `route-${Date.now()}.gpx`;
    
    // Determine what data to export
    if (currentRouteData && currentRouteData.length > 0) {
      const choice = await modal.choice('Which route would you like to export to GPX?', '📤 Export GPX', [
        { label: '📍 Current Route', value: 'current' },
        { label: '📂 Choose from Saved Routes', value: 'saved' },
        { label: '❌ Cancel', value: 'cancel' }
      ]);
      
      if (choice === 'current') {
        routeDataToExport = currentRouteData;
        filename = `current-route-${Date.now()}.gpx`;
      } else if (choice === 'saved' && savedSessions && savedSessions.length > 0) {
        const selectedRoute = await this.selectRouteForExport(savedSessions);
        if (selectedRoute) {
          routeDataToExport = selectedRoute.data;
          filename = `${selectedRoute.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`;
        }
      } else if (choice === 'cancel' || choice === null) {
        return;
      }
    } else if (savedSessions && savedSessions.length > 0) {
      const selectedRoute = await this.selectRouteForExport(savedSessions);
      if (selectedRoute) {
        routeDataToExport = selectedRoute.data;
        filename = `${selectedRoute.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`;
      }
    } else {
      toast.warning('No GPS data available. Record a route with GPS points first.');
      return;
    }
    
    if (!routeDataToExport) return;
    
    const locationPoints = routeDataToExport.filter(point => point.type === 'location' && point.coords);
    
    if (locationPoints.length === 0) {
      toast.warning('No GPS location points found in selected route');
      return;
    }

    try {
      const gpxContent = this.generateGPX(locationPoints);
      this.downloadFile(gpxContent, filename, 'application/gpx+xml');
      toast.success(`GPX file exported with ${locationPoints.length} GPS points!`);
    } catch (error) {
      console.error('GPX export failed:', error);
      toast.error('GPX export failed: ' + error.message);
    }
  }

  // Updated PDF export with route selection
  async exportPDF() {
    if (!window.jsPDF) {
      toast.error('PDF export not available. jsPDF library required.');
      return;
    }

    const currentRouteData = this.appState.getRouteData();
    const savedSessions = this.appState.getSessions();
    
    let routeDataToExport = null;
    let routeInfo = null;
    
    // Determine what data to export
    if (currentRouteData && currentRouteData.length > 0) {
      const choice = await modal.choice('Which route would you like to export to PDF?', '📤 Export PDF', [
        { label: '📍 Current Route', value: 'current' },
        { label: '📂 Choose from Saved Routes', value: 'saved' },
        { label: '❌ Cancel', value: 'cancel' }
      ]);
      
      if (choice === 'current') {
        routeDataToExport = currentRouteData;
        routeInfo = {
          name: 'Current Route',
          totalDistance: this.appState.getTotalDistance(),
          elapsedTime: this.appState.getElapsedTime(),
          date: new Date().toISOString()
        };
      } else if (choice === 'saved' && savedSessions && savedSessions.length > 0) {
        const selectedRoute = await this.selectRouteForExport(savedSessions);
        if (selectedRoute) {
          routeDataToExport = selectedRoute.data;
          routeInfo = selectedRoute;
        }
      } else if (choice === 'cancel' || choice === null) {
        return;
      }
    } else if (savedSessions && savedSessions.length > 0) {
      const selectedRoute = await this.selectRouteForExport(savedSessions);
      if (selectedRoute) {
        routeDataToExport = selectedRoute.data;
        routeInfo = selectedRoute;
      }
    } else {
      toast.warning('No route data available to export to PDF');
      return;
    }
    
    if (!routeDataToExport || !routeInfo) return;

    try {
      this.generatePDFReport(routeDataToExport, routeInfo);
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('PDF export failed: ' + error.message);
    }
  }

  // Helper method to select a route from saved sessions
  async selectRouteForExport(sessions) {
    if (!sessions || sessions.length === 0) return null;
    
    const choices = sessions.map((session, index) => {
      const date = new Date(session.date).toLocaleDateString();
      const distance = session.totalDistance ? `${session.totalDistance.toFixed(2)} km` : '0 km';
      return {
        label: `${session.name} (${date}, ${distance})`,
        value: index
      };
    });
    
    choices.push({ label: '❌ Cancel', value: 'cancel' });
    
    const choice = await modal.choice('Select a route to export:', '📂 Select Route', choices);
    
    if (choice !== null && choice !== 'cancel') {
      return sessions[choice];
    }
    
    return null;
  }

  // Generate PDF report
  generatePDFReport(routeData, routeInfo) {
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('🌲 Access Nature - Route Report', 20, 30);

    // Route info
    doc.setFontSize(14);
    doc.text(`Route: ${routeInfo.name}`, 20, 50);
    
    doc.setFontSize(12);
    const date = new Date(routeInfo.date).toLocaleDateString();
    const time = new Date(routeInfo.date).toLocaleTimeString();
    doc.text(`Date: ${date} ${time}`, 20, 65);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, 75);

    // Statistics
    let yPos = 95;
    doc.setFontSize(14);
    doc.text('📊 Route Statistics:', 20, yPos);
    yPos += 15;
    
    doc.setFontSize(12);
    const stats = [
      `📏 Total Distance: ${routeInfo.totalDistance?.toFixed(2) || 0} km`,
      `⏱️ Duration: ${this.formatDuration(routeInfo.elapsedTime || 0)}`,
      `📍 GPS Points: ${routeData.filter(p => p.type === 'location').length}`,
      `📷 Photos: ${routeData.filter(p => p.type === 'photo').length}`,
      `📝 Notes: ${routeData.filter(p => p.type === 'text').length}`
    ];

    stats.forEach(stat => {
      doc.text(stat, 20, yPos);
      yPos += 10;
    });

    // Notes section
    const notes = routeData.filter(p => p.type === 'text');
    if (notes.length > 0) {
      yPos += 10;
      doc.setFontSize(14);
      doc.text('📝 Route Notes:', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      notes.forEach((note, index) => {
        const noteTime = new Date(note.timestamp).toLocaleTimeString();
        doc.text(`${index + 1}. [${noteTime}] ${note.content}`, 20, yPos);
        yPos += 8;
        
        // Add new page if needed
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
    }

    const filename = `${routeInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`;
    doc.save(filename);
    
    this.showSuccessMessage('✅ PDF report generated successfully!');
  }

  // Keep all the existing methods (generateGPX, handleFileImport, etc.)
  generateGPX(locationPoints) {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Access Nature" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Access Nature Route</name>
    <desc>Generated by Access Nature App</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>Route Track</name>
    <trkseg>`;

    locationPoints.forEach(point => {
      const timestamp = new Date(point.timestamp).toISOString();
      gpx += `
      <trkpt lat="${point.coords.lat}" lon="${point.coords.lng}">
        <time>${timestamp}</time>
      </trkpt>`;
    });

    gpx += `
    </trkseg>
  </trk>
</gpx>`;

    return gpx;
  }

  formatDuration(milliseconds) {
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

  showSuccessMessage(message) {
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

    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 4000);
  }

  async handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const fileType = file.name.toLowerCase().split('.').pop();
      
      if (fileType === 'json') {
        await this.importJSON(file);
      } else if (fileType === 'gpx') {
        await this.importGPX(file);
      } else {
        throw new Error('Unsupported file type. Please use .json or .gpx files.');
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed: ' + error.message);
    }

    event.target.value = '';
  }

  async importJSON(file) {
    const text = await this.readFileAsText(file);
    const data = JSON.parse(text);

    let routeData = null;
    
    // Handle different export formats
    if (data.route && Array.isArray(data.route)) {
      routeData = data.route;
    } else if (data.routes && Array.isArray(data.routes)) {
      // Multiple routes - let user choose
      const choices = data.routes.map((r, i) => ({
        label: r.name || `Route ${i + 1}`,
        value: i
      }));
      choices.push({ label: '❌ Cancel', value: 'cancel' });
      
      const choice = await modal.choice('Multiple routes found. Select one:', '📂 Select Route', choices);
      if (choice !== null && choice !== 'cancel') {
        routeData = data.routes[choice].route;
      }
    }

    if (!routeData || !Array.isArray(routeData)) {
      throw new Error('Invalid JSON format - no route data found');
    }

    let shouldClear = true;
    if (this.appState.getRouteData().length > 0) {
      shouldClear = await modal.confirm('Clear current route data before importing?', '📥 Import Route');
    }

    if (shouldClear) {
      this.appState.clearRouteData();
    }

    routeData.forEach(point => {
      this.appState.addRoutePoint(point);
    });

    toast.success(`Successfully imported ${routeData.length} data points!`);
  }

  async importGPX(file) {
    const text = await this.readFileAsText(file);
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(text, 'text/xml');

    const trackPoints = gpxDoc.querySelectorAll('trkpt');
    if (trackPoints.length === 0) {
      throw new Error('No track points found in GPX file');
    }

    let shouldClear = true;
    if (this.appState.getRouteData().length > 0) {
      shouldClear = await modal.confirm('Clear current route data before importing?', '📥 Import GPX');
    }

    if (shouldClear) {
      this.appState.clearRouteData();
    }

    let importedPoints = 0;
    trackPoints.forEach(trkpt => {
      const lat = parseFloat(trkpt.getAttribute('lat'));
      const lon = parseFloat(trkpt.getAttribute('lon'));
      
      if (isNaN(lat) || isNaN(lon)) return;

      const timeElement = trkpt.querySelector('time');
      
      const point = {
        type: 'location',
        coords: { lat, lng: lon },
        timestamp: timeElement ? new Date(timeElement.textContent).getTime() : Date.now() + importedPoints * 1000
      };

      this.appState.addRoutePoint(point);
      importedPoints++;
    });

    this.showSuccessMessage(`✅ Successfully imported ${importedPoints} GPS points from GPX!`);
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  downloadJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    this.downloadFile(jsonString, filename, 'application/json');
  }

  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    // Track export for engagement
    const format = filename.split('.').pop() || 'unknown';
    if (userService.isInitialized) {
      userService.trackExport(format).catch(err => {
        console.warn('⚠️ Failed to track export:', err.message);
      });
    }
  }

  triggerImport() {
    const importFile = document.getElementById('importFile');
    if (importFile) {
      importFile.click();
    }
  }
  // Add this method to the existing ExportController class
setupExportButtons() {
  const buttons = [
    { id: 'prepareAndExportBtn', handler: () => this.showExportOptions() },
    { id: 'exportGPXBtn', handler: () => this.exportGPX() },
    { id: 'exportPDFBtn', handler: () => this.exportPDF() },
    { id: 'exportSummaryBtn', handler: () => this.exportRouteSummary() } // Make sure this line is here
  ];

  console.log('🔧 Setting up export buttons...');

  buttons.forEach(({ id, handler }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', handler);
      console.log(`✅ Button ${id} found and event listener added`);
    } else {
      console.error(`❌ Button ${id} not found in DOM`);
    }
  });

  // Debug: Check if the button exists after DOM load
  setTimeout(() => {
    const summaryBtn = document.getElementById('exportSummaryBtn');
    console.log('🌐 Summary button check:', summaryBtn ? 'Found' : 'Not found');
    if (summaryBtn) {
      console.log('Button text:', summaryBtn.textContent);
      console.log('Button parent:', summaryBtn.parentElement?.id);
    }
  }, 1000);
}

// NEW: Export Route Summary - Beautiful HTML page for sharing
async exportRouteSummary() {
  const currentRouteData = this.appState.getRouteData();
  const savedSessions = this.appState.getSessions();
  
  let routeDataToExport = null;
  let routeInfo = null;
  let accessibilityData = null;

  // Get accessibility data
  try {
    const storedAccessibilityData = localStorage.getItem('accessibilityData');
    accessibilityData = storedAccessibilityData ? JSON.parse(storedAccessibilityData) : null;
  } catch (error) {
    console.warn('Could not load accessibility data:', error);
  }

  // Determine what data to export
  if (currentRouteData && currentRouteData.length > 0) {
    const choice = await modal.choice('Which route would you like to create a summary for?', '📋 Export Summary', [
      { label: '📍 Current Route', value: 'current' },
      { label: '📂 Choose from Saved Routes', value: 'saved' },
      { label: '❌ Cancel', value: 'cancel' }
    ]);
    
    if (choice === 'current') {
      routeDataToExport = currentRouteData;
      routeInfo = {
        name: 'Current Route',
        totalDistance: this.appState.getTotalDistance(),
        elapsedTime: this.appState.getElapsedTime(),
        date: new Date().toISOString()
      };
    } else if (choice === 'saved' && savedSessions && savedSessions.length > 0) {
      const selectedRoute = await this.selectRouteForExport(savedSessions);
      if (selectedRoute) {
        routeDataToExport = selectedRoute.data;
        routeInfo = selectedRoute;
      }
    } else if (choice === 'cancel' || choice === null) {
      return;
    }
  } else if (savedSessions && savedSessions.length > 0) {
    const selectedRoute = await this.selectRouteForExport(savedSessions);
    if (selectedRoute) {
      routeDataToExport = selectedRoute.data;
      routeInfo = selectedRoute;
    }
  } else {
    toast.warning('No route data available. Record or load a route first.');
    return;
  }

  if (!routeDataToExport || !routeInfo) return;

  try {
    // Use the new trail guide generator V2
    const htmlContent = trailGuideGeneratorV2.generateHTML(routeDataToExport, routeInfo, accessibilityData);
    const filename = `${routeInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_trail_guide.html`;
    
    this.downloadFile(htmlContent, filename, 'text/html');
    toast.success('Trail guide created successfully!');
    
    // Ask if they want to preview it
    const preview = await modal.confirm('Trail guide created! Would you like to preview it in a new tab?', '👁️ Preview Guide');
    if (preview) {
      this.previewRouteSummary(htmlContent);
    }
    
  } catch (error) {
    console.error('Trail guide export failed:', error);
    toast.error('Trail guide export failed: ' + error.message);
  }
}

// Generate beautiful HTML summary page
generateRouteSummaryHTML(routeData, routeInfo, accessibilityData) {
  const locationPoints = routeData.filter(p => p.type === 'location' && p.coords);
  const photos = routeData.filter(p => p.type === 'photo');
  const notes = routeData.filter(p => p.type === 'text');
  
  const date = new Date(routeInfo.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${routeInfo.name} - Accessible Trail Guide</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            color: #2c5530;
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 1.2rem;
            margin-bottom: 20px;
        }
        
        .header .date {
            color: #888;
            font-size: 1rem;
        }
        
        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .card h2 {
            color: #2c5530;
            font-size: 1.8rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            border-left: 5px solid #4a7c59;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #2c5530;
            display: block;
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .accessibility-info {
            grid-column: 1 / -1;
        }
        
        .accessibility-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .accessibility-item {
            padding: 20px;
            background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
            border-radius: 15px;
            border-left: 5px solid #28a745;
        }
        
        .accessibility-item h4 {
            color: #155724;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .accessibility-item p {
            color: #155724;
            margin: 5px 0;
        }

               .accessibility-summary {
  font-weight: bold;
  padding: 8px 15px;
  border-radius: 20px;
  display: inline-block;
}

.accessibility-summary.accessible {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
  border: 1px solid #c3e6cb;
}

.accessibility-summary.partially-accessible {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  color: #856404;
  border: 1px solid #ffeaa7;
}

.accessibility-summary.accessible-with-assistance {
  background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.accessibility-summary.not-accessible {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.summary-item {
  grid-column: 1 / -1;
  text-align: center;
  border: 3px solid #4a7c59;
}
        
        .map-container {
            grid-column: 1 / -1;
            height: 400px;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        #map {
            height: 100%;
            width: 100%;
        }
        
        .photos-section {
            grid-column: 1 / -1;
        }
        
        .photos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .photo-item {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
        }
        
        .photo-item:hover {
            transform: translateY(-5px);
        }
        
        .photo-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        
        .photo-caption {
            padding: 15px;
        }
        
        .photo-time {
            font-size: 0.9rem;
            color: #666;
        }
        
        .notes-section {
            grid-column: 1 / -1;
        }
        
        .notes-list {
            margin-top: 20px;
        }
        
        .note-item {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border-left: 5px solid #ffc107;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
        }
        
        .note-time {
            font-size: 0.9rem;
            color: #856404;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .note-content {
            color: #856404;
            font-size: 1rem;
        }
        
        .footer {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            margin-top: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .footer p {
            color: #666;
            margin-bottom: 10px;
        }
        
        .footer .logo {
            color: #2c5530;
            font-size: 1.2rem;
            font-weight: bold;
        }
        
        .warning-box {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            border: 1px solid #f5c6cb;
            border-left: 5px solid #dc3545;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .warning-box h4 {
            color: #721c24;
            margin-bottom: 10px;
        }
        
        .warning-box p {
            color: #721c24;
            margin: 5px 0;
        }
        
        @media (max-width: 768px) {
            .content {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .photos-grid {
                grid-template-columns: 1fr;
            }
        }
        
        @media print {
            body {
                background: white;
            }
            
            .card, .header, .footer {
                background: white;
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <h1>🌲 ${routeInfo.name}</h1>
            <p class="subtitle">Accessible Trail Guide</p>
            <p class="date">Documented on ${formattedDate}</p>
        </header>

        <!-- Main Content -->
        <div class="content">
            <!-- Route Statistics -->
            <div class="card">
                <h2>📊 Route Overview</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${(routeInfo.totalDistance || 0).toFixed(2)}</span>
                        <span class="stat-label">Kilometers</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.formatDuration(routeInfo.elapsedTime || 0)}</span>
                        <span class="stat-label">Duration</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${locationPoints.length}</span>
                        <span class="stat-label">GPS Points</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${photos.length}</span>
                        <span class="stat-label">Photos</span>
                    </div>
                </div>
            </div>

            <!-- Trail Conditions -->
            <div class="card">
                <h2>🚶 Trail Conditions</h2>
                <div class="warning-box">
                    <h4>⚠️ Important Notice</h4>
                    <p>Trail conditions can change due to weather, season, and maintenance. Always check current conditions before visiting.</p>
                    <p>This information was recorded on ${formattedDate} and may not reflect current conditions.</p>
                </div>
            </div>

            ${accessibilityData ? this.generateAccessibilitySection(accessibilityData) : ''}

            <!-- Interactive Map -->
            ${locationPoints.length > 0 ? `
            <div class="card map-container">
                <div id="map"></div>
            </div>
            ` : ''}

            <!-- Photos Section -->
            ${photos.length > 0 ? `
            <div class="card photos-section">
                <h2>📷 Trail Photos (${photos.length})</h2>
                <div class="photos-grid">
                    ${photos.map(photo => `
                        <div class="photo-item">
                            <img src="${photo.content}" alt="Trail photo" onclick="this.style.position='fixed'; this.style.top='0'; this.style.left='0'; this.style.width='100vw'; this.style.height='100vh'; this.style.objectFit='contain'; this.style.zIndex='9999'; this.style.background='rgba(0,0,0,0.9)'; this.onclick=function(){this.style.position=''; this.style.top=''; this.style.left=''; this.style.width=''; this.style.height=''; this.style.objectFit=''; this.style.zIndex=''; this.style.background=''; this.onclick=null;}">
                            <div class="photo-caption">
                                <div class="photo-time">${new Date(photo.timestamp).toLocaleString()}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Notes Section -->
            ${notes.length > 0 ? `
            <div class="card notes-section">
                <h2>📝 Trail Notes (${notes.length})</h2>
                <div class="notes-list">
                    ${notes.map(note => `
                        <div class="note-item">
                            <div class="note-time">${new Date(note.timestamp).toLocaleString()}</div>
                            <div class="note-content">${note.content}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>

        <!-- Footer -->
        <footer class="footer">
            <p>Generated by <span class="logo">🌲 Access Nature</span></p>
            <p>Making outdoor spaces accessible for everyone</p>
            <p>Report generated on ${new Date().toLocaleDateString()}</p>
        </footer>
    </div>

    ${locationPoints.length > 0 ? `
    <!-- Map JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
    <script>
        // Initialize map
        const map = L.map('map').setView([${bounds.south + (bounds.north - bounds.south) / 2}, ${bounds.west + (bounds.east - bounds.west) / 2}], 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add route polyline
        const routePoints = ${JSON.stringify(locationPoints.map(p => [p.coords.lat, p.coords.lng]))};
        const polyline = L.polyline(routePoints, {
            color: '#4a7c59',
            weight: 4,
            opacity: 0.8
        }).addTo(map);

        // Add start marker
        L.marker([${locationPoints[0].coords.lat}, ${locationPoints[0].coords.lng}])
            .addTo(map)
            .bindPopup('🚩 Start')
            .openPopup();

        // Add end marker
        L.marker([${locationPoints[locationPoints.length - 1].coords.lat}, ${locationPoints[locationPoints.length - 1].coords.lng}])
            .addTo(map)
            .bindPopup('🏁 End');

        // Add photo markers
        ${photos.map(photo => photo.coords ? `
        L.marker([${photo.coords.lat}, ${photo.coords.lng}], {
            icon: L.divIcon({
                html: '📷',
                iconSize: [30, 30],
                className: 'photo-marker'
            })
        }).addTo(map).bindPopup('<img src="${photo.content}" style="width:200px; border-radius:10px;">');
        ` : '').join('')}

        // Fit map to route bounds
        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    </script>
    ` : ''}
</body>
</html>`;

  return html;
}

// Generate accessibility information section
// Enhanced generateAccessibilitySection method for export.js
generateAccessibilitySection(accessibilityData) {
  if (!accessibilityData) return '';

  const formatArray = (arr) => Array.isArray(arr) ? arr.join(', ') : arr;

  return `
    <div class="card accessibility-info">
        <h2>♿ Comprehensive Accessibility Information</h2>
        <div class="accessibility-grid">
            
            <!-- Basic Information -->
            ${accessibilityData.trailName ? `
            <div class="accessibility-item">
                <h4>🗺️ Trail Name</h4>
                <p>${accessibilityData.trailName}</p>
            </div>
            ` : ''}
            
            ${accessibilityData.location ? `
            <div class="accessibility-item">
                <h4>📍 Location</h4>
                <p>${accessibilityData.location}</p>
            </div>
            ` : ''}
            
            ${accessibilityData.trailLength ? `
            <div class="accessibility-item">
                <h4>📏 Trail Length</h4>
                <p>${accessibilityData.trailLength} km</p>
            </div>
            ` : ''}
            
            ${accessibilityData.estimatedTime ? `
            <div class="accessibility-item">
                <h4>⏱️ Estimated Time</h4>
                <p>${accessibilityData.estimatedTime}</p>
            </div>
            ` : ''}

            <!-- Trip and Route Type -->
            ${accessibilityData.tripType ? `
            <div class="accessibility-item">
                <h4>🚶 Trip Type</h4>
                <p>${accessibilityData.tripType}</p>
            </div>
            ` : ''}

            ${accessibilityData.routeType ? `
            <div class="accessibility-item">
                <h4>🔄 Route Type</h4>
                <p>${accessibilityData.routeType}</p>
            </div>
            ` : ''}
            
            <!-- Mobility Accessibility -->
            ${accessibilityData.wheelchairAccess ? `
            <div class="accessibility-item">
                <h4>♿ Wheelchair Accessibility</h4>
                <p>${accessibilityData.wheelchairAccess}</p>
            </div>
            ` : ''}

            ${accessibilityData.disabledParking ? `
            <div class="accessibility-item">
                <h4>🚗 Disabled Parking</h4>
                <p>${formatArray(accessibilityData.disabledParking)}</p>
                ${accessibilityData.parkingSpaces ? `<p>Spaces available: ${accessibilityData.parkingSpaces}</p>` : ''}
            </div>
            ` : ''}

            <!-- Trail Surface -->
            ${accessibilityData.trailSurface ? `
            <div class="accessibility-item">
                <h4>🛤️ Trail Surface</h4>
                <p>${formatArray(accessibilityData.trailSurface)}</p>
            </div>
            ` : ''}

            ${accessibilityData.surfaceQuality ? `
            <div class="accessibility-item">
                <h4>🔍 Surface Quality</h4>
                <p>${accessibilityData.surfaceQuality}</p>
            </div>
            ` : ''}

            ${accessibilityData.trailSlopes ? `
            <div class="accessibility-item">
                <h4>📈 Trail Slopes</h4>
                <p>${accessibilityData.trailSlopes}</p>
            </div>
            ` : ''}

            <!-- Visual & Environmental -->
            ${accessibilityData.visualAdaptations ? `
            <div class="accessibility-item">
                <h4>👁️ Visual Adaptations</h4>
                <p>${formatArray(accessibilityData.visualAdaptations)}</p>
            </div>
            ` : ''}

            ${accessibilityData.shadeCoverage ? `
            <div class="accessibility-item">
                <h4>🌳 Shade Coverage</h4>
                <p>${accessibilityData.shadeCoverage}</p>
            </div>
            ` : ''}

            ${accessibilityData.lighting ? `
            <div class="accessibility-item">
                <h4>💡 Lighting</h4>
                <p>${formatArray(accessibilityData.lighting)}</p>
            </div>
            ` : ''}

            <!-- Facilities -->
            ${accessibilityData.waterFountains ? `
            <div class="accessibility-item">
                <h4>🚰 Water Fountains</h4>
                <p>${accessibilityData.waterFountains}</p>
            </div>
            ` : ''}

            ${accessibilityData.seating ? `
            <div class="accessibility-item">
                <h4>🪑 Seating</h4>
                <p>${formatArray(accessibilityData.seating)}</p>
            </div>
            ` : ''}

            ${accessibilityData.picnicAreas ? `
            <div class="accessibility-item">
                <h4>🧺 Picnic Areas</h4>
                <p>${formatArray(accessibilityData.picnicAreas)}</p>
                ${accessibilityData.picnicCount ? `<p>Total areas: ${accessibilityData.picnicCount}</p>` : ''}
                ${accessibilityData.picnicShade ? `<p>Shaded areas: ${accessibilityData.picnicShade}</p>` : ''}
                ${accessibilityData.picnicSun ? `<p>Sunny areas: ${accessibilityData.picnicSun}</p>` : ''}
            </div>
            ` : ''}

            ${accessibilityData.accessibleViewpoint ? `
            <div class="accessibility-item">
                <h4>🔭 Viewpoints</h4>
                <p>${formatArray(accessibilityData.accessibleViewpoint)}</p>
            </div>
            ` : ''}

            ${accessibilityData.restrooms ? `
            <div class="accessibility-item">
                <h4>🚻 Accessible Restrooms</h4>
                <p>${accessibilityData.restrooms}</p>
            </div>
            ` : ''}

            <!-- Signage & Navigation -->
            ${accessibilityData.signage ? `
            <div class="accessibility-item">
                <h4>🗺️ Signage & Navigation</h4>
                <p>${formatArray(accessibilityData.signage)}</p>
            </div>
            ` : ''}

            ${accessibilityData.qrCode ? `
            <div class="accessibility-item">
                <h4>📱 QR Code Information</h4>
                <p>${formatArray(accessibilityData.qrCode)}</p>
            </div>
            ` : ''}

            <!-- Overall Summary -->
            ${accessibilityData.accessibilitySummary ? `
            <div class="accessibility-item summary-item">
                <h4>📋 Overall Accessibility</h4>
                <p class="accessibility-summary ${accessibilityData.accessibilitySummary.toLowerCase().replace(/\s+/g, '-')}">${accessibilityData.accessibilitySummary}</p>
            </div>
            ` : ''}
            
            ${accessibilityData.additionalNotes ? `
            <div class="accessibility-item" style="grid-column: 1 / -1;">
                <h4>📝 Additional Notes</h4>
                <p>${accessibilityData.additionalNotes}</p>
            </div>
            ` : ''}
            
            ${accessibilityData.surveyorName ? `
            <div class="accessibility-item">
                <h4>👤 Surveyed By</h4>
                <p>${accessibilityData.surveyorName}</p>
            </div>
            ` : ''}
            
            ${accessibilityData.surveyDate ? `
            <div class="accessibility-item">
                <h4>📅 Survey Date</h4>
                <p>${new Date(accessibilityData.surveyDate).toLocaleDateString()}</p>
            </div>
            ` : ''}
        </div>
    </div>
  `;
}

// Preview the generated HTML in a new tab
previewRouteSummary(htmlContent) {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  
  // Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
}