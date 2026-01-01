// Authentication controller with beautiful UI
import { auth, db } from '../../firebase-setup.js';
import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';
import { userService } from '../services/userService.js';
import { trailGuideGeneratorV2 } from './trailGuideGeneratorV2.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

export class AuthController {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.isSavingToCloud = false;     // Add this line
    this.isSelectingRoute = false;    // Add this line
    this.callbacks = {
      onLogin: [],
      onLogout: []
    };
    this.firestoreReady = false;
  }

  async initialize() {
  if (this.isInitialized) return;

  try {
    console.log('🔥 Auth controller starting...');
    
    this.setupEventListeners();
    this.setupAuthStateListener();
    this.adjustLayoutForAuth();
    
    // Force setup buttons
    this.forceSetupButtons();
    
    // Warm up Firestore connection in the background
    this.warmupFirestore();
    
    this.isInitialized = true;
    console.log('🔥 Auth controller initialized');
    
  } catch (error) {
    console.error('❌ Auth initialization failed:', error);
  }
}

// Warm up Firestore connection to avoid cold start issues
async warmupFirestore() {
  try {
    // Import Firestore functions
    const { enableNetwork } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Note: Persistence is now configured in firebase-setup.js
    // Do not call enableIndexedDbPersistence here as it conflicts with the new cache settings
    
    // Try to enable network connection explicitly
    try {
      await enableNetwork(db);
      console.log('🔥 Firestore network enabled');
    } catch (e) {
      // enableNetwork may fail if already enabled, that's OK
    }
    
    this.firestoreReady = true;
    console.log('🔥 Firestore warmed up');
  } catch (error) {
    console.warn('⚠️ Firestore warmup failed (non-critical):', error.message);
  }
}

setupEventListeners() {
  console.log('🔧 Setting up auth event listeners...');
  
  // Show auth modal button
  const showAuthBtn = document.getElementById('showAuthBtn');
  if (showAuthBtn) {
    showAuthBtn.addEventListener('click', () => this.showAuthModal());
  }

  // Login form
  const loginForm = document.querySelector('#loginForm form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => this.handleLogin(e));
  }

  // Signup form
  const signupForm = document.querySelector('#signupForm form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => this.handleSignup(e));
  }

  // Google login buttons
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => this.handleGoogleAuth());
  }
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', () => this.handleGoogleAuth());
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => this.handleLogout());
  }

  // Cloud buttons - set up immediately and with retry
  this.setupCloudButtonsWithRetry();

  // Make global functions available
  window.showAuthModal = () => this.showAuthModal();
  window.closeAuthModal = () => this.closeAuthModal();
  window.switchToLogin = () => this.switchToLogin();
  window.switchToSignup = () => this.switchToSignup();
  
  console.log('✅ Auth event listeners setup complete');
}

