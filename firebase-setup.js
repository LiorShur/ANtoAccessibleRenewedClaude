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
  apiKey: "AIzaSyAmsm916Lzp0MUXANq3SECO4ec7q1H0Vu4",
  authDomain: "accessnaturebeta-821a2.firebaseapp.com",
  projectId: "accessnaturebeta-821a2",
  storageBucket: "accessnaturebeta-821a2.appspot.com",
  messagingSenderId: "670888101781",
  appId: "1:670888101781:web:b4cf57f58e86182466589c",
  measurementId: "G-QL82J92CP7"
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