// Firebase configuration - fetched from server
let firebaseConfig = null;
let firebaseApp = null;
let firebaseAuth = null;

async function initializeFirebase() {
  if (firebaseApp) return firebaseAuth;
  
  try {
    const res = await fetch('/api/config/firebase');
    firebaseConfig = await res.json();
    
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    
    return firebaseAuth;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

function getAuth() {
  return firebaseAuth;
}

function getApp() {
  return firebaseApp;
}
