// =================================================================
// BILLU'S DIARY: FIREBASE KERNEL (STRICT PROTOTYPE BINDING)
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

window.isInjectingCloudData = false;
window.hasInitialSyncCompleted = false;
window.syncTimeout = null;

let realTimeListener = null;
let authPromise = null; 

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
        if (!this.session || !window.hasInitialSyncCompleted) return;

        const payload = {};
        SYNC_CONFIG.staticKeys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val !== null && val !== undefined) payload[key] = val;
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
                    window.hasInitialSyncCompleted = true;
                    AppDB.pushToCloud();
                    return;
                }

                const state = doc.data();
                let needsRefresh = false;
                window.isInjectingCloudData = true;

                try {
                    SYNC_CONFIG.staticKeys.forEach(key => {
                        const cloudVal = state[key];
                        const localVal = localStorage.getItem(key);
                        if (typeof cloudVal === 'string' && cloudVal !== localVal) {
                            originalSetItem.call(localStorage, key, cloudVal);
                            needsRefresh = true;
                        }
                    });

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
                } finally {
                    window.isInjectingCloudData = false;
                    window.hasInitialSyncCompleted = true;
                }

                // SILENT UI REFRESH (NO MORE RELOADING)
                if (needsRefresh) {
                    if (window.AppEvents) {
                        window.AppEvents.emit('SUBJECTS_UPDATED');
                        window.AppEvents.emit('PLANNER_UPDATED');
                        window.AppEvents.emit('DATE_CHANGE', { tab: 'todo', direction: 0 });
                        window.AppEvents.emit('DATE_CHANGE', { tab: 'journal', direction: 0 });
                    }
                    if (typeof window.forcePlannerRefresh === 'function') {
                        window.forcePlannerRefresh();
                    }
                }
            });
    }
};

window.AppDB = AppDB;

// THE UNBREAKABLE PROTOTYPE WIRETAP
const originalSetItem = Storage.prototype.setItem;

Storage.prototype.setItem = function(key, value) {
    try { 
        originalSetItem.call(this, key, value); 
    } catch (e) { 
        console.error("Storage Error:", e);
        return; 
    }

    if (window.isInjectingCloudData) return;

    const isTracked = SYNC_CONFIG.staticKeys.includes(key) || 
                      SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix));

    if (isTracked && AppDB.session && window.hasInitialSyncCompleted) {
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => {
            AppDB.pushToCloud();
        }, 1500);
    }
};