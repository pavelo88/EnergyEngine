'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // If no apps are initialized, this is the first run.
  if (!getApps().length) {
    let firebaseApp;
    try {
      // Important! initializeApp() is called without any arguments because Firebase App Hosting
      // integrates with the initializeApp() function to provide the environment variables needed to
      // populate the FirebaseOptions in production.
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development.
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    const firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache(),
    });
    
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore,
      storage: getStorage(firebaseApp),
    };
  }

  // If app is already initialized, just get the existing instances.
  // Persistence is already enabled, so we don't call it again.
  const firebaseApp = getApp();
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
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
