// =================================================================
// BILLU'S DIARY: FIREBASE KERNEL (DYNAMIC SYNC UPGRADE)
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence({ synchronizeTabs: true }).catch((err) => console.warn("Offline Mode Error:", err.code));

let isInjectingCloudData = false;
let realTimeListener = null;
let authPromise = null; // THE FIX: Prevents duplicate background listeners causing UI freezes

// ARCHITECTURE FIX: Single Source of Truth for all synced data
const SYNC_CONFIG = {
    staticKeys: [
        'plannerTargets', 
        'plannerCompleted', 
        'plannerSubjects', 
        'userDisplayName', 
        'userUltimateGoalName', 
        'userUltimateGoalDate'
    ],
    dynamicPrefixes: ['todo_', 'journal_']
};

const AppDB = {
    session: null,

    checkSession() {
        // THE FIX: Only attach the Firebase listener once. 
        // Subsequent calls instantly return the active session without hanging the thread.
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
        
        // THE FIX: Fire and forget! Do NOT await this. 
        // This stops the UI from freezing while waiting for the server handshake.
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
        // 1. Initialize the Google Provider
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // 2. Trigger the secure pop-up window
        const result = await auth.signInWithPopup(provider);
        this.session = result.user;
        
        // 3. Fire and forget push! 
        // If this is a brand new account, we instantly back up their local phone data to the cloud.
        // If it's an existing account, Firestore will safely merge it.
        this.pushToCloud();
        this.startRealTimeSync();
        
        return result.user;
    },    

    async logout() {
        await auth.signOut();
        this.session = null;
        if (realTimeListener) { realTimeListener(); realTimeListener = null; }
        
        // PRIVACY WIPE: Clean up using the central config
        SYNC_CONFIG.staticKeys.forEach(k => localStorage.removeItem(k));
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        
        window.location.reload();
    },

    async resetPassword(email) { await auth.sendPasswordResetEmail(email); },
    async updatePassword(newPassword) { if (this.session) await this.session.updatePassword(newPassword); },

    // --- THE DYNAMIC PUSH ENGINE ---
    async pushToCloud() {
        if (!this.session) return;

        const appState = {
            todos: {},     
            journals: {}   
        };

        // Package static keys
        SYNC_CONFIG.staticKeys.forEach(key => {
            appState[key] = localStorage.getItem(key) || null;
        });

        // Package dynamic keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('todo_')) appState.todos[key] = localStorage.getItem(key);
            if (key.startsWith('journal_')) appState.journals[key] = localStorage.getItem(key);
        }

        try {
            await db.collection('users').doc(this.session.uid).set({
                app_state: appState,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("Firebase Dynamic Sync Successful!");
        } catch (error) {
            console.error("Firebase Sync Failed:", error);
        }
    },

    // --- THE DYNAMIC PULL ENGINE ---
    startRealTimeSync() {
        if (!this.session || realTimeListener) return;

        realTimeListener = db.collection('users').doc(this.session.uid)
            .onSnapshot((doc) => {
                if (!doc.exists || !doc.data().app_state) return;

                const state = doc.data().app_state;
                let needsRefresh = false;
                isInjectingCloudData = true;

                // 1. Sync Static Keys
                SYNC_CONFIG.staticKeys.forEach(key => {
                    const localVal = localStorage.getItem(key);
                    const cloudVal = state[key];
                    if (cloudVal !== undefined && cloudVal !== null && cloudVal !== localVal) {
                        originalSetItem.call(localStorage, key, cloudVal);
                        needsRefresh = true;
                    }
                });

                // 2. Sync Dynamic Todo Dates
                if (state.todos) {
                    Object.keys(state.todos).forEach(dateKey => {
                        const localVal = localStorage.getItem(dateKey);
                        const cloudVal = state.todos[dateKey];
                        if (cloudVal !== undefined && cloudVal !== null && cloudVal !== localVal) {
                            originalSetItem.call(localStorage, dateKey, cloudVal);
                            needsRefresh = true;
                        }
                    });
                }

                // 3. Sync Dynamic Journal Dates
                if (state.journals) {
                    Object.keys(state.journals).forEach(dateKey => {
                        const localVal = localStorage.getItem(dateKey);
                        const cloudVal = state.journals[dateKey];
                        if (cloudVal !== undefined && cloudVal !== null && cloudVal !== localVal) {
                            originalSetItem.call(localStorage, dateKey, cloudVal);
                            needsRefresh = true;
                        }
                    });
                }

                isInjectingCloudData = false;
                if (needsRefresh) window.location.reload(); 
            });
    }
};

window.AppDB = AppDB;

// =================================================================
// THE SAFE WIRETAP (DYNAMIC AWARENESS)
// =================================================================
let syncTimeout = null;
const originalSetItem = localStorage.setItem;

localStorage.setItem = function(key, value) {
    try { 
        originalSetItem.apply(window.localStorage, [key, value]); 
    } catch (e) { 
        console.error("Storage Error:", e);
        alert("Device storage full!"); 
        return; 
    }

    if (isInjectingCloudData) return;

    const isTracked = SYNC_CONFIG.staticKeys.includes(key) || 
                      SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix));

    if (isTracked && AppDB.session) {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            console.log(`Change detected in ${key}. Syncing...`);
            AppDB.pushToCloud();
        }, 2000);
    }
};