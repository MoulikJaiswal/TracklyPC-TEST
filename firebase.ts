
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABuDd5YLHJC3FwJQRtacPtXWEzJ3qk2bk",
  authDomain: "tracklypc.firebaseapp.com",
  // IMPORTANT: Add the databaseURL for Realtime Database
  databaseURL: "https://tracklypc-default-rtdb.firebaseio.com",
  projectId: "tracklypc",
  storageBucket: "tracklypc.firebasestorage.app",
  messagingSenderId: "509028484372",
  appId: "1:509028484372:web:999d1d261e487ee25cae01",
  measurementId: "G-87JBTQW6WN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services so the app can use them
export const auth = getAuth(app);
export const db = getFirestore(app);
// Initialize and export RTDB
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (Safe for SSR/Non-browser environments if applicable)
let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Helper to log events safely
export const logAnalyticsEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

// Create and export a promise that resolves when persistence is enabled.
// The app will wait for this promise before performing any DB operations.
export const dbReadyPromise = (async () => {
  try {
    // Use multi-tab persistence to ensure data syncs across all open tabs.
    await enableMultiTabIndexedDbPersistence(db);
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Firebase persistence failed: Could not acquire lock. Is another app using IndexedDB?');
    } else if (err.code === 'unimplemented') {
      console.warn('Firebase persistence failed: Browser not supported. Data will not be saved offline.');
    } else {
      console.error("Firebase persistence error:", err);
    }
  }
})();