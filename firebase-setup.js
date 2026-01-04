import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { 
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  CACHE_SIZE_UNLIMITED
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTjQP6uun03RQxhS8Iqy_AcqwrXl47LEE",
  authDomain: "accessible-76181.firebaseapp.com",
  projectId: "accessible-76181",
  storageBucket: "accessible-76181.firebasestorage.app",
  messagingSenderId: "41577077348",
  appId: "1:41577077348:web:c7a91c89f552a9f7169d71",
  measurementId: "G-99QRHT5XBH"
};

// Initialize app - check if already exists
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase app initialized');
} else {
  app = getApp();
  console.log('🔥 Using existing Firebase app');
}

// Initialize Firestore with IndexedDB persistence for offline support
// Using single-tab manager to prevent Target ID conflicts across tabs
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({
        forceOwnership: true  // Force this tab to own persistence
      }),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    })
  });
  console.log('🔥 Firestore initialized with IndexedDB persistence');
} catch (e) {
  // If initializeFirestore fails (already initialized), fall back to getFirestore
  if (e.code === 'failed-precondition' || e.message?.includes('already been called')) {
    db = getFirestore(app);
    console.log('🔥 Using existing Firestore instance');
  } else {
    // For any other error, try getFirestore as last resort
    console.warn('⚠️ Firestore init error:', e.message);
    db = getFirestore(app);
  }
}

export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);

console.log('🔥 Firebase setup complete');