import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase configuration.
 *
 * Provide these values via environment variables (a `.env` file at the project root):
 *
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 *   VITE_FIREBASE_MEASUREMENT_ID=...
 *
 * If no configuration is present, the app falls back to a local sync mode
 * (localStorage + BroadcastChannel) so it still works across tabs on one device.
 */
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error("Failed to initialise Firebase:", err);
    app = null;
    db = null;
  }
}

if (app && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported && app) getAnalytics(app);
    })
    .catch((err) => {
      console.warn("Failed to initialise Firebase Analytics:", err);
    });
}

export { app, db };

/** Firestore collection / document that holds the live scoreboard. */
export const SCOREBOARD_COLLECTION = "scoreboards";
export const SCOREBOARD_DOC_ID = "main";
