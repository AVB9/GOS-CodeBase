// =================================================================
// 1.0 [FIREBASE KERNEL & CONFIG]
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
    staticKeys: [
        'plannerTargets', 
        'plannerCompleted', 
        'plannerSubjects', 
        'userDisplayName', 
        'userUltimateGoalName', 
        'userUltimateGoalDate',
        'momentumHabits'
    ],
    dynamicPrefixes: ['todo_', 'journal_']
};

const getDeviceId = () => {
    let id = localStorage.getItem('appDeviceId');
    if (!id) {
        id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('appDeviceId', id);
    }
    return id;
};

// =================================================================
// 2.0 [AppDB CONTROLLER]
// =================================================================
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
        if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) this.pushToCloud();
        this.startRealTimeSync();
        return result.user;
    },

    localWipeAndReload() {
        if (realTimeListener) { realTimeListener(); realTimeListener = null; }
        SYNC_CONFIG.staticKeys.forEach(k => localStorage.removeItem(k));
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix))) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        auth.signOut().then(() => window.location.reload());
    },

    async logout() {
        if (this.session) {
            try {
                // Remove this specific device from cloud sessions before logging out
                await db.collection('users').doc(this.session.uid).set({
                    sessions: { [getDeviceId()]: firebase.firestore.FieldValue.delete() }
                }, { merge: true });
            } catch (e) {}
        }
        this.localWipeAndReload();
    },

    async resetPassword(email) { await auth.sendPasswordResetEmail(email); },
    async updatePassword(newPassword) { if (this.session) await this.session.updatePassword(newPassword); },

    async pushToCloud() {
        if (!this.session || !window.hasInitialSyncCompleted) return;
        this.forcePushToCloud();
    },

    async forcePushToCloud() {
        if (!this.session) return;
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

        try { await db.collection('users').doc(this.session.uid).set(payload, { merge: true }); } 
        catch (error) { console.error("Firebase Sync Failed:", error); }
    },

    async nukeCloudData() {
        if (!this.session) return;
        try {
            await db.collection('users').doc(this.session.uid).set({
                _FACTORY_RESET_TRIGGERED: true,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) { throw error; }
    },

    async registerDevice() {
        if (!this.session) return;
        const deviceName = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile Device' : 'Desktop Device';
        try {
            await db.collection('users').doc(this.session.uid).set({
                sessions: { [getDeviceId()]: { name: deviceName, lastActive: firebase.firestore.FieldValue.serverTimestamp() } }
            }, { merge: true });
        } catch (e) {}
    },

    startRealTimeSync() {
        if (!this.session || realTimeListener) return;

        realTimeListener = db.collection('users').doc(this.session.uid)
            .onSnapshot((doc) => {
                if (!doc.exists) {
                    window.hasInitialSyncCompleted = true;
                    AppDB.pushToCloud();
                    AppDB.registerDevice();
                    return;
                }

                const state = doc.data();

                // 1. Cross-device Factory Reset Interceptor
                if (state._FACTORY_RESET_TRIGGERED === true) {
                    this.localWipeAndReload();
                    return;
                }

                // 2. Remote Logout Interceptor
                const myDeviceId = getDeviceId();
                if (state.sessions) {
                    if (!state.sessions[myDeviceId]) {
                        if (window.hasInitialSyncCompleted) { this.localWipeAndReload(); return; } 
                        else { this.registerDevice(); }
                    }
                } else {
                    this.registerDevice();
                }

                if (window.isLocalMutating) return; 

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

                if (needsRefresh) {
                    if (window.AppEvents) {
                        window.AppEvents.emit('SUBJECTS_UPDATED');
                        window.AppEvents.emit('PLANNER_UPDATED');
                        window.AppEvents.emit('DATE_CHANGE', { tab: 'todo', direction: 0 });
                        window.AppEvents.emit('DATE_CHANGE', { tab: 'journal', direction: 0 });
                        window.AppEvents.emit('MOMENTUM_SYNCED'); 
                    }
                    if (typeof window.forcePlannerRefresh === 'function') window.forcePlannerRefresh();
                }
            });
    }
};

window.AppDB = AppDB;

// =================================================================
// 3.0 [OPTIMISTIC UI SHIELD & WIRETAP]
// =================================================================
const originalSetItem = Storage.prototype.setItem;

window.isLocalMutating = false;
window.mutationShieldTimer = null;

Storage.prototype.setItem = function(key, value) {
    try { originalSetItem.call(this, key, value); } 
    catch (e) { return; }

    if (window.isInjectingCloudData) return;

    const isTracked = SYNC_CONFIG.staticKeys.includes(key) || 
                      SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix));

    if (isTracked && AppDB.session && window.hasInitialSyncCompleted) {
        window.isLocalMutating = true;
        clearTimeout(window.mutationShieldTimer);

        window.mutationShieldTimer = setTimeout(() => { window.isLocalMutating = false; }, 2500);

        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => { AppDB.pushToCloud(); }, 1000); 
    }
};