// =================================================================
// BILLU'S DIARY: FIREBASE KERNEL (SILENT SYNC UPGRADE)
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
        
        if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
            this.pushToCloud();
        }
        
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

    async pushToCloud() {
        if (!this.session || !hasInitialSyncCompleted) return;

        const payload = {};
        SYNC_CONFIG.staticKeys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) payload[key] = val;
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
        } catch (error) { console.error("Firebase Sync Failed:", error); }
    },

    startRealTimeSync() {
        if (!this.session || realTimeListener) return;

        realTimeListener = db.collection('users').doc(this.session.uid)
            .onSnapshot((doc) => {
                if (!doc.exists) {
                    hasInitialSyncCompleted = true;
                    AppDB.pushToCloud();
                    return;
                }

                const state = doc.data();
                let needsRefresh = false;
                isInjectingCloudData = true;
                
                // 1. Check Static Keys
                SYNC_CONFIG.staticKeys.forEach(key => {
                    const cloudVal = state[key];
                    const localVal = localStorage.getItem(key);
                    if (typeof cloudVal === 'string' && cloudVal !== localVal) {
                        originalSetItem.call(localStorage, key, cloudVal);
                        needsRefresh = true;
                    }
                });

                // 2. Check Dynamic Keys
                Object.keys(state).forEach(key => {
                    if (key.startsWith('todo_') || key.startsWith('journal_')) {
                        const cloudVal = state[key];
                        const localVal = localStorage.getItem(key);
                        if (typeof cloudVal === 'string' && cloudVal !== localVal) {
                            originalSetItem.call(localStorage, key, cloudVal);
                            needsRefresh = true;
                        }
                    }
                });

                isInjectingCloudData = false;
                hasInitialSyncCompleted = true;

                // CRITICAL FIX: The Soft Sync Engine. No more reloading the page.
                if (needsRefresh) {
                    console.log("Cloud data synced, updating UI silently...");
                    if (window.AppEvents) {
                        // Adding 0 days forces the UI to gracefully re-read from memory
                        window.AppEvents.emit('DATE_CHANGE', { tab: 'todo', direction: 0 });
                        window.AppEvents.emit('DATE_CHANGE', { tab: 'journal', direction: 0 });
                        window.AppEvents.emit('PLANNER_UPDATED'); 
                        window.AppEvents.emit('SUBJECTS_UPDATED');
                    }
                    if (typeof window.forcePlannerRefresh === 'function') {
                        window.forcePlannerRefresh();
                    }
                }
            });
    }
};

window.AppDB = AppDB;

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