// NEW: Setup cloud buttons with retry mechanism
setupCloudButtonsWithRetry() {
  const setupAttempt = (attempt = 1) => {
    console.log(`🔧 Setting up cloud buttons (attempt ${attempt})...`);
    
    const buttons = [
      { id: 'saveToCloudBtn', handler: () => this.saveCurrentRouteToCloud(), label: 'Save to Cloud' },
      { id: 'loadCloudRoutesBtn', handler: () => this.loadUserRoutes(), label: 'Load Cloud Routes' },
      { id: 'loadMyGuidesBtn', handler: () => this.loadMyTrailGuides(), label: 'Load My Guides' }
    ];

    let successCount = 0;
    
    buttons.forEach(({ id, handler, label }) => {
      const button = document.getElementById(id);
      if (button) {
        // Check if already has event listener
        const hasListener = button.onclick || Object.keys(getEventListeners(button)).length > 0;
        
        if (!hasListener) {
          button.addEventListener('click', (e) => {
            console.log(`📱 ${label} clicked`);
            e.preventDefault();
            e.stopPropagation();
            handler();
          });
          
          console.log(`✅ ${label} button setup complete`);
          successCount++;
        } else {
          console.log(`ℹ️ ${label} button already has event listener`);
          successCount++;
        }
      } else {
        console.warn(`⚠️ ${label} button not found (${id})`);
      }
    });
    
    // If not all buttons were found, retry up to 3 times
    if (successCount < buttons.length && attempt < 3) {
      console.log(`🔄 Only ${successCount}/${buttons.length} buttons found, retrying...`);
      setTimeout(() => setupAttempt(attempt + 1), 1000);
    } else {
      console.log(`🎯 Cloud buttons setup complete: ${successCount}/${buttons.length} buttons found`);
    }
  };
  
  // Start setup immediately
  setupAttempt();
  
  // Also setup with delay in case DOM isn't ready
  setTimeout(() => setupAttempt(), 1000);
  setTimeout(() => setupAttempt(), 3000);
}

  setupAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      this.updateUI(user);
      
      if (user) {
        console.log('✅ User signed in:', user.email);
        
        // Verify the user still exists on the server
        try {
          // Try to reload the user to verify they still exist
          await user.reload();
        } catch (reloadError) {
          console.error('❌ User no longer exists on server:', reloadError.message);
          
          // User was deleted - sign them out locally
          if (reloadError.code === 'auth/user-not-found' || 
              reloadError.code === 'auth/user-token-expired' ||
              reloadError.code === 'auth/invalid-user-token') {
            console.log('🔄 Signing out deleted user...');
            try {
              await signOut(auth);
            } catch (e) {
              // Ignore signout errors
            }
            this.currentUser = null;
            this.updateUI(null);
            toast.info('Your session has expired. Please sign in again.');
            return;
          }
        }
        
        // Small delay to let Firestore warmup queries settle
        // This helps avoid "Target ID already exists" conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize userService for engagement tracking
        try {
          await userService.initializeUser(user);
          console.log('✅ UserService initialized');
        } catch (error) {
          console.warn('⚠️ UserService initialization failed:', error.message);
        }
        
        this.executeCallbacks('onLogin', user);
        this.showCloudSyncIndicator('Connected to cloud');
      } else {
        console.log('👋 User signed out');
        
        // Reset userService on logout
        userService.reset();
        
        this.executeCallbacks('onLogout');
      }
    });
  }

  adjustLayoutForAuth() {
    // Adjust top-bar position to account for auth status bar
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
      topBar.style.top = '45px'; // Account for auth status bar height
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput.value || !passwordInput.value) {
      this.showAuthError('Please fill in all fields');
      return;
    }

    try {
      this.setButtonLoading(loginBtn, true);
      
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        emailInput.value, 
        passwordInput.value
      );
      
      console.log('✅ Login successful:', userCredential.user.email);
      this.closeAuthModal();
      this.showSuccessMessage('Welcome back! 🎉');
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      this.showAuthError(this.getFriendlyErrorMessage(error.code));
    } finally {
      this.setButtonLoading(loginBtn, false);
    }
  }

  async handleSignup(event) {
    event.preventDefault();
    
    const signupBtn = document.getElementById('signupBtn');
    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    
    if (!nameInput.value || !emailInput.value || !passwordInput.value) {
      this.showAuthError('Please fill in all fields');
      return;
    }

    if (passwordInput.value.length < 6) {
      this.showAuthError('Password must be at least 6 characters');
      return;
    }

    try {
      this.setButtonLoading(signupBtn, true);
      
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        emailInput.value, 
        passwordInput.value
      );
      
      const user = userCredential.user;
      
      // Save user profile to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: nameInput.value,
        createdAt: new Date().toISOString(),
        routesCount: 0,
        totalDistance: 0
      });
      
      console.log('✅ Signup successful:', user.email);
      this.closeAuthModal();
      this.showSuccessMessage('Account created successfully! Welcome to Access Nature! 🌲');
      
    } catch (error) {
      console.error('❌ Signup failed:', error);
      this.showAuthError(this.getFriendlyErrorMessage(error.code));
    } finally {
      this.setButtonLoading(signupBtn, false);
    }
  }

  async handleGoogleAuth() {
    try {
      this.showCloudSyncIndicator('Connecting to Google...');
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this is a new user and save profile
      if (result._tokenResponse?.isNewUser) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'Google User',
          createdAt: new Date().toISOString(),
          routesCount: 0,
          totalDistance: 0,
          provider: 'google'
        });
      }
      
      console.log('✅ Google sign-in successful:', user.email);
      this.closeAuthModal();
      this.showSuccessMessage('Successfully connected with Google! 🎉');
      
    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        this.showAuthError('Sign-in was cancelled');
      } else {
        this.showAuthError('Google sign-in failed. Please try again.');
      }
    }
  }

  async handleLogout() {
    try {
      const confirmed = await modal.confirm('Are you sure you want to sign out?', '👋 Sign Out');
      if (!confirmed) return;

      await signOut(auth);
      console.log('👋 Logout successful');
      toast.success('See you next time! 👋');
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      toast.error('Logout failed. Please try again.');
    }
  }

  // UI Management Methods
  updateUI(user) {
    const userInfo = document.getElementById('userInfo');
    const authPrompt = document.getElementById('authPrompt');
    const userEmail = document.getElementById('userEmail');
    const cloudButtons = document.querySelectorAll('.cloud-save-btn, .cloud-load-btn');
    const profileNavLink = document.getElementById('profileNavLink');
    const navAuthBtn = document.getElementById('navAuthBtn');

    if (user) {
      // Show user info
      userInfo?.classList.remove('hidden');
      authPrompt?.classList.add('hidden');
      if (userEmail) userEmail.textContent = user.displayName || user.email;

      // Enable cloud features
      cloudButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
      });
      
      // Show profile link
      if (profileNavLink) profileNavLink.style.display = 'block';
      if (navAuthBtn) navAuthBtn.textContent = 'Sign Out';

    } else {
      // Show login prompt
      userInfo?.classList.add('hidden');
      authPrompt?.classList.remove('hidden');

      // Disable cloud features
      cloudButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      });
      
      // Hide profile link
      if (profileNavLink) profileNavLink.style.display = 'none';
      if (navAuthBtn) navAuthBtn.textContent = 'Sign In';
    }
  }

  showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.switchToLogin(); // Default to login
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('hidden');
      this.clearAuthForms();
    }
  }

  switchToLogin() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authModalTitle');

    loginForm?.classList.add('active');
    signupForm?.classList.remove('active');
    
    if (title) title.textContent = 'Welcome Back!';
  }

  switchToSignup() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authModalTitle');

    signupForm?.classList.add('active');
    loginForm?.classList.remove('active');
    
    if (title) title.textContent = 'Join Access Nature';
  }

  clearAuthForms() {
    // Clear all form inputs
    const inputs = document.querySelectorAll('#authModal input');
    inputs.forEach(input => input.value = '');
    
    // Clear any error messages
    this.clearAuthError();
  }

  setButtonLoading(button, loading) {
    if (!button) return;

    const textSpan = button.querySelector('.btn-text');
    const spinnerSpan = button.querySelector('.btn-spinner');

    if (loading) {
      button.disabled = true;
      textSpan?.classList.add('hidden');
      spinnerSpan?.classList.remove('hidden');
    } else {
      button.disabled = false;
      textSpan?.classList.remove('hidden');
      spinnerSpan?.classList.add('hidden');
    }
  }

  showAuthError(message) {
    // Remove existing error if any
    this.clearAuthError();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #ffebee;
      color: #c62828;
      padding: 12px 20px;
      border-radius: 8px;
      margin: 15px 0;
      font-size: 14px;
      border: 1px solid #ffcdd2;
      animation: slideIn 0.3s ease;
    `;

    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
      activeForm.insertBefore(errorDiv, activeForm.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => this.clearAuthError(), 5000);
  }

  clearAuthError() {
    const existingError = document.querySelector('.auth-error');
    if (existingError) {
      existingError.remove();
    }
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
      animation: slideDown 0.3s ease;
    `;

    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 4000);
  }

  showCloudSyncIndicator(message) {
    const indicator = document.getElementById('cloudSyncIndicator');
    const textElement = indicator?.querySelector('.sync-text');
    
    if (indicator && textElement) {
      textElement.textContent = message;
      indicator.classList.remove('hidden');
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        indicator.classList.add('hidden');
      }, 3000);
    }
  }

  getFriendlyErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection'
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  }

  // Cloud functionality methods

// NEW: Let user select which saved route to upload to cloud
// FIXED: Route selection with proper event handling
async selectRouteForCloudSave(sessions) {
  if (!sessions || sessions.length === 0) return null;
  
  // Prevent multiple rapid calls
  if (this.isSelectingRoute) {
    console.log('⏳ Route selection already in progress...');
    return null;
  }
  
  this.isSelectingRoute = true;
  
  try {
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
    
    const choice = await modal.choice('Select a route to save to cloud:', '☁️ Upload Route', choices);
    
    if (choice === null || choice === 'cancel') {
      console.log('Route selection cancelled');
      return null;
    }
    
    const selectedRoute = sessions[choice];
    console.log('✅ Route selected:', selectedRoute.name);
    return selectedRoute;
    
  } finally {
    // Always reset the flag
    setTimeout(() => {
      this.isSelectingRoute = false;
    }, 1000);
  }
}

