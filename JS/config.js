// =================================================================
// CONFIG.JS - SECURE FIREBASE CONFIGURATION
// =================================================================
// IMPORTANT: This file uses environment variables for security.
// In production, deploy with Cloud Build secrets or similar.
// For development, create a .env file (never commit to git).
// 
// .env structure:
// VITE_FIREBASE_API_KEY=your_key
// VITE_FIREBASE_AUTH_DOMAIN=your_domain
// etc.

const firebaseConfig = {
    // Use environment variables (set via build process)
    // Fallback values are EMPTY - must be configured per environment
    apiKey: import.meta?.env?.VITE_FIREBASE_API_KEY || 
            (typeof process !== 'undefined' && process.env.VITE_FIREBASE_API_KEY) ||
            "",
    authDomain: import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN || 
                (typeof process !== 'undefined' && process.env.VITE_FIREBASE_AUTH_DOMAIN) ||
                "",
    projectId: import.meta?.env?.VITE_FIREBASE_PROJECT_ID || 
               (typeof process !== 'undefined' && process.env.VITE_FIREBASE_PROJECT_ID) ||
               "",
    storageBucket: import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET || 
                   (typeof process !== 'undefined' && process.env.VITE_FIREBASE_STORAGE_BUCKET) ||
                   "",
    messagingSenderId: import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || 
                       (typeof process !== 'undefined' && process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
                       "",
    appId: import.meta?.env?.VITE_FIREBASE_APP_ID || 
           (typeof process !== 'undefined' && process.env.VITE_FIREBASE_APP_ID) ||
           "",
    measurementId: import.meta?.env?.VITE_FIREBASE_MEASUREMENT_ID || 
                   (typeof process !== 'undefined' && process.env.VITE_FIREBASE_MEASUREMENT_ID) ||
                   ""
};

// FALLBACK CONFIG FOR DEV (if you need hardcoded values during development ONLY)
// ⚠️ NEVER commit actual credentials to git - use environment variables instead
const FALLBACK_CONFIG = {
    // TODO: Set these via environment variables, not here
};

// Validate config
function validateFirebaseConfig() {
    const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missing = required.filter(key => !firebaseConfig[key]);
    
    if (missing.length > 0) {
        console.error(
            'Firebase config incomplete. Missing: ' + missing.join(', ') +
            '\nSet environment variables: VITE_FIREBASE_* in .env file'
        );
        return false;
    }
    return true;
}

export { firebaseConfig, validateFirebaseConfig };
