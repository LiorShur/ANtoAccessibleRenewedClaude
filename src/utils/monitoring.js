/**
 * Access Nature - Analytics & Error Monitoring
 * 
 * This module initializes:
 * 1. Google Analytics 4 (GA4) for usage analytics
 * 2. Sentry for error monitoring
 * 
 * SETUP INSTRUCTIONS:
 * 1. Replace 'G-XXXXXXXXXX' with your actual GA4 Measurement ID
 * 2. Replace 'YOUR_SENTRY_DSN' with your Sentry DSN from sentry.io
 * 3. Include this script in all HTML pages
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION - UPDATE THESE VALUES
  // ============================================
  
  const CONFIG = {
    // Google Analytics 4 Measurement ID
    // Get this from: Google Analytics > Admin > Data Streams > your stream > Measurement ID
    GA4_MEASUREMENT_ID: 'G-R6BHMF7B1Z', // TODO: Replace with actual ID
    
    // Sentry DSN (Data Source Name)
    // Get this from: Sentry > Settings > Projects > your project > Client Keys (DSN)
    SENTRY_DSN: 'https://4198ba355b470166ba6141f8efd0fac8@o4510533191270400.ingest.us.sentry.io/4510533199790080', // TODO: Replace with actual DSN like 'https://xxx@xxx.ingest.sentry.io/xxx'
    
    // Environment
    ENVIRONMENT: window.location.hostname === 'localhost' ? 'development' : 'production',
    
    // App version (update with each release)
    APP_VERSION: '1.0.0-beta',
    
    // Enable/disable in development
    ENABLE_IN_DEV: false
  };

  // Skip initialization in development unless explicitly enabled
  if (CONFIG.ENVIRONMENT === 'development' && !CONFIG.ENABLE_IN_DEV) {
    console.log('📊 Analytics/Monitoring disabled in development');
    
    // Create stub functions so code doesn't break
    window.analytics = {
      track: (event, data) => console.log('📊 [DEV] Track:', event, data),
      page: (name) => console.log('📊 [DEV] Page:', name),
      identify: (userId) => console.log('📊 [DEV] Identify:', userId)
    };
    
    window.errorMonitor = {
      captureException: (error) => console.error('🐛 [DEV] Error:', error),
      captureMessage: (msg) => console.warn('🐛 [DEV] Message:', msg),
      setUser: (user) => console.log('🐛 [DEV] Set user:', user)
    };
    
    return;
  }

  // ============================================
  // GOOGLE ANALYTICS 4 SETUP
  // ============================================
  
  function initGoogleAnalytics() {
    if (!CONFIG.GA4_MEASUREMENT_ID || CONFIG.GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
      console.warn('📊 Google Analytics: Measurement ID not configured');
      return;
    }

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA4_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', CONFIG.GA4_MEASUREMENT_ID, {
      'anonymize_ip': true,  // Privacy: anonymize IP addresses
      'allow_google_signals': false,  // Disable advertising features
      'allow_ad_personalization_signals': false
    });

    console.log('📊 Google Analytics initialized');
  }

  // ============================================
  // SENTRY ERROR MONITORING SETUP
  // ============================================
  
  function initSentry() {
    if (!CONFIG.SENTRY_DSN) {
      console.warn('🐛 Sentry: DSN not configured');
      return;
    }

    // Load Sentry SDK
    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/7.100.0/bundle.tracing.min.js';
    script.crossOrigin = 'anonymous';
    
    script.onload = function() {
      if (window.Sentry) {
        Sentry.init({
          dsn: CONFIG.SENTRY_DSN,
          environment: CONFIG.ENVIRONMENT,
          release: `access-nature@${CONFIG.APP_VERSION}`,
          
          // Performance monitoring
          tracesSampleRate: CONFIG.ENVIRONMENT === 'production' ? 0.1 : 1.0,
          
          // Session replay (optional - uses more bandwidth)
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: CONFIG.ENVIRONMENT === 'production' ? 0.1 : 0,
          
          // Filter out common noise
          ignoreErrors: [
            // Browser extensions
            'top.GLOBALS',
            'originalCreateNotification',
            'canvas.contentDocument',
            'MyApp_RemoveAllHighlights',
            'http://tt.teletrax.com',
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
            // Network errors that aren't actionable
            'Network request failed',
            'Failed to fetch',
            'Load failed',
            'NetworkError',
            // Third-party scripts
            /^chrome-extension:/,
            /^moz-extension:/,
          ],
          
          // Before sending error to Sentry
          beforeSend(event, hint) {
            // Don't send errors in localhost
            if (window.location.hostname === 'localhost') {
              return null;
            }
            
            // Filter out errors from browser extensions
            if (event.exception?.values?.[0]?.stacktrace?.frames) {
              const frames = event.exception.values[0].stacktrace.frames;
              const hasExtensionFrame = frames.some(frame => 
                frame.filename?.includes('extension') ||
                frame.filename?.includes('chrome-extension') ||
                frame.filename?.includes('moz-extension')
              );
              if (hasExtensionFrame) {
                return null;
              }
            }
            
            return event;
          }
        });
        
        // Set initial tags
        Sentry.setTag('app_version', CONFIG.APP_VERSION);
        Sentry.setTag('page', window.location.pathname);
        
        console.log('🐛 Sentry error monitoring initialized');
      }
    };
    
    script.onerror = function() {
      console.warn('🐛 Failed to load Sentry SDK');
    };
    
    document.head.appendChild(script);
  }

  // ============================================
  // ANALYTICS HELPER FUNCTIONS
  // ============================================
  
  window.analytics = {
    /**
     * Track a custom event
     * @param {string} eventName - Name of the event
     * @param {object} eventParams - Additional parameters
     */
    track: function(eventName, eventParams = {}) {
      if (window.gtag) {
        gtag('event', eventName, eventParams);
      }
      console.log('📊 Track:', eventName, eventParams);
    },
    
    /**
     * Track a page view
     * @param {string} pageName - Name of the page
     */
    page: function(pageName) {
      if (window.gtag) {
        gtag('event', 'page_view', {
          page_title: pageName,
          page_location: window.location.href,
          page_path: window.location.pathname
        });
      }
    },
    
    /**
     * Identify a user (after sign in)
     * @param {string} userId - User ID (use Firebase UID)
     */
    identify: function(userId) {
      if (window.gtag) {
        gtag('config', CONFIG.GA4_MEASUREMENT_ID, {
          'user_id': userId
        });
      }
      if (window.Sentry) {
        Sentry.setUser({ id: userId });
      }
    },
    
    /**
     * Clear user identity (after sign out)
     */
    clearIdentity: function() {
      if (window.Sentry) {
        Sentry.setUser(null);
      }
    }
  };

  // ============================================
  // ERROR MONITORING HELPER FUNCTIONS
  // ============================================
  
  window.errorMonitor = {
    /**
     * Manually capture an exception
     * @param {Error} error - The error object
     * @param {object} context - Additional context
     */
    captureException: function(error, context = {}) {
      console.error('🐛 Captured exception:', error);
      if (window.Sentry) {
        Sentry.captureException(error, { extra: context });
      }
    },
    
    /**
     * Capture a message (for non-error events)
     * @param {string} message - The message
     * @param {string} level - Severity level (info, warning, error)
     */
    captureMessage: function(message, level = 'info') {
      console.log(`🐛 Captured message [${level}]:`, message);
      if (window.Sentry) {
        Sentry.captureMessage(message, level);
      }
    },
    
    /**
     * Set user context for error reports
     * @param {object} user - User object with id, email, etc.
     */
    setUser: function(user) {
      if (window.Sentry) {
        Sentry.setUser(user ? {
          id: user.uid || user.id,
          email: user.email,
          username: user.displayName
        } : null);
      }
    },
    
    /**
     * Add breadcrumb for debugging
     * @param {object} breadcrumb - Breadcrumb data
     */
    addBreadcrumb: function(breadcrumb) {
      if (window.Sentry) {
        Sentry.addBreadcrumb(breadcrumb);
      }
    }
  };

  // ============================================
  // PREDEFINED ANALYTICS EVENTS
  // ============================================
  
  window.analyticsEvents = {
    // Authentication events
    USER_SIGNED_UP: 'user_signed_up',
    USER_SIGNED_IN: 'user_signed_in',
    USER_SIGNED_OUT: 'user_signed_out',
    
    // Trail recording events
    TRAIL_RECORDING_STARTED: 'trail_recording_started',
    TRAIL_RECORDING_PAUSED: 'trail_recording_paused',
    TRAIL_RECORDING_RESUMED: 'trail_recording_resumed',
    TRAIL_RECORDING_STOPPED: 'trail_recording_stopped',
    TRAIL_PHOTO_ADDED: 'trail_photo_added',
    TRAIL_NOTE_ADDED: 'trail_note_added',
    
    // Trail guide events
    TRAIL_GUIDE_GENERATED: 'trail_guide_generated',
    TRAIL_GUIDE_PUBLISHED: 'trail_guide_published',
    TRAIL_GUIDE_VIEWED: 'trail_guide_viewed',
    TRAIL_GUIDE_PDF_DOWNLOADED: 'trail_guide_pdf_downloaded',
    
    // Accessibility survey events
    SURVEY_STARTED: 'accessibility_survey_started',
    SURVEY_COMPLETED: 'accessibility_survey_completed',
    
    // Report events
    BARRIER_REPORT_SUBMITTED: 'barrier_report_submitted',
    BARRIER_REPORT_VERIFIED: 'barrier_report_verified',
    BARRIER_REPORT_UPDATED: 'barrier_report_updated',
    
    // Profile events
    PROFILE_UPDATED: 'profile_updated',
    MOBILITY_PROFILE_UPDATED: 'mobility_profile_updated',
    DATA_EXPORTED: 'data_exported',
    
    // Engagement events
    TRAIL_SEARCHED: 'trail_searched',
    TRAIL_FILTERED: 'trail_filtered',
    NAVIGATION_STARTED: 'navigation_started',
    
    // Beta events
    BETA_FEEDBACK_SUBMITTED: 'beta_feedback_submitted'
  };

  // ============================================
  // GLOBAL ERROR HANDLER
  // ============================================
  
  window.onerror = function(message, source, lineno, colno, error) {
    // Log to console
    console.error('Global error:', { message, source, lineno, colno, error });
    
    // Send to Sentry
    if (window.Sentry && error) {
      Sentry.captureException(error, {
        extra: {
          message,
          source,
          lineno,
          colno
        }
      });
    }
    
    // Return false to allow default error handling
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (window.Sentry) {
      Sentry.captureException(event.reason || new Error('Unhandled promise rejection'), {
        extra: {
          type: 'unhandledrejection'
        }
      });
    }
  };

  // ============================================
  // INITIALIZE
  // ============================================
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initGoogleAnalytics();
      initSentry();
    });
  } else {
    initGoogleAnalytics();
    initSentry();
  }

  // Track initial page view
  window.addEventListener('load', function() {
    const pageName = document.title || window.location.pathname;
    window.analytics.page(pageName);
  });

})();