// UPDATED: Enhanced cloud save with better state management
async saveCurrentRouteToCloud() {
  // Prevent multiple simultaneous saves
  if (this.isSavingToCloud) {
    console.log('⏳ Cloud save already in progress...');
    this.showCloudSyncIndicator('Save already in progress...');
    return;
  }

  if (!this.currentUser) {
    this.showAuthError('Please sign in to save routes to cloud');
    return;
  }

  this.isSavingToCloud = true;

  try {
    const app = window.AccessNatureApp;
    const state = app?.getController('state');
    
    // Check for current route data first
    let routeDataToSave = state?.getRouteData();
    let routeInfo = null;
    
    if (!routeDataToSave || routeDataToSave.length === 0) {
      // No current route data, let user choose from saved routes
      const savedSessions = state?.getSessions();
      
      if (!savedSessions || savedSessions.length === 0) {
        toast.info('No route data available. Record a route first, then save to cloud.');
        return;
      }
      
      console.log('📂 No current route data, showing saved routes...');
      
      // Let user select from saved routes
      const selectedRoute = await this.selectRouteForCloudSave(savedSessions);
      if (!selectedRoute) {
        console.log('No route selected, cancelling cloud save');
        return;
      }
      
      routeDataToSave = selectedRoute.data;
      routeInfo = selectedRoute;
      
      console.log('✅ Selected route for cloud save:', selectedRoute.name);
    } else {
      // Use current route data
      console.log('📍 Using current route data for cloud save');
      
      const routeName = await modal.prompt('Enter a name for this route:', '☁️ Save to Cloud');
      if (!routeName) {
        console.log('No route name provided, cancelling save');
        return;
      }
      
      routeInfo = {
        name: routeName.trim(),
        totalDistance: state?.getTotalDistance() || 0,
        elapsedTime: state?.getElapsedTime() || 0,
        date: new Date().toISOString()
      };
    }

    if (!routeDataToSave || routeDataToSave.length === 0) {
      toast.warning('No valid route data to save to cloud');
      return;
    }

    // Show saving indicator
    this.showCloudSyncIndicator('Saving route to cloud...');
    console.log('☁️ Starting cloud save process for:', routeInfo.name);
    
    // Get accessibility data if available
    let accessibilityData = null;
    try {
      const storedAccessibilityData = localStorage.getItem('accessibilityData');
      accessibilityData = storedAccessibilityData ? JSON.parse(storedAccessibilityData) : null;
    } catch (error) {
      console.warn('Could not load accessibility data:', error);
    }

    // Prepare route document for Firestore
    const routeDoc = {
      userId: this.currentUser.uid,
      userEmail: this.currentUser.email,
      routeName: routeInfo.name,
      createdAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      
      // Route statistics
      totalDistance: routeInfo.totalDistance || 0,
      elapsedTime: routeInfo.elapsedTime || 0,
      originalDate: routeInfo.date,
      
      // Route data
      routeData: routeDataToSave,
      
      // Statistics for quick access
      stats: {
        locationPoints: routeDataToSave.filter(p => p.type === 'location').length,
        photos: routeDataToSave.filter(p => p.type === 'photo').length,
        notes: routeDataToSave.filter(p => p.type === 'text').length,
        totalDataPoints: routeDataToSave.length
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

    console.log('📤 Uploading route document to Firestore...');

    // Import Firestore functions and save
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const docRef = await addDoc(collection(db, 'routes'), routeDoc);
    
    console.log('✅ Route saved to cloud successfully with ID:', docRef.id);
    this.showSuccessMessage(`✅ "${routeInfo.name}" saved to cloud successfully! ☁️`);
    
    // Update user stats (optional)
    await this.updateUserStats();
    
  } catch (error) {
    console.error('❌ Failed to save route to cloud:', error);
    
    // More specific error messages
    if (error.code === 'permission-denied') {
      this.showAuthError('Permission denied. Please check your Firestore security rules.');
    } else if (error.code === 'quota-exceeded') {
      this.showAuthError('Storage quota exceeded. Please contact support.');
    } else if (error.name === 'FirebaseError') {
      this.showAuthError('Firebase error: ' + error.message);
    } else {
      this.showAuthError('Failed to save route to cloud: ' + error.message);
    }
  } finally {
    // Always reset the saving flag
    this.isSavingToCloud = false;
    
    // Hide sync indicator after a delay
    setTimeout(() => {
      const indicator = document.getElementById('cloudSyncIndicator');
      if (indicator) {
        indicator.classList.add('hidden');
      }
    }, 2000);
  }
}

// UPDATED: Better event listener setup with debouncing
setupEventListeners() {
  // Show auth modal button
  const showAuthBtn = document.getElementById('showAuthBtn');
  if (showAuthBtn) {
    showAuthBtn.addEventListener('click', () => this.showAuthModal());
  }

  // Login form
  const loginForm = document.querySelector('#loginForm form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => this.handleLogin(e));
  }

  // Signup form
  const signupForm = document.querySelector('#signupForm form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => this.handleSignup(e));
  }

  // Google login buttons
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const googleSignupBtn = document.getElementById('googleSignupBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => this.handleGoogleAuth());
  }
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', () => this.handleGoogleAuth());
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => this.handleLogout());
  }

  // Cloud save/load buttons with debouncing
  const saveToCloudBtn = document.getElementById('saveToCloudBtn');
  const loadCloudRoutesBtn = document.getElementById('loadCloudRoutesBtn');
  
  if (saveToCloudBtn) {
    // Remove any existing listeners
    const newSaveBtn = saveToCloudBtn.cloneNode(true);
    saveToCloudBtn.parentNode.replaceChild(newSaveBtn, saveToCloudBtn);
    
    // Add single event listener with debouncing
    newSaveBtn.addEventListener('click', this.debounce(() => {
      console.log('☁️ Cloud save button clicked');
      this.saveCurrentRouteToCloud();
    }, 1000)); // 1 second debounce
  }
  
  if (loadCloudRoutesBtn) {
    // Remove any existing listeners
    const newLoadBtn = loadCloudRoutesBtn.cloneNode(true);
    loadCloudRoutesBtn.parentNode.replaceChild(newLoadBtn, loadCloudRoutesBtn);
    
    // Add single event listener with debouncing
    newLoadBtn.addEventListener('click', this.debounce(() => {
      console.log('📂 Load cloud routes button clicked');
      this.loadUserRoutes();
    }, 1000)); // 1 second debounce
  }

  // Make global functions available
  window.showAuthModal = () => this.showAuthModal();
  window.closeAuthModal = () => this.closeAuthModal();
  window.switchToLogin = () => this.switchToLogin();
  window.switchToSignup = () => this.switchToSignup();
}

// NEW: Debounce utility function
debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


// Cloud routes loading is handled by loadUserRoutes method below (around line 1026)

