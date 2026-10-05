// Crystalbound Saga — Firebase web config (client-safe keys only).
// 1) Authentication → Email/Password → Enable
// 2) Firestore → create database (production) → paste firestore.rules
// 3) Auth → Authorized domains → localhost + your Vercel host(s)
//
// Leave apiKey empty (or set FIREBASE_ENABLED = false) to keep local-only saves.
window.FIREBASE_ENABLED = true;
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCLRjogqyOyVSSJyJGenySv026UKwSheg0',
  authDomain: 'crystalboundsaga.firebaseapp.com',
  projectId: 'crystalboundsaga',
  storageBucket: 'crystalboundsaga.firebasestorage.app',
  messagingSenderId: '830887390708',
  appId: '1:830887390708:web:014ad57746d842b7be1da1',
};

window.firebaseReady = function firebaseReady() {
  const c = window.FIREBASE_CONFIG;
  return !!(
    window.FIREBASE_ENABLED &&
    c &&
    c.apiKey &&
    c.projectId &&
    typeof firebase !== 'undefined' &&
    firebase.apps
  );
};
