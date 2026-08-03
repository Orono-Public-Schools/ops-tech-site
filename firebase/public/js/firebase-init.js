// Firebase initialization — shared by every page.
// Modular v10 SDK loaded from the gstatic CDN (no bundler).

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD3AEyykrwXwitsL6cD60hxUrKX0bhAw78',
  // Same-origin auth handler (Hosting serves /__/auth/* on this domain):
  // keeps signInWithRedirect working under browser storage partitioning.
  authDomain: 'ops-tech.web.app',
  projectId: 'ops-tech-ed432',
  storageBucket: 'ops-tech-ed432.firebasestorage.app',
  messagingSenderId: '770722055544',
  appId: '1:770722055544:web:524edcea4c8010972af48d'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Persistent IndexedDB cache: repeat page loads render instantly from cache
// while a background server read keeps the cache fresh (see data.js).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const functions = getFunctions(app, 'us-central1');