// UPDATED: Better cloud routes display with more info
async showCloudRoutesList(routes) {
  console.log(`📋 Displaying ${routes.length} cloud routes for selection`);
  
  const choices = routes.map((route, index) => {
    const distance = route.totalDistance?.toFixed(2) || 0;
    const stats = `${route.displayDate || 'Unknown date'} | ${distance} km | ${route.locationCount || 0} GPS | ${route.photoCount || 0} photos`;
    
    return {
      label: `${route.routeName || 'Unnamed Route'} (${stats})`,
      value: index
    };
  });
  
  choices.push({ label: '❌ Cancel', value: 'cancel' });
  
  const choice = await modal.choice('Select a route to load:', '☁️ Your Cloud Routes', choices);
  
  console.log('📋 Modal returned choice:', choice, 'type:', typeof choice);
  
  if (choice === null || choice === 'cancel') {
    console.log('📋 User cancelled selection');
    return;
  }
  
  // Convert to number if it's a string number
  const selectedIndex = typeof choice === 'string' ? parseInt(choice, 10) : choice;
  
  if (typeof selectedIndex === 'number' && !isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < routes.length) {
    const selectedRoute = routes[selectedIndex];
    console.log('📋 Selected cloud route:', selectedRoute.id, selectedRoute.routeName);
    await this.loadCloudRouteData(selectedRoute);
  } else {
    console.error('❌ Invalid selection:', choice);
  }
}

// FIXED: Enhanced route loading with proper map display
async loadCloudRouteData(route) {
  // Validate route object
  if (!route || typeof route !== 'object') {
    console.error('❌ Invalid route object:', route);
    toast.error('Unable to load route - invalid data');
    return;
  }
  
  console.log('📥 Loading cloud route:', route.id, route.routeName);
  
  const confirmed = await modal.confirm(`Load "${route.routeName || 'Unnamed Route'}"?\n\nThis will clear your current route data.`, '📥 Load Route');
  if (!confirmed) return;

  const app = window.AccessNatureApp;
  const state = app?.getController('state');
  const mapController = app?.getController('map');
  const timerController = app?.getController('timer');
  
  if (state && route.routeData) {
    try {
      console.log(`📥 Loading cloud route data: ${route.routeName}`);
      
      // Clear current data completely
      state.clearRouteData();
      
      // FIXED: Stop any running timers
      if (timerController) {
        timerController.reset();
      }
      
      // Load route data into state
      route.routeData.forEach(point => {
        state.addRoutePoint(point);
      });
      
      // FIXED: Rebuild path points for map display
      const locationPoints = route.routeData.filter(p => p.type === 'location' && p.coords);
      locationPoints.forEach(p => {
        state.addPathPoint(p.coords);
      });
      
      // Update distance and time
      if (route.totalDistance) {
        state.updateDistance(route.totalDistance);
      }
      if (route.elapsedTime) {
        state.setElapsedTime(route.elapsedTime);
        // Set timer display without starting it
        if (timerController) {
          timerController.setElapsedTime(route.elapsedTime);
        }
      }

      // Load accessibility data if available
      if (route.accessibilityData) {
        localStorage.setItem('accessibilityData', JSON.stringify(route.accessibilityData));
      }

      // FIXED: Display route on map using the enhanced method
      if (mapController && typeof mapController.showRouteData === 'function') {
        console.log('🗺️ Displaying route on map...');
        mapController.showRouteData(route.routeData);
        console.log('✅ Route displayed on map');
      } else {
        console.warn('⚠️ Map controller showRouteData method not available');
      }

      this.showSuccessMessage(`✅ "${route.routeName}" loaded from cloud!`);
      console.log('✅ Cloud route loaded successfully:', route.routeName);
      
    } catch (error) {
      console.error('❌ Failed to load cloud route:', error);
      this.showAuthError('Failed to load route: ' + error.message);
    }
  }
}

