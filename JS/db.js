// =================================================================
// BILLU'S DIARY: FIREBASE KERNEL (THE SHIELD UPGRADE)
// =================================================================

const firebaseConfig = {
    apiKey: "AIzaSyAxX3iJr--KNulCnYXqpqe6eew8_0A7lEw",
    authDomain: "gos-backend.firebaseapp.com",
    projectId: "gos-backend",
    storageBucket: "gos-backend.firebasestorage.app",
    messagingSenderId: "806581425030",
    appId: "1:806581425030:web:4d0d607772f11d03431207",
    measurementId: "G-12LLL4M7EL"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence({ synchronizeTabs: true }).catch(err => console.warn("Offline Mode Error:", err.code));

let isInjectingCloudData = false;
let realTimeListener = null;
let authPromise = null; 

// THE SHIELD: Prevents an empty phone from wiping the cloud on boot
let hasInitialSyncCompleted = false; 

const SYNC_CONFIG = {
    staticKeys: ['plannerTargets', 'plannerCompleted', 'plannerSubjects', 'userDisplayName', 'userUltimateGoalName', 'userUltimateGoalDate'],
    dynamicPrefixes: ['todo_', 'journal_']
};

const AppDB = {
    session: null,

    checkSession() {
        if (!authPromise) {
            authPromise = new Promise((resolve) => {
                auth.onAuthStateChanged((user) => {
                    this.session = user;
                    if (user) this.startRealTimeSync();
                    else if (realTimeListener) { realTimeListener(); realTimeListener = null; }
                    resolve(user);
                });
            });
        }
        return authPromise;
    },

    async register(email, password) {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        this.session = userCredential.user;
        this.pushToCloud(); 
        return { requiresVerification: false };
    },

    async login(email, password) {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        this.session = userCredential.user;
        this.startRealTimeSync();
        return userCredential.user;
    },

    async loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        this.session = result.user;
        this.startRealTimeSync();
        return result.user;
    },

    async logout() {
        await auth.signOut();
        this.session = null;
        if (realTimeListener) { realTimeListener(); realTimeListener = null; }
        
        SYNC_CONFIG.staticKeys.forEach(k => localStorage.removeItem(k));
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix))) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        window.location.reload();
    },

    async resetPassword(email) { await auth.sendPasswordResetEmail(email); },
    async updatePassword(newPassword) { if (this.session) await this.session.updatePassword(newPassword); },

    // THE FLAT PAYLOAD ENGINE: Prevents nested array wiping
    async pushToCloud() {
        // THE SHIELD: DO NOT UPLOAD UNTIL WE HAVE DOWNLOADED FIRST
        if (!this.session || !hasInitialSyncCompleted) return;

        const payload = {};
        SYNC_CONFIG.staticKeys.forEach(key => {
            payload[key] = localStorage.getItem(key) || null;
        });

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix))) {
                payload[key] = localStorage.getItem(key);
            }
        }
        
        payload.updated_at = firebase.firestore.FieldValue.serverTimestamp();

        try {
            await db.collection('users').doc(this.session.uid).set(payload, { merge: true });
            console.log("Firebase Sync Successful!");
        } catch (error) { console.error("Firebase Sync Failed:", error); }
    },

    startRealTimeSync() {
        if (!this.session || realTimeListener) return;

        realTimeListener = db.collection('users').doc(this.session.uid)
            .onSnapshot((doc) => {
                // If brand new account, unlock shield and push their local data up
                if (!doc.exists) {
                    hasInitialSyncCompleted = true;
                    AppDB.pushToCloud();
                    return;
                }

                const state = doc.data();
                let needsRefresh = false;
                isInjectingCloudData = true;

                Object.keys(state).forEach(key => {
                    if (key === 'updated_at') return; // Ignore timestamp
                    
                    const localVal = localStorage.getItem(key);
                    const cloudVal = state[key];
                    
                    if (cloudVal !== undefined && cloudVal !== null && cloudVal !== localVal) {
                        originalSetItem.call(localStorage, key, cloudVal);
                        needsRefresh = true;
                    }
                });

                isInjectingCloudData = false;
                hasInitialSyncCompleted = true; // THE SHIELD IS UNLOCKED

                if (needsRefresh) {
                    console.log("Cloud data injected, refreshing UI...");
                    window.location.reload(); 
                }
            });
    }
};

window.AppDB = AppDB;

// THE SAFE WIRETAP
let syncTimeout = null;
const originalSetItem = localStorage.setItem;

localStorage.setItem = function(key, value) {
    try { 
        originalSetItem.apply(window.localStorage, [key, value]); 
    } catch (e) { return; }

    if (isInjectingCloudData) return;
    const isTracked = SYNC_CONFIG.staticKeys.includes(key) || 
                      SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix));

    if (isTracked && AppDB.session) {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            AppDB.pushToCloud();
        }, 2000);
    }
};