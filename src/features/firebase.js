import { toast } from '../utils/toast.js';
// Firebase operations (simplified)
export class FirebaseController {
  constructor() {
    this.auth = null;
    this.db = null;
    this.user = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase not loaded, skipping initialization');
        return;
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();
      
      this.setupAuthListener();
      this.isInitialized = true;
      console.log('Firebase controller initialized');

    } catch (error) {
      console.error('Firebase initialization failed:', error);
    }
  }

  setupAuthListener() {
    if (!this.auth) return;

    this.auth.onAuthStateChanged((user) => {
      this.user = user;
      if (user) {
        console.log('User signed in:', user.email);
      } else {
        console.log('User signed out');
      }
    });
  }

  async saveRouteToCloud(routeData, metadata = {}) {
    if (!this.user || !this.db) {
      toast.warning('Please sign in to save routes to cloud');
      return;
    }

    try {
      const routeDoc = {
        userId: this.user.uid,
        userEmail: this.user.email,
        routeName: metadata.name || 'Unnamed Route',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        metadata: metadata,
        routeData: routeData
      };

      const docRef = await this.db.collection('routes').add(routeDoc);
      toast.success('Route saved to cloud!');
      return docRef.id;
    } catch (error) {
      console.error('Failed to save route to cloud:', error);
      toast.error('Failed to save route: ' + error.message);
    }
  }

  async loadMyRoutes() {
    if (!this.user || !this.db) {
      toast.warning('Please sign in to load your routes');
      return;
    }

    try {
      const querySnapshot = await this.db.collection('routes')
        .where('userId', '==', this.user.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const routes = [];
      querySnapshot.forEach(doc => {
        routes.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Loaded ${routes.length} routes from cloud`);
      return routes;
    } catch (error) {
      console.error('Failed to load routes:', error);
      return [];
    }
  }
}