// NEW: Update user statistics (optional)
async updateUserStats() {
  try {
    const { doc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const userRef = doc(db, 'users', this.currentUser.uid);
    await updateDoc(userRef, {
      routesCount: increment(1),
      lastUpload: new Date().toISOString()
    });
    
  } catch (error) {
    console.warn('Failed to update user stats:', error);
    // Don't show error to user for this non-critical operation
  }
}

  async loadUserRoutes(retryCount = 0) {
    const MAX_RETRIES = 2;
    
    if (!this.currentUser) {
      this.showAuthError('Please sign in to load your routes');
      return;
    }

    try {
      this.showCloudSyncIndicator(retryCount > 0 ? 'Retrying...' : 'Loading your routes...');

      // Import Firestore functions
      const { collection, query, where, orderBy, getDocs, getDocsFromServer } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      
      const routesQuery = query(
        collection(db, 'routes'),
        where('userId', '==', this.currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      // Try server first to avoid cache conflicts, with 30 second timeout
      let querySnapshot;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 30000)
      );
      
      try {
        // Try getDocsFromServer first to bypass cache issues
        const serverPromise = getDocsFromServer(routesQuery);
        querySnapshot = await Promise.race([serverPromise, timeoutPromise]);
        console.log('📂 Routes loaded from server');
      } catch (serverError) {
        // Fallback to cached getDocs
        console.log('📂 Server fetch failed, trying cache...', serverError.message);
        const cachePromise = getDocs(routesQuery);
        querySnapshot = await Promise.race([cachePromise, timeoutPromise]);
        console.log('📂 Routes loaded from cache');
      }
      
      const routes = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        routes.push({
          id: doc.id,
          ...data,
          // Add computed fields for display
          displayDate: new Date(data.createdAt).toLocaleDateString(),
          displayTime: new Date(data.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          locationCount: data.stats?.locationPoints || 0,
          photoCount: data.stats?.photos || 0,
          noteCount: data.stats?.notes || 0
        });
      });

      if (routes.length === 0) {
        toast.info('No cloud routes found. Start tracking and save your first route!');
        return;
      }

      await this.showCloudRoutesList(routes);
      toast.success(`Found ${routes.length} cloud routes!`);
      
    } catch (error) {
      console.error('❌ Failed to load routes:', error);
      
      // Retry on timeout or unavailable
      if ((error.message === 'Query timeout' || error.code === 'unavailable') && retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        toast.warning('Connection slow, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay between retries
        return this.loadUserRoutes(retryCount + 1);
      }
      
      if (error.message === 'Query timeout') {
        toast.error('Request timed out. Please check your internet connection and try again.');
      } else if (error.code === 'failed-precondition') {
        // Missing index error
        toast.error('Database index required. Please contact support.');
        console.error('Missing Firestore index for routes query. Create composite index: userId (asc), createdAt (desc)');
      } else {
        toast.error('Failed to load routes: ' + error.message);
      }
    }
  }

  async showRoutesList(routes) {
    console.log(`📋 Displaying ${routes.length} routes for selection`);
    
    const choices = routes.map((route, index) => {
      const date = new Date(route.createdAt).toLocaleDateString();
      const distance = route.totalDistance?.toFixed(2) || 0;
      return {
        label: `${route.routeName || 'Unnamed Route'} (${date}) - ${distance} km`,
        value: index
      };
    });
    
    choices.push({ label: '❌ Cancel', value: 'cancel' });
    
    const choice = await modal.choice('Select a route to load:', '📂 Your Routes', choices);
    
    console.log('📋 Modal returned choice:', choice, 'type:', typeof choice);
    
    if (choice === null || choice === 'cancel') {
      console.log('📋 User cancelled selection');
      return;
    }
    
    // Convert to number if it's a string number
    const selectedIndex = typeof choice === 'string' ? parseInt(choice, 10) : choice;
    
    if (typeof selectedIndex === 'number' && !isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < routes.length) {
      const selectedRoute = routes[selectedIndex];
      console.log('📋 Selected route:', selectedRoute.id, selectedRoute.routeName);
      await this.loadRouteData(selectedRoute);
    } else {
      console.error('❌ Invalid selection:', choice);
    }
  }

  async loadRouteData(route) {
  // Validate route object
  if (!route || typeof route !== 'object') {
    console.error('❌ Invalid route object:', route);
    toast.error('Unable to load route - invalid data');
    return;
  }
  
  console.log('📥 Loading route:', route.id, route.routeName);
  
  const confirmed = await modal.confirm(`Load "${route.routeName || 'Unnamed Route'}"? This will clear your current route data.`, '📥 Load Route');
  if (!confirmed) return;

  const app = window.AccessNatureApp;
  const state = app?.getController('state');
  const mapController = app?.getController('map');
  
  if (state) {
    // Clear current route
    state.clearRouteData();
    
    // Load route data
    if (route.routeData && Array.isArray(route.routeData)) {
      route.routeData.forEach(point => {
        state.addRoutePoint(point);
      });
    }
    
    // Set distance and time
    if (route.totalDistance) {
      state.updateDistance(route.totalDistance);
    }
    if (route.elapsedTime) {
      state.setElapsedTime(route.elapsedTime);
    }

    // FIXED: Force map to show route
    if (mapController) {
      console.log('🗺️ Displaying cloud route on map...');
      mapController.showRouteData(route.routeData);
    }

    toast.success('Route loaded successfully!');
    console.log('✅ Route loaded:', route.routeName);
  }
}

  // Event callback system
  onLogin(callback) {
    this.callbacks.onLogin.push(callback);
  }

  onLogout(callback) {
    this.callbacks.onLogout.push(callback);
  }

  executeCallbacks(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Getters
  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  cleanup() {
    // Remove global functions
    delete window.showAuthModal;
    delete window.closeAuthModal;
    delete window.switchToLogin;
    delete window.switchToSignup;
  }

// NEW: Generate and store HTML trail guide automatically
async generateAndStoreTrailGuide(routeId, routeData, routeInfo, accessibilityData) {
  try {
    console.log('🌐 Generating trail guide HTML for:', routeInfo.name);
    
    // Use the new trail guide generator V2
    const htmlContent = trailGuideGeneratorV2.generateHTML(routeData, routeInfo, accessibilityData);
    
    // Create trail guide document
    const trailGuideDoc = {
      routeId: routeId,
      routeName: routeInfo.name,
      userId: this.currentUser.uid,
      userEmail: this.currentUser.email,
      htmlContent: htmlContent,
      generatedAt: new Date().toISOString(),
      isPublic: false, // Private by default
      
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
      
      // Community features (for future)
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
    const guideRef = await addDoc(collection(db, 'trail_guides'), trailGuideDoc);
    
    console.log('✅ Trail guide generated and stored with ID:', guideRef.id);
    
  } catch (error) {
    console.error('❌ Failed to generate trail guide:', error);
    // Don't fail the main save if HTML generation fails
    this.showCloudSyncIndicator('Route saved, trail guide generation failed');
  }
}

// NEW: Make trail guide public/private
async toggleTrailGuideVisibility(guideId, makePublic) {
  try {
    const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const updateData = {
      isPublic: makePublic,
      lastModified: new Date().toISOString()
    };
    
    if (makePublic) {
      updateData.publishedAt = new Date().toISOString();
    }
    
    await updateDoc(doc(db, 'trail_guides', guideId), updateData);
    
    this.showSuccessMessage(`✅ Trail guide ${makePublic ? 'published' : 'made private'}!`);
    
  } catch (error) {
    console.error('❌ Failed to update trail guide visibility:', error);
    this.showAuthError('Failed to update guide visibility: ' + error.message);
  }
}

// NEW: Get user's trail guides with management options
async getUserTrailGuides() {
  try {
    const { collection, query, where, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const guidesQuery = query(
      collection(db, 'trail_guides'),
      where('userId', '==', this.currentUser.uid),
      orderBy('generatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(guidesQuery);
    const guides = [];
    
    querySnapshot.forEach(doc => {
      guides.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return guides;
    
  } catch (error) {
    console.error('❌ Failed to load trail guides:', error);
    throw error;
  }
}

// NEW: Search public trail guides
async searchPublicTrailGuides(filters = {}) {
  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    let guidesQuery = query(
      collection(db, 'trail_guides'),
      where('isPublic', '==', true),
      orderBy('generatedAt', 'desc'),
      limit(50) // Limit for performance
    );
    
    // Add filters if provided
    if (filters.wheelchairAccess) {
      guidesQuery = query(guidesQuery, where('accessibility.wheelchairAccess', '==', filters.wheelchairAccess));
    }
    
    const querySnapshot = await getDocs(guidesQuery);
    const guides = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      guides.push({
        id: doc.id,
        routeName: data.routeName,
        userEmail: data.userEmail,
        generatedAt: data.generatedAt,
        metadata: data.metadata,
        accessibility: data.accessibility,
        community: data.community,
        // Don't include full HTML content in search results for performance
        hasHtml: !!data.htmlContent
      });
    });
    
    return guides;
    
  } catch (error) {
    console.error('❌ Failed to search trail guides:', error);
    throw error;
  }
}

// NEW: Get specific trail guide with HTML content
async getTrailGuide(guideId) {
  try {
    const { doc, getDoc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const guideRef = doc(db, 'trail_guides', guideId);
    const guideSnap = await getDoc(guideRef);
    
    if (!guideSnap.exists()) {
      throw new Error('Trail guide not found');
    }
    
    const guideData = guideSnap.data();
    
    // Increment view count
    await updateDoc(guideRef, {
      'community.views': increment(1)
    });
    
    return {
      id: guideSnap.id,
      ...guideData
    };
    
  } catch (error) {
    console.error('❌ Failed to get trail guide:', error);
    throw error;
  }
}

// Add these methods to your existing AuthController class

// NEW: Rate a trail guide
async rateTrailGuide(guideId, rating, review = '') {
  if (!this.currentUser) {
    this.showAuthError('Please sign in to rate trail guides');
    return;
  }

  try {
    const { doc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const ratingData = {
      userId: this.currentUser.uid,
      userEmail: this.currentUser.email,
      rating: rating,
      review: review,
      timestamp: new Date().toISOString()
    };

    // Add rating to trail guide
    await updateDoc(doc(db, 'trail_guides', guideId), {
      'community.ratings': arrayUnion(ratingData)
    });

    // Recalculate average rating
    await this.updateAverageRating(guideId);

    this.showSuccessMessage('✅ Rating submitted successfully!');

  } catch (error) {
    console.error('❌ Failed to rate trail guide:', error);
    this.showAuthError('Failed to submit rating: ' + error.message);
  }
}

// NEW: Update average rating for a trail guide
async updateAverageRating(guideId) {
  try {
    const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const guideRef = doc(db, 'trail_guides', guideId);
    const guideSnap = await getDoc(guideRef);
    
    if (guideSnap.exists()) {
      const data = guideSnap.data();
      const ratings = data.community?.ratings || [];
      
      if (ratings.length > 0) {
        const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        
        await updateDoc(guideRef, {
          'community.averageRating': Math.round(average * 10) / 10 // Round to 1 decimal
        });
      }
    }

  } catch (error) {
    console.error('❌ Failed to update average rating:', error);
  }
}

// NEW: Search trails by region
async searchTrailsByRegion(region, filters = {}) {
  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    let guidesQuery = query(
      collection(db, 'trail_guides'),
      where('isPublic', '==', true),
      where('accessibility.location', '>=', region),
      where('accessibility.location', '<=', region + '\uf8ff'),
      orderBy('accessibility.location'),
      orderBy('generatedAt', 'desc'),
      limit(50)
    );

    // Apply additional filters
    if (filters.wheelchairAccess) {
      guidesQuery = query(guidesQuery, where('accessibility.wheelchairAccess', '==', filters.wheelchairAccess));
    }

    const querySnapshot = await getDocs(guidesQuery);
    const guides = [];
    
    querySnapshot.forEach(doc => {
      guides.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return guides;

  } catch (error) {
    console.error('❌ Failed to search trails by region:', error);
    throw error;
  }
}

// NEW: Get trail guide versions (for future versioning feature)
async getTrailGuideVersions(routeId) {
  try {
    const { collection, query, where, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const versionsQuery = query(
      collection(db, 'trail_guides'),
      where('routeId', '==', routeId),
      orderBy('generatedAt', 'desc')
    );

    const querySnapshot = await getDocs(versionsQuery);
    const versions = [];
    
    querySnapshot.forEach(doc => {
      versions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return versions;

  } catch (error) {
    console.error('❌ Failed to get trail guide versions:', error);
    throw error;
  }
}

// NEW: Update trail guide with new version
async updateTrailGuide(originalGuideId, routeData, routeInfo, accessibilityData) {
  try {
    // Create new version instead of updating existing
    const newGuideDoc = {
      routeId: originalGuideId, // Link to original
      routeName: routeInfo.name,
      userId: this.currentUser.uid,
      userEmail: this.currentUser.email,
      htmlContent: trailGuideGeneratorV2.generateHTML(routeData, routeInfo, accessibilityData),
      generatedAt: new Date().toISOString(),
      isPublic: false, // New version starts private
      
      // Version info
      version: {
        previousVersion: originalGuideId,
        versionNumber: 2, // This would be calculated properly
        updateReason: 'Trail conditions updated'
      },
      
      // Copy metadata structure from auto-generation function
      metadata: {
        totalDistance: routeInfo.totalDistance || 0,
        elapsedTime: routeInfo.elapsedTime || 0,
        originalDate: routeInfo.date,
        locationCount: routeData.filter(p => p.type === 'location').length,
        photoCount: routeData.filter(p => p.type === 'photo').length,
        noteCount: routeData.filter(p => p.type === 'text').length
      },
      
      accessibility: accessibilityData ? {
        wheelchairAccess: accessibilityData.wheelchairAccess || 'Unknown',
        trailSurface: accessibilityData.trailSurface || 'Unknown',
        difficulty: accessibilityData.difficulty || 'Unknown',
        facilities: accessibilityData.facilities || [],
        location: accessibilityData.location || 'Unknown'
      } : null,
      
      community: {
        views: 0,
        downloads: 0,
        ratings: [],
        averageRating: 0,
        reviews: []
      }
    };

    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const newGuideRef = await addDoc(collection(db, 'trail_guides'), newGuideDoc);

    this.showSuccessMessage('✅ Trail guide updated with new version!');
    return newGuideRef.id;

  } catch (error) {
    console.error('❌ Failed to update trail guide:', error);
    throw error;
  }
}

// ADD this to your auth.js for testing
async makeAllMyGuidesPublic() {
  if (!this.currentUser) {
    console.log('Not logged in');
    return;
  }
  
  try {
    const { collection, query, where, getDocs, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Get user's private guides
    const myGuidesQuery = query(
      collection(db, 'trail_guides'),
      where('userId', '==', this.currentUser.uid),
      where('isPublic', '==', false)
    );
    
    const snapshot = await getDocs(myGuidesQuery);
    console.log(`Found ${snapshot.size} private guides to make public`);
    
    // Make them public
    const updatePromises = [];
    snapshot.forEach(docSnap => {
      const guideRef = doc(db, 'trail_guides', docSnap.id);
      updatePromises.push(updateDoc(guideRef, {
        isPublic: true,
        publishedAt: new Date().toISOString()
      }));
    });
    
    await Promise.all(updatePromises);
    console.log('✅ Made all guides public');
    
  } catch (error) {
    console.error('❌ Failed to make guides public:', error);
  }
}

// UPDATED: Load and display user's trail guides with better error handling and retry
async loadMyTrailGuides(retryCount = 0) {
  const MAX_RETRIES = 2;
  
  if (!this.currentUser) {
    this.showAuthError('Please sign in to view your trail guides');
    return;
  }

  try {
    console.log(`📂 Loading user trail guides... ${retryCount > 0 ? `(retry ${retryCount})` : ''}`);
    this.showCloudSyncIndicator(retryCount > 0 ? 'Retrying...' : 'Loading your trail guides...');
    
    // Import Firestore functions
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    console.log('🔍 Querying for userId:', this.currentUser.uid);
    
    // Create filtered query
    let guidesQuery;
    try {
      guidesQuery = query(
        collection(db, 'trail_guides'),
        where('userId', '==', this.currentUser.uid)
      );
    } catch (queryError) {
      console.error('❌ Query creation failed:', queryError);
      toast.error('Failed to create query: ' + queryError.message);
      return;
    }

    console.log('📤 Executing Firestore query...');
    
    // Add timeout to the query (15 seconds to allow for slow connections)
    const queryPromise = getDocs(guidesQuery);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 15000)
    );
    
    const querySnapshot = await Promise.race([queryPromise, timeoutPromise]);
    
    console.log('📥 Query completed, processing results...');
    
    const guides = [];
    querySnapshot.forEach(doc => {
      guides.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort client-side if we used simple query (no orderBy)
    guides.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    
    console.log(`✅ Found ${guides.length} user trail guides`);
    
    if (guides.length === 0) {
      toast.info('No trail guides found. Record a route and save to cloud to create a trail guide.');
      return;
    }
    
    // Show the guides list - don't show success toast here as it's confusing
    await this.displayMyGuides(guides);
    
  } catch (error) {
    console.error('❌ Failed to load trail guides:', error);
    
    // Retry on timeout or unavailable errors
    if ((error.message === 'Query timeout' || error.code === 'unavailable') && retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      toast.warning('Connection slow, retrying...');
      // Wait a moment before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.loadMyTrailGuides(retryCount + 1);
    }
    
    // Handle specific error types
    if (error.message === 'Query timeout') {
      toast.error('Request timed out. Please check your internet connection and try again.');
    } else if (error.code === 'permission-denied') {
      toast.error('Permission denied. Please check your Firestore security rules.');
    } else if (error.code === 'unavailable') {
      toast.error('Firestore service temporarily unavailable. Try again in a moment.');
    } else {
      toast.error('Failed to load trail guides: ' + error.message);
    }
  } finally {
    // Hide loading indicator
    setTimeout(() => {
      const indicator = document.getElementById('cloudSyncIndicator');
      if (indicator) {
        indicator.classList.add('hidden');
      }
    }, 1000);
  }
}

// Manage individual guide
async manageGuide(guide) {
  // Validate guide object
  if (!guide || typeof guide !== 'object') {
    console.error('❌ Invalid guide object:', guide);
    toast.error('Unable to manage guide - invalid data');
    return;
  }
  
  console.log('📋 Managing guide:', guide.id, guide.routeName);
  
  const toggleLabel = guide.isPublic ? '🔒 Make Private' : '🌍 Make Public';
  
  const choice = await modal.choice(`Manage "${guide.routeName || 'Unnamed Guide'}":`, '🌐 Trail Guide', [
    { label: '👁️ View Trail Guide', value: 'view' },
    { label: toggleLabel, value: 'toggle' },
    { label: '🗑️ Delete Guide', value: 'delete' },
    { label: '❌ Cancel', value: 'cancel' }
  ]);
  
  console.log('📋 User chose:', choice);
  
  switch (choice) {
    case 'view':
      console.log('👁️ Opening trail guide:', guide.id);
      await this.viewTrailGuide(guide.id);
      break;
    case 'toggle':
      await this.toggleTrailGuideVisibility(guide.id, !guide.isPublic);
      break;
    case 'delete':
      await this.deleteTrailGuide(guide.id);
      break;
    default:
      console.log('📋 Cancelled or invalid choice');
      break;
  }
}

// NEW: Display user's guides in the panel
async displayMyGuides(guides) {
  // Validate guides array
  if (!guides || !Array.isArray(guides) || guides.length === 0) {
    toast.info('No trail guides to display');
    return;
  }
  
  console.log(`📋 Displaying ${guides.length} guides for selection`);
  
  const choices = guides.map((guide, index) => {
    const date = new Date(guide.generatedAt).toLocaleDateString();
    const stats = guide.metadata || {};
    const visibility = guide.isPublic ? '🌍' : '🔒';
    const distance = (stats.totalDistance || 0).toFixed(1);
    
    return {
      label: `${visibility} ${guide.routeName || 'Unnamed'} (${date}, ${distance} km)`,
      value: index
    };
  });
  
  choices.push({ label: '❌ Cancel', value: 'cancel' });
  
  const choice = await modal.choice('Select a guide to manage:', '🌐 Your Trail Guides', choices);
  
  console.log('📋 Modal returned choice:', choice, 'type:', typeof choice);
  
  // Handle the selection
  if (choice === null || choice === 'cancel') {
    console.log('📋 User cancelled selection');
    return;
  }
  
  // Convert to number if it's a string number
  const selectedIndex = typeof choice === 'string' ? parseInt(choice, 10) : choice;
  
  console.log('📋 Selected index:', selectedIndex, 'guides available:', guides.length);
  
  if (typeof selectedIndex === 'number' && !isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < guides.length) {
    const selectedGuide = guides[selectedIndex];
    console.log('📋 Selected guide:', selectedGuide.id, selectedGuide.routeName);
    await this.manageGuide(selectedGuide);
  } else {
    console.error('❌ Invalid selection:', choice);
  }
}

// NEW: Create HTML for a guide item
createGuideItem(guide) {
  const date = new Date(guide.generatedAt).toLocaleDateString();
  const stats = guide.metadata || {};
  
  return `
    <div class="guide-item">
      <div class="guide-header">
        <div class="guide-name">${guide.routeName}</div>
        <div class="guide-visibility ${guide.isPublic ? 'guide-public' : 'guide-private'}">
          ${guide.isPublic ? '🌍 Public' : '🔒 Private'}
        </div>
      </div>
      
      <div class="guide-meta">
        📅 ${date} | 📏 ${(stats.totalDistance || 0).toFixed(1)} km | 
        📍 ${stats.locationCount || 0} GPS | 📷 ${stats.photoCount || 0} photos
        ${guide.community?.views ? `| 👁️ ${guide.community.views} views` : ''}
      </div>
      
      <div class="guide-actions">
        <button class="guide-btn guide-btn-view" onclick="viewMyTrailGuide('${guide.id}')">
          👁️ View
        </button>
        <button class="guide-btn guide-btn-toggle" onclick="toggleGuideVisibility('${guide.id}', ${!guide.isPublic})">
          ${guide.isPublic ? '🔒 Make Private' : '🌍 Make Public'}
        </button>
        <button class="guide-btn guide-btn-delete" onclick="deleteTrailGuide('${guide.id}')">
          🗑️ Delete
        </button>
      </div>
    </div>
  `;
}

// UPDATED: Toggle guide visibility with confirmation
async toggleTrailGuideVisibility(guideId, makePublic) {
  const action = makePublic ? 'publish' : 'make private';
  const warning = makePublic 
    ? 'This will make your trail guide visible to everyone.' 
    : 'This will hide your trail guide from public search.';
    
  const confirmed = await modal.confirm(`${warning}\n\nAre you sure you want to ${action} this trail guide?`, makePublic ? '🌍 Publish Guide' : '🔒 Make Private');
  
  if (!confirmed) return;

  try {
    const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    const updateData = {
      isPublic: makePublic,
      lastModified: new Date().toISOString()
    };
    
    if (makePublic) {
      updateData.publishedAt = new Date().toISOString();
    }
    
    await updateDoc(doc(db, 'trail_guides', guideId), updateData);
    
    toast.success(`Trail guide ${makePublic ? 'published' : 'made private'}!`);
    
    // Reload the guides list
    this.loadMyTrailGuides();
    
  } catch (error) {
    console.error('❌ Failed to update trail guide visibility:', error);
    toast.error('Failed to update guide visibility: ' + error.message);
  }
}

// NEW: Delete trail guide
// Delete trail guide
async deleteTrailGuide(guideId) {
  const confirmed = await modal.confirm('Are you sure you want to permanently delete this trail guide?\n\nThis action cannot be undone!', '⚠️ Delete Trail Guide');
  
  if (!confirmed) return;

  try {
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    await deleteDoc(doc(db, 'trail_guides', guideId));
    
    toast.success('Trail guide deleted!');
    
  } catch (error) {
    console.error('❌ Failed to delete trail guide:', error);
    toast.error('Failed to delete guide: ' + error.message);
  }
}

// SIMPLE: Quick test method for loading guides
async testLoadGuides() {
  if (!this.currentUser) {
    toast.warning('Please sign in first');
    return;
  }

  try {
    console.log('🧪 Testing guide loading...');
    toast.info('Loading guides... check console for progress');
    
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Simple query without orderBy to avoid index issues
    const guidesQuery = query(
      collection(db, 'trail_guides'),
      where('userId', '==', this.currentUser.uid)
    );
    
    const querySnapshot = await getDocs(guidesQuery);
    const guides = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      guides.push({
        id: doc.id,
        name: data.routeName,
        isPublic: data.isPublic,
        created: data.generatedAt
      });
    });
    
    console.log('✅ Found guides:', guides);
    
    if (guides.length === 0) {
      toast.info('No trail guides found for your account.');
    } else {
      toast.success(`Found ${guides.length} trail guides! Check console for details.`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    toast.error('Test failed: ' + error.message);
  }
}

// NEW: View trail guide method for AuthController
async viewTrailGuide(guideId) {
  try {
    console.log('👁️ Viewing trail guide:', guideId);
    
    // Import Firestore functions
    const { doc, getDoc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Get the trail guide document
    const guideRef = doc(db, 'trail_guides', guideId);
    const guideSnap = await getDoc(guideRef);
    
    if (!guideSnap.exists()) {
      toast.error('Trail guide not found');
      return;
    }
    
    const guideData = guideSnap.data();
    
    // Check if user can view this guide
    const canView = guideData.isPublic || (this.currentUser && this.currentUser.uid === guideData.userId);
    
    if (!canView) {
      toast.error('This trail guide is private and you don\'t have permission to view it.');
      return;
    }
    
    // Increment view count (only for public guides and if not the owner)
    if (guideData.isPublic && (!this.currentUser || this.currentUser.uid !== guideData.userId)) {
      try {
        await updateDoc(guideRef, {
          'community.views': increment(1)
        });
        console.log('📈 View count incremented');
      } catch (error) {
        console.warn('Failed to increment view count:', error);
      }
    }
    
    // Show the HTML content
    if (guideData.htmlContent) {
      this.displayTrailGuideHTML(guideData.htmlContent, guideData.routeName);
    } else {
      toast.error('Trail guide content not available');
    }
    
  } catch (error) {
    console.error('❌ Failed to view trail guide:', error);
    toast.error('Failed to load trail guide: ' + error.message);
  }
}

// NEW: Display trail guide HTML
async displayTrailGuideHTML(htmlContent, routeName) {
  try {
    // Create blob and open in new tab
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window/tab
    const newWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (!newWindow) {
      // Popup blocked, offer download instead
      const downloadConfirm = await modal.confirm('Popup blocked! Would you like to download the trail guide instead?', '📥 Download Guide');
      if (downloadConfirm) {
        this.downloadTrailGuide(htmlContent, routeName);
      }
    } else {
      // Set window title
      newWindow.document.title = `${routeName} - Trail Guide`;
    }
    
    // Clean up URL after delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
  } catch (error) {
    console.error('❌ Failed to display trail guide:', error);
    toast.error('Failed to display trail guide: ' + error.message);
  }
}

// NEW: Download trail guide as HTML file
downloadTrailGuide(htmlContent, routeName) {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName.replace(/[^a-z0-9]/gi, '_')}_trail_guide.html`;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('✅ Trail guide downloaded');
    toast.success('Trail guide downloaded!');
    
  } catch (error) {
    console.error('❌ Failed to download trail guide:', error);
    toast.error('Failed to download trail guide: ' + error.message);
  }
}

// NEW: Force setup buttons immediately
forceSetupButtons() {
  console.log('🔨 Force setting up buttons...');
  
  // Use setTimeout to ensure DOM is ready
  const setupButtons = () => {
    const loadMyGuidesBtn = document.getElementById('loadMyGuidesBtn');
    
    if (loadMyGuidesBtn) {
      console.log('🔧 Found loadMyGuidesBtn, setting up...');
      
      // Remove all existing listeners
      const newBtn = loadMyGuidesBtn.cloneNode(true);
      loadMyGuidesBtn.parentNode.replaceChild(newBtn, loadMyGuidesBtn);
      
      // Add our listener
      newBtn.addEventListener('click', (e) => {
        console.log('🌐 Load My Guides clicked (forced setup)');
        e.preventDefault();
        e.stopPropagation();
        this.loadMyTrailGuides();
      });
      
      console.log('✅ loadMyGuidesBtn setup complete');
      return true;
    } else {
      // Only warn if we're on tracker.html where the button should exist
      if (window.location.pathname.includes('tracker')) {
        console.warn('⚠️ loadMyGuidesBtn not found on tracker page');
      }
      return false;
    }
  };
  
  // Try setup immediately
  if (!setupButtons()) {
    // If failed and we're on tracker page, retry with delays
    if (window.location.pathname.includes('tracker')) {
      setTimeout(setupButtons, 500);
      setTimeout(setupButtons, 1000);
      setTimeout(setupButtons, 2000);
    }
  }
}
}

// Auto-initialize when imported - only on tracker page
const authController = new AuthController();
document.addEventListener('DOMContentLoaded', () => {
  // Only auto-initialize on tracker.html - landing page has its own auth controller
  if (window.location.pathname.includes('tracker')) {
    authController.initialize();
  }
});

// Re-export userService for convenience
export { userService };

// Make userService globally accessible for console debugging
if (typeof window !== 'undefined') {
  window.userService = userService;
}

export default authController;