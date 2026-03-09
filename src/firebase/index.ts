'use client';

<<<<<<< HEAD
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
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
  } else {
    firebaseApp = getApp();
  }

  const firestore = getFirestore(firebaseApp);

  // Enable persistence FIRST, before any other service is initialized.
  enableMultiTabIndexedDbPersistence(firestore).catch((error: any) => {
    if (error.code === 'failed-precondition') {
      console.warn(
        'Firestore persistence failed: multi-tab execution is likely already running in another tab.'
      );
    } else if (error.code === 'unimplemented') {
      console.warn(
        'Firestore persistence failed: the browser does not support the required features.'
      );
    }
  });

  // NOW initialize other services
  const auth = getAuth(firebaseApp);
  const storage = getStorage(firebaseApp);

  return {
    firebaseApp,
    auth,
    firestore,
    storage,
=======
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
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
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
