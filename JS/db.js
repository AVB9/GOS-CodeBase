// =================================================================
// BILLU'S DIARY: FIREBASE KERNEL (DYNAMIC SYNC & GOOGLE AUTH)
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
let authPromise = null; 

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
        // CRITICAL FIX: Do NOT push to cloud here. Wait for the cloud to download to the phone!
        this.startRealTimeSync();
        return userCredential.user;
    },

    async loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        this.session = result.user;
        
        // CRITICAL FIX: Only push empty local data if this is a BRAND NEW account.
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
            if (SYNC_CONFIG.dynamicPrefixes.some(prefix => key.startsWith(prefix))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        window.location.reload();
    },

    async resetPassword(email) { await auth.sendPasswordResetEmail(email); },
    async updatePassword(newPassword) { if (this.session) await this.session.updatePassword(newPassword); },

    async pushToCloud() {
        if (!this.session) return;
        const appState = { todos: {}, journals: {} };

        SYNC_CONFIG.staticKeys.forEach(key => {
            appState[key] = localStorage.getItem(key) || null;
        });

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
        } catch (error) { console.error("Firebase Sync Failed:", error); }
    },

    startRealTimeSync() {
        if (!this.session || realTimeListener) return;

        realTimeListener = db.collection('users').doc(this.session.uid)
            .onSnapshot((doc) => {
                if (!doc.exists || !doc.data().app_state) return;
                const state = doc.data().app_state;
                let needsRefresh = false;
                isInjectingCloudData = true;

                // Sync Static Keys
                SYNC_CONFIG.staticKeys.forEach(key => {
                    const localVal = localStorage.getItem(key);
                    const cloudVal = state[key];
                    // Strict type check to prevent ghost data
                    if (cloudVal && typeof cloudVal === 'string' && cloudVal !== localVal) {
                        originalSetItem.call(localStorage, key, cloudVal);
                        needsRefresh = true;
                    }
                });

                // Sync Dynamic Todos
                if (state.todos) {
                    Object.keys(state.todos).forEach(dateKey => {
                        const localVal = localStorage.getItem(dateKey);
                        const cloudVal = state.todos[dateKey];
                        if (cloudVal && typeof cloudVal === 'string' && cloudVal !== localVal) {
                            originalSetItem.call(localStorage, dateKey, cloudVal);
                            needsRefresh = true;
                        }
                    });
                }

                // Sync Dynamic Journals
                if (state.journals) {
                    Object.keys(state.journals).forEach(dateKey => {
                        const localVal = localStorage.getItem(dateKey);
                        const cloudVal = state.journals[dateKey];
                        if (cloudVal && typeof cloudVal === 'string' && cloudVal !== localVal) {
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

// THE SAFE WIRETAP
let syncTimeout = null;
const originalSetItem = localStorage.setItem;

localStorage.setItem = function(key, value) {
    try { 
        originalSetItem.apply(window.localStorage, [key, value]); 
    } catch (e) { 
        return; 
    }

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