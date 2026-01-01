// Navigation and UI panel management
import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';

export class NavigationController {
  constructor() {
    this.currentPanel = null;
  }

  initialize() {
    this.setupPanelToggles();
    console.log('Navigation controller initialized');
  }

  setupPanelToggles() {
    window.togglePanel = (panelId) => this.togglePanel(panelId);
    window.showStorageMonitor = () => this.showStorageMonitor();
    window.clearAllSessions = () => this.clearAllSessions();
    window.clearAllAppData = () => this.clearAllAppData();
  }

  togglePanel(panelId) {
    // Hide all panels first
    const panels = document.querySelectorAll('.bottom-popup');
    panels.forEach(panel => {
      if (panel.id !== panelId) {
        panel.classList.add('hidden');
      }
    });

    // Toggle the requested panel
    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
      targetPanel.classList.toggle('hidden');
      this.currentPanel = targetPanel.classList.contains('hidden') ? null : panelId;
    }
  }

  async showStorageMonitor() {
  try {
    const app = window.AccessNatureApp;
    const storageInfo = await app?.getController('state')?.getStorageInfo();
    
    if (!storageInfo) {
      toast.error('Could not retrieve storage information');
      return;
    }

    const message = `💾 Storage Information:

🗄️ Storage Type: ${storageInfo.storageType}
📊 Usage: ${storageInfo.usageFormatted} / ${storageInfo.quotaFormatted}
📈 Used: ${storageInfo.usagePercent}%
${storageInfo.indexedDBSupported ? '✅ Large Storage Available' : '⚠️ Limited Storage (localStorage)'}
${storageInfo.migrationCompleted ? '✅ Migration Completed' : '🔄 Migration Pending'}

💡 Benefits of IndexedDB:
- Much larger storage capacity (GBs vs MBs)
- Better performance for route data
- Supports photos and large files
- Offline-first design

${storageInfo.usagePercent > 80 ? '⚠️ Storage nearly full! Consider exporting old routes.' : ''}`;
    
    toast.info(message, { duration: 10000 });
    
  } catch (error) {
    console.error('❌ Failed to show storage monitor:', error);
    toast.error('Failed to retrieve storage information');
  }
}

  getStorageInfo() {
    let totalSize = 0;
    let photoCount = 0;
    let photoSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += new Blob([value]).size;
        
        // Count photos in sessions
        if (key === 'sessions') {
          try {
            const sessions = JSON.parse(value);
            sessions.forEach(session => {
              if (session.data) {
                session.data.forEach(entry => {
                  if (entry.type === 'photo' && entry.content) {
                    photoCount++;
                    photoSize += new Blob([entry.content]).size;
                  }
                });
              }
            });
          } catch (error) {
            console.warn('Error parsing sessions for storage info:', error);
          }
        }
      }
    }

    const maxSize = 5 * 1024 * 1024; // 5MB typical localStorage limit
    const usagePercent = (totalSize / maxSize) * 100;

    return {
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(1),
      photoCount,
      photoSizeKB: (photoSize / 1024).toFixed(1),
      usagePercent: usagePercent.toFixed(1),
      isNearLimit: usagePercent > 80
    };
  }

  async clearAllSessions() {
    const confirmed = await modal.confirm('This will permanently clear all saved routes. This cannot be undone!', '⚠️ Clear All Routes?');
    if (confirmed) {
      localStorage.removeItem('sessions');
      localStorage.removeItem('route_backup');
      toast.success('All saved routes have been cleared!');
    }
  }

  async clearAllAppData() {
    const confirmed = await modal.confirm('This will permanently delete all routes, photos, and settings.', '⚠️ Delete All Data?');
    if (confirmed) {
      const keysToKeep = ['darkMode']; // Keep user preferences
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      toast.success('All app data has been cleared!');
      location.reload();
    }
  }

  hideAllPanels() {
    const panels = document.querySelectorAll('.bottom-popup');
    panels.forEach(panel => panel.classList.add('hidden'));
    this.currentPanel = null;
  }

  cleanup() {
    // Remove global functions
    delete window.togglePanel;
    delete window.showStorageMonitor;
    delete window.clearAllSessions;
    delete window.clearAllAppData;
  }

  // Enhanced route management
async showRouteManager() {
  try {
    const app = window.AccessNatureApp;
    const state = app?.getController('state');
    const routes = await state?.getSessions();
    
    if (!routes || routes.length === 0) {
      toast.info('No saved routes found. Start tracking to create your first route!');
      return;
    }

    let message = `📂 Route Manager (${routes.length} routes):\n\n`;
    
    routes.slice(0, 10).forEach((route, index) => {
      const date = new Date(route.date).toLocaleDateString();
      const size = route.dataSize ? ` (${this.formatBytes(route.dataSize)})` : '';
      message += `${index + 1}. ${route.name}\n`;
      message += `   📅 ${date} | 📏 ${route.totalDistance?.toFixed(2) || 0} km${size}\n\n`;
    });

    if (routes.length > 10) {
      message += `... and ${routes.length - 10} more routes\n\n`;
    }

    // Build choices for modal
    const choices = [
      { label: '📂 View All Routes', value: 'all' },
      { label: '📤 Export All', value: 'export' },
      { label: '❌ Cancel', value: 'cancel' }
    ];

    const choice = await modal.choice(message, `📂 Route Manager (${routes.length} routes)`, choices);
    
    if (!choice || choice === 'cancel') return;
    
    if (choice === 'all') {
      this.showAllRoutes(routes);
    } else if (choice === 'export') {
      this.exportAllRoutes(routes);
    }
    
  } catch (error) {
    console.error('❌ Failed to show route manager:', error);
    toast.error('Failed to load routes');
  }
}

async manageRoute(route) {
  const date = new Date(route.date).toLocaleDateString();
  const message = `📅 Created: ${date}
📏 Distance: ${route.totalDistance?.toFixed(2) || 0} km
📊 Data Points: ${route.data?.length || 0}
${route.dataSize ? `💾 Size: ${this.formatBytes(route.dataSize)}` : ''}`;

  const choices = [
    { label: '👁️ View on map', value: 'view' },
    { label: '📤 Export route', value: 'export' },
    { label: '📋 Copy details', value: 'copy' },
    { label: '🗑️ Delete route', value: 'delete' },
    { label: '❌ Cancel', value: 'cancel' }
  ];

  const choice = await modal.choice(message, `🗂️ ${route.name}`, choices);
  
  switch (choice) {
    case 'view':
      this.viewRouteOnMap(route);
      break;
    case 'export':
      this.exportSingleRoute(route);
      break;
    case 'copy':
      this.copyRouteDetails(route);
      break;
    case 'delete':
      this.deleteRoute(route);
      break;
  }
}

formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
}