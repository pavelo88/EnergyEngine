'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Hardcoded configuration to ensure connectivity
const firebaseConfig = {
  apiKey: "AIzaSyDG0UPVLgFfsZWvCqByvdXc3_daDbpKLzo",
  authDomain: "studio-5218899653-d333b.firebaseapp.com",
  projectId: "studio-5218899653-d333b",
  storageBucket: "studio-5218899653-d333b.appspot.com",
  messagingSenderId: "534626091746",
  appId: "1:534626091746:web:6e3e901a6138a1665754bb",
  measurementId: "G-R2SJ4K31X8",
};


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  // This check prevents re-initializing the app on every render.
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    try {
      initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache(),
      });
    } catch (e) {
      console.error("Firestore persistence error:", e);
    }
  } else {
    firebaseApp = getApp();
  }

  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);

  return {
    firebaseApp,
    auth,
    firestore,
    storage,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
