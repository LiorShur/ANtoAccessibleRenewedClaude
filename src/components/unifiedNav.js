/**
 * Access Nature - Unified Navigation Component
 * 
 * This module provides consistent navigation functionality across all pages.
 * Handles menu toggle, auth state, and mobile responsiveness.
 */

class UnifiedNavigation {
  constructor() {
    this.menuToggle = null;
    this.navMenu = null;
    this.navBackdrop = null;
    this.isMenuOpen = false;
    this.currentUser = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  init() {
    this.menuToggle = document.getElementById('menuToggle');
    this.navMenu = document.getElementById('navMenu');
    
    if (!this.menuToggle || !this.navMenu) {
      console.warn('⚠️ Navigation elements not found');
      return;
    }
    
    // Create backdrop for mobile menu
    this.createBackdrop();
    
    // Bind event listeners
    this.bindEvents();
    
    // Setup auth listener
    this.setupAuthListener();
    
    console.log('✅ Unified navigation initialized');
  }
  
  createBackdrop() {
    // Check if backdrop already exists
    if (document.getElementById('navBackdrop')) {
      this.navBackdrop = document.getElementById('navBackdrop');
      return;
    }
    
    this.navBackdrop = document.createElement('div');
    this.navBackdrop.id = 'navBackdrop';
    this.navBackdrop.className = 'nav-backdrop';
    this.navBackdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.navBackdrop);
  }
  
  bindEvents() {
    // Menu toggle click
    this.menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
    
    // Backdrop click closes menu
    if (this.navBackdrop) {
      this.navBackdrop.addEventListener('click', () => this.closeMenu());
    }
    
    // Close menu on nav link click (mobile)
    this.navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          this.closeMenu();
        }
      });
    });
    
    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen) {
        this.closeMenu();
        this.menuToggle.focus();
      }
    });
    
    // Close menu on window resize (if switching to desktop)
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && this.isMenuOpen) {
        this.closeMenu();
      }
    });
    
    // Handle nav auth button click
    const navAuthBtn = document.getElementById('navAuthBtn');
    if (navAuthBtn) {
      navAuthBtn.addEventListener('click', () => this.handleAuthClick());
    }
  }
  
  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }
  
  openMenu() {
    this.isMenuOpen = true;
    this.navMenu.classList.add('active');
    this.navBackdrop?.classList.add('active');
    this.menuToggle.setAttribute('aria-expanded', 'true');
    
    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
    
    // Focus first menu item for accessibility
    const firstLink = this.navMenu.querySelector('.nav-link');
    if (firstLink) {
      setTimeout(() => firstLink.focus(), 100);
    }
  }
  
  closeMenu() {
    this.isMenuOpen = false;
    this.navMenu.classList.remove('active');
    this.navBackdrop?.classList.remove('active');
    this.menuToggle.setAttribute('aria-expanded', 'false');
    
    // Restore body scroll
    document.body.style.overflow = '';
  }
  
  async setupAuthListener() {
    try {
      const { auth } = await import('../firebase-setup.js');
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js');
      
      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
        this.updateAuthUI(user);
      });
    } catch (error) {
      console.warn('⚠️ Failed to setup auth listener for nav:', error);
    }
  }
  
  updateAuthUI(user) {
    const profileNavLink = document.getElementById('profileNavLink');
    const navAuthBtn = document.getElementById('navAuthBtn');
    const authIndicator = document.getElementById('navAuthIndicator');
    const authStatusText = document.getElementById('navAuthStatusText');
    
    if (user) {
      // User is signed in
      if (profileNavLink) profileNavLink.style.display = 'block';
      if (navAuthBtn) navAuthBtn.textContent = 'Sign Out';
      if (authIndicator) authIndicator.classList.add('signed-in');
      if (authStatusText) authStatusText.textContent = user.displayName || user.email?.split('@')[0] || 'User';
      document.body.classList.add('signed-in');
    } else {
      // User is signed out
      if (profileNavLink) profileNavLink.style.display = 'none';
      if (navAuthBtn) navAuthBtn.textContent = 'Sign In';
      if (authIndicator) authIndicator.classList.remove('signed-in');
      if (authStatusText) authStatusText.textContent = 'Guest';
      document.body.classList.remove('signed-in');
    }
  }
  
  async handleAuthClick() {
    if (this.currentUser) {
      // Sign out
      if (confirm('Are you sure you want to sign out?')) {
        try {
          const { auth } = await import('../firebase-setup.js');
          const { signOut } = await import('https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js');
          await signOut(auth);
          this.closeMenu();
        } catch (error) {
          console.error('Sign out error:', error);
        }
      }
    } else {
      // Show sign in modal or redirect
      const authModal = document.getElementById('authModal');
      if (authModal) {
        authModal.classList.remove('hidden');
        this.closeMenu();
      } else {
        // If no auth modal on page, redirect to home
        window.location.href = 'index.html';
      }
    }
  }
  
  /**
   * Set active nav link based on current page
   */
  setActivePage(pageName) {
    this.navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
      
      if (link.getAttribute('href')?.includes(pageName)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }
}

// Auto-initialize
const unifiedNav = new UnifiedNavigation();

// Export for use in other modules
export default unifiedNav;
export { UnifiedNavigation };
