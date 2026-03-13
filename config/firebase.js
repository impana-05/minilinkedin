const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const fullPath = path.resolve(serviceAccountPath);

if (fs.existsSync(fullPath)) {
  const serviceAccount = require(fullPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} else {
  console.warn('⚠️  Firebase service account file not found at:', fullPath);
  console.warn('   Firebase Auth verification will not work.');
  // Initialize without credentials for development
  try {
    admin.initializeApp();
  } catch (e) {
    // Already initialized or no credentials
  }
}

module.exports = admin;
